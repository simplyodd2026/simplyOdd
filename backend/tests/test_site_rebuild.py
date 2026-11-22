import logging

import httpx
import pytest

from app.repositories.memory import MemoryStore
from app.services.site_rebuild import SiteRebuild
from tests.conftest import ADMIN

HOOK = "https://api.vercel.com/v1/integrations/deploy/prj_x/secret-token"


class Clock:
    def __init__(self):
        self.t = 1_000_000.0

    def __call__(self):
        return self.t


def hook(status=201):
    calls = []

    def handler(request: httpx.Request):
        calls.append(request)
        return httpx.Response(status, json={"job": {"id": "j"}})

    return calls, httpx.AsyncClient(transport=httpx.MockTransport(handler))


@pytest.mark.asyncio
async def test_bursts_are_batched_into_one_build():
    calls, client = hook()
    clock, store = Clock(), MemoryStore()
    r = SiteRebuild(store, HOOK, min_interval=120, client=client, clock=clock)

    await r.request("published a")
    assert len(calls) == 1 and calls[0].method == "POST"  # first change after a quiet spell: straight away
    await r.request("updated a")
    await r.request("updated b")
    assert len(calls) == 1 and r.pending and not r.due()  # inside the interval: held

    clock.t += 121
    assert r.due()
    await r.flush()  # what the next request of any kind does
    assert len(calls) == 2 and not r.pending
    await r.flush()
    assert len(calls) == 2  # nothing left to do


@pytest.mark.asyncio
async def test_pending_rebuild_survives_a_restart():
    calls, client = hook()
    clock, store = Clock(), MemoryStore()
    first = SiteRebuild(store, HOOK, client=client, clock=clock)
    await first.request("a")
    await first.request("b")  # pending, then the instance stops
    clock.t += 200
    second = SiteRebuild(store, HOOK, client=client, clock=clock)
    assert second.due()
    await second.flush()
    assert len(calls) == 2


@pytest.mark.asyncio
async def test_failures_are_retried_and_never_log_the_secret(caplog):
    calls, client = hook(status=500)
    clock = Clock()
    r = SiteRebuild(MemoryStore(), HOOK, client=client, clock=clock)
    with caplog.at_level(logging.INFO):
        await r.request("published a")
    assert len(calls) == 1 and r.pending
    assert "secret-token" not in caplog.text and "failed" in caplog.text
    clock.t += 121
    await r.flush()
    assert len(calls) == 2


@pytest.mark.asyncio
async def test_without_a_hook_nothing_happens():
    r = SiteRebuild(MemoryStore(), None)
    await r.request("x")
    assert not r.due() and not r.pending


def test_admin_changes_trigger_only_when_public_pages_change(client):
    calls, http = hook()
    svc = client.app.state.services
    svc.rebuild = SiteRebuild(svc.store, HOOK, min_interval=0, client=http)
    n = lambda: len(calls)  # noqa: E731

    draft = client.post("/api/admin/products", json={"name": "Quiet Draft", "price": 500, "is_published": False},
                        headers=ADMIN).json()
    client.patch(f"/api/admin/products/{draft['id']}", json={"price": 600}, headers=ADMIN)
    assert n() == 0  # drafts aren't on the storefront

    client.patch(f"/api/admin/products/{draft['id']}", json={"is_published": True}, headers=ADMIN)
    assert n() == 1  # published
    client.patch(f"/api/admin/products/{draft['id']}", json={"price": 650}, headers=ADMIN)
    assert n() == 2  # visible change to a published piece
    client.patch(f"/api/admin/products/{draft['id']}", json={"price": 650}, headers=ADMIN)
    assert n() == 2  # saved without changes
    client.patch(f"/api/admin/products/{draft['id']}", json={"is_published": False}, headers=ADMIN)
    assert n() == 3  # unpublished: its page must go
    client.delete(f"/api/admin/products/{draft['id']}", headers=ADMIN)
    assert n() == 3  # deleting a draft changes nothing public

    live = client.post("/api/admin/products", json={"name": "Loud Launch", "price": 900}, headers=ADMIN).json()
    assert n() == 4
    client.delete(f"/api/admin/products/{live['id']}", headers=ADMIN)
    assert n() == 5

    # Shoppers' activity (orders, reviews) never triggers a build.
    client.get("/api/products")
    assert n() == 5
