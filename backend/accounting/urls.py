from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomerLedgerViewSet, CustomerTransactionViewSet, VendorLedgerViewSet, VendorTransactionViewSet, CashAccountViewSet, CashTransactionViewSet, ExpenseAccountViewSet, ExpenseTransactionViewSet
from .customer_views import CustomerBalanceViewSet

router = DefaultRouter()
router.register(r'customer-ledgers', CustomerLedgerViewSet, basename='customer-ledger')
router.register(r'customer-transactions', CustomerTransactionViewSet, basename='customer-transaction')
router.register(r'vendor-ledgers', VendorLedgerViewSet, basename='vendor-ledger')
router.register(r'vendor-transactions', VendorTransactionViewSet, basename='vendor-transaction')
router.register(r'cash-accounts', CashAccountViewSet, basename='cashaccount')
router.register(r'cash-transactions', CashTransactionViewSet, basename='cashtransaction')
router.register(r'expense-accounts', ExpenseAccountViewSet, basename='expense-account')
router.register(r'expense-transactions', ExpenseTransactionViewSet, basename='expense-transaction')

urlpatterns = [
    path('', include(router.urls)),
    path('customer/balance/', CustomerBalanceViewSet.as_view({'get': 'my_balance'}), name='customer-balance'),
]
