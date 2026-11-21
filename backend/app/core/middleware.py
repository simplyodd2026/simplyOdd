"""Request hardening: security headers, request size limits and per-IP rate limits.

Plain ASGI middleware so uploads stream through untouched. Rate-limit counters
live in process memory, which is enough while Cloud Run runs a single instance
(max-instances=1); with more instances each one counts separately.
"""
from __future__ import annotations

import ipaddress
import json
import math
import re
import time

from starlette.datastructures import Headers
from starlette.types import ASGIApp, Message, Receive, Scope, Send


async def _send_json(send: Send, status: int, detail: str, headers: dict[str, str] | None = None) -> None:
    body = json.dumps({"detail": detail}).encode()
    raw = [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())]
    raw += [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()]
    await send({"type": "http.response.start", "status": status, "headers": raw})
    await send({"type": "http.response.body", "body": body})


# Google's front end / load balancer proxies, which may also appear in X-Forwarded-For.
_GOOGLE_PROXIES = (ipaddress.ip_network("35.191.0.0/16"), ipaddress.ip_network("130.211.0.0/22"))


def _is_proxy(value: str) -> bool:
    try:
        ip = ipaddress.ip_address(value)
    except ValueError:
        return False
    return ip.is_private or ip.is_loopback or any(ip in net for net in _GOOGLE_PROXIES)


def client_ip(scope: Scope) -> str:
    """The caller's IP. Google's front end appends the real client to X-Forwarded-For
    (after anything the caller sent), so read from the right, past any proxy hops."""
    forwarded = Headers(scope=scope).get("x-forwarded-for")
    if forwarded:
        hops = [h.strip() for h in forwarded.split(",") if h.strip()]
        for hop in reversed(hops):
            if not _is_proxy(hop):
                return hop
        if hops:
            return hops[0]
    client = scope.get("client")
    return client[0] if client else "unknown"


class SecurityHeadersMiddleware:
    """Headers for an API that only ever returns JSON and images: nothing it serves
    may run script, be framed, or be sniffed into another type."""

    def __init__(self, app: ASGIApp, hsts: bool = False, docs_paths: tuple[str, ...] = ()):
        self.app = app
        self.hsts = hsts
        self.docs_paths = docs_paths

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        authed = "authorization" in Headers(scope=scope)
        docs = scope["path"] in self.docs_paths  # Swagger UI needs its CDN scripts

        async def wrapped(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = message.setdefault("headers", [])
                present = {k.lower() for k, _ in headers}
                extra = {
                    b"x-content-type-options": b"nosniff",
                    b"x-frame-options": b"DENY",
                    b"referrer-policy": b"no-referrer",
                    b"permissions-policy": b"camera=(), microphone=(), geolocation=()",
                }
                if not docs:
                    extra[b"content-security-policy"] = b"default-src 'none'; frame-ancestors 'none'; sandbox"
                if self.hsts:
                    extra[b"strict-transport-security"] = b"max-age=63072000; includeSubDomains"
                if authed:  # personal data: never let a shared cache keep it
                    extra[b"cache-control"] = b"no-store"
                headers.extend((k, v) for k, v in extra.items() if k not in present)
            await send(message)

        await self.app(scope, receive, wrapped)


class _TooLarge(Exception):
    pass


class BodySizeLimitMiddleware:
    """Refuses request bodies over `default` bytes, or `uploads` bytes on upload routes."""

    def __init__(self, app: ASGIApp, default: int, uploads: int, upload_paths: re.Pattern[str]):
        self.app = app
        self.default = default
        self.uploads = uploads
        self.upload_paths = upload_paths

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        limit = self.uploads if self.upload_paths.search(scope["path"]) else self.default
        length = Headers(scope=scope).get("content-length")
        if length and length.isdigit() and int(length) > limit:
            return await _send_json(send, 413, "That request is too large")

        received = 0
        started = False

        async def counting_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > limit:
                    raise _TooLarge
            return message

        async def tracking_send(message: Message) -> None:
            nonlocal started
            started = started or message["type"] == "http.response.start"
            await send(message)

        try:
            await self.app(scope, counting_receive, tracking_send)
        except _TooLarge:
            if not started:
                await _send_json(send, 413, "That request is too large")


class RateLimitMiddleware:
    """Fixed-window limits per client IP. `rules` are (method or "*", path regex, max
    requests, window seconds); every rule a request matches is counted and enforced."""

    def __init__(self, app: ASGIApp, rules: list[tuple[str, str, int, int]], exempt: tuple[str, ...] = ()):
        self.app = app
        self.rules = [(m, re.compile(p), n, w) for m, p, n, w in rules]
        self.exempt = exempt
        self.hits: dict[tuple[int, str, int], int] = {}
        self._next_sweep = 0.0

    def _sweep(self, now: float) -> None:
        if now < self._next_sweep:
            return
        self._next_sweep = now + 60
        self.hits = {k: v for k, v in self.hits.items() if (k[2] + 1) * self.rules[k[0]][3] > now}

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["method"] == "OPTIONS" or scope["path"] in self.exempt:
            return await self.app(scope, receive, send)
        now = time.time()
        self._sweep(now)
        ip = client_ip(scope)
        retry_after = 0
        for i, (method, pattern, limit, window) in enumerate(self.rules):
            if method not in ("*", scope["method"]) or not pattern.search(scope["path"]):
                continue
            bucket = int(now // window)
            key = (i, ip, bucket)
            self.hits[key] = self.hits.get(key, 0) + 1
            if self.hits[key] > limit:
                retry_after = max(retry_after, math.ceil((bucket + 1) * window - now))
        if retry_after:
            return await _send_json(send, 429, "Too many requests. Wait a moment and try again.",
                                    {"Retry-After": str(retry_after)})
        await self.app(scope, receive, send)


class ChatBodyLimit:
    """A tighter body limit for /api/chat/*, where requests are a line of text."""

    _NEVER = re.compile(r"(?!)")

    def __init__(self, app: ASGIApp, limit: int, prefix: str = "/api/chat/"):
        self.app = app
        self.prefix = prefix
        self.limited = BodySizeLimitMiddleware(app, default=limit, uploads=limit, upload_paths=self._NEVER)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http" and scope["path"].startswith(self.prefix):
            return await self.limited(scope, receive, send)
        await self.app(scope, receive, send)
