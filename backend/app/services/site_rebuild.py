"""Rebuilds the storefront when the public catalogue changes.

The storefront prerenders every published product page at build time (frontend/scripts/prerender.mjs),
so publishing, editing or removing a product needs a new Vercel build. This calls the Vercel Deploy
Hook (VERCEL_DEPLOY_HOOK_URL, a secret kept only on the API's Cloud Run service) at most once per
`min_interval` seconds:

- The first change after a quiet spell deploys straight away.
- Changes inside the interval only mark a rebuild as pending. The pending rebuild fires on the first
  request of any kind once the interval has passed, so a burst of edits becomes one build that picks
  up the last of them. Cloud Run only gives CPU during requests, which is why it piggybacks on traffic
  rather than on a timer.
- The pending flag is also saved, so a rebuild still happens if the instance stops before it fires.
- A failed call is logged (never the hook URL itself) and retried after the next interval.
"""
from __future__ import annotations

import asyncio
import logging
import time

import httpx

from app.repositories.store import DocumentStore

log = logging.getLogger("site_rebuild")

STATE = ("site", "rebuild")  # collection, document


class _RedactHook(logging.Filter):
    """httpx logs every request URL at INFO; the deploy hook's URL is the secret, so it's masked."""

    def __init__(self, url: str):
        super().__init__()
        self.url = url

    def filter(self, record: logging.LogRecord) -> bool:
        if self.url in record.getMessage():
            record.msg, record.args = record.getMessage().replace(self.url, "<vercel deploy hook>"), ()
        return True


class SiteRebuild:
    def __init__(self, store: DocumentStore, hook_url: str | None, min_interval: float = 120,
                 client: httpx.AsyncClient | None = None, clock=time.time):
        self.store = store
        self.hook_url = hook_url
        self.min_interval = min_interval
        self._client = client
        self._clock = clock
        self._lock = asyncio.Lock()
        self.pending = False
        self.last_fired = 0.0
        self._loaded = False
        if hook_url and not any(isinstance(f, _RedactHook) and f.url == hook_url for f in logging.getLogger("httpx").filters):
            logging.getLogger("httpx").addFilter(_RedactHook(hook_url))

    @property
    def enabled(self) -> bool:
        return bool(self.hook_url)

    async def _load(self) -> None:
        if self._loaded:
            return
        self._loaded = True
        doc = await self.store.get(*STATE) or {}
        self.pending = bool(doc.get("pending"))
        self.last_fired = float(doc.get("last_fired") or 0)

    async def _save(self) -> None:
        await self.store.set(*STATE, {"pending": self.pending, "last_fired": self.last_fired})

    async def request(self, reason: str) -> None:
        """Ask for a rebuild because the public catalogue changed."""
        if not self.enabled:
            return
        async with self._lock:
            await self._load()
            log.info("storefront rebuild requested: %s", reason)
            if not self.pending:
                self.pending = True
                await self._save()
        await self.flush()

    def due(self) -> bool:
        """Cheap, in-memory check run after every request."""
        return self.enabled and (self.pending or not self._loaded) and self._clock() - self.last_fired >= self.min_interval

    async def flush(self) -> None:
        """Calls the deploy hook if a rebuild is pending and the interval has passed."""
        if not self.enabled:
            return
        async with self._lock:
            await self._load()
            if not self.pending or self._clock() - self.last_fired < self.min_interval:
                return
            # Counted as fired either way: a failure waits a full interval before the next attempt.
            self.last_fired = self._clock()
            try:
                client = self._client or httpx.AsyncClient(timeout=5)
                try:
                    res = await client.post(self.hook_url)
                finally:
                    if self._client is None:
                        await client.aclose()
                res.raise_for_status()
                self.pending = False
                log.info("storefront rebuild triggered (Vercel answered %s)", res.status_code)
            except Exception as e:  # never let a deploy problem break the API
                status = getattr(getattr(e, "response", None), "status_code", None)
                log.warning("storefront rebuild failed (%s%s); will retry", type(e).__name__, f" {status}" if status else "")
            try:
                await self._save()
            except Exception:
                log.warning("couldn't save storefront rebuild state", exc_info=True)
