from typing import Literal

from pydantic import Field, field_validator

from app.models.catalog import PersonalizationField, ProductVariant
from app.models.common import Schema
from app.models.filament import FilamentChoice

ShippingMethod = Literal["standard", "express"]


Personalization = dict[str, str]


def personalization_key(values: Personalization | None) -> tuple[tuple[str, str], ...]:
    """A hashable form of the values, so the same piece with different text stays on separate lines."""
    return tuple(sorted((values or {}).items()))


class CartLine(Schema):
    product_id: str = Field(min_length=1, max_length=100)
    quantity: int = Field(ge=1, le=99)
    color: str | None = Field(default=None, max_length=40)  # filament id; one line per product and colour
    variant: str | None = Field(default=None, max_length=24)  # variant key, like "framed"; one line per variant
    # What the shopper wants written on a personalised piece, by field key.
    # One line per product, colour and personalisation.
    personalization: Personalization | None = None

    @field_validator("personalization")
    @classmethod
    def _tidy_personalization(cls, v: Personalization | None) -> Personalization | None:
        if not v:
            return None
        if len(v) > 10:
            raise ValueError("Too many personalisation fields")
        tidy = {}
        for key, value in v.items():
            if len(key) > 24 or len(value) > 200:
                raise ValueError("Personalisation is too long")
            value = " ".join(value.split())  # trim and collapse whitespace, as the storefront does
            if value:
                tidy[key] = value
        return tidy or None

    @property
    def key(self) -> tuple:
        return self.product_id, self.variant, self.color, personalization_key(self.personalization)


MAX_LINES = 100


class CartIn(Schema):
    items: list[CartLine] = Field(default_factory=list, max_length=MAX_LINES)


class Cart(Schema):
    items: list[CartLine] = []


class QuoteRequest(Schema):
    items: list[CartLine] = Field(max_length=MAX_LINES)
    coupon_code: str | None = Field(default=None, max_length=32)
    coupon_amount: float | None = Field(default=None, gt=0)  # what the shopper pays with a custom_total coupon
    shipping_method: ShippingMethod = "standard"
    country: str | None = Field(default=None, max_length=100)


class PersonalizationValue(Schema):
    """A filled-in field with its label, kept on quote lines and order items so
    an order still reads correctly if the product's fields change later."""
    key: str
    label: str
    value: str


class QuoteLine(Schema):
    product_id: str
    color: str | None = None              # the filament id as requested, so the client can match its line
    variant: str | None = None            # the variant key as requested, so the client can match its line
    variant_label: str | None = None      # the chosen variant's name, like "With frame", when it is valid
    variant_name: str = ""                # what the choice is called, like "Frame"
    variants: list[ProductVariant] = []   # what the product comes in, for changing the choice from the bag
    personalization: Personalization | None = None  # as requested, so the client can match its line
    personalization_details: list[PersonalizationValue] = []  # the accepted values, labelled, in field order
    personalization_fields: list[PersonalizationField] = []  # what the piece asks for, for editing from the bag
    personalization_fee: float = 0
    filament: FilamentChoice | None = None  # the resolved choice, when it is valid for the product
    colors: list[str] = []                # what the product can be printed in, for changing the choice
    name: str
    slug: str
    image: str | None
    unit_price: float
    compare_at_price: float | None
    quantity: int
    line_total: float
    available: bool
    issue: str | None = None


# full: the whole total online. partial: half online now, the rest on delivery. cod: all of it on delivery.
PaymentPlan = Literal["full", "partial", "cod"]


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
    coupon_needs_amount: bool = False  # the code is a custom_total one: ask the shopper for an amount
    coupon_amount: float | None = None  # the amount applied, when it was
    shipping_method: ShippingMethod
    shipping: float
    shipping_options: list[ShippingOption]
    total: float
    deposit: float  # paid online up front on the partial plan
    # How this bag may be paid. A personalised piece can't be resold, so a bag with one takes the
    # 50% advance only; everything else is paid in full online or cash on delivery.
    payment_plans: list[PaymentPlan]
    currency: str
    item_count: int
    has_issues: bool
