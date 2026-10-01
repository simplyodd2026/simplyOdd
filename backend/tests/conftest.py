import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.repositories.memory import MemoryStore

CUSTOMER = {"Authorization": "Bearer dev:u-test:test@example.com:Test Person"}
OTHER = {"Authorization": "Bearer dev:u-other:other@example.com"}
# The seeded "dev-admin" profile has is_admin=True.
ADMIN = {"Authorization": "Bearer dev:dev-admin:admin@simplyodd.dev"}


@pytest.fixture
def client():
    settings = Settings(_env_file=None, env="test", memory_persist_path=None, catalog_cache_seconds=0,
                        payment_providers=["mock", "cod"])
    with TestClient(create_app(settings, MemoryStore())) as c:
        yield c


@pytest.fixture
def products(client):
    return {p["slug"]: p for p in client.get("/api/products?page_size=100").json()["items"]}


def address(email="test@example.com"):
    return {"full_name": "Test Person", "phone": "9876543210", "email": email, "line1": "1 Road",
            "city": "Bengaluru", "state": "Karnataka", "postal_code": "560001", "country": "India"}
