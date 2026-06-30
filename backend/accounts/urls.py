from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AuthViewSet, UserManagementViewSet
from .admin_views import AdminCustomerViewSet, AdminSalesmanViewSet

router = DefaultRouter()
router.register(r'auth', AuthViewSet, basename='auth')
router.register(r'users', UserManagementViewSet, basename='users')

# admin helper routes used by frontend
router.register(r'admin/customers', AdminCustomerViewSet, basename='admin-customers')
router.register(r'admin/salesmen', AdminSalesmanViewSet, basename='admin-salesmen')

urlpatterns = [
    path('', include(router.urls)),
]