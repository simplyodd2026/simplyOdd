from datetime import datetime
from typing import Literal

from pydantic import EmailStr, Field, model_validator

from app.models.cart import CartLine, ShippingMethod
from app.models.common import Schema
from app.models.filament import FilamentChoice

OrderStatus = Literal[
    "pending", "confirmed", "processing", "shipped",
    "out_for_delivery", "delivered", "cancelled", "refunded",
]
# "cod_due" only appears on orders placed before cash on delivery was removed.
PaymentStatus = Literal["pending", "authorized", "paid", "partially_paid", "failed", "refund_pending", "refunded",
                        "cod_due", "void"]
# full: the whole total online. partial: half online now, the rest on delivery.
PaymentPlan = Literal["full", "partial"]

# Which transitions an admin may make. Cancel/refund have dedicated endpoints.
STATUS_FLOW: dict[str, list[str]] = {
    "pending": ["confirmed", "cancelled"],
    "confirmed": ["processing", "cancelled"],
    "processing": ["shipped", "cancelled"],
    "shipped": ["out_for_delivery", "delivered"],
    "out_for_delivery": ["delivered"],
    "delivered": ["refunded"],
    "cancelled": ["refunded"],
    "refunded": [],
}


class ShippingAddress(Schema):
    full_name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=6, max_length=20)
    email: EmailStr
    line1: str = Field(min_length=1, max_length=200)
    line2: str = ""
    city: str = Field(min_length=1)
    state: str = Field(min_length=1)
    postal_code: str = Field(min_length=3, max_length=12)
    country: str = Field(min_length=2)


class OrderItem(Schema):
    product_id: str
    color: str | None = None
    filament: FilamentChoice | None = None  # snapshot of the colour and finish at the time of purchase
    name: str
    slug: str
    image: str | None
    unit_price: float
    quantity: int
    line_total: float


class StatusEvent(Schema):
    status: OrderStatus
    at: datetime
    note: str | None = None
    by: str | None = None


class PaymentInfo(Schema):
    provider: str
    status: PaymentStatus = "pending"
    plan: PaymentPlan = "full"
    reference: str | None = None       # provider order/intent id
    transaction_id: str | None = None  # provider payment id
    amount: float                      # charged online at checkout
    balance: float = 0                 # collected on delivery (partial plan)
    currency: str
    paid_at: datetime | None = None
    refund_reference: str | None = None


class CheckoutRequest(Schema):
    items: list[CartLine] = Field(min_length=1)
    address: ShippingAddress
    shipping_method: ShippingMethod = "standard"
    coupon_code: str | None = None
    coupon_amount: float | None = Field(default=None, gt=0)
    payment_provider: str
    payment_plan: PaymentPlan = "full"
    notes: str | None = Field(default=None, max_length=500)


class Order(Schema):
    id: str
    number: str
    user_id: str
    email: str
    items: list[OrderItem]
    address: ShippingAddress
    shipping_method: ShippingMethod
    subtotal: float
    discount: float
    coupon_code: str | None = None
    shipping: float
    total: float
    currency: str
    status: OrderStatus = "pending"
    history: list[StatusEvent] = []
    payment: PaymentInfo
    tracking_number: str | None = None
    notes: str | None = None
    sales_counted: bool = True  # whether this order's units are in each product's sales_count
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def _legacy_stock_flag(cls, data):
        # Orders saved while stock was tracked carry `stock_reserved` instead.
        if isinstance(data, dict) and "stock_reserved" in data:
            data = {**data}
            data.setdefault("sales_counted", data.pop("stock_reserved"))
        return data


class CheckoutResponse(Schema):
    order: Order
    payment: dict  # provider-specific payload the client adapter needs


class CheckoutConfirm(Schema):
    checkout: CheckoutRequest  # the same request sent to /checkout; re-priced on the server
    reference: str = Field(min_length=1)  # from the /checkout payment payload
    payload: dict = {}  # what the provider returned to the client


class StatusUpdate(Schema):
    status: OrderStatus
    note: str | None = None
    tracking_number: str | None = None


class RefundRequest(Schema):
    note: str | None = None
    status: Literal["refund_pending", "refunded"] = "refunded"
