from django.db.models import Sum
from inventory.models import Inventory
from accounting.models import (
    CashAccount,
    CustomerLedger,
    VendorLedger,
    ExpenseTransaction
)
from .models import ProfitReport
from decimal import Decimal


def calculate_working_capital_snapshot():
    # --- 1. STOCK VALUE ---
    stock_value = Decimal('0.00')
    inventory_items = Inventory.objects.select_related('product').all()

    for item in inventory_items:
        cost = item.product.cost_price or Decimal('0.00')
        stock_value += Decimal(item.stock_quantity) * cost

    # --- 2. CASH ---
    cash_balance = (
        CashAccount.objects.aggregate(total=Sum('balance'))['total']
        or Decimal('0.00')
    )

    # --- 3. RECEIVABLES (ONLY POSITIVE BALANCES) ---
    receivables = (
        CustomerLedger.objects.filter(balance__gt=0)
        .aggregate(total=Sum('balance'))['total']
        or Decimal('0.00')
    )

    # --- 4. CUSTOMER PREPAIDS (NEGATIVE BALANCES) ---
    customer_prepaids = (
        CustomerLedger.objects.filter(balance__lt=0)
        .aggregate(total=Sum('balance'))['total']
        or Decimal('0.00')
    )

    total_credit_debt = abs(customer_prepaids)

    # --- 5. PAYABLES (FORCE POSITIVE) ---
    payables = (
        VendorLedger.objects.aggregate(total=Sum('balance'))['total']
        or Decimal('0.00')
    )
    payables = abs(payables)

    # --- 6. UNPROCESSED EXPENSES ---
    unprocessed_expenses = ExpenseTransaction.objects.filter(is_processed=False)

    expenses_total = (
        unprocessed_expenses.aggregate(total=Sum('amount'))['total']
        or Decimal('0.00')
    )

    # --- 7. WORKING CAPITAL ---
    # Assets: Stock + Cash + Receivables
    total_assets = stock_value + cash_balance + receivables

    # Liabilities: Payables + Prepaids (Expenses are already deducted from cash)
    total_liabilities = payables + total_credit_debt

    current_wc = total_assets - total_liabilities

    # --- 8. PROFIT / LOSS (CHANGE IN WC) ---
    last_report = ProfitReport.objects.order_by('-created_at').first()

    previous_wc = (
        last_report.working_capital
        if last_report
        else Decimal('0.00')
    )

    profit_loss = current_wc - previous_wc

    # --- RETURN SNAPSHOT ---
    return {
        'stock_value': stock_value,
        'cash_balance': cash_balance,
        'receivables': receivables,
        'payables': payables,
        'expenses_total': expenses_total,
        'total_credit_debt': total_credit_debt,
        'working_capital': current_wc,
        'net_profit_loss': profit_loss,
        'expense_queryset': unprocessed_expenses
    }