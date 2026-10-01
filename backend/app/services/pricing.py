"""The single source of truth for money. The frontend never computes totals;
it renders the quote returned from here, and checkout recomputes it."""
from __future__ import annotations

from app.core.config import Settings
from app.core.utils import money
from app.models.cart import CartLine, Quote, QuoteLine, QuoteRequest, ShippingOption
from app.models.marketing import Coupon
from app.services.catalog import CatalogService
from app.services.coupons import CouponService


class PricingService:
    def __init__(self, settings: Settings, catalog: CatalogService, coupons: CouponService):
        self.s = settings
        self.catalog = catalog
        self.coupons = coupons

    def shipping_options(self, subtotal: float) -> list[ShippingOption]:
        free = subtotal >= self.s.free_shipping_threshold
        return [
            ShippingOption(method="standard", label="Standard", eta="5–8 business days",
                           fee=0 if free or subtotal == 0 else self.s.standard_shipping_fee),
            ShippingOption(method="express", label="Express", eta="2–3 business days",
                           fee=self.s.express_shipping_fee if subtotal else 0),
        ]

    async def quote(self, req: QuoteRequest) -> tuple[Quote, Coupon | None]:
        merged: dict[str, int] = {}
        for line in req.items:
            merged[line.product_id] = merged.get(line.product_id, 0) + line.quantity
        products = await self.catalog.get_products(list(merged))

        lines: list[QuoteLine] = []
        for pid, qty in merged.items():
            p = products.get(pid)
            if p is None or not p.is_published:
                lines.append(QuoteLine(product_id=pid, name="Unavailable item", slug="", image=None, unit_price=0,
                                       compare_at_price=None, quantity=qty, line_total=0, stock=0,
                                       available=False, issue="This item is no longer available"))
                continue
            issue = None
            if p.stock <= 0:
                issue = "Out of stock"
            elif qty > p.stock:
                issue = f"Only {p.stock} left"
            lines.append(QuoteLine(
                product_id=pid, name=p.name, slug=p.slug, image=p.images[0].url if p.images else None,
                unit_price=p.price, compare_at_price=p.compare_at_price, quantity=qty,
                line_total=money(p.price * qty), stock=p.stock, available=issue is None, issue=issue,
            ))

        subtotal = money(sum(line.line_total for line in lines if line.available))
        options = self.shipping_options(subtotal)
        shipping = next(o.fee for o in options if o.method == req.shipping_method)

        discount, coupon, message = 0.0, None, None
        if req.coupon_code and req.coupon_code.strip():
            found = await self.coupons.find(req.coupon_code)
            applied, discount, shipping, message = self.coupons.evaluate(found, req.coupon_code, subtotal, shipping)
            coupon = found if applied else None

        tax = money((subtotal - discount) * self.s.tax_rate)
        total = money(subtotal - discount + shipping + tax)
        quote = Quote(
            lines=lines, subtotal=subtotal, discount=discount,
            coupon_code=coupon.code if coupon else None, coupon_message=message,
            shipping_method=req.shipping_method, shipping=shipping, shipping_options=options,
            tax=tax, tax_rate=self.s.tax_rate, total=total, currency=self.s.currency,
            item_count=sum(line.quantity for line in lines if line.available),
            has_issues=any(not line.available for line in lines),
        )
        return quote, coupon

    async def quote_lines(self, items: list[CartLine], **kw) -> tuple[Quote, Coupon | None]:
        return await self.quote(QuoteRequest(items=items, **kw))
