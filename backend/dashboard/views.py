# ======================================================================
# dashboard/views.py
# PART 1 - IMPORTS + HELPERS + AI TOOLS + DASHBOARD ENDPOINTS
# ======================================================================

import os
import json
import traceback
from django.conf import settings
from django.db.models import Sum, Count, Q
from django.utils import timezone

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from google import genai
from google.genai import types

from crm.models import Customer
from inventory.models import Product, Inventory
from orders.models import Order, Invoice, OrderItem
from accounting.models import (
    CustomerLedger,
    CustomerTransaction,
    VendorLedger,
    VendorTransaction,
)

# ======================================================================
# AI TOOL FUNCTIONS
# ======================================================================

def list_all_customers(limit: int = 25) -> str:
    """
    Returns a list of customers in the system (id, name, email, phone,
    company, city, country), most recently created first. Use this tool
    whenever the user asks to list, browse, or see all/multiple customers,
    as opposed to looking up one specific customer by name.

    Args:
        limit: Maximum number of customers to return. Defaults to 25,
            capped at 100 to keep responses readable.
    """

    try:
        limit = max(1, min(100, int(limit or 25)))

        customers = (
            Customer.objects
            .order_by("-created_at")[:limit]
        )

        payload = {
            "success": True,
            "count": customers.count() if hasattr(customers, "count") else len(customers),
            "customers": [
                {
                    "id": c.id,
                    "name": c.name,
                    "email": c.email,
                    "phone": c.phone,
                    "company": c.company,
                    "city": c.city,
                    "country": c.country,
                }
                for c in customers
            ],
        }

        return json.dumps(payload, indent=2)

    except Exception as e:
        return f"Customer list failed: {str(e)}"


def lookup_customer_profile(customer_name: str) -> str:
    """
    Looks up a customer by name and returns their full profile, INCLUDING
    their recent orders (order number, status, payment type, total, date)
    and recent invoices (invoice number, payment status, total, paid amount).
    Use this tool any time the user asks about a customer's orders, order
    history, invoices, or general details.

    Args:
        customer_name: Full or partial customer/company name to search for.
    """

    try:
        customer = (
            Customer.objects.filter(
                name__icontains=customer_name
            )
            .first()
        )

        if not customer:
            return json.dumps({
                "success": False,
                "message": f"No customer found matching '{customer_name}'"
            })

        orders = (
            Order.objects
            .filter(customer=customer)
            .order_by("-order_date")[:20]
        )

        invoices = (
            Invoice.objects
            .filter(customer=customer)
            .order_by("-invoice_date")[:20]
        )

        payload = {
            "success": True,
            "customer": {
                "id": customer.id,
                "name": customer.name,
                "email": customer.email,
                "phone": customer.phone,
                "company": customer.company,
                "city": customer.city,
                "country": customer.country,
            },
            "orders": [
                {
                    "order_number": o.order_number,
                    "status": o.status,
                    "payment_type": o.payment_type,
                    "total_amount": str(o.total_amount),
                    "order_date": o.order_date.strftime("%Y-%m-%d"),
                }
                for o in orders
            ],
            "invoices": [
                {
                    "invoice_number": i.invoice_number,
                    "payment_status": i.payment_status,
                    "total_amount": str(i.total_amount),
                    "paid_amount": str(i.paid_amount),
                }
                for i in invoices
            ],
        }

        return json.dumps(payload, indent=2)

    except Exception as e:
        return f"Customer lookup failed: {str(e)}"


def list_all_products(limit: int = 25) -> str:
    """
    Returns a list of products in the system (id, name, SKU, category,
    vendor, price, cost price, stock quantity, reorder level). Use this
    tool whenever the user asks to list, browse, or see all/multiple
    products, as opposed to looking up one specific product by name.

    Args:
        limit: Maximum number of products to return. Defaults to 25,
            capped at 100 to keep responses readable.
    """

    try:
        limit = max(1, min(100, int(limit or 25)))

        products = (
            Product.objects
            .select_related("category", "vendor", "inventory")
            .order_by("-id")[:limit]
        )

        payload = {
            "success": True,
            "count": len(products),
            "products": [
                {
                    "id": p.id,
                    "name": p.name,
                    "sku": p.sku,
                    "category": p.category.name if p.category else None,
                    "vendor": p.vendor.name if p.vendor else None,
                    "price": str(p.price),
                    "cost_price": str(p.cost_price),
                    "stock_quantity": p.inventory.stock_quantity if getattr(p, "inventory", None) else 0,
                    "reorder_level": p.inventory.reorder_level if getattr(p, "inventory", None) else 0,
                }
                for p in products
            ],
        }

        return json.dumps(payload, indent=2)

    except Exception as e:
        return f"Product list failed: {str(e)}"


