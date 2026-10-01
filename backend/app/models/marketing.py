from datetime import datetime
from typing import Literal

from pydantic import EmailStr, Field

from app.models.common import Schema


class CouponBase(Schema):
    code: str = Field(min_length=3, max_length=32)
    description: str = ""
    kind: Literal["percent", "fixed", "free_shipping"] = "percent"
    value: float = Field(default=0, ge=0)
    min_subtotal: float = 0
    max_discount: float | None = None
    usage_limit: int | None = None
    starts_at: datetime | None = None
    expires_at: datetime | None = None
    active: bool = True


class CouponCreate(CouponBase):
    pass


class CouponUpdate(Schema):
    description: str | None = None
    kind: Literal["percent", "fixed", "free_shipping"] | None = None
    value: float | None = None
    min_subtotal: float | None = None
    max_discount: float | None = None
    usage_limit: int | None = None
    starts_at: datetime | None = None
    expires_at: datetime | None = None
    active: bool | None = None


class Coupon(CouponBase):
    id: str
    used_count: int = 0
    created_at: datetime
    updated_at: datetime


class NewsletterIn(Schema):
    email: EmailStr


class Subscriber(Schema):
    id: str
    email: str
    created_at: datetime


CustomKind = Literal["decor", "lighting", "desk", "gift", "other"]
CustomSize = Literal["small", "medium", "large", "not_sure"]
CustomBudget = Literal["under_1000", "1000_2500", "2500_5000", "5000_plus", "not_sure"]
CustomStatus = Literal["new", "replied", "closed"]


class CustomRequestIn(Schema):
    """A customer's idea for a one-off piece."""
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    idea: str = Field(min_length=10, max_length=2000)
    kind: CustomKind = "other"
    size: CustomSize = "not_sure"
    colours: list[str] = Field(default_factory=list, max_length=8)
    budget: CustomBudget = "not_sure"
    reference_url: str | None = Field(default=None, max_length=500)


class CustomRequestUpdate(Schema):
    status: CustomStatus


class CustomRequest(CustomRequestIn):
    id: str
    status: CustomStatus = "new"
    created_at: datetime
    updated_at: datetime
