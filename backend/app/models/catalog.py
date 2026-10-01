from datetime import datetime
from typing import Literal

from pydantic import Field, computed_field

from app.models.common import Schema


class ProductImage(Schema):
    url: str
    path: str | None = None  # Storage object path, used for deletion
    alt: str = ""


class Dimensions(Schema):
    width_cm: float | None = None
    height_cm: float | None = None
    depth_cm: float | None = None


class RatingSummary(Schema):
    average: float = 0
    count: int = 0
    distribution: dict[str, int] = Field(default_factory=lambda: {str(i): 0 for i in range(1, 6)})


class ProductBase(Schema):
    name: str = Field(min_length=1, max_length=140)
    slug: str | None = None
    tagline: str = ""
    description: str = ""
    price: float = Field(ge=0)
    compare_at_price: float | None = Field(default=None, ge=0)
    stock: int = Field(default=0, ge=0)
    category_id: str | None = None
    tags: list[str] = []
    materials: list[str] = []
    dimensions: Dimensions = Dimensions()
    weight_g: float | None = None
    manufacturing: str = ""
    images: list[ProductImage] = []
    is_featured: bool = False
    is_bestseller: bool = False
    is_new_arrival: bool = False
    is_published: bool = True
    frequently_bought_with: list[str] = []


class ProductCreate(ProductBase):
    pass


class ProductUpdate(Schema):
    name: str | None = None
    slug: str | None = None
    tagline: str | None = None
    description: str | None = None
    price: float | None = Field(default=None, ge=0)
    compare_at_price: float | None = None
    stock: int | None = Field(default=None, ge=0)
    category_id: str | None = None
    tags: list[str] | None = None
    materials: list[str] | None = None
    dimensions: Dimensions | None = None
    weight_g: float | None = None
    manufacturing: str | None = None
    images: list[ProductImage] | None = None
    is_featured: bool | None = None
    is_bestseller: bool | None = None
    is_new_arrival: bool | None = None
    is_published: bool | None = None
    frequently_bought_with: list[str] | None = None


class Product(ProductBase):
    id: str
    slug: str
    rating: RatingSummary = RatingSummary()
    sales_count: int = 0
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def discount_percent(self) -> int:
        if self.compare_at_price and self.compare_at_price > self.price:
            return round((1 - self.price / self.compare_at_price) * 100)
        return 0

    @computed_field
    @property
    def availability(self) -> Literal["in_stock", "low_stock", "out_of_stock"]:
        if self.stock <= 0:
            return "out_of_stock"
        return "low_stock" if self.stock <= 5 else "in_stock"


class CategoryBase(Schema):
    name: str = Field(min_length=1, max_length=80)
    slug: str | None = None
    description: str = ""
    image: str | None = None
    position: int = 0


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(Schema):
    name: str | None = None
    slug: str | None = None
    description: str | None = None
    image: str | None = None
    position: int | None = None


class Category(CategoryBase):
    id: str
    slug: str
    product_count: int = 0
    created_at: datetime
    updated_at: datetime


SortKey = Literal["relevance", "newest", "popular", "price_asc", "price_desc", "rating"]
