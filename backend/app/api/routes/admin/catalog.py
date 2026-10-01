from typing import Literal

from fastapi import APIRouter, Depends, File, Query, UploadFile

from app.core.container import Services, services
from app.core.errors import BadRequest
from app.models.catalog import (
    Category, CategoryCreate, CategoryUpdate, Product, ProductCreate, ProductImage, ProductUpdate, SortKey,
)
from app.models.common import Page, Schema
from app.services.catalog import PRODUCTS
from app.services.media import Label, validate_upload

router = APIRouter()


# Where a product's or category's images are filed in storage (Drive builds
# folders from these; see GoogleDriveMediaStorage).
async def _product_label(svc: Services, product: Product) -> Label:
    cat = await svc.catalog.get_category(product.category_id, missing_ok=True) if product.category_id else None
    return ["Products", cat.name if cat else "Uncategorized", product.name]


async def _refile_product(svc: Services, product: Product) -> None:
    label = await _product_label(svc, product)
    for img in product.images:
        if img.path:
            await svc.media.organize(img.path, label)


async def _refile_category(svc: Services, before: Category | None, after: Category) -> None:
    old, new = svc.media.path_from_url(before and before.image), svc.media.path_from_url(after.image)
    if old and old != new:
        await svc.media.delete(old)
    if new:
        await svc.media.organize(new, ["Categories", after.name])
    if before and before.name != after.name:
        for doc in await svc.store.list(PRODUCTS, where=[("category_id", "==", after.id)]):
            await _refile_product(svc, Product.model_validate(doc))


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
    if (before.name, before.category_id) != (product.name, product.category_id):
        await _refile_product(svc, product)
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
        url, path = await svc.media.upload(f"products/{pid}", f.filename or "image", data, ct,
                                           label=await _product_label(svc, product))
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
    category = await svc.catalog.create_category(body)
    await _refile_category(svc, None, category)
    return category


@router.patch("/categories/{cid}", response_model=Category)
async def update_category(cid: str, body: CategoryUpdate, svc: Services = Depends(services)):
    before = await svc.catalog.get_category(cid)
    category = await svc.catalog.update_category(cid, body)
    await _refile_category(svc, before, category)
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
