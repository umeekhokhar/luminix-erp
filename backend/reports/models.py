from django.db import models

class ProfitReport(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Snapshot Data
    stock_value = models.DecimalField(max_digits=15, decimal_places=2)
    cash_balance = models.DecimalField(max_digits=15, decimal_places=2)
    receivables = models.DecimalField(max_digits=15, decimal_places=2)
    payables = models.DecimalField(max_digits=15, decimal_places=2)
    expenses_total = models.DecimalField(max_digits=15, decimal_places=2)
    
    # Results
    working_capital = models.DecimalField(max_digits=15, decimal_places=2)
    net_profit_loss = models.DecimalField(max_digits=15, decimal_places=2)
    
    # Metadata
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']