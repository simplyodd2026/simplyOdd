from datetime import datetime
from typing import Literal

from pydantic import EmailStr, Field

from app.models.cart import CartLine, ShippingMethod
from app.models.common import Schema

OrderStatus = Literal[
    "pending", "confirmed", "processing", "shipped",
    "out_for_delivery", "delivered", "cancelled", "refunded",
]
PaymentStatus = Literal["pending", "authorized", "paid", "failed", "refund_pending", "refunded", "cod_due", "void"]

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
    reference: str | None = None       # provider order/intent id
    transaction_id: str | None = None  # provider payment id
    amount: float
    currency: str
    paid_at: datetime | None = None
    refund_reference: str | None = None


class CheckoutRequest(Schema):
    items: list[CartLine] = Field(min_length=1)
    address: ShippingAddress
    shipping_method: ShippingMethod = "standard"
    coupon_code: str | None = None
    payment_provider: str
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
    tax: float
    total: float
    currency: str
    status: OrderStatus = "pending"
    history: list[StatusEvent] = []
    payment: PaymentInfo
    tracking_number: str | None = None
    notes: str | None = None
    stock_reserved: bool = True
    created_at: datetime
    updated_at: datetime


class CheckoutResponse(Schema):
    order: Order
    payment: dict  # provider-specific payload the client adapter needs


class PaymentConfirm(Schema):
    payload: dict = {}


class StatusUpdate(Schema):
    status: OrderStatus
    note: str | None = None
    tracking_number: str | None = None


class RefundRequest(Schema):
    note: str | None = None
    status: Literal["refund_pending", "refunded"] = "refunded"
