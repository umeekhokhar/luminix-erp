from django.urls import path
from forecasting import views

urlpatterns = [
    path('summary/',          views.forecast_summary,         name='forecast-summary'),
    path('product/<int:pk>/', views.product_forecast,         name='product-forecast'),
    path('history/<int:pk>/', views.product_history,          name='product-history'),
    path('run/',              views.run_forecast,             name='run-forecast'),
    path('seed/',             views.seed_data,                name='seed-data'),
    path('reorder/',          views.reorder_recommendations,  name='reorder-recommendations'),
]
