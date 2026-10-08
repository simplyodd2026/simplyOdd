from fastapi import APIRouter, Depends, File, UploadFile

from app.core.container import Services, services
from app.core.errors import BadRequest
from app.core.security import current_user
from app.models.cart import Cart, CartIn, Quote, QuoteRequest
from app.models.catalog import Product
from app.models.common import Schema
from app.models.user import Address, AddressIn, AuthUser, ProfileUpdate, UserProfile
from app.services.media import validate_upload

router = APIRouter(tags=["account"])


@router.post("/cart/quote", response_model=Quote)
async def quote(body: QuoteRequest, svc: Services = Depends(services)):
    """Price a bag. Works for guests and signed-in shoppers alike."""
    q, _ = await svc.pricing.quote(body)
    return q


@router.get("/me", response_model=UserProfile)
async def me(user: AuthUser = Depends(current_user), svc: Services = Depends(services)):
    return await svc.accounts.ensure_profile(user)


@router.patch("/me", response_model=UserProfile)
async def update_me(body: ProfileUpdate, user: AuthUser = Depends(current_user), svc: Services = Depends(services)):
    return await svc.accounts.update_profile(user, body)


@router.post("/me/avatar", response_model=UserProfile)
async def upload_avatar(file: UploadFile = File(...), user: AuthUser = Depends(current_user),
                        svc: Services = Depends(services)):
    data = await file.read()
    ct = validate_upload(data, file.content_type)
    if ct == "image/svg+xml":  # SVG can carry script; not accepted from customers
        raise BadRequest("Upload a JPEG, PNG or WebP image")
    profile = await svc.accounts.ensure_profile(user)
    url, _ = await svc.media.upload(f"avatars/{user.uid}", file.filename or "avatar", data, ct)
    updated = await svc.accounts.update_profile(user, ProfileUpdate(profile_image=url))
    if old := svc.media.path_from_url(profile.profile_image):  # don't leave the previous photo behind
        await svc.media.delete(old)
    return updated


# ------------------------------------------------------------------ addresses
@router.post("/me/addresses", response_model=list[Address], status_code=201)
async def add_address(body: AddressIn, user: AuthUser = Depends(current_user), svc: Services = Depends(services)):
    return await svc.accounts.add_address(user, body)


@router.put("/me/addresses/{address_id}", response_model=list[Address])
async def update_address(address_id: str, body: AddressIn, user: AuthUser = Depends(current_user),
                         svc: Services = Depends(services)):
    return await svc.accounts.update_address(user, address_id, body)


@router.delete("/me/addresses/{address_id}", response_model=list[Address])
async def delete_address(address_id: str, user: AuthUser = Depends(current_user), svc: Services = Depends(services)):
    return await svc.accounts.delete_address(user, address_id)


@router.post("/me/addresses/{address_id}/default", response_model=list[Address])
async def default_address(address_id: str, user: AuthUser = Depends(current_user), svc: Services = Depends(services)):
    return await svc.accounts.set_default_address(user, address_id)


# ----------------------------------------------------------------------- cart
@router.get("/me/cart", response_model=Cart)
async def get_cart(user: AuthUser = Depends(current_user), svc: Services = Depends(services)):
    return await svc.accounts.get_cart(user.uid)


@router.put("/me/cart", response_model=Cart)
async def put_cart(body: CartIn, user: AuthUser = Depends(current_user), svc: Services = Depends(services)):
    return await svc.accounts.put_cart(user.uid, body.items)


@router.post("/me/cart/merge", response_model=Cart)
async def merge_cart(body: CartIn, user: AuthUser = Depends(current_user), svc: Services = Depends(services)):
    return await svc.accounts.merge_cart(user.uid, body.items)


# ------------------------------------------------------------------- wishlist
class WishlistIn(Schema):
    product_ids: list[str]


class WishlistOut(Schema):
    product_ids: list[str]
    products: list[Product]


async def _wishlist(svc: Services, ids: list[str]) -> WishlistOut:
    found = await svc.catalog.get_products(ids)
    return WishlistOut(product_ids=ids, products=[found[i] for i in ids if i in found and found[i].is_published])


@router.get("/me/wishlist", response_model=WishlistOut)
async def get_wishlist(user: AuthUser = Depends(current_user), svc: Services = Depends(services)):
    return await _wishlist(svc, await svc.accounts.get_wishlist(user.uid))


@router.post("/me/wishlist", response_model=WishlistOut)
async def add_wishlist(body: WishlistIn, user: AuthUser = Depends(current_user), svc: Services = Depends(services)):
    return await _wishlist(svc, await svc.accounts.add_to_wishlist(user.uid, body.product_ids))


@router.delete("/me/wishlist/{product_id}", response_model=WishlistOut)
async def remove_wishlist(product_id: str, user: AuthUser = Depends(current_user), svc: Services = Depends(services)):
    return await _wishlist(svc, await svc.accounts.remove_from_wishlist(user.uid, product_id))
