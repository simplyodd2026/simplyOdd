from datetime import datetime

from pydantic import Field, model_validator

from app.models.catalog import Product
from app.models.common import Schema


class HomeSlot(Schema):
    """A product placed on the home page, and optionally which photo of it to show (any image URL,
    one of the product's own or an uploaded one). No image means the section picks as it normally would."""
    product_id: str
    image: str | None = None


class HomepageLayout(Schema):
    """What the home page shows, chosen in the admin. Anything left empty is filled automatically,
    the way the page has always chosen: featured and best-selling pieces first."""
    spotlight: HomeSlot | None = None
    spotlight_inset: str | None = None
    collection: list[HomeSlot] = Field(default_factory=list, max_length=2)
    collection_row: list[HomeSlot] = Field(default_factory=list, max_length=12)
    room: HomeSlot | None = None
    moodboard: list[HomeSlot] = Field(default_factory=list, max_length=12)
    studio_image: str | None = None
    updated_at: datetime | None = None

    @model_validator(mode="before")
    @classmethod
    def _split_collection(cls, data):
        # Layouts saved before the sliding row had its own list kept all the pieces in `collection`.
        if isinstance(data, dict) and len(data.get("collection") or []) > 2 and not data.get("collection_row"):
            data = {**data, "collection": data["collection"][:2], "collection_row": data["collection"][2:14]}
        return data


class Homepage(Schema):
    """The layout with every product it names, so the storefront can render it in one request."""
    layout: HomepageLayout
    products: list[Product]
