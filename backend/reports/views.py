from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import FileResponse
from django.db.models import Sum  # 👈 FIX 1: Imported Sum so Django can do math
import io
from django.db import transaction
from .models import ProfitReport
from .serializers import ProfitReportSerializer
from .logic import calculate_working_capital_snapshot
from .utils import generate_profit_pdf

# 👈 FIX 2: Imported CashAccount alongside ExpenseAccount
from accounting.models import ExpenseAccount, CashAccount 

class ProfitReportViewSet(viewsets.ModelViewSet):
    queryset = ProfitReport.objects.all()
    serializer_class = ProfitReportSerializer

    @action(detail=False, methods=['get'])
    def preview(self, request):
        """Calculates current stats without saving or wiping expenses."""
        data = calculate_working_capital_snapshot()
        # Remove the queryset from the response, just send the numbers
        data.pop('expense_queryset', None)
        return Response(data)

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        report = self.get_object()
        buffer = io.BytesIO()
        
        generate_profit_pdf(buffer, report)
        
        buffer.seek(0)
        filename = f"Luminix_Report_{report.created_at.strftime('%Y%m%d')}.pdf"
        
        return FileResponse(buffer, as_attachment=True, filename=filename)

    @action(detail=False, methods=['post'])
    def finalize(self, request):
        """Calculates, Saves to Database, and WIPES current expenses."""
        
        with transaction.atomic():
            snapshot = calculate_working_capital_snapshot()
            
            # 1. Save the snapshot history
            report = ProfitReport.objects.create(
                stock_value=snapshot['stock_value'],
                cash_balance=snapshot['cash_balance'],
                receivables=snapshot['receivables'],
                payables=snapshot['payables'],
                expenses_total=snapshot['expenses_total'],
                working_capital=snapshot['working_capital'],
                net_profit_loss=snapshot['net_profit_loss'],
                notes=request.data.get('notes', '')
            )

            # 2. MARK AS PROCESSED
            # We NO LONGER loop through and deduct cash here!
            snapshot['expense_queryset'].update(is_processed=True)

            # 3. RESET EXPENSE LEDGERS
            # Clears the temporary balance for the next period
            ExpenseAccount.objects.all().update(
                total_debit=0, total_credit=0, balance=0
            )

            return Response(self.get_serializer(report).data, status=status.HTTP_201_CREATED)