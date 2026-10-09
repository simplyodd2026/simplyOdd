from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, Query

from app.core.container import Services, services
from app.models.catalog import Category, Product, SortKey
from app.models.common import Page
from app.models.homepage import Homepage
from app.models.marketing import CustomRequestIn, NewsletterIn

router = APIRouter(tags=["catalog"])


@router.get("/config")
async def storefront_config(svc: Services = Depends(services)):
    s = svc.settings
    return {
        "currency": s.currency,
        "tax_rate": s.tax_rate,
        "free_shipping_threshold": s.free_shipping_threshold,
        "payment_providers": svc.payments.public(),
    }


@router.get("/homepage", response_model=Homepage)
async def homepage(svc: Services = Depends(services)):
    return await svc.homepage.public()


@router.get("/products", response_model=Page[Product])
async def list_products(
    bg: BackgroundTasks,
    q: str | None = None,
    category: str | None = None,
    min_price: float | None = Query(None, ge=0),
    max_price: float | None = Query(None, ge=0),
    in_stock: bool = False,
    tag: list[str] | None = Query(None),
    flag: Literal["featured", "bestseller", "new"] | None = None,
    sort: SortKey = "newest",
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
    track: bool = False,
    svc: Services = Depends(services),
):
    if q and track:
        bg.add_task(svc.catalog.record_search, q)
    return await svc.catalog.list_products(
        q=q, category=category, min_price=min_price, max_price=max_price, in_stock=in_stock,
        tags=tag, flag=flag, sort=sort, page=page, page_size=page_size)


@router.get("/products/by-ids", response_model=list[Product])
async def products_by_ids(ids: str = "", svc: Services = Depends(services)):
    wanted = [i for i in ids.split(",") if i][:100]
    found = await svc.catalog.get_products(wanted)
    return [found[i] for i in wanted if i in found and found[i].is_published]


@router.get("/products/{id_or_slug}")
async def get_product(id_or_slug: str, svc: Services = Depends(services)):
    product = await svc.catalog.get_product(id_or_slug)
    category = await svc.catalog.get_category(product.category_id, missing_ok=True) if product.category_id else None
    return {
        "product": product,
        "category": category,
        "related": await svc.catalog.related(product),
        "frequently_bought": await svc.catalog.frequently_bought(product),
    }


@router.get("/categories", response_model=list[Category])
async def list_categories(svc: Services = Depends(services)):
    return await svc.catalog.list_categories()


@router.get("/categories/{id_or_slug}", response_model=Category)
async def get_category(id_or_slug: str, svc: Services = Depends(services)):
    return await svc.catalog.get_category(id_or_slug)


@router.get("/search/suggest")
async def suggest(q: str = "", svc: Services = Depends(services)):
    return await svc.catalog.suggestions(q)


@router.get("/search/popular", response_model=list[str])
async def popular(svc: Services = Depends(services)):
    return await svc.catalog.popular_searches()


@router.post("/custom-requests", status_code=201)
async def request_custom(body: CustomRequestIn, svc: Services = Depends(services)):
    req = await svc.insights.request_custom(body)
    return {"ok": True, "id": req.id}


@router.post("/newsletter", status_code=201)
async def subscribe(body: NewsletterIn, svc: Services = Depends(services)):
    await svc.insights.subscribe(body.email)
    return {"ok": True}
