"""Authentication: verifies Firebase ID tokens sent as `Authorization: Bearer`.

Admin access comes only from `is_admin` on the user's `users/{uid}` document,
read on every request so flipping it in the Firestore console applies at once.

In development (ALLOW_DEV_AUTH=true) a token of the form
`dev:<uid>:<email>[:<name>]` is also accepted so the full stack can run
without a Firebase project. This is refused at startup in production.
"""
from __future__ import annotations

import asyncio

from fastapi import Depends, Request

from app.core.config import Settings
from app.core.container import Services, services
from app.core.errors import Forbidden, Unauthorized
from app.models.user import AuthUser
from app.services.accounts import USERS


async def _verify(token: str, settings: Settings) -> AuthUser:
    if token.startswith("dev:"):
        if not settings.allow_dev_auth:
            raise Unauthorized("Dev tokens are disabled")
        parts = token.split(":", 3)
        if len(parts) < 3 or not parts[1]:
            raise Unauthorized("Malformed dev token")
        uid, email = parts[1], parts[2]
        name = parts[3] if len(parts) > 3 else email.split("@")[0]
        return AuthUser(uid=uid, email=email, name=name, email_verified=True)

    from firebase_admin import auth as fb_auth

    from app.core.firebase import get_app

    try:
        claims = await asyncio.to_thread(fb_auth.verify_id_token, token, get_app(), True)
    except Exception as exc:  # expired, revoked, malformed...
        raise Unauthorized("Your session has expired. Sign in again.") from exc
    email = claims.get("email")
    return AuthUser(
        uid=claims["uid"], email=email, name=claims.get("name"), picture=claims.get("picture"),
        email_verified=bool(claims.get("email_verified")),
    )


def _bearer(request: Request) -> str | None:
    header = request.headers.get("Authorization", "")
    if header.lower().startswith("bearer "):
        return header[7:].strip() or None
    return None


async def optional_user(request: Request, svc: Services = Depends(services)) -> AuthUser | None:
    token = _bearer(request)
    if not token:
        return None
    user = await _verify(token, svc.settings)
    profile = await svc.store.get(USERS, user.uid)
    user.is_admin = bool(profile and profile.get("is_admin"))
    return user


async def current_user(user: AuthUser | None = Depends(optional_user)) -> AuthUser:
    if user is None:
        raise Unauthorized()
    return user


async def admin_user(user: AuthUser = Depends(current_user)) -> AuthUser:
    if not user.is_admin:
        raise Forbidden("Admin access required")
    return user
