"""Products, categories and search.

Simply Odd is a small-batch catalogue (hundreds, not millions, of products),
so the published catalogue is cached in-process for a few seconds and
filtered/sorted/searched in Python. That gives richer filtering than
Firestore queries allow without extra indexes or a search service. If the
catalogue outgrows this, swap `_all_products` for Algolia/Typesense.
"""
from __future__ import annotations

import math
import time
from typing import Literal

from app.core.errors import Conflict, NotFound
from app.core.utils import new_id, now, slugify
from app.models.catalog import (
    Category, CategoryCreate, CategoryUpdate, Product, ProductCreate, ProductUpdate, SortKey,
)
from app.models.common import Page
from app.repositories.store import DocumentStore

PRODUCTS = "products"
CATEGORIES = "categories"
SEARCH_STATS = "search_stats"

DEFAULT_POPULAR = ["lamp", "vase", "desk", "sculpture", "planter", "weird"]


class CatalogService:
    def __init__(self, store: DocumentStore, cache_seconds: int = 30):
        self.store = store
        self.cache_seconds = cache_seconds
        self._cache: tuple[float, list[Product]] | None = None

    # ---------------------------------------------------------------- cache
    def invalidate(self) -> None:
        self._cache = None

    async def _all_products(self) -> list[Product]:
        if self._cache and time.monotonic() - self._cache[0] < self.cache_seconds:
            return self._cache[1]
        products = [Product.model_validate(d) for d in await self.store.list(PRODUCTS)]
        self._cache = (time.monotonic(), products)
        return products

    # ------------------------------------------------------------- products
    async def list_products(
        self,
        *,
        q: str | None = None,
        category: str | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
        in_stock: bool = False,
        tags: list[str] | None = None,
        flag: Literal["featured", "bestseller", "new"] | None = None,
        sort: SortKey = "newest",
        page: int = 1,
        page_size: int = 24,
        include_unpublished: bool = False,
    ) -> Page[Product]:
        items = await self._all_products()
        if not include_unpublished:
            items = [p for p in items if p.is_published]
        if category:
            cat = await self.get_category(category, missing_ok=True)
            cat_id = cat.id if cat else category
            items = [p for p in items if p.category_id == cat_id]
        if min_price is not None:
            items = [p for p in items if p.price >= min_price]
        if max_price is not None:
            items = [p for p in items if p.price <= max_price]
        if in_stock:
            items = [p for p in items if p.stock > 0]
        if tags:
            wanted = {t.lower() for t in tags}
            items = [p for p in items if wanted & {t.lower() for t in p.tags}]
        if flag:
            attr = {"featured": "is_featured", "bestseller": "is_bestseller", "new": "is_new_arrival"}[flag]
            items = [p for p in items if getattr(p, attr)]

        scores: dict[str, float] = {}
        if q and q.strip():
            cats = {c.id: c.name for c in await self.list_categories()}
            for p in items:
                s = _score(p, q, cats.get(p.category_id or "", ""))
                if s > 0:
                    scores[p.id] = s
            items = [p for p in items if p.id in scores]

        items = _sort(items, sort, scores if q and q.strip() else None)
        total = len(items)
        page_size = max(1, min(page_size, 100))
        page = max(1, page)
        start = (page - 1) * page_size
        return Page[Product](
            items=items[start:start + page_size], total=total, page=page,
            page_size=page_size, pages=max(1, math.ceil(total / page_size)),
        )

    async def get_product(self, id_or_slug: str, include_unpublished: bool = False) -> Product:
        doc = await self.store.get(PRODUCTS, id_or_slug)
        product = Product.model_validate(doc) if doc else None
        if product is None:
            product = next((p for p in await self._all_products() if p.slug == id_or_slug), None)
        if product is None or (not product.is_published and not include_unpublished):
            raise NotFound("Product")
        return product

    async def get_products(self, ids: list[str]) -> dict[str, Product]:
        docs = await self.store.get_many(PRODUCTS, ids)
        return {k: Product.model_validate(v) for k, v in docs.items()}

    async def related(self, product: Product, limit: int = 4) -> list[Product]:
        pool = [p for p in await self._all_products() if p.is_published and p.id != product.id]
        tags = set(product.tags)

        def affinity(p: Product) -> tuple:
            return (p.category_id == product.category_id, len(tags & set(p.tags)), p.sales_count)

        return sorted(pool, key=affinity, reverse=True)[:limit]

    async def frequently_bought(self, product: Product, limit: int = 2) -> list[Product]:
        chosen = await self.get_products(product.frequently_bought_with)
        items = [p for p in chosen.values() if p.is_published and p.stock > 0]
        if len(items) < limit:
            # Fall back to bestsellers from other categories: complementary, not duplicates.
            pool = [p for p in await self._all_products()
                    if p.is_published and p.stock > 0 and p.id != product.id
                    and p.category_id != product.category_id and p not in items]
            pool.sort(key=lambda p: p.sales_count, reverse=True)
            items += pool[: limit - len(items)]
        return items[:limit]

    async def _unique_slug(self, base: str, collection: str, exclude_id: str | None = None) -> str:
        base = slugify(base) or "item"
        taken = {d["slug"] for d in await self.store.list(collection) if d.get("id") != exclude_id}
        slug, n = base, 2
        while slug in taken:
            slug, n = f"{base}-{n}", n + 1
        return slug

    async def create_product(self, data: ProductCreate) -> Product:
        ts = now()
        pid = new_id("p_")
        product = Product(
            **data.model_dump(exclude={"slug"}), id=pid,
            slug=await self._unique_slug(data.slug or data.name, PRODUCTS),
            created_at=ts, updated_at=ts,
        )
        await self.store.set(PRODUCTS, pid, product.model_dump(exclude={"discount_percent", "availability"}))
        self.invalidate()
        return product

    async def update_product(self, pid: str, data: ProductUpdate) -> Product:
        current = await self.get_product(pid, include_unpublished=True)
        patch = data.model_dump(exclude_unset=True)
        if "slug" in patch or ("name" in patch and not patch.get("slug")):
            if patch.get("slug") or patch.get("name") != current.name:
                patch["slug"] = await self._unique_slug(patch.get("slug") or patch["name"], PRODUCTS, pid)
            else:
                patch.pop("slug", None)
        if "dimensions" in patch and patch["dimensions"] is not None:
            patch["dimensions"] = data.dimensions.model_dump()
        if "images" in patch:
            patch["images"] = [i.model_dump() for i in data.images or []]
        patch["updated_at"] = now()
        doc = await self.store.update(PRODUCTS, pid, patch)
        self.invalidate()
        return Product.model_validate(doc)

    async def delete_product(self, pid: str) -> Product:
        product = await self.get_product(pid, include_unpublished=True)
        await self.store.delete(PRODUCTS, pid)
        self.invalidate()
        return product

    async def set_rating(self, pid: str, rating: dict) -> None:
        await self.store.update(PRODUCTS, pid, {"rating": rating})
        self.invalidate()

    # ----------------------------------------------------------- categories
    async def list_categories(self) -> list[Category]:
        docs = await self.store.list(CATEGORIES)
        counts: dict[str, int] = {}
        for p in await self._all_products():
            if p.is_published and p.category_id:
                counts[p.category_id] = counts.get(p.category_id, 0) + 1
        cats = [Category.model_validate({**d, "product_count": counts.get(d["id"], 0)}) for d in docs]
        return sorted(cats, key=lambda c: (c.position, c.name))

    async def get_category(self, id_or_slug: str, missing_ok: bool = False) -> Category | None:
        for c in await self.list_categories():
            if id_or_slug in (c.id, c.slug):
                return c
        if missing_ok:
            return None
        raise NotFound("Category")

    async def create_category(self, data: CategoryCreate) -> Category:
        ts = now()
        cid = new_id("c_")
        existing = await self.store.list(CATEGORIES)
        position = data.position or (max((d.get("position", 0) for d in existing), default=0) + 1)
        cat = Category(**data.model_dump(exclude={"slug", "position"}), id=cid, position=position,
                       slug=await self._unique_slug(data.slug or data.name, CATEGORIES),
                       created_at=ts, updated_at=ts)
        await self.store.set(CATEGORIES, cid, cat.model_dump(exclude={"product_count"}))
        return cat

    async def update_category(self, cid: str, data: CategoryUpdate) -> Category:
        await self.get_category(cid)
        patch = data.model_dump(exclude_unset=True)
        if patch.get("slug") or patch.get("name"):
            patch["slug"] = await self._unique_slug(patch.get("slug") or patch["name"], CATEGORIES, cid)
        patch["updated_at"] = now()
        await self.store.update(CATEGORIES, cid, patch)
        return await self.get_category(cid)

    async def delete_category(self, cid: str) -> None:
        cat = await self.get_category(cid)
        if any(p.category_id == cat.id for p in await self._all_products()):
            raise Conflict("Move or delete this category's products first")
        await self.store.delete(CATEGORIES, cat.id)

    async def reorder_categories(self, ids: list[str]) -> list[Category]:
        for i, cid in enumerate(ids):
            await self.store.update(CATEGORIES, cid, {"position": i + 1, "updated_at": now()})
        return await self.list_categories()

    # --------------------------------------------------------------- search
    async def suggestions(self, q: str, limit: int = 6) -> dict:
        q = q.strip().lower()
        if not q:
            return {"products": [], "categories": [], "tags": []}
        page = await self.list_products(q=q, sort="popular", page_size=limit)
        cats = [c for c in await self.list_categories() if q in c.name.lower()][:3]
        tags = sorted({t for p in await self._all_products() if p.is_published for t in p.tags if t.lower().startswith(q)})[:5]
        return {"products": page.items, "categories": cats, "tags": tags}

    async def record_search(self, q: str) -> None:
        term = q.strip().lower()[:60]
        if len(term) < 2:
            return
        await self.store.increment(SEARCH_STATS, slugify(term) or term, "count", 1)
        await self.store.update(SEARCH_STATS, slugify(term) or term, {"term": term})

    async def popular_searches(self, limit: int = 6) -> list[str]:
        docs = await self.store.list(SEARCH_STATS, order_by="count", descending=True, limit=limit)
        terms = [d["term"] for d in docs if d.get("term") and d.get("count", 0) >= 3]
        return (terms + [t for t in DEFAULT_POPULAR if t not in terms])[:limit]


