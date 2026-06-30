from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from crm.models import Customer, Salesman
from inventory.models import Product
import uuid
from datetime import datetime


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('invoiced', 'Invoiced'),
    ]

    PAYMENT_TYPE_CHOICES = [
        ('cash', 'Cash (Upfront/COD)'),
        ('credit', 'Credit (Net-30)'),
    ]

    order_number = models.CharField(max_length=50, unique=True, blank=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='orders')
    salesman = models.ForeignKey(Salesman, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    payment_type = models.CharField(max_length=10, choices=PAYMENT_TYPE_CHOICES, default='credit')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    order_date = models.DateTimeField(auto_now_add=True)
    expected_delivery_date = models.DateField(null=True, blank=True)
    delivered_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def __str__(self):
        return self.order_number

    def save(self, *args, **kwargs):
        if not self.order_number:
            today = datetime.now().strftime('%Y%m%d')
            last_order = Order.objects.filter(order_number__startswith=f'ORD-{today}').order_by('order_number').last()
            if last_order:
                try:
                    last_id = int(last_order.order_number.split('-')[-1])
                    new_id = last_id + 1
                except (ValueError, IndexError):
                    new_id = 1
            else:
                new_id = 1
            self.order_number = f'ORD-{today}-{new_id:04d}'
        super().save(*args, **kwargs)

    def get_days_outstanding(self):
        if self.delivered_date:
            return (timezone.now().date() - self.delivered_date).days
        return None


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.product.name} - {self.quantity} units'


class Invoice(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ('unpaid', 'Unpaid'),
        ('partially_paid', 'Partially Paid'),
        ('paid', 'Paid'),
    ]

    invoice_number = models.CharField(max_length=50, unique=True, blank=True)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='invoice')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='invoices')
    invoice_date = models.DateTimeField(auto_now_add=True)
    due_date = models.DateField()
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='unpaid')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.invoice_number

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            today = datetime.now().strftime('%Y%m%d')
            last_invoice = Invoice.objects.filter(invoice_number__startswith=f'INV-{today}').order_by('invoice_number').last()
            if last_invoice:
                try:
                    last_id = int(last_invoice.invoice_number.split('-')[-1])
                    new_id = last_id + 1
                except (ValueError, IndexError):
                    new_id = 1
            else:
                new_id = 1
            self.invoice_number = f'INV-{today}-{new_id:04d}'
        super().save(*args, **kwargs)

    def get_balance_due(self):
        return self.total_amount - self.paid_amount

    def is_overdue(self):
        if self.payment_status != 'paid':
            return timezone.now().date() > self.due_date
        return False

class DailyLedger(models.Model):
    date = models.DateField(unique=True, default=timezone.now)
    total_cash = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_credit = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    def __str__(self):
        return f"Ledger for {self.date} - Cash: ${self.total_cash} | Credit: ${self.total_credit}"