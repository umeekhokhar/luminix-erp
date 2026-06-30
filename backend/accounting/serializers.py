from rest_framework import serializers
from .models import CustomerLedger, CustomerTransaction, VendorLedger, VendorTransaction, CashAccount, CashTransaction, ExpenseAccount, ExpenseTransaction
from crm.models import Customer
from inventory.models import Vendor

class CustomerTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerTransaction
        fields = '__all__'

class CustomerLedgerSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_address = serializers.CharField(source='customer.address', read_only=True)
    customer_city = serializers.CharField(source='customer.city', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    transactions = CustomerTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = CustomerLedger
        fields = [
            'id', 'customer', 'customer_name', 'customer_address', 'customer_city', 
            'customer_phone', 'balance', 'total_credit', 'total_debit', 
            'credit_limit', 'updated_at', 'transactions'
        ]

class VendorTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorTransaction
        fields = '__all__'

class VendorLedgerSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    transactions = VendorTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = VendorLedger
        fields = ['id', 'vendor', 'vendor_name', 'balance', 'total_credit', 'total_debit', 'updated_at', 'transactions']

class CashTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CashTransaction
        fields = '__all__'

class CashAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = CashAccount
        fields = '__all__'

class ExpenseTransactionSerializer(serializers.ModelSerializer):
    # This grabs the actual string name of the cash register for display purposes
    cash_account_name = serializers.CharField(source='cash_account.name', read_only=True)
    
    # Let's also grab the expense account name while we are at it!
    account_name = serializers.CharField(source='account.name', read_only=True)

    class Meta:
        model = ExpenseTransaction
        fields = '__all__' 
        # Using __all__ automatically includes your new 'cash_account' ID field!
# -------------------------------------------------------------

class ExpenseAccountSerializer(serializers.ModelSerializer):
    transactions = ExpenseTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = ExpenseAccount
        fields = ['id', 'name', 'description', 'total_debit', 'total_credit', 'balance', 'updated_at', 'transactions']