from django.db import models
from inventory.models import Product


class SaleRecord(models.Model):
    """
    Synthetic sales record used for ML demand forecasting.
    Mirrors real OrderItem data but stored separately to support
    synthetic seeding and historical analysis.
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='sale_records')
    quantity_sold = models.PositiveIntegerField()
    sale_date = models.DateField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_synthetic = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sale_date']
        verbose_name = 'Sale Record'
        verbose_name_plural = 'Sale Records'

    def __str__(self):
        return f'{self.product.name} | {self.sale_date} | qty={self.quantity_sold}'


class ForecastResult(models.Model):
    """
    Stores the latest demand forecast output per product.
    Refreshed each time the forecasting engine runs.
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='forecasts')
    forecast_date = models.DateField()           # The future date being forecast
    predicted_quantity = models.FloatField()     # Predicted units to be sold
    lower_bound = models.FloatField(default=0)   # Confidence interval lower
    upper_bound = models.FloatField(default=0)   # Confidence interval upper
    model_used = models.CharField(max_length=50, default='WMA')
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['forecast_date']
        unique_together = ('product', 'forecast_date')
        verbose_name = 'Forecast Result'
        verbose_name_plural = 'Forecast Results'

    def __str__(self):
        return f'{self.product.name} | {self.forecast_date} | pred={self.predicted_quantity:.1f}'
