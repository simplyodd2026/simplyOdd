from __future__ import annotations

from app.core.errors import Conflict, NotFound
from app.core.utils import money, new_id, now
from app.models.marketing import Coupon, CouponCreate, CouponUpdate
from app.repositories.store import DocumentStore

COUPONS = "coupons"


class CouponService:
    def __init__(self, store: DocumentStore):
        self.store = store

    async def list(self) -> list[Coupon]:
        docs = await self.store.list(COUPONS, order_by="created_at", descending=True)
        return [Coupon.model_validate(d) for d in docs]

    async def find(self, code: str) -> Coupon | None:
        docs = await self.store.list(COUPONS, where=[("code", "==", code.strip().upper())], limit=1)
        return Coupon.model_validate(docs[0]) if docs else None

    async def create(self, data: CouponCreate) -> Coupon:
        code = data.code.strip().upper()
        if await self.find(code):
            raise Conflict("A coupon with that code already exists")
        ts = now()
        coupon = Coupon(**data.model_dump(exclude={"code"}), code=code, id=new_id("cp_"), created_at=ts, updated_at=ts)
        await self.store.set(COUPONS, coupon.id, coupon.model_dump())
        return coupon

    async def update(self, cid: str, data: CouponUpdate) -> Coupon:
        doc = await self.store.update(COUPONS, cid, {**data.model_dump(exclude_unset=True), "updated_at": now()})
        if not doc:
            raise NotFound("Coupon")
        return Coupon.model_validate(doc)

    async def delete(self, cid: str) -> None:
        if not await self.store.delete(COUPONS, cid):
            raise NotFound("Coupon")

    async def mark_used(self, coupon: Coupon) -> None:
        await self.store.increment(COUPONS, coupon.id, "used_count", 1)

    def evaluate(self, coupon: Coupon | None, code: str, subtotal: float, shipping: float) -> tuple[bool, float, float, str]:
        """Returns (applied, discount, shipping_after, message)."""
        if coupon is None or not coupon.active:
            return False, 0, shipping, f"{code.upper()} isn't a valid code"
        ts = now()
        if coupon.starts_at and ts < coupon.starts_at:
            return False, 0, shipping, f"{coupon.code} isn't active yet"
        if coupon.expires_at and ts > coupon.expires_at:
            return False, 0, shipping, f"{coupon.code} has expired"
        if coupon.usage_limit is not None and coupon.used_count >= coupon.usage_limit:
            return False, 0, shipping, f"{coupon.code} has been fully redeemed"
        if subtotal < coupon.min_subtotal:
            return False, 0, shipping, f"Add items worth {coupon.min_subtotal - subtotal:.0f} more to use {coupon.code}"
        if coupon.kind == "free_shipping":
            return True, 0, 0, f"{coupon.code} applied: free shipping"
        discount = subtotal * coupon.value / 100 if coupon.kind == "percent" else coupon.value
        if coupon.max_discount is not None:
            discount = min(discount, coupon.max_discount)
        discount = money(min(discount, subtotal))
        return True, discount, shipping, f"{coupon.code} applied"