def lookup_product_inventory(product_name: str) -> str:
    """
    Looks up a product by name and returns its details: SKU, category,
    vendor, price, cost price, current stock quantity, and reorder level.
    Use this tool when the user asks about product stock, pricing, or
    inventory levels.

    Args:
        product_name: Full or partial product name to search for.
    """

    try:
        product = (
            Product.objects
            .select_related("category", "vendor")
            .filter(name__icontains=product_name)
            .first()
        )

        if not product:
            return json.dumps({
                "success": False,
                "message": f"No product found for '{product_name}'"
            })

        inventory = getattr(product, "inventory", None)

        payload = {
            "success": True,
            "product": {
                "id": product.id,
                "name": product.name,
                "sku": product.sku,
                "category": product.category.name if product.category else None,
                "vendor": product.vendor.name if product.vendor else None,
                "price": str(product.price),
                "cost_price": str(product.cost_price),
                "stock_quantity": inventory.stock_quantity if inventory else 0,
                "reorder_level": inventory.reorder_level if inventory else 0,
            }
        }

        return json.dumps(payload, indent=2)

    except Exception as e:
        return f"Inventory lookup failed: {str(e)}"


def list_all_orders(limit: int = 25, status: str = "") -> str:
    """
    Returns a list of recent orders (order number, customer, status,
    payment type, total amount, order date), most recent first. Use this
    tool whenever the user asks to list, browse, or see all/multiple
    orders, as opposed to looking up orders for one specific customer
    (use lookup_customer_profile for that instead).

    Args:
        limit: Maximum number of orders to return. Defaults to 25,
            capped at 100 to keep responses readable.
        status: Optional order status to filter by, e.g. "pending",
            "processing", "delivered", or "invoiced". Leave empty to
            return orders of any status.
    """

    try:
        limit = max(1, min(100, int(limit or 25)))

        orders = (
            Order.objects
            .select_related("customer")
            .order_by("-order_date")
        )

        if status:
            orders = orders.filter(status__iexact=status.strip())

        orders = orders[:limit]

        payload = {
            "success": True,
            "count": len(orders),
            "status_filter": status or None,
            "orders": [
                {
                    "order_number": o.order_number,
                    "customer": o.customer.name,
                    "status": o.status,
                    "payment_type": o.payment_type,
                    "total_amount": str(o.total_amount),
                    "order_date": o.order_date.strftime("%Y-%m-%d"),
                }
                for o in orders
            ],
        }

        return json.dumps(payload, indent=2)

    except Exception as e:
        return f"Order list failed: {str(e)}"


def list_all_invoices(limit: int = 25) -> str:
    """
    Returns a list of recent invoices (invoice number, customer, order
    number, payment status, paid amount, total amount, balance due), most
    recent first. Use this tool whenever the user asks to list, browse, or
    see all/multiple invoices, as opposed to looking up invoices for one
    specific customer (use lookup_customer_profile for that instead).

    Args:
        limit: Maximum number of invoices to return. Defaults to 25,
            capped at 100 to keep responses readable.
    """

    try:
        limit = max(1, min(100, int(limit or 25)))

        invoices = (
            Invoice.objects
            .select_related("customer", "order")
            .order_by("-invoice_date")[:limit]
        )

        payload = {
            "success": True,
            "count": len(invoices),
            "invoices": [
                {
                    "invoice_number": i.invoice_number,
                    "customer": i.customer.name,
                    "order": i.order.order_number,
                    "payment_status": i.payment_status,
                    "paid_amount": str(i.paid_amount),
                    "total_amount": str(i.total_amount),
                    "balance_due": str(i.get_balance_due()),
                }
                for i in invoices
            ],
        }

        return json.dumps(payload, indent=2)

    except Exception as e:
        return f"Invoice list failed: {str(e)}"


