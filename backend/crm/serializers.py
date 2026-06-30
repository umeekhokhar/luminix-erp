from rest_framework import serializers
from .models import Customer, Salesman


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = (
            'id',
            'user',
            'name',
            'email',
            'phone',
            'address',
            'city',
            'country',
            'company',
            'created_by',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('created_by', 'user')
        extra_kwargs = {
            'user': {'required': False, 'allow_null': True},
        }


class SalesmanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Salesman
        fields = (
            'id',
            'user',
            'employee_id',
            'commission_rate',
            'territory',
            'created_at',
            'updated_at',
        )
