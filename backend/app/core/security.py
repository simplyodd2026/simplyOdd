"""Authentication: verifies Firebase ID tokens sent as `Authorization: Bearer`.

In development (ALLOW_DEV_AUTH=true) a token of the form
`dev:<uid>:<email>[:<name>]` is also accepted so the full stack can run
without a Firebase project. This is refused at startup in production.
"""
from __future__ import annotations

import asyncio

from fastapi import Depends, Request

from app.core.config import Settings, get_settings
from app.core.errors import Forbidden, Unauthorized
from app.models.user import AuthUser


def _is_admin(email: str | None, claims: dict, settings: Settings) -> bool:
    if claims.get("admin") is True:
        return True
    return bool(email) and email.lower() in {e.lower() for e in settings.admin_emails}


async def _verify(token: str, settings: Settings) -> AuthUser:
    if token.startswith("dev:"):
        if not settings.allow_dev_auth:
            raise Unauthorized("Dev tokens are disabled")
        parts = token.split(":", 3)
        if len(parts) < 3 or not parts[1]:
            raise Unauthorized("Malformed dev token")
        uid, email = parts[1], parts[2]
        name = parts[3] if len(parts) > 3 else email.split("@")[0]
        return AuthUser(uid=uid, email=email, name=name, email_verified=True,
                        is_admin=_is_admin(email, {}, settings))

    from firebase_admin import auth as fb_auth

    from app.core.firebase import get_app

    try:
        claims = await asyncio.to_thread(fb_auth.verify_id_token, token, get_app(), True)
    except Exception as exc:  # expired, revoked, malformed...
        raise Unauthorized("Your session has expired. Sign in again.") from exc
    email = claims.get("email")
    return AuthUser(
        uid=claims["uid"], email=email, name=claims.get("name"), picture=claims.get("picture"),
        email_verified=bool(claims.get("email_verified")), is_admin=_is_admin(email, claims, settings),
    )


def _bearer(request: Request) -> str | None:
    header = request.headers.get("Authorization", "")
    if header.lower().startswith("bearer "):
        return header[7:].strip() or None
    return None


async def optional_user(request: Request, settings: Settings = Depends(get_settings)) -> AuthUser | None:
    token = _bearer(request)
    return await _verify(token, settings) if token else None


async def current_user(user: AuthUser | None = Depends(optional_user)) -> AuthUser:
    if user is None:
        raise Unauthorized()
    return user


async def admin_user(user: AuthUser = Depends(current_user)) -> AuthUser:
    if not user.is_admin:
        raise Forbidden("Admin access required")
    return user
