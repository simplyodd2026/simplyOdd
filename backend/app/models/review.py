from datetime import datetime

from pydantic import Field

from app.models.common import Schema


class ReviewIn(Schema):
    rating: int = Field(ge=1, le=5)
    title: str = Field(default="", max_length=120)
    body: str = Field(default="", max_length=3000)


class Review(ReviewIn):
    id: str
    product_id: str
    user_id: str
    author_name: str
    verified: bool = True
    created_at: datetime
    updated_at: datetime


class ReviewWithProduct(Review):
    """A review plus just enough of its product to show it outside the product page."""
    product_name: str
    product_slug: str
    product_image: str | None = None


class ReviewEligibility(Schema):
    can_review: bool
    reason: str | None = None
    existing_review_id: str | None = None
