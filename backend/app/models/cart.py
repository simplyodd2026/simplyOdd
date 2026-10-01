from typing import Literal

from pydantic import Field

from app.models.common import Schema

ShippingMethod = Literal["standard", "express"]


class CartLine(Schema):
    product_id: str
    quantity: int = Field(ge=1, le=99)


class CartIn(Schema):
    items: list[CartLine] = []


class Cart(Schema):
    items: list[CartLine] = []


class QuoteRequest(Schema):
    items: list[CartLine]
    coupon_code: str | None = None
    shipping_method: ShippingMethod = "standard"
    country: str | None = None


class QuoteLine(Schema):
    product_id: str
    name: str
    slug: str
    image: str | None
    unit_price: float
    compare_at_price: float | None
    quantity: int
    line_total: float
    stock: int
    available: bool
    issue: str | None = None


class ShippingOption(Schema):
    method: ShippingMethod
    label: str
    eta: str
    fee: float


class Quote(Schema):
    lines: list[QuoteLine]
    subtotal: float
    discount: float
    coupon_code: str | None
    coupon_message: str | None = None
    shipping_method: ShippingMethod
    shipping: float
    shipping_options: list[ShippingOption]
    tax: float
    tax_rate: float
    total: float
    currency: str
    item_count: int
    has_issues: bool
