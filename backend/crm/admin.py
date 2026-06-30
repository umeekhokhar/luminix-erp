from django.contrib import admin
from .models import Customer, Salesman


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'phone', 'city', 'country', 'company', 'created_by', 'created_at')
    search_fields = ('name', 'email', 'phone', 'company')
    list_filter = ('city', 'country')


@admin.register(Salesman)
class SalesmanAdmin(admin.ModelAdmin):
    list_display = ('user', 'employee_id', 'commission_rate', 'territory')
    search_fields = ('user__username', 'employee_id')
    list_filter = ('territory',)

