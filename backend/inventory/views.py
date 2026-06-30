from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone
from .models import Category, Product, Inventory, InventoryTransaction, Vendor, Purchase, PurchaseItem
from .serializers import (
    CategorySerializer, ProductSerializer, InventorySerializer,
    InventoryTransactionSerializer, VendorSerializer,
    PurchaseSerializer, PurchaseItemSerializer
)
from accounting.models import VendorLedger, VendorTransaction
from decimal import Decimal
from rest_framework.decorators import (
    action
)

from rest_framework.response import (
    Response
)

from inventory.ocr.service import (
    process_purchase_invoice
)


# ... (CategoryViewSet and VendorViewSet remain the same) ...
class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Vendor.objects.all()
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        return queryset

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Product.objects.all()
        category = self.request.query_params.get('category')
        vendor = self.request.query_params.get('vendor')
        search = self.request.query_params.get('search')

        if category:
            queryset = queryset.filter(category_id=category)
        if vendor:
            queryset = queryset.filter(vendor_id=vendor)
        if search:
            queryset = queryset.filter(name__icontains=search)
        return queryset

    def create(self, request, *args, **kwargs):
        """Create product and initialize inventory with optional starting stock"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            with transaction.atomic():
                product = serializer.save()
                
                # Check for initial stock in the request
                initial_stock = int(request.data.get('initial_stock', 0))

                # Initialize Inventory
                Inventory.objects.create(
                    product=product,
                    stock_quantity=initial_stock
                )

                # If stock was added, log it in the transaction history
                if initial_stock > 0:
                    InventoryTransaction.objects.create(
                        product=product,
                        transaction_type='adjustment', # Classified as initial adjustment
                        quantity=initial_stock,
                        notes='Initial stock set upon product creation',
                        created_by=request.user.username if request.user else 'System'
                    )
                
                headers = self.get_success_headers(serializer.data)
                return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

# ... (InventoryViewSet and PurchaseViewSet remain the same as previous steps) ...
# Be sure to include the rest of the file I provided in previous steps for these viewsets
class InventoryViewSet(viewsets.ModelViewSet):
    queryset = Inventory.objects.all()
    serializer_class = InventorySerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'])
    def adjust_stock(self, request, pk=None):
        inventory = self.get_object()
        quantity = request.data.get('quantity', 0)
        notes = request.data.get('notes', '')

        try:
            quantity = int(quantity)
            if quantity == 0:
                raise ValueError("Quantity cannot be zero")

            with transaction.atomic():
                inventory.stock_quantity += quantity
                if inventory.stock_quantity < 0:
                     return Response({'error': 'Insufficient stock'}, status=status.HTTP_400_BAD_REQUEST)
                inventory.save()

                InventoryTransaction.objects.create(
                    product=inventory.product,
                    transaction_type='adjustment',
                    quantity=quantity,
                    notes=notes,
                    created_by=request.user.username
                )

            return Response({'status': 'success', 'new_quantity': inventory.stock_quantity})
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class PurchaseViewSet(viewsets.ModelViewSet):
    queryset = Purchase.objects.all().order_by('-created_at')
    serializer_class = PurchaseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        vendor = self.request.query_params.get('vendor')
        status_filter = self.request.query_params.get('status')
        if vendor:
            queryset = queryset.filter(vendor_id=vendor)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset

    # REMOVED the custom create() method. 
    
    @action(
        detail=False,
        methods=["post"],
        url_path="ocr"
    )
    def ocr(self, request):

        try:

            uploaded = (
                request.FILES.get(
                    "invoice"
                )
            )

            if not uploaded:

                return Response(
                    {
                        "error":
                        "invoice required"
                    },
                    status=400
                )

            data = (
                process_purchase_invoice(
                    uploaded
                )
            )

            return Response(
                data
            )

        except Exception as e:

            return Response(
                {
                    "error":
                    str(e)
                },
                status=500
            )


    # Our updated PurchaseSerializer handles the atomic transaction and nested item creation perfectly now!

    @action(detail=True, methods=['post'])
    def receive_items(self, request, pk=None):
        purchase = self.get_object()
        items_data = request.data.get('items', [])

        try:
            with transaction.atomic():
                # 1. Initialize as a Decimal instead of an integer 0
                total_received_value = Decimal('0.00') 

                for item_data in items_data:
                    item_id = item_data.get('id')
                    received_qty = int(item_data.get('received_quantity', 0))

                    if received_qty > 0:
                        item = PurchaseItem.objects.get(id=item_id, purchase=purchase)
                        item.received_quantity += received_qty
                        item.save()

                        # Update Inventory
                        inventory = Inventory.objects.get(product=item.product)
                        inventory.stock_quantity += received_qty
                        inventory.last_restocked = timezone.now()
                        inventory.save()

                        # Log Transaction
                        InventoryTransaction.objects.create(
                            product=item.product,
                            transaction_type='purchase',
                            quantity=received_qty,
                            reference_number=purchase.purchase_number,
                            created_by=request.user.username
                        )

                        # 2. REMOVE the float() wrapper. 
                        # item.unit_price is already a Decimal, and Decimal * int works perfectly.
                        total_received_value += received_qty * item.unit_price

                # Accounting Integration
                if total_received_value > Decimal('0.00'): # 3. Compare against Decimal
                    ledger, _ = VendorLedger.objects.get_or_create(vendor=purchase.vendor)
                    VendorTransaction.objects.create(
                        ledger=ledger,
                        transaction_type='credit',
                        amount=total_received_value,
                        reference_number=purchase.purchase_number,
                        description=f"Received items for PO {purchase.purchase_number}"
                    )
                    ledger.total_credit += total_received_value
                    ledger.balance += total_received_value
                    ledger.save()

                all_received = all(i.received_quantity >= i.quantity for i in purchase.items.all())
                purchase.status = 'received' if all_received else 'partially_received'
                purchase.save()

                return Response({'status': 'success'})

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            
class InventoryTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = InventoryTransaction.objects.all().order_by('-created_at')
    serializer_class = InventoryTransactionSerializer
    permission_classes = [IsAuthenticated]