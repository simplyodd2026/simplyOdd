from tests.conftest import ADMIN


def test_list_filters_and_sorts(client):
    r = client.get("/api/products", params={"sort": "price_asc", "page_size": 100}).json()
    prices = [p["price"] for p in r["items"]]
    assert prices == sorted(prices) and r["total"] == 21

    lighting = client.get("/api/products", params={"category": "lighting"}).json()
    assert lighting["total"] == 3

    in_stock = client.get("/api/products", params={"in_stock": True, "page_size": 100}).json()
    assert all(p["stock"] > 0 for p in in_stock["items"]) and in_stock["total"] == 20


def test_search_matches_names_tags_and_categories(client):
    names = [p["name"] for p in client.get("/api/products", params={"q": "lamp", "sort": "relevance"}).json()["items"]]
    assert names[0] in {"Fungal Lamp", "Ghost Lamp"} and "Hanging Bell" in names  # via tag
    assert client.get("/api/products", params={"q": "zzzz"}).json()["total"] == 0
    sug = client.get("/api/search/suggest", params={"q": "va"}).json()
    assert any(p["name"] == "Melt Vase" for p in sug["products"])


def test_product_detail_by_slug(client):
    body = client.get("/api/products/melt-vase").json()
    assert body["product"]["discount_percent"] == 17
    assert body["category"]["slug"] == "home-decor"
    assert len(body["related"]) == 4 and len(body["frequently_bought"]) == 2
    assert client.get("/api/products/nope").status_code == 404


def test_recent_reviews_across_catalogue(client):
    recent = client.get("/api/reviews/recent").json()
    assert recent, "seeded reviews should be listed"
    dates = [r["created_at"] for r in recent]
    assert dates == sorted(dates, reverse=True)
    first = recent[0]
    assert first["product_name"] and first["product_slug"] and first["body"] is not None
    assert len(client.get("/api/reviews/recent", params={"limit": 2}).json()) == 2

    # Reviews of an unpublished product disappear from the feed
    hidden = first["product_id"]
    client.patch(f"/api/admin/products/{hidden}", json={"is_published": False}, headers=ADMIN)
    assert all(r["product_id"] != hidden for r in client.get("/api/reviews/recent").json())
