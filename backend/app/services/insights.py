"""Admin dashboard numbers, newsletter and custom-order requests."""
from __future__ import annotations

from collections import defaultdict
from datetime import timedelta

from app.core.errors import Conflict, NotFound
from app.core.utils import money, new_id, now
from app.models.marketing import CustomRequest, CustomRequestIn, CustomRequestUpdate, Subscriber
from app.repositories.store import DocumentStore
from app.services.accounts import AccountService
from app.services.catalog import CatalogService
from app.services.orders import OrderService

REVENUE_STATUSES = {"confirmed", "processing", "shipped", "out_for_delivery", "delivered"}
NEWSLETTER = "newsletter"
CUSTOM_REQUESTS = "custom_requests"


class InsightsService:
    def __init__(self, store: DocumentStore, catalog: CatalogService, orders: OrderService, accounts: AccountService):
        self.store = store
        self.catalog = catalog
        self.orders = orders
        self.accounts = accounts

    async def dashboard(self, days: int = 30) -> dict:
        orders = await self.orders.list_all()
        since = now() - timedelta(days=days)
        recent = [o for o in orders if o.created_at >= since]
        earning = [o for o in recent if o.status in REVENUE_STATUSES]

        daily: dict[str, float] = defaultdict(float)
        for o in earning:
            daily[o.created_at.date().isoformat()] += o.total
        series = []
        for i in range(days - 1, -1, -1):
            d = (now() - timedelta(days=i)).date().isoformat()
            series.append({"date": d, "revenue": money(daily.get(d, 0))})

        units: dict[str, dict] = {}
        for o in earning:
            for it in o.items:
                u = units.setdefault(it.product_id, {"product_id": it.product_id, "name": it.name, "units": 0, "revenue": 0.0})
                u["units"] += it.quantity
                u["revenue"] = money(u["revenue"] + it.line_total)

        products = (await self.catalog.list_products(include_unpublished=True, page_size=100)).items
        status_counts: dict[str, int] = defaultdict(int)
        for o in orders:
            status_counts[o.status] += 1
        revenue = money(sum(o.total for o in earning))
        return {
            "period_days": days,
            "revenue": revenue,
            "orders": len(recent),
            "average_order_value": money(revenue / len(earning)) if earning else 0,
            "customers": len(await self.accounts.list_profiles()),
            "to_fulfil": sum(1 for o in orders if o.status in ("confirmed", "processing")),
            "status_counts": dict(status_counts),
            "revenue_series": series,
            "top_products": sorted(units.values(), key=lambda u: u["revenue"], reverse=True)[:5],
            "low_stock": [{"id": p.id, "name": p.name, "stock": p.stock} for p in sorted(products, key=lambda p: p.stock)
                          if p.stock <= 5][:8],
            "recent_orders": [o.model_dump(include={"id", "number", "email", "total", "status", "created_at"})
                              for o in orders[:6]],
        }

    async def customers(self, q: str | None = None) -> list[dict]:
        orders = await self.orders.list_all()
        by_user: dict[str, list] = defaultdict(list)
        for o in orders:
            by_user[o.user_id].append(o)
        out = []
        for p in await self.accounts.list_profiles():
            mine = by_user.get(p.user_id, [])
            spent = money(sum(o.total for o in mine if o.status in REVENUE_STATUSES))
            row = {"user_id": p.user_id, "name": p.name, "email": p.email, "phone": p.phone,
                   "created_at": p.created_at, "order_count": len(mine), "total_spent": spent,
                   "last_order_at": mine[0].created_at if mine else None, "is_admin": p.is_admin}
            if not q or q.lower() in f"{p.name} {p.email} {p.phone}".lower():
                out.append(row)
        return out

    # ------------------------------------------------------------ newsletter
    async def subscribe(self, email: str) -> Subscriber:
        email = email.strip().lower()
        existing = await self.store.list(NEWSLETTER, where=[("email", "==", email)], limit=1)
        if existing:
            raise Conflict("You're already on the list")
        sub = Subscriber(id=new_id("n_"), email=email, created_at=now())
        await self.store.set(NEWSLETTER, sub.id, sub.model_dump())
        return sub

    async def subscribers(self) -> list[Subscriber]:
        return [Subscriber.model_validate(d) for d in
                await self.store.list(NEWSLETTER, order_by="created_at", descending=True)]

    async def unsubscribe(self, sid: str) -> None:
        await self.store.delete(NEWSLETTER, sid)

    # ------------------------------------------------------- custom requests
    async def request_custom(self, data: CustomRequestIn) -> CustomRequest:
        ts = now()
        body = data.model_dump()
        body["email"] = body["email"].strip().lower()
        body["colours"] = [c.strip()[:20] for c in body["colours"] if c.strip()]
        req = CustomRequest(id=new_id("cr_"), created_at=ts, updated_at=ts, **body)
        await self.store.set(CUSTOM_REQUESTS, req.id, req.model_dump())
        return req

    async def custom_requests(self) -> list[CustomRequest]:
        return [CustomRequest.model_validate(d) for d in
                await self.store.list(CUSTOM_REQUESTS, order_by="created_at", descending=True)]

    async def update_custom_request(self, rid: str, data: CustomRequestUpdate) -> CustomRequest:
        doc = await self.store.get(CUSTOM_REQUESTS, rid)
        if not doc:
            raise NotFound("Request")
        req = CustomRequest.model_validate({**doc, "status": data.status, "updated_at": now()})
        await self.store.set(CUSTOM_REQUESTS, rid, req.model_dump())
        return req

    async def delete_custom_request(self, rid: str) -> None:
        await self.store.delete(CUSTOM_REQUESTS, rid)
