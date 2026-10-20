from typing import Dict, Any, Optional

ORDERS_DB = {
    "ORD-1001": {
        "order_id": "ORD-1001",
        "customer_id": "cust_001",
        "status": "in_transit",
        "carrier": "FedEx",
        "tracking_number": "TRK987654321",
        "estimated_delivery": "Tomorrow by 5 PM",
        "items": [{"name": "Wireless Headphones Pro", "qty": 1, "price": 149.99}],
        "total": 149.99
    },
    "ORD-1002": {
        "order_id": "ORD-1002",
        "customer_id": "cust_002",
        "status": "delivered",
        "carrier": "UPS",
        "tracking_number": "TRK123456789",
        "delivered_at": "Yesterday at 2:15 PM",
        "items": [{"name": "Mechanical Keyboard RGB", "qty": 1, "price": 99.99}],
        "total": 99.99
    }
}

PRODUCTS_DB = {
    "wireless headphones pro": {
        "id": "PROD-001",
        "name": "Wireless Headphones Pro",
        "in_stock": True,
        "stock_count": 42,
        "price": 149.99,
        "category": "Audio",
        "warranty": "1-year limited warranty"
    },
    "mechanical keyboard rgb": {
        "id": "PROD-002",
        "name": "Mechanical Keyboard RGB",
        "in_stock": False,
        "stock_count": 0,
        "restock_date": "Next Monday",
        "price": 99.99,
        "category": "Peripherals"
    }
}

ERROR_CODES_DB = {
    "ERR_AUTH_500": {
        "code": "ERR_AUTH_500",
        "title": "Authentication Token Expired",
        "cause": "Session token invalid or expired on client browser",
        "resolution": "Clear browser cache and cookies, or log out and log back in."
    },
    "ERR_CHK_402": {
        "code": "ERR_CHK_402",
        "title": "Payment Gateway Timeout / Double Charge Risk",
        "cause": "Gateway timed out during 3D Secure verification",
        "resolution": "Check bank statement before retrying. If charged twice, refund processed within 3-5 business days automatically."
    }
}

def tool_order_lookup(query: str) -> Dict[str, Any]:
    query_upper = query.upper()
    for oid, details in ORDERS_DB.items():
        if oid in query_upper:
            return {"found": True, "order": details}
    # Return default mock order for demo
    return {"found": True, "order": ORDERS_DB["ORD-1001"]}

def tool_product_lookup(query: str) -> Dict[str, Any]:
    query_lower = query.lower()
    for pname, details in PRODUCTS_DB.items():
        if pname in query_lower or query_lower in pname:
            return {"found": True, "product": details}
    return {"found": True, "product": PRODUCTS_DB["wireless headphones pro"]}

def tool_lookup_error_code(query: str) -> Dict[str, Any]:
    query_upper = query.upper()
    for ecode, details in ERROR_CODES_DB.items():
        if ecode in query_upper:
            return {"found": True, "error": details}
    if "login" in query.lower() or "auth" in query.lower() or "crash" in query.lower():
        return {"found": True, "error": ERROR_CODES_DB["ERR_AUTH_500"]}
    if "checkout" in query.lower() or "pay" in query.lower() or "charge" in query.lower():
        return {"found": True, "error": ERROR_CODES_DB["ERR_CHK_402"]}
    return {"found": False, "message": "No matching error code found in database"}

def tool_db_query(query_type: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if "charge" in query_type or "billing" in query_type or "refund" in query_type:
        return {
            "status": "success",
            "account_id": "cust_001",
            "billing_history": [
                {"id": "INV-2026-01", "amount": 149.99, "date": "2026-08-01", "status": "paid"},
                {"id": "INV-2026-02", "amount": 149.99, "date": "2026-08-01", "status": "duplicate_pending_refund"}
            ]
        }
    return {"status": "success", "message": "Account in good standing"}

TOOL_REGISTRY = {
    "orderLookup": tool_order_lookup,
    "productLookup": tool_product_lookup,
    "lookupErrorCode": tool_lookup_error_code,
    "dbQuery": tool_db_query,
    "subscriptionLookup": lambda q: {"status": "active", "plan": "Premium Monthly"},
    "accountStatus": lambda q: {"status": "active", "verified": True}
}

def execute_tool(tool_name: str, query: str) -> Dict[str, Any]:
    tool_fn = TOOL_REGISTRY.get(tool_name)
    if tool_fn:
        try:
            return tool_fn(query)
        except Exception as e:
            return {"error": str(e)}
    return {"error": f"Tool '{tool_name}' not registered"}
