from __future__ import annotations

from app.core.errors import BadRequest
from app.core.utils import now
from app.models.homepage import Homepage, HomepageLayout, HomeSlot
from app.repositories.store import DocumentStore
from app.services.catalog import CatalogService

SETTINGS = "settings"
HOMEPAGE = "homepage"


def _slots(layout: HomepageLayout) -> list[HomeSlot]:
    return [s for s in (layout.spotlight, layout.room, *layout.collection, *layout.collection_row, *layout.moodboard) if s]


def images_in(layout: HomepageLayout) -> set[str]:
    return {u for u in (layout.spotlight_inset, layout.studio_image, *(s.image for s in _slots(layout))) if u}


class HomepageService:
    def __init__(self, store: DocumentStore, catalog: CatalogService):
        self.store = store
        self.catalog = catalog

    async def layout(self) -> HomepageLayout:
        doc = await self.store.get(SETTINGS, HOMEPAGE)
        return HomepageLayout.model_validate(doc) if doc else HomepageLayout()

    async def save(self, layout: HomepageLayout) -> HomepageLayout:
        ids = list({s.product_id for s in _slots(layout)})
        found = await self.catalog.get_products(ids)
        if missing := [i for i in ids if i not in found]:
            raise BadRequest(f"Unknown product: {', '.join(missing)}")
        layout = layout.model_copy(update={"updated_at": now()})
        await self.store.set(SETTINGS, HOMEPAGE, layout.model_dump(mode="json"))
        return layout

    async def public(self) -> Homepage:
        """The layout as shoppers see it: slots whose product is unpublished or gone are dropped,
        so the section falls back to choosing on its own."""
        layout = await self.layout()
        found = await self.catalog.get_products(list({s.product_id for s in _slots(layout)}))
        live = {pid: p for pid, p in found.items() if p.is_published}

        def keep(slot: HomeSlot | None) -> HomeSlot | None:
            return slot if slot and slot.product_id in live else None

        layout = layout.model_copy(update={
            "spotlight": keep(layout.spotlight),
            "room": keep(layout.room),
            "collection": [s for s in layout.collection if keep(s)],
            "collection_row": [s for s in layout.collection_row if keep(s)],
            "moodboard": [s for s in layout.moodboard if keep(s)],
        })
        return Homepage(layout=layout, products=list(live.values()))
