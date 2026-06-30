from django.db import models
from django.contrib.auth.models import User
from crm.models import Customer
from inventory.models import Vendor


class CustomerLedger(models.Model):
    customer = models.OneToOneField(Customer, on_delete=models.CASCADE, related_name='ledger')
    total_credit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_debit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, default=10000)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.customer.name} - Balance: {self.balance}'

    def get_available_credit(self):
        return self.credit_limit - abs(self.balance) if self.balance < 0 else self.credit_limit


class CustomerTransaction(models.Model):
    TRANSACTION_TYPE_CHOICES = [
        ('debit', 'Debit (Sale)'),
        ('credit', 'Credit (Payment)'),
        ('adjustment', 'Adjustment'),
    ]

    ledger = models.ForeignKey(CustomerLedger, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reference_number = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    transaction_date = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f'{self.ledger.customer.name} - {self.transaction_type} - {self.amount}'

    class Meta:
        ordering = ['-transaction_date']


class VendorLedger(models.Model):
    vendor = models.OneToOneField(Vendor, on_delete=models.CASCADE, related_name='ledger')
    total_credit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_debit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.vendor.name} - Balance: {self.balance}'


class VendorTransaction(models.Model):
    TRANSACTION_TYPE_CHOICES = [
        ('credit', 'Credit (Purchase)'),
        ('debit', 'Debit (Payment)'),
        ('adjustment', 'Adjustment'),
    ]

    ledger = models.ForeignKey(VendorLedger, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reference_number = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    transaction_date = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f'{self.ledger.vendor.name} - {self.transaction_type} - {self.amount}'

    class Meta:
        ordering = ['-transaction_date']


# --- FIXED: Merged the two CashAccount classes into one ---
class CashAccount(models.Model):
    name = models.CharField(max_length=100, unique=True)
    total_debit = models.DecimalField(max_digits=12, decimal_places=2, default=0.00) # Money In
    total_credit = models.DecimalField(max_digits=12, decimal_places=2, default=0.00) # Money Out
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - Balance: ${self.balance}"
# ----------------------------------------------------------


class CashTransaction(models.Model):
    CATEGORY_CHOICES = [
        ('deposit', 'Manual Deposit / Report'),
        ('vendor_payment', 'Vendor Payment'),
        ('personal_expense', 'Personal Expense')
    ]

    account = models.ForeignKey(CashAccount, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=10, choices=[('debit', 'Debit (In)'), ('credit', 'Credit (Out)')])
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='deposit')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reference_number = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.transaction_type.upper()} - ${self.amount} - {self.category}"


class ExpenseAccount(models.Model):
    name = models.CharField(max_length=100) # e.g., "Office Supplies", "Rent", "Travel"
    description = models.TextField(blank=True, null=True)
    total_debit = models.DecimalField(max_digits=12, decimal_places=2, default=0.00) # Total Expenses Incurred
    total_credit = models.DecimalField(max_digits=12, decimal_places=2, default=0.00) # Refunds / Reversals
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - Balance: ${self.balance}"


class ExpenseTransaction(models.Model):
    account = models.ForeignKey(ExpenseAccount, on_delete=models.CASCADE, related_name='transactions')
    
    # --- NEW: Link the expense to a specific Cash Account ---
    cash_account = models.ForeignKey(
        CashAccount, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='paid_expenses'
    )
    # --------------------------------------------------------

    transaction_type = models.CharField(max_length=10, choices=[('debit', 'Debit (Expense)'), ('credit', 'Credit (Refund)')])
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reference_number = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    date = models.DateTimeField(auto_now_add=True)
    is_processed = models.BooleanField(default=False)
    

    def __str__(self):
        return f"{self.transaction_type.upper()} - ${self.amount} - {self.account.name}"

    class Meta:
        ordering = ['-date']