def _score(p: Product, q: str, category_name: str) -> float:
    tokens = [t for t in q.lower().split() if t]
    name, desc = p.name.lower(), f"{p.tagline} {p.description}".lower()
    tags = " ".join(p.tags).lower()
    cat = category_name.lower()
    score = 0.0
    for t in tokens:
        hit = 0.0
        if t in name:
            hit += 6 if any(w.startswith(t) for w in name.split()) else 4
        if t in tags:
            hit += 3
        if t in cat:
            hit += 3
        if t in desc or t in " ".join(p.materials).lower():
            hit += 1
        if hit == 0:
            return 0  # every token must match somewhere
        score += hit
    return score


def _sort(items: list[Product], sort: SortKey, scores: dict[str, float] | None) -> list[Product]:
    if sort == "relevance":
        if scores is None:
            sort = "popular"
        else:
            return sorted(items, key=lambda p: (scores[p.id], p.sales_count), reverse=True)
    key = {
        "newest": lambda p: p.created_at,
        "popular": lambda p: (p.sales_count, p.rating.average),
        "price_asc": lambda p: p.price,
        "price_desc": lambda p: p.price,
        "rating": lambda p: (p.rating.average, p.rating.count),
    }[sort]
    return sorted(items, key=key, reverse=sort not in ("price_asc",))
