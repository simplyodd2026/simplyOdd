from typing import Literal

from fastapi import APIRouter, Depends, File, Query, UploadFile

from app.core.container import Services, services
from app.models.catalog import (
    Category, CategoryCreate, CategoryUpdate, Product, ProductCreate, ProductImage, ProductUpdate, SortKey,
)
from app.models.common import Page, Schema
from app.models.homepage import HomepageLayout
from app.services.homepage import images_in
from app.services.media import validate_upload

router = APIRouter()

# Fields that never show on the storefront's prerendered pages, so changing only these doesn't rebuild it.
_NOT_ON_PAGE = {"updated_at", "sales_count", "rating"}


def _changed_on_page(before: Product | None, after: Product | None) -> bool:
    """Whether the storefront's published pages differ after this change."""
    if not (before and before.is_published) and not (after and after.is_published):
        return False  # a draft before and after: nothing public changed
    if before is None or after is None:
        return True
    return before.model_dump(exclude=_NOT_ON_PAGE) != after.model_dump(exclude=_NOT_ON_PAGE)


async def _drop_replaced_image(svc: Services, before: Category, after: Category) -> None:
    old = svc.media.path_from_url(before.image)
    if old and old != svc.media.path_from_url(after.image):
        await svc.media.delete(old)


@router.get("/products", response_model=Page[Product])
async def list_products(
    q: str | None = None, category: str | None = None,
    status: Literal["published", "draft"] | None = None,
    sort: SortKey = "newest", page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=100),
    svc: Services = Depends(services),
):
    result = await svc.catalog.list_products(q=q, category=category, sort=sort, page=1, page_size=100_000,
                                             include_unpublished=True)
    items = result.items
    if status == "published":
        items = [p for p in items if p.is_published]
    elif status == "draft":
        items = [p for p in items if not p.is_published]
    start = (page - 1) * page_size
    return Page[Product](items=items[start:start + page_size], total=len(items), page=page,
                         page_size=page_size, pages=max(1, -(-len(items) // page_size)))


@router.post("/products", response_model=Product, status_code=201)
async def create_product(body: ProductCreate, svc: Services = Depends(services)):
    product = await svc.catalog.create_product(body)
    if _changed_on_page(None, product):
        await svc.rebuild.request(f"published {product.slug}")
    return product


@router.get("/products/{pid}", response_model=Product)
async def get_product(pid: str, svc: Services = Depends(services)):
    return await svc.catalog.get_product(pid, include_unpublished=True)


@router.patch("/products/{pid}", response_model=Product)
async def update_product(pid: str, body: ProductUpdate, svc: Services = Depends(services)):
    before = await svc.catalog.get_product(pid, include_unpublished=True)
    product = await svc.catalog.update_product(pid, body)
    if body.images is not None:  # clean up files for images removed in this edit
        kept = {i.path for i in product.images}
        for img in before.images:
            if img.path and img.path not in kept:
                await svc.media.delete(img.path)
    if _changed_on_page(before, product):
        await svc.rebuild.request(f"updated {product.slug}")
    return product


@router.delete("/products/{pid}", status_code=204)
async def delete_product(pid: str, svc: Services = Depends(services)):
    product = await svc.catalog.delete_product(pid)
    for img in product.images:
        if img.path:
            await svc.media.delete(img.path)
    if _changed_on_page(product, None):
        await svc.rebuild.request(f"deleted {product.slug}")


@router.post("/products/{pid}/images", response_model=Product)
async def upload_product_images(pid: str, files: list[UploadFile] = File(...), svc: Services = Depends(services)):
    product = await svc.catalog.get_product(pid, include_unpublished=True)
    images = list(product.images)
    for f in files:
        data = await f.read()
        ct = validate_upload(data, f.content_type)
        # Filed under the product's slug so the bucket reads by item name.
        url, path = await svc.media.upload(f"products/{product.slug or pid}", f.filename or "image", data, ct)
        images.append(ProductImage(url=url, path=path, alt=product.name))
    updated = await svc.catalog.update_product(pid, ProductUpdate(images=images))
    if _changed_on_page(product, updated):
        await svc.rebuild.request(f"new photos for {updated.slug}")
    return updated


class UploadOut(Schema):
    url: str
    path: str


@router.post("/uploads", response_model=UploadOut)
async def upload(file: UploadFile = File(...), folder: Literal["categories", "homepage", "misc"] = "misc",
                 svc: Services = Depends(services)):
    data = await file.read()
    ct = validate_upload(data, file.content_type)
    url, path = await svc.media.upload(folder, file.filename or "image", data, ct)
    return UploadOut(url=url, path=path)


# ------------------------------------------------------------------ categories
@router.post("/categories", response_model=Category, status_code=201)
async def create_category(body: CategoryCreate, svc: Services = Depends(services)):
    category = await svc.catalog.create_category(body)
    await svc.rebuild.request(f"new collection {category.slug}")
    return category


@router.patch("/categories/{cid}", response_model=Category)
async def update_category(cid: str, body: CategoryUpdate, svc: Services = Depends(services)):
    before = await svc.catalog.get_category(cid)
    category = await svc.catalog.update_category(cid, body)
    await _drop_replaced_image(svc, before, category)
    if before.model_dump(exclude={"updated_at"}) != category.model_dump(exclude={"updated_at"}):
        await svc.rebuild.request(f"updated collection {category.slug}")
    return category


@router.delete("/categories/{cid}", status_code=204)
async def delete_category(cid: str, svc: Services = Depends(services)):
    category = await svc.catalog.get_category(cid)
    await svc.catalog.delete_category(cid)
    if path := svc.media.path_from_url(category.image):
        await svc.media.delete(path)
    await svc.rebuild.request(f"deleted collection {category.slug}")


class Reorder(Schema):
    ids: list[str]


@router.put("/categories/order", response_model=list[Category])
async def reorder_categories(body: Reorder, svc: Services = Depends(services)):
    categories = await svc.catalog.reorder_categories(body.ids)
    await svc.rebuild.request("reordered collections")
    return categories


# ------------------------------------------------------------------ home page
@router.get("/homepage", response_model=HomepageLayout)
async def get_homepage(svc: Services = Depends(services)):
    return await svc.homepage.layout()


@router.put("/homepage", response_model=HomepageLayout)
async def save_homepage(body: HomepageLayout, svc: Services = Depends(services)):
    before = await svc.homepage.layout()
    layout = await svc.homepage.save(body)
    # Photos uploaded just for the home page are removed once nothing uses them; product photos are left alone.
    for url in images_in(before) - images_in(layout):
        path = svc.media.path_from_url(url)
        if path and path.startswith("homepage/"):
            await svc.media.delete(path)
    return layout
