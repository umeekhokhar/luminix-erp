from django.contrib import admin
from forecasting.models import SaleRecord, ForecastResult


@admin.register(SaleRecord)
class SaleRecordAdmin(admin.ModelAdmin):
    list_display = ['product', 'sale_date', 'quantity_sold', 'unit_price', 'is_synthetic']
    list_filter  = ['is_synthetic', 'sale_date']
    search_fields = ['product__name']
    date_hierarchy = 'sale_date'


@admin.register(ForecastResult)
class ForecastResultAdmin(admin.ModelAdmin):
    list_display = ['product', 'forecast_date', 'predicted_quantity', 'lower_bound',
                    'upper_bound', 'model_used', 'generated_at']
    list_filter  = ['model_used', 'forecast_date']
    search_fields = ['product__name']
    date_hierarchy = 'forecast_date'
