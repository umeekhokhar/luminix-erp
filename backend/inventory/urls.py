from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet, ProductViewSet, InventoryViewSet,
    VendorViewSet, PurchaseViewSet, InventoryTransactionViewSet
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'inventory', InventoryViewSet, basename='inventory')
router.register(r'vendors', VendorViewSet, basename='vendor')
router.register(r'purchases', PurchaseViewSet, basename='purchase')
router.register(r'transactions', InventoryTransactionViewSet, basename='transaction')

urlpatterns = [
    path('', include(router.urls)),
]

