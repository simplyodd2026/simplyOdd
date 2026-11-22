"""The single source of truth for money. The frontend never computes totals;
it renders the quote returned from here, and checkout recomputes it."""
from __future__ import annotations

from app.core.constants import (COD_FEE, CURRENCY, EXPRESS_SHIPPING_FEE, FREE_SHIPPING_THRESHOLD, MAX_PER_PRODUCT,
                                PARTIAL_SHARE, STANDARD_SHIPPING_FEE)
from app.core.utils import money
from app.models.cart import (CartLine, PaymentPlan, Personalization, PersonalizationValue, Quote, QuoteLine, QuoteRequest,
                             ShippingOption, personalization_key)
from app.models.catalog import Product
from app.models.filament import FILAMENTS_BY_ID, FilamentChoice
from app.models.marketing import Coupon
from app.services.catalog import CatalogService
from app.services.coupons import CouponService


class PricingService:
    def __init__(self, catalog: CatalogService, coupons: CouponService):
        self.catalog = catalog
        self.coupons = coupons

    def shipping_options(self, subtotal: float) -> list[ShippingOption]:
        free = subtotal >= FREE_SHIPPING_THRESHOLD
        return [
            ShippingOption(method="standard", label="Standard", eta="Regular courier",
                           fee=0 if free or subtotal == 0 else STANDARD_SHIPPING_FEE),
            ShippingOption(method="express", label="Express", eta="Priority courier",
                           fee=EXPRESS_SHIPPING_FEE if subtotal else 0),
        ]

    async def quote(self, req: QuoteRequest, paid: bool = False) -> tuple[Quote, Coupon | None]:
        """`paid`: re-pricing a bag the shopper has already paid for (see CouponService.problem)."""
        products = await self.catalog.get_products(list(dict.fromkeys(line.product_id for line in req.items)))
        # One line per product, variant, colour and personalisation. A variant, colour or personalisation sent
        # for a piece that doesn't offer one is dropped, so it can't split or fail an otherwise valid line.
        merged: dict[tuple, tuple[str, str | None, str | None, Personalization | None, int]] = {}
        for line in req.items:
            p = products.get(line.product_id)
            variant = line.variant if p is None or p.variants else None
            color = line.color if p is None or p.colors else None
            values = line.personalization if p is None or p.personalization else None
            key = (line.product_id, variant, color, personalization_key(values))
            qty = merged[key][4] if key in merged else 0
            merged[key] = (line.product_id, variant, color, values, qty + line.quantity)
        # The order limit covers every version, colour and personalisation of a product together.
        per_product: dict[str, int] = {}
        for pid, _, _, _, qty in merged.values():
            per_product[pid] = per_product.get(pid, 0) + qty

        lines: list[QuoteLine] = []
        for pid, variant, color, values, qty in merged.values():
            p = products.get(pid)
            if p is None or not p.is_published:
                lines.append(QuoteLine(product_id=pid, variant=variant, color=color, personalization=values, name="Unavailable item",
                                       slug="", image=None, unit_price=0, compare_at_price=None, quantity=qty,
                                       line_total=0, available=False, issue="This item is no longer available"))
                continue
            offered = [c for c in p.colors if c in FILAMENTS_BY_ID]
            filament = FILAMENTS_BY_ID.get(color) if color in offered else None
            details, personalization_issue = _personalize(p, values)
            version = next((v for v in p.variants if v.key == variant), None)
            choice = (p.variant_label or "option").lower()
            issue = None
            if p.variants and variant is None:
                issue = f"Choose a {choice}"
            elif variant is not None and version is None:
                issue = f"This {choice} isn't available any more. Choose another"
            elif offered and color is None:
                issue = "Choose a colour"
            elif color is not None and filament is None:
                issue = "This colour isn't available for this piece. Choose another"
            elif personalization_issue:
                issue = personalization_issue
            elif per_product[pid] > MAX_PER_PRODUCT:
                issue = f"You can order up to {MAX_PER_PRODUCT} of this piece"
            image = _line_image(p, variant if version else None, color)
            fee = p.personalization_fee if details else 0
            base, base_compare = (version.price, version.compare_at_price) if version else (p.price, p.compare_at_price)
            unit_price = money(base + fee)
            lines.append(QuoteLine(
                product_id=pid, color=color, filament=FilamentChoice.of(filament) if filament else None,
                variant=variant, variant_label=version.label if version else None,
                variant_name=p.variant_label, variants=p.variants,
                personalization=values, personalization_details=details,
                personalization_fields=p.personalization, personalization_fee=p.personalization_fee,
                colors=offered, name=p.name, slug=p.slug, image=image,
                unit_price=unit_price, compare_at_price=money(base_compare + fee) if base_compare else None,
                quantity=qty, line_total=money(unit_price * qty), available=issue is None, issue=issue,
            ))

        subtotal = money(sum(line.line_total for line in lines if line.available))
        options = self.shipping_options(subtotal)
        shipping = next(o.fee for o in options if o.method == req.shipping_method)

        discount, coupon, message, needs_amount = 0.0, None, None, False
        if req.coupon_code and req.coupon_code.strip():
            found = await self.coupons.find(req.coupon_code)
            applied, discount, shipping, message = self.coupons.evaluate(
                found, req.coupon_code, subtotal, shipping, req.coupon_amount, paid)
            coupon = found if applied else None
            needs_amount = found is not None and found.kind == "custom_total" \
                and self.coupons.problem(found, req.coupon_code, subtotal) is None

        total = money(subtotal - discount + shipping)
        quote = Quote(
            lines=lines, subtotal=subtotal, discount=discount,
            coupon_code=coupon.code if coupon else None, coupon_message=message, coupon_needs_amount=needs_amount,
            coupon_amount=total if coupon and coupon.kind == "custom_total" else None,
            shipping_method=req.shipping_method, shipping=shipping, shipping_options=options,
            total=total, deposit=money(total * PARTIAL_SHARE), payment_plans=payment_plans(lines), cod_fee=COD_FEE, currency=CURRENCY,
            item_count=sum(line.quantity for line in lines if line.available),
            has_issues=any(not line.available for line in lines),
        )
        return quote, coupon

    async def quote_lines(self, items: list[CartLine], paid: bool = False, **kw) -> tuple[Quote, Coupon | None]:
        return await self.quote(QuoteRequest(items=items, **kw), paid)