def list_all_inventory(limit: int = 25) -> str:
    """
    Returns a list of inventory rows (product name, SKU, price, stock
    quantity, reorder level), sorted with the lowest-stock items first.
    Use this tool whenever the user asks to list, browse, or see all/
    multiple products' stock levels, as opposed to looking up stock for
    one specific product (use lookup_product_inventory for that instead).

    Args:
        limit: Maximum number of inventory rows to return. Defaults to
            25, capped at 100 to keep responses readable.
    """

    try:
        limit = max(1, min(100, int(limit or 25)))

        inventory = (
            Inventory.objects
            .select_related("product")
            .order_by("stock_quantity")[:limit]
        )

        payload = {
            "success": True,
            "count": len(inventory),
            "inventory": [
                {
                    "product": row.product.name,
                    "sku": row.product.sku,
                    "price": str(row.product.price),
                    "stock": row.stock_quantity,
                    "reorder": row.reorder_level,
                }
                for row in inventory
            ],
        }

        return json.dumps(payload, indent=2)

    except Exception as e:
        return f"Inventory list failed: {str(e)}"


def fetch_account_ledger_summary(
    party_name: str,
    ledger_type: str
) -> str:
    """
    Looks up the financial ledger for a customer or vendor, returning their
    balance and recent transactions (date, type, amount, reference,
    description). Use this when the user asks about balances, credit,
    or transaction history for a customer or vendor.

    Args:
        party_name: Name of the customer or vendor to look up.
        ledger_type: Either "customer" or "vendor".
    """

    try:

        if "customer" in ledger_type.lower():

            ledger = (
                CustomerLedger.objects
                .select_related("customer")
                .filter(customer__name__icontains=party_name)
                .first()
            )

            if not ledger:
                return f"No customer ledger found for {party_name}"

            transactions = (
                CustomerTransaction.objects
                .filter(ledger=ledger)
                .order_by("-transaction_date")[:25]
            )

            return json.dumps({
                "type": "customer",
                "customer": ledger.customer.name,
                "balance": str(ledger.balance),
                "credit_limit": str(ledger.credit_limit),
                "transactions": [
                    {
                        "date": t.transaction_date.strftime("%Y-%m-%d"),
                        "type": t.transaction_type,
                        "amount": str(t.amount),
                        "reference": t.reference_number,
                        "description": t.description
                    }
                    for t in transactions
                ]
            }, indent=2)

        elif "vendor" in ledger_type.lower():

            ledger = (
                VendorLedger.objects
                .select_related("vendor")
                .filter(vendor__name__icontains=party_name)
                .first()
            )

            if not ledger:
                return f"No vendor ledger found for {party_name}"

            transactions = (
                VendorTransaction.objects
                .filter(ledger=ledger)
                .order_by("-transaction_date")[:25]
            )

            return json.dumps({
                "type": "vendor",
                "vendor": ledger.vendor.name,
                "balance": str(ledger.balance),
                "transactions": [
                    {
                        "date": t.transaction_date.strftime("%Y-%m-%d"),
                        "type": t.transaction_type,
                        "amount": str(t.amount),
                        "reference": t.reference_number,
                        "description": t.description
                    }
                    for t in transactions
                ]
            }, indent=2)

        return "Please specify customer or vendor ledger."

    except Exception as e:
        return str(e)


def query_system_demand_forecast(query: str) -> str:
    """
    Placeholder forecasting.
    """

    return json.dumps({
        "forecast_scope": query,
        "confidence": "88.4%",
        "growth_estimate": "+12.5%",
        "forecast_period": "30 days",
        "status": "Positive demand trend detected"
    })


# ======================================================================
# MAIN VIEWSET
# ======================================================================

