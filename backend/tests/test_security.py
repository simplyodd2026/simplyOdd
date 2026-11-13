import io

from fastapi.testclient import TestClient
from PIL import Image

from app.core.config import Settings
from app.core.middleware import client_ip
from app.main import create_app
from app.repositories.memory import MemoryStore
from tests.conftest import CUSTOMER, OTHER


class FakeMedia:
    """Records uploads and deletes instead of touching disk or a bucket."""
    base = "https://media.test/"

    def __init__(self):
        self.deleted: list[str] = []

    async def upload(self, folder, filename, data, content_type):
        path = f"{folder}/{len(self.deleted)}-{filename}"
        return self.base + path, path

    async def delete(self, path):
        self.deleted.append(path)

    def path_from_url(self, url):
        return url[len(self.base):] if url and url.startswith(self.base) else None


def png() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (8, 8)).save(buf, "PNG")
    return buf.getvalue()


def app_client(**overrides) -> TestClient:
    settings = Settings(_env_file=None, memory_persist_path=None, catalog_cache_seconds=0,
                        **{"env": "test", "payment_providers": ["mock"], "allow_dev_auth": True, **overrides})
    return TestClient(create_app(settings, MemoryStore()))


# ------------------------------------------------------------------ access
def test_dev_tokens_are_off_unless_enabled():
    assert Settings(_env_file=None).allow_dev_auth is False
    with app_client(allow_dev_auth=False) as c:
        assert c.get("/api/me", headers=CUSTOMER).status_code == 401


def test_customers_cannot_reach_admin(client):
    assert client.get("/api/admin/orders").status_code == 401
    assert client.get("/api/admin/orders", headers=CUSTOMER).status_code == 403
    assert client.post("/api/admin/coupons", headers=CUSTOMER, json={"code": "FREE100"}).status_code == 403


def test_customers_cannot_grant_themselves_admin(client):
    r = client.patch("/api/me", headers=CUSTOMER, json={"name": "Me", "is_admin": True})
    assert r.status_code == 200 and r.json()["is_admin"] is False
    assert client.get("/api/admin/orders", headers=CUSTOMER).status_code == 403


def test_profile_photo_cannot_point_at_someone_elses_file(client):
    media = FakeMedia()
    client.app.state.services.media = media
    # The photo URL isn't settable directly...
    r = client.patch("/api/me", headers=CUSTOMER, json={"profile_image": media.base + "products/vase/a.webp"})
    assert r.status_code == 200 and r.json()["profile_image"] is None
    # ...and even if a profile holds a foreign URL, replacing the photo never deletes that file.
    client.app.state.services.store._data["users"]["u-test"]["profile_image"] = media.base + "products/vase/a.webp"
    files = {"file": ("me.png", png(), "image/png")}
    assert client.post("/api/me/avatar", headers=CUSTOMER, files=files).status_code == 200
    assert media.deleted == []
    # Their own previous upload is cleaned up.
    assert client.post("/api/me/avatar", headers=CUSTOMER, files=files).status_code == 200
    assert media.deleted and media.deleted[0].startswith("avatars/u-test/")


def test_avatars_must_be_re_encodable_images(client):
    client.app.state.services.media = FakeMedia()
    for name, ct in (("x.svg", "image/svg+xml"), ("x.gif", "image/gif")):
        r = client.post("/api/me/avatar", headers=CUSTOMER, files={"file": (name, b"<svg onload=alert(1)>", ct)})
        assert r.status_code == 400


def test_orders_are_private(client):
    assert client.get("/api/me/orders/o_doesnotexist", headers=OTHER).status_code == 404


# ------------------------------------------------------------------- input
def test_reference_links_must_be_web_addresses(client):
    body = {"name": "A", "email": "a@example.com", "idea": "A lamp shaped like a cloud"}
    for bad in ("javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "https://"):
        assert client.post("/api/custom-requests", json={**body, "reference_url": bad}).status_code == 400
    assert client.post("/api/custom-requests", json={**body, "reference_url": "https://example.com/x"}).status_code == 201


def test_oversized_inputs_are_refused(client):
    assert client.put("/api/me/cart", headers=CUSTOMER, json={
        "items": [{"product_id": f"p{i}", "quantity": 1} for i in range(101)]}).status_code == 422
    assert client.get("/api/products", params={"q": "x" * 201}).status_code == 422
    assert client.post("/api/cart/quote", json={"items": [], "coupon_code": "X" * 33}).status_code == 422


def test_request_body_size_is_capped(client):
    big = b'{"items": [], "pad": "' + b"x" * (1024 * 1024) + b'"}'
    r = client.post("/api/cart/quote", content=big, headers={"Content-Type": "application/json"})
    assert r.status_code == 413


# ----------------------------------------------------------------- headers
def test_security_headers(client):
    r = client.get("/api/health")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"
    assert "default-src 'none'" in r.headers["content-security-policy"]
    assert client.get("/api/me", headers=CUSTOMER).headers["cache-control"] == "no-store"


def test_production_hides_docs_and_sends_hsts():
    with app_client(env="production", allow_dev_auth=False, payment_providers=[]) as c:
        assert c.get("/api/docs").status_code == 404
        assert c.get("/api/openapi.json").status_code == 404
        assert "max-age" in c.get("/api/health").headers["strict-transport-security"]


def test_cors_only_allows_configured_origins(client):
    ok = client.options("/api/products", headers={"Origin": "http://localhost:5173",
                                                  "Access-Control-Request-Method": "GET"})
    assert ok.headers["access-control-allow-origin"] == "http://localhost:5173"
    bad = client.options("/api/products", headers={"Origin": "https://evil.example",
                                                   "Access-Control-Request-Method": "GET"})
    assert "access-control-allow-origin" not in bad.headers


# ------------------------------------------------------------- rate limits
def test_rate_limits_answer_429_with_retry_after():
    with app_client(rate_limit=True) as c:
        codes = [c.post("/api/newsletter", json={"email": f"n{i}@example.com"}).status_code for i in range(6)]
        assert codes[:5] == [201] * 5 and codes[5] == 429
        r = c.post("/api/newsletter", json={"email": "late@example.com"})
        assert int(r.headers["retry-after"]) > 0
        # Other clients aren't affected.
        assert c.post("/api/newsletter", json={"email": "x@example.com"},
                      headers={"X-Forwarded-For": "203.0.113.9"}).status_code == 201
        assert c.get("/api/health").status_code == 200


def test_client_ip_ignores_forged_and_proxy_hops():
    def ip(xff):
        return client_ip({"type": "http", "headers": [(b"x-forwarded-for", xff.encode())], "client": ("10.0.0.1", 1)})
    assert ip("1.2.3.4") == "1.2.3.4"
    assert ip("6.6.6.6, 1.2.3.4") == "1.2.3.4"  # caller-supplied entry on the left is ignored
    assert ip("6.6.6.6, 1.2.3.4, 35.191.0.5") == "1.2.3.4"  # Google proxy hop skipped
    assert client_ip({"type": "http", "headers": [], "client": ("9.9.9.9", 1)}) == "9.9.9.9"
