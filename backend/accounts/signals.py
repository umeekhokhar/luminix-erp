from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import UserProfile
from crm.models import Customer, Salesman
import datetime

# 1. Ensure UserProfile always exists
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)

# 2. Sync UserProfile Role with CRM Data
@receiver(post_save, sender=UserProfile)
def sync_crm_profile(sender, instance, created, **kwargs):
    user = instance.user
    role = instance.role

    # AUTOMATION: Create Customer Profile
    if role == 'customer':
        if not hasattr(user, 'customer_profile'):
            Customer.objects.create(
                user=user,
                name=f"{user.first_name} {user.last_name}" or user.username,
                email=user.email,
                phone=instance.phone or "Pending",
                address=instance.address or "Pending",
                city=instance.city or "Pending",
                country=instance.country or "Pending"
            )

    # AUTOMATION: Create Salesman Profile
    elif role == 'salesman':
        if not hasattr(user, 'salesman'):
            # Generate Unique Employee ID (SLS-YEAR-ID)
            emp_id = f"SLS-{datetime.datetime.now().strftime('%Y')}-{user.id:04d}"
            Salesman.objects.create(
                user=user,
                employee_id=emp_id,
                commission_rate=5.00
            )