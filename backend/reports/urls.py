from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProfitReportViewSet

router = DefaultRouter()
router.register(r'profit-loss', ProfitReportViewSet, basename='profit-loss')

urlpatterns = [
    path('', include(router.urls)),
]