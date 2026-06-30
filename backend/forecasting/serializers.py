from rest_framework import serializers
from forecasting.models import SaleRecord, ForecastResult


class SaleRecordSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = SaleRecord
        fields = ['id', 'product', 'product_name', 'quantity_sold',
                  'sale_date', 'unit_price', 'is_synthetic', 'created_at']


class ForecastResultSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = ForecastResult
        fields = ['id', 'product', 'product_name', 'forecast_date',
                  'predicted_quantity', 'lower_bound', 'upper_bound',
                  'model_used', 'generated_at']