class DashboardViewSet(viewsets.ViewSet):

    permission_classes = [IsAuthenticated]

    # ==========================================================
    # SUMMARY
    # ==========================================================

    @action(detail=False, methods=["get"])
    def summary(self, request):

        today = timezone.now().date()

        today_orders = Order.objects.filter(
            order_date__date=today
        )

        sales_today = (
            today_orders.aggregate(
                total=Sum("total_amount")
            )["total"] or 0
        )

        return Response({

            "total_sales_today": sales_today,

            "total_orders_today":
                today_orders.count(),

            "pending_orders":
                Order.objects.filter(
                    status="pending"
                ).count(),

            "processing_orders":
                Order.objects.filter(
                    status="processing"
                ).count(),

            "delivered_orders":
                Order.objects.filter(
                    status="delivered"
                ).count(),

            "total_customers":
                Customer.objects.count(),

            "total_products":
                Product.objects.count(),

            "low_stock_alerts":
                Inventory.objects.filter(
                    stock_quantity__lte=10
                ).count(),

            "unpaid_invoices":
                Invoice.objects.filter(
                    payment_status="unpaid"
                ).count(),

        })

    # ==========================================================
    # RECENT ORDERS
    # ==========================================================

    @action(detail=False, methods=["get"])
    def recent_orders(self, request):

        orders = (
            Order.objects
            .select_related(
                "customer",
                "salesman"
            )
            .order_by("-order_date")[:20]
        )

        data = []

        for order in orders:

            data.append({
                "id": order.id,
                "order_number": order.order_number,
                "customer": order.customer.name,
                "status": order.status,
                "payment_type": order.payment_type,
                "total_amount": str(order.total_amount),
                "order_date": order.order_date,
            })

        return Response(data)

    # ==========================================================
    # RECENT INVOICES
    # ==========================================================

    @action(detail=False, methods=["get"])
    def recent_invoices(self, request):

        invoices = (
            Invoice.objects
            .select_related("customer")
            .order_by("-invoice_date")[:20]
        )

        data = []

        for invoice in invoices:

            data.append({
                "id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "customer": invoice.customer.name,
                "total_amount": str(invoice.total_amount),
                "paid_amount": str(invoice.paid_amount),
                "payment_status": invoice.payment_status,
                "invoice_date": invoice.invoice_date,
            })

        return Response(data)

