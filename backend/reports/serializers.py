from rest_framework import serializers
from .models import ProfitReport

class ProfitReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfitReport
        fields = '__all__'