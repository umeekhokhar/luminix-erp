from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, InvoiceViewSet

router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'invoices', InvoiceViewSet, basename='invoice')

urlpatterns = [
    path('', include(router.urls)),
]
