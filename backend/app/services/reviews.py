from __future__ import annotations

from app.core.errors import Conflict, Forbidden, NotFound
from app.core.utils import new_id, now
from app.models.review import Review, ReviewEligibility, ReviewIn, ReviewWithProduct
from app.models.user import AuthUser
from app.repositories.store import DocumentStore
from app.services.catalog import CatalogService
from app.services.orders import OrderService

REVIEWS = "reviews"


class ReviewService:
    def __init__(self, store: DocumentStore, catalog: CatalogService, orders: OrderService):
        self.store = store
        self.catalog = catalog
        self.orders = orders

    async def list_for_product(self, product_id: str) -> list[Review]:
        docs = await self.store.list(REVIEWS, where=[("product_id", "==", product_id)],
                                     order_by="created_at", descending=True)
        return [Review.model_validate(d) for d in docs]

    async def recent(self, limit: int = 12) -> list[ReviewWithProduct]:
        """Newest reviews across the catalogue, skipping any whose product is gone or unpublished."""
        docs = await self.store.list(REVIEWS, order_by="created_at", descending=True, limit=limit * 2)
        reviews = [Review.model_validate(d) for d in docs]
        products = await self.catalog.get_products(list({r.product_id for r in reviews}))
        out: list[ReviewWithProduct] = []
        for r in reviews:
            p = products.get(r.product_id)
            if p is None or not p.is_published:
                continue
            out.append(ReviewWithProduct(**r.model_dump(), product_name=p.name, product_slug=p.slug,
                                         product_image=p.images[0].url if p.images else None))
            if len(out) == limit:
                break
        return out

    async def _mine(self, uid: str, product_id: str) -> Review | None:
        docs = await self.store.list(REVIEWS, where=[("product_id", "==", product_id), ("user_id", "==", uid)], limit=1)
        return Review.model_validate(docs[0]) if docs else None

    async def eligibility(self, user: AuthUser, product_id: str) -> ReviewEligibility:
        existing = await self._mine(user.uid, product_id)
        if existing:
            return ReviewEligibility(can_review=True, existing_review_id=existing.id)
        if not await self.orders.has_purchased(user.uid, product_id):
            return ReviewEligibility(can_review=False, reason="Reviews are open to people who've bought this piece.")
        return ReviewEligibility(can_review=True)

    async def create(self, user: AuthUser, product_id: str, data: ReviewIn, author_name: str) -> Review:
        product = await self.catalog.get_product(product_id)
        if await self._mine(user.uid, product.id):
            raise Conflict("You've already reviewed this. Edit your review instead.")
        if not await self.orders.has_purchased(user.uid, product.id):
            raise Forbidden("Only verified purchasers can review this product")
        ts = now()
        review = Review(**data.model_dump(), id=new_id("r_"), product_id=product.id, user_id=user.uid,
                        author_name=author_name or "Simply Odd customer", created_at=ts, updated_at=ts)
        await self.store.set(REVIEWS, review.id, review.model_dump())
        await self._recompute(product.id)
        return review

    async def _owned(self, user: AuthUser, review_id: str) -> Review:
        doc = await self.store.get(REVIEWS, review_id)
        if not doc:
            raise NotFound("Review")
        review = Review.model_validate(doc)
        if review.user_id != user.uid and not user.is_admin:
            raise Forbidden()
        return review

    async def update(self, user: AuthUser, review_id: str, data: ReviewIn) -> Review:
        review = await self._owned(user, review_id)
        doc = await self.store.update(REVIEWS, review_id, {**data.model_dump(), "updated_at": now()})
        await self._recompute(review.product_id)
        return Review.model_validate(doc)

    async def delete(self, user: AuthUser, review_id: str) -> None:
        review = await self._owned(user, review_id)
        await self.store.delete(REVIEWS, review_id)
        await self._recompute(review.product_id)

    async def _recompute(self, product_id: str) -> None:
        reviews = await self.list_for_product(product_id)
        dist = {str(i): 0 for i in range(1, 6)}
        for r in reviews:
            dist[str(r.rating)] += 1
        count = len(reviews)
        avg = round(sum(r.rating for r in reviews) / count, 2) if count else 0
        await self.catalog.set_rating(product_id, {"average": avg, "count": count, "distribution": dist})
