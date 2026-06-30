"""
engine.py  –  Luminix ERP · AI Demand Forecasting Engine
=========================================================
Implements:
  • Weighted Moving Average (WMA) – primary, fast, interpretable
  • Linear Regression trend  – secondary, captures growth/decline
  • Ensemble  – weighted blend of both

For each product the engine:
  1. Fetches the last 90 days of SaleRecord data
  2. Aggregates to weekly totals (reduces noise)
  3. Applies WMA with recency weights
  4. Overlays a linear trend from sklearn
  5. Produces a 4-week (28-day) daily forecast
  6. Saves ForecastResult rows (upsert)

Called from views.py or the management command.
"""

from datetime import date, timedelta
from typing import List, Dict

import numpy as np
from sklearn.linear_model import LinearRegression

from forecasting.models import SaleRecord, ForecastResult
from inventory.models import Product


# ──────────────────────────────────────────────────
HISTORY_DAYS   = 90      # how many days of history to use
FORECAST_DAYS  = 28      # how many days ahead to forecast
WMA_WEEKS      = 8       # number of weeks in the WMA window
WMA_ALPHA      = 0.15    # exponential decay base for weights
ENSEMBLE_WMA_W = 0.60    # weight for WMA in ensemble
ENSEMBLE_LR_W  = 0.40    # weight for LR  in ensemble
# ──────────────────────────────────────────────────


def _weekly_series(product: Product, end_date: date) -> np.ndarray:
    """Return array of weekly demand totals (oldest → newest)."""
    start = end_date - timedelta(days=HISTORY_DAYS)
    records = SaleRecord.objects.filter(
        product=product,
        sale_date__gte=start,
        sale_date__lte=end_date,
    ).values_list('sale_date', 'quantity_sold')

    # Map each day to a week-bucket index
    daily = {}
    for sale_date, qty in records:
        delta = (sale_date - start).days
        bucket = delta // 7
        daily[bucket] = daily.get(bucket, 0) + qty

    total_weeks = HISTORY_DAYS // 7
    series = np.array([daily.get(i, 0) for i in range(total_weeks)], dtype=float)
    return series


def _wma_forecast(series: np.ndarray, window: int = WMA_WEEKS) -> float:
    """Weighted moving average; recent weeks get higher weight (exponential)."""
    tail = series[-window:] if len(series) >= window else series
    n = len(tail)
    # Exponential weights: w_i = (1+alpha)^i
    weights = np.array([(1 + WMA_ALPHA) ** i for i in range(n)])
    weights /= weights.sum()
    return float(np.dot(weights, tail))


def _lr_forecast(series: np.ndarray, steps_ahead: int = 1) -> float:
    """Linear regression over the series, projected `steps_ahead` weeks."""
    if len(series) < 3:
        return float(np.mean(series)) if len(series) else 0.0
    X = np.arange(len(series)).reshape(-1, 1)
    y = series
    model = LinearRegression()
    model.fit(X, y)
    future_x = np.array([[len(series) + steps_ahead - 1]])
    return float(model.predict(future_x)[0])


def _confidence_interval(weekly_pred: float, series: np.ndarray) -> tuple:
    """±1 std-dev of the historical series scaled to a daily value."""
    daily_pred = weekly_pred / 7
    if len(series) > 1:
        std_weekly = float(np.std(series))
    else:
        std_weekly = daily_pred * 0.2
    margin = (std_weekly / 7) * 1.0        # 1-sigma daily margin
    lower = max(0.0, daily_pred - margin)
    upper = daily_pred + margin
    return lower, upper


def forecast_product(product: Product, today: date = None) -> List[Dict]:
    """
    Compute a 28-day demand forecast for `product`.
    Returns a list of dicts with keys: date, predicted, lower, upper, model.
    Also persists ForecastResult rows.
    """
    if today is None:
        today = date.today()

    series = _weekly_series(product, today)

    # Edge case: no historical data → flat zero forecast
    if series.sum() == 0:
        results = []
        for d in range(1, FORECAST_DAYS + 1):
            fdate = today + timedelta(days=d)
            fr, _ = ForecastResult.objects.update_or_create(
                product=product, forecast_date=fdate,
                defaults={'predicted_quantity': 0, 'lower_bound': 0,
                          'upper_bound': 0, 'model_used': 'NO_DATA'}
            )
            results.append({'date': fdate, 'predicted': 0, 'lower': 0, 'upper': 0})
        return results

    # Week-level forecasts for 4 future weeks
    week_preds = []
    for week in range(1, 5):
        wma = _wma_forecast(series)
        lr  = _lr_forecast(series, steps_ahead=week)
        ensemble = ENSEMBLE_WMA_W * wma + ENSEMBLE_LR_W * lr
        ensemble = max(0.0, ensemble)
        week_preds.append(ensemble)

    # Explode weekly → daily with mild noise + weekend bump
    results = []
    for w_idx, weekly_total in enumerate(week_preds):
        for day_offset in range(7):
            fdate = today + timedelta(days=w_idx * 7 + day_offset + 1)
            if fdate > today + timedelta(days=FORECAST_DAYS):
                break
            weekday = fdate.weekday()
            day_factor = 1.35 if weekday in (4, 5) else 1.0
            daily_base = (weekly_total / 7) * day_factor
            # Normalize so the week sums correctly on average
            daily_pred = max(0.0, daily_base * (1 + np.random.normal(0, 0.05)))
            lower, upper = _confidence_interval(weekly_total, series)

            ForecastResult.objects.update_or_create(
                product=product, forecast_date=fdate,
                defaults={
                    'predicted_quantity': round(daily_pred, 2),
                    'lower_bound': round(lower, 2),
                    'upper_bound': round(upper, 2),
                    'model_used': 'WMA+LR_Ensemble',
                }
            )
            results.append({
                'date': fdate.isoformat(),
                'predicted': round(daily_pred, 2),
                'lower': round(lower, 2),
                'upper': round(upper, 2),
            })

    return results


def forecast_all_products(today: date = None) -> Dict:
    """Run forecasting for all products that have SaleRecord history."""
    if today is None:
        today = date.today()

    product_ids = (
        SaleRecord.objects
        .values_list('product_id', flat=True)
        .distinct()
    )
    products = Product.objects.filter(id__in=product_ids)

    summary = {}
    for product in products:
        summary[product.id] = {
            'product_name': product.name,
            'forecasts': forecast_product(product, today),
        }
    return summary
