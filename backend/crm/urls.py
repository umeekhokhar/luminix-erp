from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomerViewSet, SalesmanViewSet

router = DefaultRouter()
router.register(r'customers', CustomerViewSet)
router.register(r'salesmen', SalesmanViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
