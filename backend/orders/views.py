from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum
from .models import Order, OrderItem, Invoice, DailyLedger
from .serializers import OrderSerializer, OrderItemSerializer, InvoiceSerializer
from accounting.models import CustomerLedger, CustomerTransaction, CashAccount, CashTransaction
from django.http import HttpResponse
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().order_by('-created_at')
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Order.objects.all().order_by('-created_at')

        if not hasattr(user, 'userprofile'):
            return queryset.none()

        role = user.userprofile.role

        if role == 'salesman':
            if hasattr(user, 'salesman'):
                queryset = queryset.filter(salesman=user.salesman)

        elif role == 'customer':
            if hasattr(user, 'customer_profile'):
                queryset = queryset.filter(customer=user.customer_profile)
            else:
                return queryset.none()

        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')

        valid_statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'invoiced']

        if new_status not in valid_statuses:
            return Response({'error': f'Invalid status. Choices: {valid_statuses}'},
                            status=status.HTTP_400_BAD_REQUEST)

        if order.status == 'pending' and new_status in ['processing', 'shipped', 'delivered', 'invoiced']:
            if not hasattr(order, 'invoice'):
                self._generate_invoice(order)

        order.status = new_status

        if new_status == 'delivered':
            order.delivered_date = timezone.now().date()

        order.save()
        return Response({'status': 'success', 'new_status': order.status})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        order = self.get_object()

        if order.status in ['delivered', 'shipped']:
            return Response({'error': 'Cannot cancel an order that has already shipped or been delivered.'},
                            status=status.HTTP_400_BAD_REQUEST)

        order.status = 'cancelled'
        order.save()
        return Response({'status': 'Order cancelled'})

    def _generate_invoice(self, order):
        from accounting.models import CashAccount

        with transaction.atomic():
            due_date = timezone.now().date() + timezone.timedelta(days=30)

            is_cash = order.payment_type == 'cash'
            paid_amount = order.total_amount if is_cash else 0
            payment_status = 'paid' if is_cash else 'unpaid'

            invoice = Invoice.objects.create(
                order=order,
                customer=order.customer,
                total_amount=order.total_amount,
                subtotal=order.total_amount,
                paid_amount=paid_amount,
                payment_status=payment_status,
                due_date=due_date
            )

            # 🔥 CASH SALE (FIXED)
            if is_cash:
                from accounting.models import CashTransaction
                cash_acc, _ = CashAccount.objects.get_or_create(name="Main Cash")
                CashTransaction.objects.create(
                    account=cash_acc,
                    transaction_type='debit',  # Money in
                    category='sale',
                    amount=order.total_amount,
                    reference_number=invoice.invoice_number,
                    notes=f"Cash sale for Order #{order.order_number}"
                )
                # Update totals
                cash_acc.total_debit += order.total_amount
                cash_acc.balance = cash_acc.total_debit - cash_acc.total_credit
                cash_acc.save()

                # ❌ DO NOTHING with CustomerLedger
                return

            # ✅ CREDIT SALE
            ledger, _ = CustomerLedger.objects.get_or_create(customer=order.customer)

            CustomerTransaction.objects.create(
                ledger=ledger,
                transaction_type='debit',
                amount=order.total_amount,
                reference_number=invoice.invoice_number,
                description=f"Invoice for Order #{order.order_number}"
            )

            ledger.total_debit += order.total_amount
            ledger.balance += order.total_amount
            ledger.save()

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        order = self.get_object()

        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Order_{order.order_number}.pdf"'

        doc = SimpleDocTemplate(response, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()

        elements.append(Paragraph(f"Invoice for Order: {order.order_number}", styles['Title']))
        elements.append(Spacer(1, 12))

        customer_name = order.customer.name if order.customer else 'N/A'
        elements.append(Paragraph(f"<b>Customer:</b> {customer_name}", styles['Normal']))
        elements.append(Paragraph(f"<b>Date:</b> {order.created_at.strftime('%B %d, %Y')}", styles['Normal']))
        elements.append(Paragraph(f"<b>Payment Terms:</b> {order.get_payment_type_display()}", styles['Normal']))
        elements.append(Paragraph(f"<b>Status:</b> {order.status.upper()}", styles['Normal']))
        elements.append(Spacer(1, 20))

        data = [['Product', 'Quantity', 'Unit Price', 'Total']]

        subtotal = 0
        for item in order.items.all():
            line_total = item.quantity * item.price
            subtotal += line_total
            data.append([
                item.product.name,
                str(item.quantity),
                f"${item.price}",
                f"${line_total}"
            ])

        if order.discount and order.discount > 0:
            data.append(['', '', 'SUBTOTAL:', f"${subtotal}"])
            data.append(['', '', 'DISCOUNT:', f"-${order.discount}"])

        data.append(['', '', 'GRAND TOTAL:', f"${order.total_amount}"])

        t = Table(data, colWidths=[200, 80, 100, 100])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (0, 1), (0, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -2), colors.beige),
            ('GRID', (0, 0), (-1, -2), 1, colors.black),
            ('LINEABOVE', (2, -1), (3, -1), 2, colors.black),
        ]))

        elements.append(t)
        doc.build(elements)
        return response


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Invoice.objects.all().order_by('-created_at')
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Invoice.objects.all().order_by('-created_at')
        payment_status = self.request.query_params.get('payment_status')

        if payment_status:
            queryset = queryset.filter(payment_status=payment_status)

        return queryset

    @action(detail=False, methods=['get'])
    def daily_tally(self, request):
        today = timezone.now().date()

        orders_today = Order.objects.filter(created_at__date=today)

        cash_total = orders_today.filter(payment_type='cash').aggregate(Sum('total_amount'))['total_amount__sum'] or 0.00
        credit_total = orders_today.filter(payment_type='credit').aggregate(Sum('total_amount'))['total_amount__sum'] or 0.00

        ledger, _ = DailyLedger.objects.get_or_create(date=today)
        ledger.total_cash = cash_total
        ledger.total_credit = credit_total
        ledger.save()

        return Response({
            'date': today,
            'cash': cash_total,
            'credit': credit_total,
            'total': float(cash_total) + float(credit_total)
        })

    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        invoice = self.get_object()
        amount_str = request.data.get('amount')
        notes = request.data.get('notes', '')

        try:
            with transaction.atomic():
                amount = float(amount_str)
                balance_due = invoice.get_balance_due()

                if amount <= 0:
                    return Response({'error': 'Amount must be positive'},
                                    status=status.HTTP_400_BAD_REQUEST)

                if amount > balance_due:
                    return Response({'error': f'Amount exceeds balance due ({balance_due})'},
                                    status=status.HTTP_400_BAD_REQUEST)

                from decimal import Decimal
                amount_decimal = Decimal(str(amount))

                invoice.paid_amount += amount_decimal

                if invoice.paid_amount >= invoice.total_amount:
                    invoice.payment_status = 'paid'
                elif invoice.paid_amount > 0:
                    invoice.payment_status = 'partially_paid'

                invoice.save()

                ledger, _ = CustomerLedger.objects.get_or_create(customer=invoice.customer)

                CustomerTransaction.objects.create(
                    ledger=ledger,
                    transaction_type='credit',
                    amount=amount_decimal,
                    reference_number=invoice.invoice_number,
                    description=f"Payment for Invoice #{invoice.invoice_number}",
                    notes=notes
                )

                ledger.total_credit += amount_decimal
                ledger.balance -= amount_decimal
                ledger.save()

                return Response({
                    'status': 'success',
                    'paid_amount': invoice.paid_amount,
                    'new_balance': invoice.get_balance_due(),
                    'payment_status': invoice.payment_status
                })

        except:
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)


class OrderItemViewSet(viewsets.ModelViewSet):
    queryset = OrderItem.objects.all()
    serializer_class = OrderItemSerializer
    permission_classes = [IsAuthenticated]