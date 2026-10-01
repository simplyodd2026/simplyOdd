"""File existing Drive images into the Products/Categories/Avatars folders.
New uploads are filed automatically; run this once for older ones.

    python -m scripts.organize_drive

Only moves files (and removes folders a move leaves empty). Safe to rerun.
"""
import asyncio

from app.api.routes.admin.catalog import _product_label
from app.core.config import get_settings
from app.core.container import build_services
from app.models.catalog import Category, Product
from app.models.user import UserProfile
from app.services.media import GoogleDriveMediaStorage


async def main() -> None:
    svc = build_services(get_settings())
    if not isinstance(svc.media, GoogleDriveMediaStorage):
        raise SystemExit("MEDIA_BACKEND is not drive; nothing to organise.")
    moved = 0
    for doc in await svc.store.list("products"):
        product = Product.model_validate(doc)
        label = await _product_label(svc, product)
        for img in product.images:
            if img.path and svc.media.path_from_url(img.url):
                await svc.media.organize(img.path, label)
                moved += 1
    for doc in await svc.store.list("categories"):
        cat = Category.model_validate(doc)
        if path := svc.media.path_from_url(cat.image):
            await svc.media.organize(path, ["Categories", cat.name])
            moved += 1
    for doc in await svc.store.list("users"):
        user = UserProfile.model_validate(doc)
        if path := svc.media.path_from_url(user.profile_image):
            await svc.media.organize(path, ["Avatars", user.email or user.user_id])
            moved += 1
    print(f"Filed {moved} image(s).")


if __name__ == "__main__":
    asyncio.run(main())
