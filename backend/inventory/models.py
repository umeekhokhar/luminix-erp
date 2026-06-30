from django.db import models
from datetime import datetime

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name

class Vendor(models.Model):
    name = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20)
    address = models.TextField()
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    payment_terms = models.CharField(max_length=100, default='Net 30')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Product(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    # FIXED: Added blank=True so frontend doesn't crash on save
    sku = models.CharField(max_length=50, unique=True, blank=True)
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.sku:
            # Generate SKU: PRD-YYYYMMDD-XXXX
            today = datetime.now().strftime('%Y%m%d')
            last_product = Product.objects.filter(sku__startswith=f'PRD-{today}').order_by('sku').last()
            if last_product:
                try:
                    last_id = int(last_product.sku.split('-')[-1])
                    new_id = last_id + 1
                except (ValueError, IndexError):
                    new_id = 1
            else:
                new_id = 1
            self.sku = f'PRD-{today}-{new_id:04d}'
        super().save(*args, **kwargs)

class Inventory(models.Model):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='inventory')
    stock_quantity = models.PositiveIntegerField(default=0)
    reorder_level = models.PositiveIntegerField(default=10)
    last_restocked = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Inventories'

    def __str__(self):
        return f'{self.product.name} - Stock: {self.stock_quantity}'

class InventoryTransaction(models.Model):
    TRANSACTION_TYPE_CHOICES = [
        ('in', 'Stock In'),
        ('out', 'Stock Out'),
        ('adjustment', 'Adjustment'),
        ('purchase', 'Purchase'),
        ('sale', 'Sale'),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    quantity = models.IntegerField()
    reference_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f'{self.product.name} - {self.transaction_type} - {self.quantity} units'

    class Meta:
        ordering = ['-created_at']

class Purchase(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('received', 'Received'),
        ('partially_received', 'Partially Received'),
        ('cancelled', 'Cancelled'),
    ]

    # FIXED: Added blank=True
    purchase_number = models.CharField(max_length=50, unique=True, blank=True)
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT, related_name='purchases')
    purchase_date = models.DateTimeField(auto_now_add=True)
    expected_delivery_date = models.DateField(null=True, blank=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.purchase_number

    def save(self, *args, **kwargs):
        if not self.purchase_number:
            # Generate PO Number: PO-YYYYMMDD-XXXX
            today = datetime.now().strftime('%Y%m%d')
            last_po = Purchase.objects.filter(purchase_number__startswith=f'PO-{today}').order_by('purchase_number').last()
            if last_po:
                try:
                    last_id = int(last_po.purchase_number.split('-')[-1])
                    new_id = last_id + 1
                except (ValueError, IndexError):
                    new_id = 1
            else:
                new_id = 1
            self.purchase_number = f'PO-{today}-{new_id:04d}'
        super().save(*args, **kwargs)

class PurchaseItem(models.Model):
    purchase = models.ForeignKey(Purchase, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    received_quantity = models.PositiveIntegerField(default=0)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.product.name} - {self.quantity} units'