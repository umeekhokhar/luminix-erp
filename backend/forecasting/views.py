"""
views.py  –  Luminix ERP · AI Demand Forecasting API
=====================================================

Endpoints:
  GET  /api/forecasting/summary/        – per-product summary (next 28 days)
  GET  /api/forecasting/product/<id>/   – detailed forecast for one product
  GET  /api/forecasting/history/<id>/   – last 90 days of sale records
  POST /api/forecasting/run/            – trigger a fresh forecast run
  POST /api/forecasting/seed/           – seed / re-seed synthetic beverage data
  GET  /api/forecasting/reorder/        – products that need restocking
"""

from datetime import date, timedelta

from django.db.models import Sum

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from forecasting.models import SaleRecord, ForecastResult
from forecasting.serializers import SaleRecordSerializer, ForecastResultSerializer
from forecasting.engine import forecast_product, forecast_all_products
from inventory.models import Product


# ──────────────────────────────────────────────────
# Helper
# ──────────────────────────────────────────────────
def _get_product_or_404(pk):
    try:
        return Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return None


# ──────────────────────────────────────────────────
# 1. Summary  –  all products, next 28 days total
# ──────────────────────────────────────────────────
@api_view(['GET'])
def forecast_summary(request):
    """
    Returns a list of products with their 28-day demand forecast,
    current stock, and a reorder recommendation flag.
    """
    today = date.today()
    horizon = today + timedelta(days=28)

    # Products with any sale history
    product_ids = SaleRecord.objects.values_list('product_id', flat=True).distinct()
    products = Product.objects.filter(id__in=product_ids).select_related('inventory')

    data = []
    for product in products:
        forecasts = ForecastResult.objects.filter(
            product=product,
            forecast_date__gt=today,
            forecast_date__lte=horizon,
        )
        total_predicted = sum(f.predicted_quantity for f in forecasts)
        current_stock = getattr(getattr(product, 'inventory', None), 'stock_quantity', 0)
        reorder_level  = getattr(getattr(product, 'inventory', None), 'reorder_level',  10)

        # Recent 7-day actual sales for accuracy display
        last7_sales = SaleRecord.objects.filter(
            product=product,
            sale_date__gte=today - timedelta(days=7),
        ).aggregate(total=Sum('quantity_sold'))['total'] or 0

        data.append({
            'product_id':       product.id,
            'product_name':     product.name,
            'sku':              product.sku,
            'current_stock':    current_stock,
            'reorder_level':    reorder_level,
            'forecast_28_days': round(total_predicted, 1),
            'last_7_days_sales': last7_sales,
            'needs_reorder':    current_stock < reorder_level or current_stock < total_predicted * 0.5,
            'forecast_count':   forecasts.count(),
        })

    return Response({'results': data, 'generated_at': today.isoformat()})


# ──────────────────────────────────────────────────
# 2. Product detail forecast
# ──────────────────────────────────────────────────
@api_view(['GET'])
def product_forecast(request, pk):
    product = _get_product_or_404(pk)
    if not product:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

    today = date.today()
    forecasts = ForecastResult.objects.filter(
        product=product,
        forecast_date__gt=today,
        forecast_date__lte=today + timedelta(days=28),
    ).order_by('forecast_date')

    serializer = ForecastResultSerializer(forecasts, many=True)
    return Response({
        'product_id':   product.id,
        'product_name': product.name,
        'forecasts':    serializer.data,
    })


# ──────────────────────────────────────────────────
# 3. Historical sales for a product
# ──────────────────────────────────────────────────
@api_view(['GET'])
def product_history(request, pk):
    product = _get_product_or_404(pk)
    if not product:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

    today = date.today()
    records = SaleRecord.objects.filter(
        product=product,
        sale_date__gte=today - timedelta(days=90),
    ).order_by('sale_date')

    # Aggregate to weekly buckets for a cleaner chart
    weekly = {}
    for r in records:
        week_start = r.sale_date - timedelta(days=r.sale_date.weekday())
        key = week_start.isoformat()
        weekly[key] = weekly.get(key, 0) + r.quantity_sold

    chart_data = [{'week': k, 'quantity': v} for k, v in sorted(weekly.items())]
    return Response({
        'product_id':   product.id,
        'product_name': product.name,
        'weekly_sales': chart_data,
        'total_records': records.count(),
    })


# ──────────────────────────────────────────────────
# 4. Run / refresh forecast
# ──────────────────────────────────────────────────
@api_view(['POST'])
def run_forecast(request):
    """Trigger a fresh forecast run for all products with sale history."""
    try:
        summary = forecast_all_products()
        return Response({
            'status': 'success',
            'products_forecasted': len(summary),
            'message': f'Forecasts generated for {len(summary)} product(s).',
        })
    except Exception as exc:
        return Response({'status': 'error', 'message': str(exc)},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ──────────────────────────────────────────────────
# 5. Seed synthetic data
# ──────────────────────────────────────────────────
@api_view(['POST'])
def seed_data(request):
    """Seed or re-seed synthetic beverage data and immediately run forecasts."""
    try:
        from forecasting.seed_beverages import run as seed_run
        seed_run()
        summary = forecast_all_products()
        return Response({
            'status': 'success',
            'message': 'Synthetic beverage data seeded and forecasts generated.',
            'products_forecasted': len(summary),
        })
    except Exception as exc:
        return Response({'status': 'error', 'message': str(exc)},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ──────────────────────────────────────────────────
# 6. Reorder recommendations
# ──────────────────────────────────────────────────
@api_view(['GET'])
def reorder_recommendations(request):
    """
    Return products where predicted 14-day demand exceeds current stock
    or stock is below reorder level, with suggested order quantity.
    """
    today = date.today()
    horizon = today + timedelta(days=14)

    product_ids = SaleRecord.objects.values_list('product_id', flat=True).distinct()
    products = Product.objects.filter(id__in=product_ids).select_related('inventory')

    recommendations = []
    for product in products:
        inv = getattr(product, 'inventory', None)
        if inv is None:
            continue

        forecasts = ForecastResult.objects.filter(
            product=product,
            forecast_date__gt=today,
            forecast_date__lte=horizon,
        )
        predicted_14d = sum(f.predicted_quantity for f in forecasts)
        gap = predicted_14d - inv.stock_quantity
        below_reorder = inv.stock_quantity <= inv.reorder_level

        if gap > 0 or below_reorder:
            # Suggest: cover the gap + 20% safety buffer
            suggested_qty = max(
                inv.reorder_level,
                int(gap * 1.2) if gap > 0 else inv.reorder_level * 2
            )
            recommendations.append({
                'product_id':       product.id,
                'product_name':     product.name,
                'sku':              product.sku,
                'current_stock':    inv.stock_quantity,
                'reorder_level':    inv.reorder_level,
                'predicted_14d':    round(predicted_14d, 1),
                'stock_gap':        round(gap, 1),
                'suggested_order_qty': suggested_qty,
                'urgency':          'HIGH' if inv.stock_quantity <= inv.reorder_level else 'MEDIUM',
            })

    recommendations.sort(key=lambda x: x['urgency'] == 'HIGH', reverse=True)
    return Response({'recommendations': recommendations, 'generated_at': today.isoformat()})
