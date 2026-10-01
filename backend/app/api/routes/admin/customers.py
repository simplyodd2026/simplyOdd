from fastapi import APIRouter, Depends

from app.core.container import Services, services
from app.models.review import Review

router = APIRouter()


@router.get("/customers")
async def list_customers(q: str | None = None, svc: Services = Depends(services)):
    return await svc.insights.customers(q)


@router.get("/customers/{uid}")
async def get_customer(uid: str, svc: Services = Depends(services)):
    profile = await svc.accounts.get_profile(uid)
    orders = await svc.orders.list_all(user_id=uid)
    wishlist = await svc.accounts.get_wishlist(uid)
    summary = next((c for c in await svc.insights.customers() if c["user_id"] == uid), None)
    return {"profile": profile, "orders": orders, "wishlist_count": len(wishlist), "summary": summary}


@router.get("/reviews", response_model=list[Review])
async def recent_reviews(svc: Services = Depends(services)):
    docs = await svc.store.list("reviews", order_by="created_at", descending=True, limit=200)
    return [Review.model_validate(d) for d in docs]
