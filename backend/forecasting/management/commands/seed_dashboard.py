"""
Management command: seed_dashboard
Usage:  python manage.py seed_dashboard

Seeds realistic demo data for:
  - 10 Customers  (with User accounts)
  -  2 Salesmen
  - 30 Orders     (mix of today + last 30 days, statuses: delivered/invoiced)
  - 30 Invoices   (paid / partially_paid / unpaid)
  - CustomerLedger entries
  - CustomerTransaction entries
  - VendorLedger entries
  - DailyLedger entries
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import date, timedelta, datetime
from decimal import Decimal
import random

from crm.models import Customer, Salesman
from inventory.models import Product, Inventory, Vendor
from orders.models import Order, OrderItem, Invoice, DailyLedger
from accounting.models import (
    CustomerLedger, CustomerTransaction,
    VendorLedger, VendorTransaction, CashAccount, CashTransaction
)


random.seed(77)


CUSTOMERS_DATA = [
    ('Ahmed Traders',       'ahmed@ahmedtraders.pk',     '+92-300-1234001', '12 Hall Road, Lahore',          'Lahore',   'Ahmed Traders Pvt Ltd'),
    ('Karim General Store', 'karim@karimstore.pk',       '+92-321-1234002', 'Shop 4, Anarkali Bazar',        'Lahore',   'Karim & Sons'),
    ('Fatima Departmental', 'fatima@fatimadept.pk',      '+92-333-1234003', 'Plot 9, Gulshan-e-Iqbal',       'Karachi',  'Fatima Supermart'),
    ('Raza Beverages',      'raza@razabev.pk',           '+92-345-1234004', '78 Main Boulevard, DHA',        'Lahore',   'Raza Beverages Co.'),
    ('Malik Cold Store',    'malik@malikcold.pk',        '+92-300-1234005', 'Sector G-11, Markaz',           'Islamabad','Malik Cold Storage'),
    ('Shahzaib Retail',     'shahzaib@shahzaibretail.pk','+92-323-1234006', '22 Johar Town, Phase 1',        'Lahore',   'Shahzaib Retail Pvt'),
    ('Umar Distributors',   'umar@umardist.pk',          '+92-311-1234007', 'Clifton Block 5',               'Karachi',  'Umar Distributors'),
    ('Nadia Mini Mart',     'nadia@nadiamart.pk',        '+92-333-1234008', 'F-7 Markaz Shop 3',             'Islamabad','Nadia Mini Mart'),
    ('Bilal Wholesale',     'bilal@bilalwhole.pk',       '+92-300-1234009', 'Akbari Mandi Gate 2',           'Lahore',   'Bilal Wholesale'),
    ('Sana Cash & Carry',   'sana@sanacash.pk',          '+92-321-1234010', 'Plot 45, Korangi Industrial',   'Karachi',  'Sana Cash & Carry'),
]

SALESMEN_DATA = [
    ('salesman_ali',    'Ali',    'Hassan',   'SM-001', '5.00', 'Lahore & Central Punjab'),
    ('salesman_bilal2', 'Bilal',  'Qureshi',  'SM-002', '4.50', 'Karachi & Sindh'),
]


class Command(BaseCommand):
    help = 'Seed demo Orders, Invoices, Customers and Ledger data for the dashboard'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING('Seeding dashboard demo data…'))

        today = timezone.now().date()

        # ── Customers ────────────────────────────────────────────────────────
        customers = []
        for i, (name, email, phone, address, city, company) in enumerate(CUSTOMERS_DATA):
            # Create a Django User for each customer
            uname = email.split('@')[0]
            user, _ = User.objects.get_or_create(
                username=uname,
                defaults={'first_name': name.split()[0], 'last_name': name.split()[-1],
                          'email': email, 'is_active': True}
            )
            if _:
                user.set_password('demo1234')
                user.save()

            cust, _ = Customer.objects.get_or_create(
                email=email,
                defaults={'user': user, 'name': name, 'phone': phone,
                          'address': address, 'city': city,
                          'country': 'Pakistan', 'company': company}
            )
            customers.append(cust)

            # Ensure CustomerLedger exists
            CustomerLedger.objects.get_or_create(
                customer=cust,
                defaults={'credit_limit': Decimal(str(random.choice([50000, 100000, 150000])))}
            )
        self.stdout.write(f'  ✓ {len(customers)} customers')

        # ── Salesmen ─────────────────────────────────────────────────────────
        salesmen = []
        for uname, first, last, emp_id, comm, territory in SALESMEN_DATA:
            user, _ = User.objects.get_or_create(
                username=uname,
                defaults={'first_name': first, 'last_name': last,
                          'email': f'{uname}@luminix.pk', 'is_active': True}
            )
            if _:
                user.set_password('demo1234')
                user.save()
            sm, _ = Salesman.objects.get_or_create(
                employee_id=emp_id,
                defaults={'user': user, 'commission_rate': Decimal(comm),
                          'territory': territory}
            )
            salesmen.append(sm)
        self.stdout.write(f'  ✓ {len(salesmen)} salesmen')

        # ── Products (pick from seeded beverages) ────────────────────────────
        products = list(Product.objects.filter(
            sale_records__isnull=False
        ).distinct().select_related('inventory')[:50])

        if not products:
            self.stdout.write(self.style.WARNING(
                '  ⚠ No products found — run seed_forecasting first'))
            return

        # ── Cash account ─────────────────────────────────────────────────────
        cash_acc, _ = CashAccount.objects.get_or_create(
            name='Main Cash Account',
            defaults={'balance': Decimal('0')}
        )

        # ── Vendor ledgers ───────────────────────────────────────────────────
        for vendor in Vendor.objects.all():
            vl, _ = VendorLedger.objects.get_or_create(vendor=vendor)

        # ── Orders & Invoices ─────────────────────────────────────────────────
        admin_user = User.objects.filter(is_superuser=True).first()

        # Delete old demo orders to keep things clean on re-run
        Order.objects.filter(order_number__startswith='ORD-').delete()

        orders_created = 0
        for day_offset in range(29, -1, -1):   # last 30 days including today
            order_date = today - timedelta(days=day_offset)
            # 1–4 orders per day
            n_orders = random.randint(1, 4) if day_offset > 0 else random.randint(2, 5)

            for _ in range(n_orders):
                customer  = random.choice(customers)
                salesman  = random.choice(salesmen)
                pay_type  = random.choice(['cash', 'cash', 'credit'])
                n_items   = random.randint(1, 5)
                order_products = random.sample(products, min(n_items, len(products)))

                # Build items & total
                items_data = []
                total = Decimal('0')
                for prod in order_products:
                    qty   = random.randint(5, 50)
                    price = prod.price
                    total += price * qty
                    items_data.append((prod, qty, price))

                discount = total * Decimal(str(random.choice([0, 0, 0, 0.02, 0.05])))
                total   -= discount

                # Status: older orders are delivered, recent may vary
                if day_offset > 3:
                    status = random.choice(['delivered', 'delivered', 'invoiced'])
                elif day_offset > 0:
                    status = random.choice(['delivered', 'invoiced', 'processing'])
                else:
                    status = random.choice(['pending', 'processing', 'delivered'])

                # Create order with explicit date
                order = Order(
                    customer=customer,
                    salesman=salesman,
                    user=admin_user,
                    payment_type=pay_type,
                    total_amount=total,
                    status=status,
                    discount=discount,
                    expected_delivery_date=order_date + timedelta(days=2),
                )
                if status == 'delivered':
                    order.delivered_date = order_date + timedelta(days=random.randint(1, 2))
                order.save()

                # Backdate order_date & created_at
                Order.objects.filter(pk=order.pk).update(
                    order_date=datetime.combine(order_date, datetime.min.time()).replace(tzinfo=timezone.utc),
                    created_at=datetime.combine(order_date, datetime.min.time()).replace(tzinfo=timezone.utc),
                )

                # Order items
                for prod, qty, price in items_data:
                    OrderItem.objects.create(order=order, product=prod,
                                             quantity=qty, price=price)
                    # Deduct stock
                    inv = getattr(prod, 'inventory', None)
                    if inv:
                        inv.stock_quantity = max(0, inv.stock_quantity - qty)
                        inv.save()

                # Invoice for invoiced/delivered orders
                if status in ('invoiced', 'delivered'):
                    due_date = order_date + timedelta(days=30)
                    paid_frac = random.choice([1.0, 1.0, 1.0, 0.5, 0.0])
                    paid_amt  = (total * Decimal(str(paid_frac))).quantize(Decimal('0.01'))
                    pay_status = ('paid' if paid_frac == 1.0
                                  else 'partially_paid' if paid_frac > 0
                                  else 'unpaid')

                    inv_obj = Invoice(
                        order=order,
                        customer=customer,
                        due_date=due_date,
                        subtotal=total + discount,
                        tax_amount=Decimal('0'),
                        total_amount=total,
                        paid_amount=paid_amt,
                        payment_status=pay_status,
                    )
                    inv_obj.save()
                    Invoice.objects.filter(pk=inv_obj.pk).update(
                        invoice_date=datetime.combine(order_date, datetime.min.time()).replace(tzinfo=timezone.utc),
                        created_at=datetime.combine(order_date, datetime.min.time()).replace(tzinfo=timezone.utc),
                    )

                    # CustomerLedger transaction
                    ledger = CustomerLedger.objects.get(customer=customer)
                    CustomerTransaction.objects.create(
                        ledger=ledger,
                        transaction_type='debit',
                        amount=total,
                        reference_number=order.order_number,
                        description=f'Sale – {order.order_number}',
                    )
                    ledger.total_debit += total
                    ledger.balance     -= total

                    if paid_amt > 0:
                        CustomerTransaction.objects.create(
                            ledger=ledger,
                            transaction_type='credit',
                            amount=paid_amt,
                            reference_number=inv_obj.invoice_number,
                            description=f'Payment received – {inv_obj.invoice_number}',
                        )
                        ledger.total_credit += paid_amt
                        ledger.balance      += paid_amt

                        # CashAccount credit
                        cash_acc.total_debit += paid_amt
                        cash_acc.balance     += paid_amt

                    ledger.save()

                orders_created += 1

        cash_acc.save()
        self.stdout.write(f'  ✓ {orders_created} orders created')

        # ── DailyLedger (last 30 days) ────────────────────────────────────────
        for day_offset in range(29, -1, -1):
            d = today - timedelta(days=day_offset)
            day_orders = Order.objects.filter(
                order_date__date=d,
                status__in=['invoiced', 'delivered']
            )
            total_cash   = sum(float(o.total_amount) for o in day_orders if o.payment_type == 'cash')
            total_credit = sum(float(o.total_amount) for o in day_orders if o.payment_type == 'credit')
            DailyLedger.objects.update_or_create(
                date=d,
                defaults={
                    'total_cash':   Decimal(str(total_cash)),
                    'total_credit': Decimal(str(total_credit)),
                }
            )

        self.stdout.write(f'  ✓ DailyLedger entries created')
        self.stdout.write(self.style.SUCCESS(
            '\nDone. Dashboard will now show live revenue, orders and invoice data.'
        ))
