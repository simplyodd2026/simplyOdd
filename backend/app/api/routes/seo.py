"""XML sitemap for search engines.

Served here as /api/sitemap.xml and on the storefront domain as /sitemap.xml
through a Vercel rewrite (frontend/vercel.json). Built from the live catalogue
on each request (the catalogue cache keeps that cheap), so a product appears as
soon as it is published and drops out as soon as it is unpublished or deleted.
"""
from datetime import UTC, datetime
from urllib.parse import quote
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, Response

from app.core.container import Services, services

router = APIRouter(tags=["seo"])

# Public storefront pages that don't come from the catalogue. Mirrors the public
# routes in frontend/src/router.tsx. Left out on purpose: search results, cart,
# wishlist, login, checkout, order confirmations, account and admin pages.
STATIC_PATHS = [
    "/",
    "/shop",
    "/new",
    "/bestsellers",
    "/collections",
    "/customise",
    "/about",
    "/help/shipping",
    "/help/returns",
    "/help/faq",
]

# Shared caches (Vercel's CDN) may keep it briefly; Google rereads it on its own schedule.
CACHE_CONTROL = "public, max-age=0, s-maxage=900, stale-while-revalidate=3600"


def _lastmod(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


@router.get("/sitemap.xml", include_in_schema=False)
async def sitemap(svc: Services = Depends(services)) -> Response:
    base = svc.settings.site_url.rstrip("/")
    products = await svc.catalog.published_products()
    categories = await svc.catalog.list_categories()

    # path -> lastmod (or None). A dict keeps the first entry for a path, so nothing is listed twice.
    entries: dict[str, datetime | None] = {path: None for path in STATIC_PATHS}

    newest_in: dict[str, datetime] = {}
    for p in products:
        for cid in p.category_ids:
            if cid not in newest_in or p.updated_at > newest_in[cid]:
                newest_in[cid] = p.updated_at

    # Only collections with something published in them; empty ones are thin pages.
    for c in categories:
        if c.product_count > 0 and c.slug:
            entries.setdefault(f"/collections/{quote(c.slug)}", max(c.updated_at, newest_in.get(c.id, c.updated_at)))

    for p in products:
        if p.slug:
            entries.setdefault(f"/product/{quote(p.slug)}", p.updated_at)

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path, modified in entries.items():
        lines.append("  <url>")
        lines.append(f"    <loc>{escape(base + path)}</loc>")
        if modified:
            lines.append(f"    <lastmod>{_lastmod(modified)}</lastmod>")
        lines.append("  </url>")
    lines.append("</urlset>")

    return Response("\n".join(lines) + "\n", media_type="application/xml",
                    headers={"Cache-Control": CACHE_CONTROL})
