"""The single source of truth for money. The frontend never computes totals;
it renders the quote returned from here, and checkout recomputes it."""
from __future__ import annotations

from app.core.constants import (CURRENCY, EXPRESS_SHIPPING_FEE, FREE_SHIPPING_THRESHOLD, MAX_PER_PRODUCT,
                                PARTIAL_SHARE, STANDARD_SHIPPING_FEE)
from app.core.utils import money
from app.models.cart import CartLine, Quote, QuoteLine, QuoteRequest, ShippingOption
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
        # One line per product and colour. A colour sent for a piece that has no
        # colour options is dropped, so it can't split or fail an otherwise valid line.
        merged: dict[tuple[str, str | None], int] = {}
        for line in req.items:
            p = products.get(line.product_id)
            key = (line.product_id, line.color if p is None or p.colors else None)
            merged[key] = merged.get(key, 0) + line.quantity
        # The order limit covers every colour of a product together.
        per_product: dict[str, int] = {}
        for (pid, _), qty in merged.items():
            per_product[pid] = per_product.get(pid, 0) + qty

        lines: list[QuoteLine] = []
        for (pid, color), qty in merged.items():
            p = products.get(pid)
            if p is None or not p.is_published:
                lines.append(QuoteLine(product_id=pid, color=color, name="Unavailable item", slug="", image=None,
                                       unit_price=0, compare_at_price=None, quantity=qty, line_total=0,
                                       available=False, issue="This item is no longer available"))
                continue
            offered = [c for c in p.colors if c in FILAMENTS_BY_ID]
            filament = FILAMENTS_BY_ID.get(color) if color in offered else None
            issue = None
            if offered and color is None:
                issue = "Choose a colour"
            elif color is not None and filament is None:
                issue = "This colour isn't available for this piece. Choose another"
            elif per_product[pid] > MAX_PER_PRODUCT:
                issue = f"You can order up to {MAX_PER_PRODUCT} of this piece"
            image = next((i.url for i in p.images if color and i.color == color), None) \
                or (p.images[0].url if p.images else None)
            lines.append(QuoteLine(
                product_id=pid, color=color, filament=FilamentChoice.of(filament) if filament else None,
                colors=offered, name=p.name, slug=p.slug, image=image,
                unit_price=p.price, compare_at_price=p.compare_at_price, quantity=qty,
                line_total=money(p.price * qty), available=issue is None, issue=issue,
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
            total=total, deposit=money(total * PARTIAL_SHARE), currency=CURRENCY,
            item_count=sum(line.quantity for line in lines if line.available),
            has_issues=any(not line.available for line in lines),
        )
        return quote, coupon

    async def quote_lines(self, items: list[CartLine], paid: bool = False, **kw) -> tuple[Quote, Coupon | None]:
        return await self.quote(QuoteRequest(items=items, **kw), paid)
