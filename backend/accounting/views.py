import io
from django.http import HttpResponse
from django.http import FileResponse
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction 
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from decimal import Decimal
from reportlab.pdfgen import canvas
from .models import CustomerLedger, CustomerTransaction, VendorLedger, VendorTransaction, CashAccount, CashTransaction, ExpenseAccount, ExpenseTransaction
from .serializers import (
    CustomerLedgerSerializer, 
    CustomerTransactionSerializer, 
    VendorLedgerSerializer, 
    VendorTransactionSerializer,
    CashTransactionSerializer,
    CashAccountSerializer,
    ExpenseAccountSerializer,
    ExpenseTransactionSerializer
)

class CustomerLedgerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CustomerLedger.objects.all()
    serializer_class = CustomerLedgerSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['get'], url_path='download_statement')
    def balance_details(self, request, pk=None):
        ledger = self.get_object()
        return Response({
            'customer': ledger.customer.name,
            'total_debit': ledger.total_debit,
            'total_credit': ledger.total_credit,
            'balance': ledger.balance,
            'credit_limit': ledger.credit_limit,
            'available_credit': ledger.get_available_credit(),
            'is_overdue': ledger.balance > ledger.credit_limit,
        })

    @action(detail=True, methods=['GET'], url_path='download-statement')
    def download_statement(self, request, pk=None):
        ledger = self.get_object()
        
        # Create a temporary buffer and the document template
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()

        # --- HEADER SECTION ---
        # Fallbacks for customer name just in case
        customer_name = getattr(ledger, 'customer_name', None) or getattr(ledger.customer, 'name', 'Customer')
        
        elements.append(Paragraph(f"Account Statement: {customer_name}", styles['Title']))
        elements.append(Spacer(1, 12))
        
        elements.append(Paragraph(f"<b>Total Billed (Debit):</b> ${ledger.total_debit}", styles['Normal']))
        elements.append(Paragraph(f"<b>Total Paid (Credit):</b> ${ledger.total_credit}", styles['Normal']))
        elements.append(Paragraph(f"<b>Current Balance:</b> ${ledger.balance}", styles['Heading2']))
        elements.append(Spacer(1, 20))

        # --- TRANSACTION HISTORY TABLE ---
        # Table Headers
        table_data = [['ID', 'Type', 'Ref #', 'Notes', 'Amount']]
        
        # Fetch all transactions for this ledger (oldest to newest)
        transactions = CustomerTransaction.objects.filter(ledger=ledger).order_by('id')
        
        for tx in transactions:
            table_data.append([
                str(tx.id),
                tx.transaction_type.upper(),
                tx.reference_number or '-',
                tx.notes[:20] + '...' if len(tx.notes) > 20 else tx.notes, # Truncate long notes
                f"${tx.amount:.2f}"
            ])

        # Style the table
        t = Table(table_data, colWidths=[50, 80, 100, 150, 80])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#007bff')), # Blue header
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 10),
            ('BACKGROUND', (0,1), (-1,-1), colors.beige),
            ('GRID', (0,0), (-1,-1), 1, colors.black),
        ]))
        
        elements.append(t)
        
        # Build the PDF
        doc.build(elements)
        buffer.seek(0)
        
        return FileResponse(buffer, as_attachment=True, filename=f"Statement_{ledger.id}.pdf")

from decimal import Decimal, InvalidOperation

