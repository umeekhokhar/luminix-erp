from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.models import UserProfile
from accounts.permissions import IsCustomer, IsSalesmanOrAdmin
from crm.models import Customer
from .models import CustomerLedger
from .serializers import CustomerLedgerSerializer


class CustomerBalanceViewSet(viewsets.ViewSet):
    """Customer can only see their own balance"""
    permission_classes = [IsAuthenticated, IsCustomer]
    
    @action(detail=False, methods=['get'])
    def my_balance(self, request):
        """Get customer's own balance"""
        try:
            profile = UserProfile.objects.get(user=request.user)
            if profile.role != 'customer':
                return Response(
                    {'error': 'Only customers can access this endpoint'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Find customer linked to this user
            try:
                customer = Customer.objects.get(user=request.user)
            except Customer.DoesNotExist:
                return Response(
                    {'error': 'Customer profile not found. Please contact administrator.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get customer ledger
            try:
                ledger = CustomerLedger.objects.get(customer=customer)
                serializer = CustomerLedgerSerializer(ledger)
                return Response({
                    'customer_name': customer.name,
                    'balance': float(ledger.balance),
                    'total_debit': float(ledger.total_debit),
                    'total_credit': float(ledger.total_credit),
                    'credit_limit': float(ledger.credit_limit),
                    'available_credit': float(ledger.get_available_credit()),
                    'is_overdue': ledger.balance > ledger.credit_limit,
                })
            except CustomerLedger.DoesNotExist:
                return Response({
                    'customer_name': customer.name,
                    'balance': 0.00,
                    'total_debit': 0.00,
                    'total_credit': 0.00,
                    'credit_limit': 0.00,
                    'available_credit': 0.00,
                    'is_overdue': False,
                    'message': 'No transactions yet'
                })
        except UserProfile.DoesNotExist:
            return Response(
                {'error': 'User profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