# ======================================================================
# PART 2 — LISTING ENDPOINTS + CHATBOT
# APPEND BELOW PART 1
# ======================================================================

    def _paginate(self, queryset, request):

        try:
            page = max(1, int(request.GET.get("page", 1)))
        except:
            page = 1

        try:
            limit = min(
                100,
                max(
                    10,
                    int(request.GET.get("limit", 25))
                )
            )
        except:
            limit = 25

        start = (page - 1) * limit
        end = start + limit

        return queryset[start:end], page, limit


    # ==========================================================
    # CUSTOMER LIST
    # ==========================================================

    @action(detail=False, methods=["get"])
    def customer_list(self, request):

        customers = (
            Customer.objects
            .order_by("-created_at")
        )

        customers, page, limit = (
            self._paginate(customers, request)
        )

        results = []

        for c in customers:

            order_count = (
                Order.objects
                .filter(customer=c)
                .count()
            )

            invoice_total = (
                Invoice.objects
                .filter(customer=c)
                .aggregate(
                    total=Sum("total_amount")
                )["total"] or 0
            )

            results.append({

                "id": c.id,
                "name": c.name,
                "email": c.email,
                "phone": c.phone,
                "company": c.company,
                "city": c.city,
                "country": c.country,
                "orders": order_count,
                "invoice_total": str(
                    invoice_total
                ),

            })

        return Response({

            "page": page,
            "limit": limit,
            "count": len(results),
            "customers": results

        })


    # ==========================================================
    # ORDER LIST
    # ==========================================================

    @action(detail=False, methods=["get"])
    def order_list(self, request):

        orders = (
            Order.objects
            .select_related(
                "customer",
                "salesman"
            )
            .prefetch_related(
                "items"
            )
            .order_by("-order_date")
        )

        orders, page, limit = (
            self._paginate(
                orders,
                request
            )
        )

        output = []

        for order in orders:

            items = []

            for item in order.items.all():

                items.append({

                    "product":
                        item.product.name,

                    "quantity":
                        item.quantity,

                    "price":
                        str(item.price),

                })

            output.append({

                "id":
                    order.id,

                "order_number":
                    order.order_number,

                "customer":
                    order.customer.name,

                "status":
                    order.status,

                "payment_type":
                    order.payment_type,

                "discount":
                    str(order.discount),

                "total_amount":
                    str(order.total_amount),

                "created_at":
                    order.created_at,

                "items":
                    items

            })

        return Response({

            "page":
                page,

            "limit":
                limit,

            "orders":
                output

        })


    # ==========================================================
    # INVOICE LIST
    # ==========================================================

    @action(detail=False, methods=["get"])
    def invoice_list(self, request):

        invoices = (
            Invoice.objects
            .select_related(
                "customer",
                "order"
            )
            .order_by(
                "-invoice_date"
            )
        )

        invoices, page, limit = (
            self._paginate(
                invoices,
                request
            )
        )

        return Response({

            "page":
                page,

            "limit":
                limit,

            "invoices": [

                {

                    "invoice":
                        i.invoice_number,

                    "customer":
                        i.customer.name,

                    "order":
                        i.order.order_number,

                    "payment_status":
                        i.payment_status,

                    "paid":
                        str(
                            i.paid_amount
                        ),

                    "total":
                        str(
                            i.total_amount
                        ),

                    "balance_due":
                        str(
                            i.get_balance_due()
                        )

                }

                for i in invoices
            ]

        })


    # ==========================================================
    # INVENTORY
    # ==========================================================

    @action(detail=False, methods=["get"])
    def inventory_list(self, request):

        inventory = (
            Inventory.objects
            .select_related(
                "product"
            )
            .order_by(
                "stock_quantity"
            )
        )

        inventory, page, limit = (
            self._paginate(
                inventory,
                request
            )
        )

        return Response({

            "page":
                page,

            "limit":
                limit,

            "inventory": [

                {

                    "product":
                        row.product.name,

                    "sku":
                        row.product.sku,

                    "price":
                        str(
                            row.product.price
                        ),

                    "stock":
                        row.stock_quantity,

                    "reorder":
                        row.reorder_level

                }

                for row in inventory
            ]

        })


    # ==========================================================
    # CUSTOMER HISTORY
    # ==========================================================

    @action(detail=False, methods=["get"])
    def customer_history(self, request):

        customer_id = (
            request.GET.get(
                "customer"
            )
        )

        if not customer_id:

            return Response(
                {
                    "error":
                        "customer required"
                },
                status=400
            )

        orders = (
            Order.objects
            .filter(
                customer_id=customer_id
            )
            .prefetch_related(
                "items"
            )
            .order_by(
                "-order_date"
            )
        )

        history = []

        for o in orders:

            history.append({

                "order":
                    o.order_number,

                "date":
                    o.order_date,

                "status":
                    o.status,

                "amount":
                    str(
                        o.total_amount
                    ),

                "products": [

                    x.product.name
                    for x
                    in o.items.all()

                ]

            })

        return Response(history)


    # ==========================================================
    # LEDGER
    # ==========================================================

    @action(detail=False, methods=["get"])
    def ledger_summary(self, request):

        customer = (
            request.GET.get(
                "customer"
            )
        )

        if not customer:

            return Response(
                {
                    "error":
                        "customer required"
                },
                status=400
            )

        return Response(
            json.loads(
                fetch_account_ledger_summary(
                    customer,
                    "customer"
                )
            )
        )


    # ==========================================================
    # CHATBOT
    # ==========================================================

    @action(
        detail=False,
        methods=["post"],
        url_path="chat"
    )
    def quick_chatbot(
        self,
        request
    ):

        user_message = (
            request.data
            .get(
                "userMessage",
                ""
            )
            .strip()
        )

        history = (
            request.data
            .get(
                "history",
                []
            )
        )

        if not user_message:

            return Response(
                {
                    "reply":
                        "Please ask a question."
                },
                status=400
            )

        tools = [

            list_all_customers,

            lookup_customer_profile,

            lookup_product_inventory,

            list_all_products,

            list_all_orders,

            list_all_invoices,

            list_all_inventory,

            fetch_account_ledger_summary,

            query_system_demand_forecast,

        ]

        system = """

You are Luminix ERP Copilot.

RULES:

1 Return detailed data.

2 Never summarize lists.

3 Use markdown.

4 Show complete order details.

5 Show customers in tables.

6 Show invoices.

7 Prefer structured ERP output.

"""

        formatted = []

        for msg in history:

            role = (
                "model"
                if msg.get(
                    "role"
                ) in [
                    "assistant",
                    "model"
                ]
                else "user"
            )

            formatted.append(

                types.Content(
                    role=role,
                    parts=[
                        types.Part.from_text(
                            text=msg.get(
                                "text",
                                ""
                            )
                        )
                    ]
                )

            )

        

        for key in settings.GEMINI_API_KEYS:
            try:
                client = genai.Client(api_key=key)
                cfg = types.GenerateContentConfig(
                    system_instruction=system,
                    temperature=0.2,
                    tools=tools
                )
                chat = client.chats.create(
                    model="gemini-2.5-flash",
                    history=formatted,
                    config=cfg
                )
                response = chat.send_message(user_message)
                return Response({"reply": response.text})
            
            except Exception as e:
                print("====== GEMINI KEY ATTEMPT FAILED ======")
                traceback.print_exc()  # <--- THIS WILL PRINT THE EXACT ERROR IN POWERSHELL
                print("=======================================")
                continue

        return Response({"reply": "AI unavailable."})

# ======================================================================
# END OF FILE
# ======================================================================