class CustomerTransactionViewSet(viewsets.ModelViewSet):
    queryset = CustomerTransaction.objects.all()
    serializer_class = CustomerTransactionSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['POST'], url_path='add_transaction')
    def add_transaction(self, request):
        ledger_id = request.data.get('ledger_id')
        customer_id = request.data.get('customer_id') 
        amount = request.data.get('amount')
        transaction_type = request.data.get('transaction_type') # 'credit' or 'debit'
        reference_number = request.data.get('reference_number', '')
        notes = request.data.get('notes', '')

        if not amount:
            return Response({'error': 'Amount is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if transaction_type not in ['credit', 'debit', 'adjustment']:
            return Response({'error': 'Invalid transaction type.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                if ledger_id:
                    ledger = CustomerLedger.objects.select_for_update().get(id=ledger_id)
                elif customer_id:
                    ledger = CustomerLedger.objects.select_for_update().get(customer_id=customer_id)
                else:
                    return Response({'error': 'Ledger ID or Customer ID required'}, status=status.HTTP_400_BAD_REQUEST)
                
                # Determine standard description
                desc = 'Payment received' if transaction_type == 'credit' else 'Manual charge/debit'

                # Convert the amount to a strict Decimal for accurate financial math
                amount_decimal = Decimal(str(amount))

                new_transaction = CustomerTransaction.objects.create(
                    ledger=ledger,
                    transaction_type=transaction_type,
                    amount=amount_decimal,
                    reference_number=reference_number,
                    description=desc,
                    notes=notes
                )

                # Update Ledger mathematically using the Decimal
                if transaction_type == 'credit':
                    ledger.total_credit += amount_decimal
                elif transaction_type == 'debit':
                    ledger.total_debit += amount_decimal
                
                # Balance is always Total Owed (Debit) minus Total Paid (Credit)
                ledger.balance = ledger.total_debit - ledger.total_credit
                ledger.save()
                
                return Response(
                    CustomerTransactionSerializer(new_transaction).data, 
                    status=status.HTTP_201_CREATED
                )
        
        # THESE are the lines that were missing! 👇
        except CustomerLedger.DoesNotExist:
            return Response({'error': 'Ledger not found'}, status=status.HTTP_404_NOT_FOUND)
        except (ValueError, TypeError, InvalidOperation):
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

# ... (Keep your VendorLedgerViewSet and VendorTransactionViewSet exactly as they were below this!)
class VendorLedgerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VendorLedger.objects.all()
    serializer_class = VendorLedgerSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['get'])
    def payable_details(self, request, pk=None):
        ledger = self.get_object()
        return Response({
            'vendor': ledger.vendor.name,
            'total_credit': ledger.total_credit,
            'total_debit': ledger.total_debit,
            'balance': ledger.balance,
            'total_payable': ledger.balance,
        })

    @action(detail=True, methods=['GET'], url_path='download-statement')
    def download_statement(self, request, pk=None):
        ledger = self.get_object()
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()

        # Get vendor name safely
        vendor_name = getattr(ledger, 'vendor_name', None) or getattr(ledger.vendor, 'name', 'Vendor')
        
        elements.append(Paragraph(f"Vendor Statement: {vendor_name}", styles['Title']))
        elements.append(Spacer(1, 12))
        
        elements.append(Paragraph(f"<b>Total Billed (Credit):</b> ${ledger.total_credit}", styles['Normal']))
        elements.append(Paragraph(f"<b>Total Paid (Debit):</b> ${ledger.total_debit}", styles['Normal']))
        elements.append(Paragraph(f"<b>Current Balance Owed:</b> ${ledger.balance}", styles['Heading2']))
        elements.append(Spacer(1, 20))

        table_data = [['ID', 'Type', 'Ref #', 'Notes', 'Amount']]
        
        transactions = VendorTransaction.objects.filter(ledger=ledger).order_by('id')
        
        for tx in transactions:
            table_data.append([
                str(tx.id),
                tx.transaction_type.upper(),
                tx.reference_number or '-',
                tx.notes[:20] + '...' if len(tx.notes) > 20 else tx.notes,
                f"${tx.amount:.2f}"
            ])

        t = Table(table_data, colWidths=[50, 80, 100, 150, 80])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#28a745')), # Green header for vendors!
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 10),
            ('BACKGROUND', (0,1), (-1,-1), colors.beige),
            ('GRID', (0,0), (-1,-1), 1, colors.black),
        ]))
        
        elements.append(t)
        doc.build(elements)
        buffer.seek(0)
        
        return FileResponse(buffer, as_attachment=True, filename=f"Vendor_Statement_{ledger.id}.pdf")    