def _line_image(p: Product, variant: str | None, color: str | None) -> str | None:
    """The photo that best shows what this line buys: its version in its colour, then its version, then its
    colour, then the first photo. Photos of another version never stand in for this one."""
    fits = [i for i in p.images if i.variant in (None, variant)] or p.images
    ranked = sorted(fits, key=lambda i: (not (variant and i.variant == variant), not (color and i.color == color)))
    return ranked[0].url if ranked else None


def payment_plans(lines: list[QuoteLine]) -> list[PaymentPlan]:
    """Personalised (customised) bags take the 50% advance only; the rest pay in full online or on delivery."""
    if any(line.personalization_details for line in lines):
        return ["partial"]
    return ["full", "cod"]


def _personalize(p: Product, values: Personalization | None) -> tuple[list[PersonalizationValue], str | None]:
    """The shopper's values checked against the product's fields: the accepted
    ones in field order, and what's wrong with them, if anything."""
    values = values or {}
    details: list[PersonalizationValue] = []
    for f in p.personalization:
        value = values.get(f.key, "")
        if not value:
            if f.required:
                return details, f"Add the {f.label.lower()} for this piece"
            continue
        if len(value) > f.max_length:
            return details, f"{f.label} can be up to {f.max_length} characters"
        details.append(PersonalizationValue(key=f.key, label=f.label, value=value))
    unknown = values.keys() - {f.key for f in p.personalization}
    if unknown:
        return details, "This piece's personalisation options have changed. Remove it and add it again"
    return details, None
