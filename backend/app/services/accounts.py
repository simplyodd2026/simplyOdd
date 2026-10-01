"""User profiles, saved addresses, carts and wishlists."""
from __future__ import annotations

from app.core.errors import NotFound
from app.core.utils import new_id, now
from app.models.cart import Cart, CartLine
from app.models.user import Address, AddressIn, AuthUser, ProfileUpdate, UserProfile
from app.repositories.store import DocumentStore

USERS, CARTS, WISHLISTS = "users", "carts", "wishlists"


class AccountService:
    def __init__(self, store: DocumentStore):
        self.store = store

    # -------------------------------------------------------------- profile
    async def ensure_profile(self, user: AuthUser) -> UserProfile:
        doc = await self.store.get(USERS, user.uid)
        if doc:
            profile = UserProfile.model_validate(doc)
            patch = {}
            if user.email and profile.email != user.email:
                patch["email"] = user.email
            if patch:
                await self.store.update(USERS, user.uid, patch)
                profile = profile.model_copy(update=patch)
            return profile
        # is_admin is only ever granted by editing the user document (or
        # scripts/set_admin.py); sign-in never changes it.
        ts = now()
        profile = UserProfile(user_id=user.uid, name=user.name or "", email=user.email or "",
                              profile_image=user.picture, is_admin=user.is_admin, created_at=ts, updated_at=ts)
        await self.store.set(USERS, user.uid, profile.model_dump())
        return profile

    async def get_profile(self, uid: str) -> UserProfile:
        doc = await self.store.get(USERS, uid)
        if not doc:
            raise NotFound("Customer")
        return UserProfile.model_validate(doc)

    async def update_profile(self, user: AuthUser, data: ProfileUpdate) -> UserProfile:
        await self.ensure_profile(user)
        doc = await self.store.update(USERS, user.uid, {**data.model_dump(exclude_unset=True), "updated_at": now()})
        return UserProfile.model_validate(doc)

    async def list_profiles(self) -> list[UserProfile]:
        return [UserProfile.model_validate(d) for d in await self.store.list(USERS, order_by="created_at", descending=True)]

    # ------------------------------------------------------------ addresses
    async def _write_addresses(self, uid: str, addresses: list[Address]) -> list[Address]:
        if addresses and not any(a.is_default for a in addresses):
            addresses[0].is_default = True
        await self.store.update(USERS, uid, {"addresses": [a.model_dump() for a in addresses], "updated_at": now()})
        return addresses

    async def add_address(self, user: AuthUser, data: AddressIn) -> list[Address]:
        profile = await self.ensure_profile(user)
        addresses = profile.addresses
        if data.is_default:
            for a in addresses:
                a.is_default = False
        addresses.append(Address(**data.model_dump(), id=new_id("a_")))
        return await self._write_addresses(user.uid, addresses)

    async def update_address(self, user: AuthUser, address_id: str, data: AddressIn) -> list[Address]:
        profile = await self.ensure_profile(user)
        if not any(a.id == address_id for a in profile.addresses):
            raise NotFound("Address")
        addresses = []
        for a in profile.addresses:
            if a.id == address_id:
                a = Address(**data.model_dump(), id=address_id)
            elif data.is_default:
                a.is_default = False
            addresses.append(a)
        return await self._write_addresses(user.uid, addresses)

    async def delete_address(self, user: AuthUser, address_id: str) -> list[Address]:
        profile = await self.ensure_profile(user)
        remaining = [a for a in profile.addresses if a.id != address_id]
        if len(remaining) == len(profile.addresses):
            raise NotFound("Address")
        return await self._write_addresses(user.uid, remaining)

    async def set_default_address(self, user: AuthUser, address_id: str) -> list[Address]:
        profile = await self.ensure_profile(user)
        if not any(a.id == address_id for a in profile.addresses):
            raise NotFound("Address")
        for a in profile.addresses:
            a.is_default = a.id == address_id
        return await self._write_addresses(user.uid, profile.addresses)

    # ------------------------------------------------------------------ cart
    async def get_cart(self, uid: str) -> Cart:
        doc = await self.store.get(CARTS, uid)
        return Cart.model_validate(doc) if doc else Cart()

    async def put_cart(self, uid: str, items: list[CartLine]) -> Cart:
        merged: dict[str, int] = {}
        for line in items:
            merged[line.product_id] = min(99, merged.get(line.product_id, 0) + line.quantity)
        cart = Cart(items=[CartLine(product_id=k, quantity=v) for k, v in merged.items()])
        await self.store.set(CARTS, uid, {**cart.model_dump(), "updated_at": now()})
        return cart

    async def merge_cart(self, uid: str, guest_items: list[CartLine]) -> Cart:
        """Guest bag + saved bag. Takes the larger quantity for duplicates so a
        re-login doesn't double quantities."""
        current = {line.product_id: line.quantity for line in (await self.get_cart(uid)).items}
        for line in guest_items:
            current[line.product_id] = max(current.get(line.product_id, 0), line.quantity)
        return await self.put_cart(uid, [CartLine(product_id=k, quantity=v) for k, v in current.items()])

    # -------------------------------------------------------------- wishlist
    async def get_wishlist(self, uid: str) -> list[str]:
        doc = await self.store.get(WISHLISTS, uid)
        return doc.get("product_ids", []) if doc else []

    async def set_wishlist(self, uid: str, product_ids: list[str]) -> list[str]:
        ids = list(dict.fromkeys(product_ids))[:200]
        await self.store.set(WISHLISTS, uid, {"product_ids": ids, "updated_at": now()})
        return ids

    async def add_to_wishlist(self, uid: str, product_ids: list[str]) -> list[str]:
        return await self.set_wishlist(uid, await self.get_wishlist(uid) + product_ids)

    async def remove_from_wishlist(self, uid: str, product_id: str) -> list[str]:
        return await self.set_wishlist(uid, [p for p in await self.get_wishlist(uid) if p != product_id])