class VendorTransactionViewSet(viewsets.ModelViewSet):
    queryset = VendorTransaction.objects.all()
    serializer_class = VendorTransactionSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['POST'], url_path='add_transaction')
    def add_transaction(self, request):
        ledger_id = request.data.get('ledger_id')
        vendor_id = request.data.get('vendor_id') 
        amount = request.data.get('amount')
        transaction_type = request.data.get('transaction_type') # 'credit' or 'debit'
        reference_number = request.data.get('reference_number', '')
        notes = request.data.get('notes', '')

        if not amount:
            return Response({'error': 'Amount is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if transaction_type not in ['credit', 'debit', 'adjustment']:
            return Response({'error': 'Invalid transaction type.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                if ledger_id:
                    ledger = VendorLedger.objects.select_for_update().get(id=ledger_id)
                elif vendor_id:
                    ledger = VendorLedger.objects.select_for_update().get(vendor_id=vendor_id)
                else:
                    return Response({'error': 'Ledger ID or Vendor ID required'}, status=status.HTTP_400_BAD_REQUEST)
                
                # For Vendors: Credit = Bill Received, Debit = Payment Made
                desc = 'Bill/Invoice received' if transaction_type == 'credit' else 'Payment made'

                amount_decimal = Decimal(str(amount))

                new_transaction = VendorTransaction.objects.create(
                    ledger=ledger,
                    transaction_type=transaction_type,
                    amount=amount_decimal,
                    reference_number=reference_number,
                    description=desc,
                    notes=notes
                )

                if transaction_type == 'credit':
                    ledger.total_credit += amount_decimal
                elif transaction_type == 'debit':
                    ledger.total_debit += amount_decimal
                
                # Accounts Payable Balance is typically Total Credit (Owed) - Total Debit (Paid)
                ledger.balance = ledger.total_credit - ledger.total_debit
                ledger.save()
                
                return Response(
                    VendorTransactionSerializer(new_transaction).data, 
                    status=status.HTTP_201_CREATED
                )
        
        except VendorLedger.DoesNotExist:
            return Response({'error': 'Ledger not found'}, status=status.HTTP_404_NOT_FOUND)
        except (ValueError, TypeError, InvalidOperation):
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)


# Import the new models at the top!

class CashAccountViewSet(viewsets.ModelViewSet):
    queryset = CashAccount.objects.all()
    serializer_class = CashAccountSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['GET'], url_path='download-statement')
    def download_statement(self, request, pk=None):
        account = self.get_object()
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()

        elements.append(Paragraph(f"Cash Account Statement: {account.name}", styles['Title']))
        elements.append(Spacer(1, 12))
        
        elements.append(Paragraph(f"<b>Total Money In (Debit):</b> ${account.total_debit}", styles['Normal']))
        elements.append(Paragraph(f"<b>Total Money Out (Credit):</b> ${account.total_credit}", styles['Normal']))
        elements.append(Paragraph(f"<b>Available Cash Balance:</b> ${account.balance}", styles['Heading2']))
        elements.append(Spacer(1, 20))

        table_data = [['Date', 'Type', 'Category', 'Ref #', 'Amount']]
        
        transactions = CashTransaction.objects.filter(account=account).order_by('id')
        
        for tx in transactions:
            table_data.append([
                tx.date.strftime("%Y-%m-%d"),
                tx.transaction_type.upper(),
                tx.get_category_display(),
                tx.reference_number or '-',
                f"${tx.amount:.2f}"
            ])

        t = Table(table_data, colWidths=[80, 60, 130, 90, 80])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#6f42c1')), # Purple header for Cash!
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 10),
            ('BACKGROUND', (0,1), (-1,-1), colors.beige),
            ('GRID', (0,0), (-1,-1), 1, colors.black),
        ]))
        
        elements.append(t)
        doc.build(elements)
        buffer.seek(0)
        
        return FileResponse(buffer, as_attachment=True, filename=f"Cash_Statement_{account.id}.pdf")

