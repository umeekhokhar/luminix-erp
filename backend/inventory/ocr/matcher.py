import re
from django.db.models import Q
from inventory.models import (
    Product,
    Vendor
)

def normalize(s):
    return re.sub(r'\s+', ' ', s or '').strip().lower()

def match_product(name):
    name = normalize(name)
    if not name:
        return None

    # Try exact/substring match first (cheap, handles the common case)
    product = Product.objects.filter(name__iexact=name).first()
    if product:
        return product

    product = Product.objects.filter(name__icontains=name).first()
    if product:
        return product

    # Fall back to word-by-word AND match, order-independent
    words = name.split()
    if not words:
        return None

    qs = Product.objects.all()
    for word in words:
        qs = qs.filter(name__icontains=word)

    return qs.first()


def match_vendor(name):
    """Helper to match vendor names from the invoice to your database"""
    name = normalize(name)
    if not name:
        return None
    
    # Try exact match or substring match for vendor
    vendor = Vendor.objects.filter(name__iexact=name).first()
    if not vendor:
        vendor = Vendor.objects.filter(name__icontains=name).first()
    return vendor


def build_purchase_payload(parsed_data):
    """
    Takes the raw parsed JSON from Gemini and processes it against 
    the database to build a structural payload for Django.
    """
    # 1. Try to find the vendor in your database
    vendor_obj = match_vendor(parsed_data.get("vendor", ""))
    
    payload = {
        "vendor_id": vendor_obj.id if vendor_obj else None,
        "vendor_name": parsed_data.get("vendor"),
        "invoice_number": parsed_data.get("invoice_number"),
        "invoice_date": parsed_data.get("invoice_date"),
        "due_date": parsed_data.get("due_date"),
        "subtotal": parsed_data.get("subtotal", 0),
        "tax": parsed_data.get("tax", 0),
        "total": parsed_data.get("total", 0),
        "items": []
    }
    
    # 2. Match individual line items to existing products
    for item in parsed_data.get("items", []):
        # Fallback to 'product' field or 'description' field if one is missing
        item_name = item.get("product") or item.get("description", "")
        matched_product = match_product(item_name)
        
        payload["items"].append({
            "product_id": matched_product.id if matched_product else None,
            "raw_name": item_name,
            "description": item.get("description", ""),
            "quantity": item.get("quantity", 0),
            "unit_price": item.get("unit_price", 0),
            "amount": item.get("amount", 0)
        })
        
    return payload