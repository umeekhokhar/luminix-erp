from rest_framework import serializers
from .models import Category, Product, Inventory, Vendor, Purchase, PurchaseItem, InventoryTransaction

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name', 'description', 'created_at', 'updated_at')

class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ('id', 'name', 'email', 'phone', 'address', 'city', 'country', 'payment_terms', 'is_active', 'created_at', 'updated_at')

class InventoryTransactionSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = InventoryTransaction
        fields = ('id', 'product', 'product_name', 'transaction_type', 'quantity', 'reference_number', 'notes', 'created_at', 'created_by')

class InventorySerializer(serializers.ModelSerializer):
    transactions = InventoryTransactionSerializer(many=True, read_only=True)
    # ADDED: Flattened fields for easy frontend display
    product_name = serializers.CharField(source='product.name', read_only=True)
    sku = serializers.CharField(source='product.sku', read_only=True)

    class Meta:
        model = Inventory
        fields = ('id', 'product', 'product_name', 'sku', 'stock_quantity', 'reorder_level', 'last_restocked', 'transactions', 'created_at', 'updated_at')

class ProductSerializer(serializers.ModelSerializer):
    inventory = InventorySerializer(read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)

    class Meta:
        model = Product
        fields = ('id', 'name', 'description', 'category', 'category_name', 'price', 'sku', 'vendor', 'vendor_name', 'cost_price', 'inventory', 'created_at', 'updated_at')

# ... (Keep all your other serializers exactly the same) ...

class PurchaseItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = PurchaseItem
        fields = ('id', 'product', 'product_name', 'quantity', 'received_quantity', 'unit_price', 'created_at')
        # NOTE: We intentionally do not include 'purchase' here because it will be assigned in the PurchaseSerializer's create() method.

class PurchaseSerializer(serializers.ModelSerializer):
    # FIXED: Removed read_only=True so it accepts incoming JSON arrays
    items = PurchaseItemSerializer(many=True) 
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)

    class Meta:
        model = Purchase
        fields = ('id', 'purchase_number', 'vendor', 'vendor_name', 'purchase_date', 'expected_delivery_date', 'total_amount', 'status', 'items', 'created_at', 'updated_at')

    def create(self, validated_data):
        # 1. Pop the items array out of the data dictionary
        items_data = validated_data.pop('items', [])
        
        # 2. Create the parent Purchase record first
        purchase = Purchase.objects.create(**validated_data)
        
        # 3. Loop through the items and create them, linking them to the new Purchase
        for item_data in items_data:
            PurchaseItem.objects.create(purchase=purchase, **item_data)
            
        return purchase

    def update(self, instance, validated_data):
        # 1. Pop the items array out of the data dictionary
        items_data = validated_data.pop('items', None)
        
        # 2. Update the parent Purchase fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # 3. If items were provided in the payload, update them
        if items_data is not None:
            # The simplest way to handle nested updates is to clear out the old items 
            # and replace them with the new list from the frontend.
            instance.items.all().delete()
            for item_data in items_data:
                PurchaseItem.objects.create(purchase=instance, **item_data)
                
        return instance