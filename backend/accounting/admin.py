from django.contrib import admin
from .models import CustomerLedger, CustomerTransaction, VendorLedger, VendorTransaction


@admin.register(CustomerLedger)
class CustomerLedgerAdmin(admin.ModelAdmin):
    list_display = ('customer', 'balance', 'credit_limit', 'updated_at')
    readonly_fields = ('total_credit', 'total_debit', 'balance')


@admin.register(CustomerTransaction)
class CustomerTransactionAdmin(admin.ModelAdmin):
    list_display = ('ledger', 'transaction_type', 'amount', 'transaction_date')
    list_filter = ('transaction_type', 'transaction_date')
    search_fields = ('ledger__customer__name', 'reference_number')


@admin.register(VendorLedger)
class VendorLedgerAdmin(admin.ModelAdmin):
    list_display = ('vendor', 'balance', 'updated_at')
    readonly_fields = ('total_credit', 'total_debit', 'balance')


@admin.register(VendorTransaction)
class VendorTransactionAdmin(admin.ModelAdmin):
    list_display = ('ledger', 'transaction_type', 'amount', 'transaction_date')
    list_filter = ('transaction_type', 'transaction_date')
    search_fields = ('ledger__vendor__name', 'reference_number')