class CashTransactionViewSet(viewsets.ModelViewSet):
    queryset = CashTransaction.objects.all()
    serializer_class = CashTransactionSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['POST'], url_path='add_transaction')
    def add_transaction(self, request):
        account_id = request.data.get('account_id')
        amount = request.data.get('amount')
        transaction_type = request.data.get('transaction_type') # 'debit' or 'credit'
        category = request.data.get('category', 'deposit')
        reference_number = request.data.get('reference_number', '')
        notes = request.data.get('notes', '')

        if not account_id or not amount or not transaction_type:
            return Response({'error': 'Account ID, amount, and type are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                account = CashAccount.objects.select_for_update().get(id=account_id)
                amount_decimal = Decimal(str(amount))

                new_tx = CashTransaction.objects.create(
                    account=account,
                    transaction_type=transaction_type,
                    category=category,
                    amount=amount_decimal,
                    reference_number=reference_number,
                    notes=notes
                )

                if transaction_type == 'debit': # Money In
                    account.total_debit += amount_decimal
                elif transaction_type == 'credit': # Money Out
                    account.total_credit += amount_decimal
                
                # Cash Balance = Money In (Debit) - Money Out (Credit)
                account.balance = account.total_debit - account.total_credit
                account.save()
                
                return Response(CashTransactionSerializer(new_tx).data, status=status.HTTP_201_CREATED)
        
        except CashAccount.DoesNotExist:
            return Response({'error': 'Cash Account not found'}, status=status.HTTP_404_NOT_FOUND)

class ExpenseAccountViewSet(viewsets.ModelViewSet):
    queryset = ExpenseAccount.objects.all()
    serializer_class = ExpenseAccountSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['GET'], url_path='download-statement')
    def download_statement(self, request, pk=None):
        account = self.get_object()
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()

        elements.append(Paragraph(f"Expense Statement: {account.name}", styles['Title']))
        elements.append(Spacer(1, 12))
        
        elements.append(Paragraph(f"<b>Total Expenses (Debit):</b> ${account.total_debit}", styles['Normal']))
        elements.append(Paragraph(f"<b>Total Refunds (Credit):</b> ${account.total_credit}", styles['Normal']))
        elements.append(Paragraph(f"<b>Net Expense Balance:</b> ${account.balance}", styles['Heading2']))
        elements.append(Spacer(1, 20))

        table_data = [['Date', 'Type', 'Ref #', 'Notes', 'Amount']]
        
        transactions = ExpenseTransaction.objects.filter(account=account).order_by('id')
        
        for tx in transactions:
            table_data.append([
                tx.date.strftime("%Y-%m-%d"),
                tx.transaction_type.upper(),
                tx.reference_number or '-',
                tx.notes[:20] + '...' if len(tx.notes) > 20 else tx.notes,
                f"${tx.amount:.2f}"
            ])

        t = Table(table_data, colWidths=[80, 80, 100, 150, 80])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#dc3545')), # Red header for Expenses
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 10),
            ('BACKGROUND', (0,1), (-1,-1), colors.beige),
            ('GRID', (0,0), (-1,-1), 1, colors.black),
        ]))
        
        elements.append(t)
        doc.build(elements)
        buffer.seek(0)
        
        return FileResponse(buffer, as_attachment=True, filename=f"Expense_Statement_{account.id}.pdf")

class ExpenseTransactionViewSet(viewsets.ModelViewSet):
    queryset = ExpenseTransaction.objects.all()
    serializer_class = ExpenseTransactionSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['POST'], url_path='add_transaction')
    def add_transaction(self, request):
        # 1. Capture the data from the frontend
        expense_acc_id = request.data.get('account_id')  # The Expense Category
        cash_acc_id = request.data.get('cash_account')  # The Wallet/Till
        amount = request.data.get('amount')
        transaction_type = request.data.get('transaction_type')
        reference_number = request.data.get('reference_number', '')
        notes = request.data.get('notes', '')

        if not all([expense_acc_id, cash_acc_id, amount]):
            return Response({'error': 'Expense Account, Cash Account, and Amount are required'}, 
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                # 2. Fetch the accounts
                expense_account = ExpenseAccount.objects.select_for_update().get(id=expense_acc_id)
                cash_account = CashAccount.objects.select_for_update().get(id=cash_acc_id)
                amount_decimal = Decimal(str(amount))

                # 3. Create the Expense Record
                new_tx = ExpenseTransaction.objects.create(
                    account=expense_account,
                    cash_account=cash_account, # <--- Link established!
                    transaction_type=transaction_type,
                    amount=amount_decimal,
                    reference_number=reference_number,
                    notes=notes
                )

                # 4. Update Expense Ledger
                if transaction_type == 'debit':
                    expense_account.total_debit += amount_decimal
                expense_account.balance = expense_account.total_debit - expense_account.total_credit
                expense_account.save()

                # 5. IMMEDIATE CASH DEDUCTION (Fixed the "Ghost Expense")
                cash_account.total_credit += amount_decimal
                cash_account.balance = cash_account.total_debit - cash_account.total_credit
                cash_account.save()

                # 6. Log a Cash Transaction for the Audit Trail
                CashTransaction.objects.create(
                    account=cash_account,
                    transaction_type='credit',
                    category='expense',
                    amount=amount_decimal,
                    reference_number=reference_number,
                    notes=f"Expense: {expense_account.name}"
                )

                return Response(ExpenseTransactionSerializer(new_tx).data, status=status.HTTP_201_CREATED)

        except (ExpenseAccount.DoesNotExist, CashAccount.DoesNotExist):
            return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)