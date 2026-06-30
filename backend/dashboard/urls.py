from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DashboardViewSet

# Register the ViewSet with an empty prefix string
router = DefaultRouter()
router.register(r'', DashboardViewSet, basename='dashboard')

urlpatterns = [
    path('', include(router.urls)),
]