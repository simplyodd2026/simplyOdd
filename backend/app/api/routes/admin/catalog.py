from typing import Literal

from fastapi import APIRouter, Depends, File, Query, UploadFile

from app.core.container import Services, services
from app.core.errors import BadRequest
from app.models.catalog import (
    Category, CategoryCreate, CategoryUpdate, Product, ProductCreate, ProductImage, ProductUpdate, SortKey,
)
from app.models.common import Page, Schema
from app.services.media import validate_upload

router = APIRouter()


async def _drop_replaced_image(svc: Services, before: Category, after: Category) -> None:
    old = svc.media.path_from_url(before.image)
    if old and old != svc.media.path_from_url(after.image):
        await svc.media.delete(old)


@router.get("/products", response_model=Page[Product])
async def list_products(
    q: str | None = None, category: str | None = None,
    status: Literal["published", "draft", "out_of_stock", "low_stock"] | None = None,
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
    elif status == "out_of_stock":
        items = [p for p in items if p.stock <= 0]
    elif status == "low_stock":
        items = [p for p in items if 0 < p.stock <= 5]
    start = (page - 1) * page_size
    return Page[Product](items=items[start:start + page_size], total=len(items), page=page,
                         page_size=page_size, pages=max(1, -(-len(items) // page_size)))


@router.post("/products", response_model=Product, status_code=201)
async def create_product(body: ProductCreate, svc: Services = Depends(services)):
    return await svc.catalog.create_product(body)


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
    return product


@router.delete("/products/{pid}", status_code=204)
async def delete_product(pid: str, svc: Services = Depends(services)):
    product = await svc.catalog.delete_product(pid)
    for img in product.images:
        if img.path:
            await svc.media.delete(img.path)


@router.post("/products/{pid}/images", response_model=Product)
async def upload_product_images(pid: str, files: list[UploadFile] = File(...), svc: Services = Depends(services)):
    product = await svc.catalog.get_product(pid, include_unpublished=True)
    if len(product.images) + len(files) > 12:
        raise BadRequest("A product can have up to 12 images")
    images = list(product.images)
    for f in files:
        data = await f.read()
        ct = validate_upload(data, f.content_type)
        # Filed under the product's slug so the bucket reads by item name.
        url, path = await svc.media.upload(f"products/{product.slug or pid}", f.filename or "image", data, ct)
        images.append(ProductImage(url=url, path=path, alt=product.name))
    return await svc.catalog.update_product(pid, ProductUpdate(images=images))


class UploadOut(Schema):
    url: str
    path: str


@router.post("/uploads", response_model=UploadOut)
async def upload(file: UploadFile = File(...), folder: Literal["categories", "misc"] = "misc",
                 svc: Services = Depends(services)):
    data = await file.read()
    ct = validate_upload(data, file.content_type)
    url, path = await svc.media.upload(folder, file.filename or "image", data, ct)
    return UploadOut(url=url, path=path)


# ------------------------------------------------------------------ categories
@router.post("/categories", response_model=Category, status_code=201)
async def create_category(body: CategoryCreate, svc: Services = Depends(services)):
    return await svc.catalog.create_category(body)


@router.patch("/categories/{cid}", response_model=Category)
async def update_category(cid: str, body: CategoryUpdate, svc: Services = Depends(services)):
    before = await svc.catalog.get_category(cid)
    category = await svc.catalog.update_category(cid, body)
    await _drop_replaced_image(svc, before, category)
    return category


@router.delete("/categories/{cid}", status_code=204)
async def delete_category(cid: str, svc: Services = Depends(services)):
    category = await svc.catalog.get_category(cid)
    await svc.catalog.delete_category(cid)
    if path := svc.media.path_from_url(category.image):
        await svc.media.delete(path)


class Reorder(Schema):
    ids: list[str]


@router.put("/categories/order", response_model=list[Category])
async def reorder_categories(body: Reorder, svc: Services = Depends(services)):
    return await svc.catalog.reorder_categories(body.ids)
