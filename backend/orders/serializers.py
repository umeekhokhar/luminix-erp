from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from .models import Order, OrderItem, Invoice
from inventory.models import Product, Inventory, InventoryTransaction
from accounting.models import CustomerLedger, CustomerTransaction

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())

    class Meta:
        model = OrderItem
        fields = ('id', 'order', 'product', 'product_name', 'quantity', 'price', 'created_at')
        read_only_fields = ('id', 'order', 'created_at')

class InvoiceSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='order.customer.name', read_only=True)
    balance_due = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = (
            'id', 'invoice_number', 'order', 'customer_name',
            'invoice_date', 'due_date', 'total_amount', 'paid_amount',
            'balance_due', 'payment_status', 'is_overdue', 'created_at'
        )

    def get_balance_due(self, obj):
        return obj.get_balance_due()

    def get_is_overdue(self, obj):
        return obj.is_overdue()

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    invoice = InvoiceSerializer(read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    salesman_name = serializers.CharField(source='salesman.user.get_full_name', read_only=True)
    days_outstanding = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            'id', 'order_number', 'customer', 'customer_name', 'user', 'salesman',
            'salesman_name', 'payment_type', 'total_amount', 'discount', 'status', 'expected_delivery_date',
            'delivered_date', 'days_outstanding', 'invoice', 'items', 'created_at', 'updated_at'
        )
        extra_kwargs = {'customer': {'required': False}}
        read_only_fields = ('user', 'total_amount', 'status', 'order_number')

    def get_days_outstanding(self, obj):
        return obj.get_days_outstanding()

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        provided_customer = validated_data.pop('customer', None) 
        discount_value = validated_data.pop('discount', 0.00) # Extract the discount
        
        request = self.context.get('request')
        user = request.user
        
        try:
            role = user.userprofile.role
        except:
            role = 'customer'

        if role == 'customer':
            try:
                customer = user.customer_profile
            except:
                raise serializers.ValidationError("User does not have a linked Customer Profile.")
            initial_status = 'pending'
            discount_value = 0.00 # Force 0 discount for customers
        else:
            customer = provided_customer
            if not customer:
                 raise serializers.ValidationError({"customer": "This field is required for Admins."})
            initial_status = 'invoiced'

        with transaction.atomic():
            subtotal = Decimal('0.00')
            for item_data in items_data:
                product = item_data['product']
                qty = item_data['quantity']
                price = Decimal(str(item_data['price']))
                
                try:
                    inventory = Inventory.objects.get(product=product)
                    if inventory.stock_quantity < qty:
                        raise serializers.ValidationError(
                            f"Insufficient stock for '{product.name}'. Available: {inventory.stock_quantity}"
                        )
                except Inventory.DoesNotExist:
                    raise serializers.ValidationError(f"Inventory missing for '{product.name}'")
                
                subtotal += (Decimal(str(qty)) * price)

            # Apply the discount to get the final total amount
            discount_decimal = Decimal(str(discount_value))
            final_total = max(Decimal('0.00'), subtotal - discount_decimal)

            order = Order.objects.create(
                customer=customer,
                user=user,
                total_amount=final_total,
                discount=discount_decimal,
                status=initial_status,
                **validated_data
            )

            for item_data in items_data:
                product = item_data['product']
                qty = item_data['quantity']
                price = item_data['price']

                OrderItem.objects.create(order=order, product=product, quantity=qty, price=price)

                inventory = Inventory.objects.get(product=product)
                inventory.stock_quantity -= qty
                inventory.save()

                InventoryTransaction.objects.create(
                    product=product,
                    transaction_type='sale',
                    quantity=qty,
                    reference_number=order.order_number,
                    notes=f"Order {order.order_number}",
                    created_by=user.username
                )

            if initial_status == 'invoiced':
                # Pass the discounted final_total to the invoice generator
                self._create_invoice_and_ledger(order, final_total)

            return order

    def _create_invoice_and_ledger(self, order, amount):
        from accounting.models import CashAccount

        is_cash = order.payment_type == 'cash'
        paid_amount = amount if is_cash else 0
        payment_status = 'paid' if is_cash else 'unpaid'

        due_date = timezone.now().date() + timezone.timedelta(days=30)

        invoice = Invoice.objects.create(
            order=order,
            customer=order.customer,
            total_amount=amount,
            subtotal=amount,
            paid_amount=paid_amount,
            payment_status=payment_status,
            due_date=due_date
        )

        if is_cash:
            # ✅ Create CashTransaction for cash sale
            from accounting.models import CashTransaction
            cash_acc, _ = CashAccount.objects.get_or_create(name="Main Cash")
            CashTransaction.objects.create(
                account=cash_acc,
                transaction_type='debit',  # Money in
                category='sale',
                amount=amount,
                reference_number=invoice.invoice_number,
                notes=f"Cash sale for Order #{order.order_number}"
            )
            # Update totals
            cash_acc.total_debit += amount
            cash_acc.balance = cash_acc.total_debit - cash_acc.total_credit
            cash_acc.save()
        else:
            # ✅ Only credit affects ledger
            ledger, _ = CustomerLedger.objects.get_or_create(customer=order.customer)

            CustomerTransaction.objects.create(
                ledger=ledger,
                transaction_type='debit',
                amount=amount,
                reference_number=invoice.invoice_number,
                description=f"Auto-Invoice for Order #{order.order_number}"
            )

            ledger.total_debit += amount
            ledger.balance += amount
            ledger.save()