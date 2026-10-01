from __future__ import annotations

import logging

from app.core.errors import BadRequest, Conflict, Forbidden, NotFound
from app.core.utils import new_id, now
from app.models.order import (
    STATUS_FLOW, CheckoutRequest, Order, OrderItem, PaymentInfo, StatusEvent,
)
from app.models.user import AuthUser
from app.repositories.store import DocumentStore, InsufficientStock
from app.services.catalog import CatalogService
from app.services.coupons import CouponService
from app.services.payments.base import PaymentRegistry
from app.services.pricing import PricingService

log = logging.getLogger(__name__)
ORDERS = "orders"
# Orders in these states count as a purchase for "verified purchaser" reviews.
PURCHASED = {"confirmed", "processing", "shipped", "out_for_delivery", "delivered"}
CANCELLABLE_BY_CUSTOMER = {"pending", "confirmed"}


class OrderService:
    def __init__(self, store: DocumentStore, catalog: CatalogService, pricing: PricingService,
                 coupons: CouponService, payments: PaymentRegistry):
        self.store = store
        self.catalog = catalog
        self.pricing = pricing
        self.coupons = coupons
        self.payments = payments

    # --------------------------------------------------------------- helpers
    async def _save(self, order: Order) -> Order:
        order.updated_at = now()
        await self.store.set(ORDERS, order.id, order.model_dump())
        return order

    async def get(self, order_id: str) -> Order:
        doc = await self.store.get(ORDERS, order_id)
        if not doc:
            raise NotFound("Order")
        return Order.model_validate(doc)

    async def get_for_user(self, user: AuthUser, order_id: str) -> Order:
        order = await self.get(order_id)
        if order.user_id != user.uid and not user.is_admin:
            raise NotFound("Order")
        return order

    def _event(self, order: Order, status: str, note: str | None = None, by: str | None = None) -> None:
        order.status = status  # type: ignore[assignment]
        order.history.append(StatusEvent(status=status, at=now(), note=note, by=by))  # type: ignore[arg-type]

    async def _release_stock(self, order: Order) -> None:
        if order.stock_reserved:
            await self.store.adjust_stock({i.product_id: i.quantity for i in order.items})
            order.stock_reserved = False
            self.catalog.invalidate()

    async def _on_confirmed(self, order: Order) -> None:
        if order.coupon_code:
            coupon = await self.coupons.find(order.coupon_code)
            if coupon:
                await self.coupons.mark_used(coupon)

    # -------------------------------------------------------------- checkout
    async def checkout(self, user: AuthUser, req: CheckoutRequest) -> tuple[Order, dict]:
        provider = self.payments.get(req.payment_provider)
        if provider is None:
            raise BadRequest("Choose a payment method")

        quote, coupon = await self.pricing.quote_lines(
            req.items, coupon_code=req.coupon_code, shipping_method=req.shipping_method, country=req.address.country)
        if quote.has_issues:
            problems = "; ".join(f"{line.name}: {line.issue}" for line in quote.lines if line.issue)
            raise Conflict(f"Update your bag before checking out. {problems}")
        if req.coupon_code and not coupon:
            raise BadRequest(quote.coupon_message or "That coupon can't be applied")

        try:
            await self.store.adjust_stock({line.product_id: -line.quantity for line in quote.lines})
        except InsufficientStock as e:
            raise Conflict(f"Only {e.available} left of one of your items. Update your bag and try again.") from e
        self.catalog.invalidate()

        ts = now()
        seq = await self.store.next_sequence("orders", start=10000)
        order = Order(
            id=new_id("o_"), number=f"OM-{seq}", user_id=user.uid, email=req.address.email,
            items=[OrderItem(product_id=line.product_id, name=line.name, slug=line.slug, image=line.image,
                             unit_price=line.unit_price, quantity=line.quantity, line_total=line.line_total)
                   for line in quote.lines],
            address=req.address, shipping_method=req.shipping_method, subtotal=quote.subtotal,
            discount=quote.discount, coupon_code=quote.coupon_code, shipping=quote.shipping, tax=quote.tax,
            total=quote.total, currency=quote.currency, notes=req.notes,
            payment=PaymentInfo(provider=provider.id, amount=quote.total, currency=quote.currency),
            history=[StatusEvent(status="pending", at=ts, note="Order placed")],
            created_at=ts, updated_at=ts,
        )
        await self._save(order)

        try:
            started = await provider.start(order)
        except Exception as exc:
            log.exception("Payment start failed for %s", order.number)
            await self._release_stock(order)
            self._event(order, "cancelled", "Payment could not be started")
            order.payment.status = "failed"
            await self._save(order)
            raise BadRequest("We couldn't reach the payment provider. Your bag is unchanged; try again.") from exc

        order.payment.reference = started.reference
        if started.status == "cod_due":
            order.payment.status = "cod_due"
            self._event(order, "confirmed", "Cash on delivery")
            await self._on_confirmed(order)
        await self._save(order)
        return order, {"provider": provider.id, **started.client_payload}

    async def restart_payment(self, user: AuthUser, order_id: str) -> tuple[Order, dict]:
        order = await self.get_for_user(user, order_id)
        if order.status != "pending" or order.payment.status not in ("pending", "failed"):
            raise Conflict("This order doesn't need payment")
        provider = self.payments.get(order.payment.provider)
        if provider is None:
            raise BadRequest("That payment method is no longer available")
        started = await provider.start(order)
        order.payment.reference = started.reference
        order.payment.status = "pending"
        await self._save(order)
        return order, {"provider": provider.id, **started.client_payload}

    async def confirm_payment(self, user: AuthUser, order_id: str, payload: dict) -> Order:
        order = await self.get_for_user(user, order_id)
        if order.payment.status == "paid":
            return order  # idempotent
        if order.status != "pending":
            raise Conflict("This order can no longer be paid")
        provider = self.payments.get(order.payment.provider)
        if provider is None:
            raise BadRequest("That payment method is no longer available")
        result = await provider.verify(order, payload)
        if not result.ok:
            order.payment.status = "failed"
            await self._save(order)
            raise BadRequest(result.message or "Payment failed. Try again or use another method.")
        order.payment.status = "paid"
        order.payment.transaction_id = result.transaction_id
        order.payment.paid_at = now()
        self._event(order, "confirmed", "Payment received")
        await self._on_confirmed(order)
        return await self._save(order)

    # ------------------------------------------------------------- customers
    async def list_for_user(self, uid: str) -> list[Order]:
        docs = await self.store.list(ORDERS, where=[("user_id", "==", uid)], order_by="created_at", descending=True)
        return [Order.model_validate(d) for d in docs]

    async def cancel_by_customer(self, user: AuthUser, order_id: str) -> Order:
        order = await self.get_for_user(user, order_id)
        if order.user_id != user.uid:
            raise Forbidden()
        if order.status not in CANCELLABLE_BY_CUSTOMER:
            raise Conflict("This order has already been packed and can't be cancelled. Contact us for a return.")
        return await self._cancel(order, "Cancelled by customer", by=user.uid)

    async def has_purchased(self, uid: str, product_id: str) -> bool:
        return any(o.status in PURCHASED and any(i.product_id == product_id for i in o.items)
                   for o in await self.list_for_user(uid))

    # ----------------------------------------------------------------- admin
    async def list_all(self, *, status: str | None = None, q: str | None = None,
                       payment_status: str | None = None, user_id: str | None = None) -> list[Order]:
        where = [("status", "==", status)] if status else []
        docs = await self.store.list(ORDERS, where=where, order_by="created_at", descending=True)
        orders = [Order.model_validate(d) for d in docs]
        if payment_status:
            orders = [o for o in orders if o.payment.status == payment_status]
        if user_id:
            orders = [o for o in orders if o.user_id == user_id]
        if q:
            needle = q.strip().lower()
            orders = [o for o in orders if needle in o.number.lower() or needle in o.email.lower()
                      or needle in o.address.full_name.lower() or needle in o.address.phone
                      or needle == o.id]
        return orders

    async def update_status(self, order_id: str, status: str, note: str | None, tracking: str | None,
                            admin: AuthUser) -> Order:
        order = await self.get(order_id)
        if status == "cancelled":
            return await self._cancel(order, note or "Cancelled by store", by=admin.uid)
        if status == "refunded":
            return await self.refund(order_id, note, "refunded", admin)
        if status not in STATUS_FLOW[order.status]:
            raise Conflict(f"An order that is {order.status.replace('_', ' ')} can't move to {status.replace('_', ' ')}")
        if status == "confirmed" and order.payment.status == "pending":
            raise Conflict("This order hasn't been paid yet")
        if tracking:
            order.tracking_number = tracking
        self._event(order, status, note, by=admin.uid)
        if status == "delivered" and order.payment.status == "cod_due":
            order.payment.status = "paid"
            order.payment.paid_at = now()
        return await self._save(order)

    async def _cancel(self, order: Order, note: str, by: str) -> Order:
        if "cancelled" not in STATUS_FLOW[order.status]:
            raise Conflict("Shipped orders can't be cancelled; process a refund once returned")
        await self._release_stock(order)
        self._event(order, "cancelled", note, by=by)
        if order.payment.status == "paid":
            order.payment.status = "refund_pending"
        elif order.payment.status in ("pending", "failed", "cod_due"):
            order.payment.status = "void"  # nothing was collected
        return await self._save(order)

    async def refund(self, order_id: str, note: str | None, status: str, admin: AuthUser) -> Order:
        order = await self.get(order_id)
        if order.status not in ("delivered", "cancelled") and "cancelled" in STATUS_FLOW[order.status]:
            order = await self._cancel(order, "Cancelled for refund", by=admin.uid)
        if order.status not in ("delivered", "cancelled"):
            raise Conflict("Only delivered or cancelled orders can be refunded")
        if status == "refund_pending":
            order.payment.status = "refund_pending"
            return await self._save(order)
        provider = self.payments.get(order.payment.provider)
        if provider and order.payment.transaction_id and order.payment.status in ("paid", "refund_pending"):
            try:
                order.payment.refund_reference = await provider.refund(order)
            except Exception as exc:
                log.exception("Refund failed for %s", order.number)
                raise BadRequest("The payment provider rejected the refund. Try again or refund manually.") from exc
        order.payment.status = "refunded"
        self._event(order, "refunded", note or "Refund processed", by=admin.uid)
        return await self._save(order)
