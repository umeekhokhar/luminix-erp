from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction as db_transaction
from crm.models import Customer
from inventory.models import Vendor, Purchase
# Note: Invoice is no longer imported here because we handle it in views.py
from .models import CustomerLedger, VendorLedger, VendorTransaction

# 1. Automatically create a Ledger when a new Customer is added
@receiver(post_save, sender=Customer)
def create_customer_ledger(sender, instance, created, **kwargs):
    if created:
        CustomerLedger.objects.create(customer=instance)

# 2. Automatically create a Ledger when a new Vendor is added
@receiver(post_save, sender=Vendor)
def create_vendor_ledger(sender, instance, created, **kwargs):
    if created:
        VendorLedger.objects.create(vendor=instance)

# (The Invoice signal was removed from here to prevent double-counting. 
# Cash/Credit logic is now safely handled entirely in orders/views.py)

# 3. When a PURCHASE is Received -> Credit the Vendor (We owe them money)
@receiver(post_save, sender=Purchase)
def create_purchase_transaction(sender, instance, created, **kwargs):
    # Only trigger if status changed to 'received' and we haven't already processed it
    if instance.status == 'received':
        # Check if this purchase was already recorded to avoid duplicates
        existing = VendorTransaction.objects.filter(reference_number=instance.purchase_number).exists()
        if not existing:
            with db_transaction.atomic():
                ledger = instance.vendor.ledger
                
                VendorTransaction.objects.create(
                    ledger=ledger,
                    transaction_type='credit',
                    amount=instance.total_amount,
                    reference_number=instance.purchase_number,
                    description=f"Purchase Order #{instance.purchase_number} received"
                )
                
                ledger.total_credit += instance.total_amount
                ledger.balance += instance.total_amount # Positive balance = We owe them
                ledger.save()