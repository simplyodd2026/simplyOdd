from fastapi import APIRouter, Depends, Query

from app.core.container import Services, services
from app.core.security import current_user
from app.models.review import Review, ReviewEligibility, ReviewIn, ReviewWithProduct
from app.models.user import AuthUser

router = APIRouter(tags=["reviews"])


@router.get("/reviews/recent", response_model=list[ReviewWithProduct])
async def recent_reviews(limit: int = Query(12, ge=1, le=30), svc: Services = Depends(services)):
    return await svc.reviews.recent(limit)


@router.get("/products/{product_id}/reviews", response_model=list[Review])
async def list_reviews(product_id: str, svc: Services = Depends(services)):
    product = await svc.catalog.get_product(product_id)
    return await svc.reviews.list_for_product(product.id)


@router.get("/products/{product_id}/reviews/eligibility", response_model=ReviewEligibility)
async def eligibility(product_id: str, user: AuthUser = Depends(current_user), svc: Services = Depends(services)):
    product = await svc.catalog.get_product(product_id)
    return await svc.reviews.eligibility(user, product.id)


@router.post("/products/{product_id}/reviews", response_model=Review, status_code=201)
async def create_review(product_id: str, body: ReviewIn, user: AuthUser = Depends(current_user),
                        svc: Services = Depends(services)):
    profile = await svc.accounts.ensure_profile(user)
    return await svc.reviews.create(user, product_id, body, profile.name or (user.email or "").split("@")[0])


@router.patch("/reviews/{review_id}", response_model=Review)
async def update_review(review_id: str, body: ReviewIn, user: AuthUser = Depends(current_user),
                        svc: Services = Depends(services)):
    return await svc.reviews.update(user, review_id, body)


@router.delete("/reviews/{review_id}", status_code=204)
async def delete_review(review_id: str, user: AuthUser = Depends(current_user), svc: Services = Depends(services)):
    await svc.reviews.delete(user, review_id)
