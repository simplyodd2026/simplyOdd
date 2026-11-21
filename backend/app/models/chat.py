"""Oddly Assistant: request/response schemas for /api/chat.

Every reply the storefront renders is one `ChatReply`. Product data in it is
always copied from the catalogue by the server, never from model output.
"""
from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import EmailStr, Field

from app.models.common import Schema

ReplyType = Literal[
    "text", "product_recommendations", "product_comparison", "faq", "custom_enquiry", "order_status", "error",
]

VisitorId = Annotated[str, Field(pattern=r"^[A-Za-z0-9_-]{8,64}$")]
SessionId = Annotated[str, Field(pattern=r"^cs_[a-f0-9]{16}$")]


# ------------------------------------------------------------------ payloads
class ChatProduct(Schema):
    id: str
    slug: str
    name: str
    price: float
    compare_at_price: float | None = None
    # True when the piece comes in versions at different prices; `price` is the default version's.
    price_varies: bool = False
    image: str | None = None
    url: str
    summary: str = ""


class ComparisonRow(Schema):
    label: str
    values: list[str]


class Comparison(Schema):
    products: list[ChatProduct]
    rows: list[ComparisonRow]


class FaqItem(Schema):
    question: str
    answer: str


class EnquiryDraft(Schema):
    """A custom-creation brief collected in chat. Nothing is sent until the customer confirms."""
    name: str | None = None
    email: str | None = None
    idea: str | None = None
    reference_url: str | None = None
    dimensions: str | None = None
    colours: list[str] = []
    quantity: int | None = None
    notes: str | None = None
    missing: list[str] = []
    errors: list[str] = []
    ready: bool = False
    submitted: bool = False
    request_id: str | None = None


class OrderLine(Schema):
    name: str
    quantity: int


class OrderSummary(Schema):
    id: str
    number: str
    status: str
    status_label: str
    total: float
    currency: str
    created_at: datetime
    tracking_number: str | None = None
    items: list[OrderLine] = []
    url: str


class ChatReply(Schema):
    session_id: str
    type: ReplyType = "text"
    message: str
    products: list[ChatProduct] = Field(default_factory=list, max_length=12)
    comparison: Comparison | None = None
    faq: list[FaqItem] = Field(default_factory=list, max_length=6)
    enquiry: EnquiryDraft | None = None
    orders: list[OrderSummary] = Field(default_factory=list, max_length=10)
    suggestions: list[Annotated[str, Field(max_length=80)]] = Field(default_factory=list, max_length=4)
    # True when the reply came from the built-in fallback rather than the language model.
    fallback: bool = False


# ------------------------------------------------------------------ requests
class SessionCreate(Schema):
    visitor_id: VisitorId | None = None


class SessionOut(Schema):
    session_id: str
    # Proves this browser owns the session; send it back as the X-Chat-Token header.
    token: str
    expires_at: datetime
    greeting: str
    suggestions: list[str]


class MessageIn(Schema):
    session_id: SessionId
    # The configured limit (CHAT_MAX_MESSAGE_CHARS) is enforced in the service; this is the hard cap.
    message: str = Field(min_length=1, max_length=2000)
    # Slug of the product page the shopper has open, so "this one" means that piece. Only the slug is
    # trusted from the browser: the server looks the product up in the catalogue itself.
    viewing: str | None = Field(default=None, pattern=r"^[A-Za-z0-9_-]{1,140}$")


class EnquiryIn(Schema):
    session_id: SessionId
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    idea: str = Field(min_length=10, max_length=2000)
    reference_url: str | None = Field(default=None, max_length=500)
    dimensions: str | None = Field(default=None, max_length=120)
    colours: list[Annotated[str, Field(max_length=40)]] = Field(default_factory=list, max_length=8)
    quantity: int | None = Field(default=None, ge=1, le=500)
    notes: str | None = Field(default=None, max_length=1000)


class EnquiryOut(Schema):
    ok: bool = True
    id: str
    message: str
