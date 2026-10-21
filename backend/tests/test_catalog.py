from tests.conftest import ADMIN


def test_list_filters_and_sorts(client):
    r = client.get("/api/products", params={"sort": "price_asc", "page_size": 100}).json()
    prices = [p["price"] for p in r["items"]]
    assert prices == sorted(prices) and r["total"] == 21

    lighting = client.get("/api/products", params={"category": "lighting"}).json()
    assert lighting["total"] == 3


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


def test_product_in_several_categories(client):
    cats = {c["slug"]: c for c in client.get("/api/categories").json()}
    lighting, decor = cats["lighting"], cats["home-decor"]
    pid = client.get("/api/products/melt-vase").json()["product"]["id"]

    r = client.patch(f"/api/admin/products/{pid}", json={"category_ids": [decor["id"], lighting["id"], decor["id"]]},
                     headers=ADMIN).json()
    assert r["category_ids"] == [decor["id"], lighting["id"]]

    in_lighting = [p["id"] for p in client.get("/api/products", params={"category": "lighting"}).json()["items"]]
    in_decor = [p["id"] for p in client.get("/api/products", params={"category": "home-decor"}).json()["items"]]
    assert pid in in_lighting and pid in in_decor
    counts = {c["slug"]: c["product_count"] for c in client.get("/api/categories").json()}
    assert counts["lighting"] == lighting["product_count"] + 1 and counts["home-decor"] == decor["product_count"]
    assert client.get("/api/products/melt-vase").json()["category"]["slug"] == "home-decor"  # the first is its home


def test_single_category_products_still_read(client):
    store = client.app.state.services.store
    pid = client.get("/api/products/melt-vase").json()["product"]["id"]
    doc = client.portal.call(store.get, "products", pid)
    legacy = {k: v for k, v in doc.items() if k != "category_ids"} | {"category_id": doc["category_ids"][0]}
    client.portal.call(store.set, "products", pid, legacy)
    client.app.state.services.catalog.invalidate()
    assert client.get("/api/products/melt-vase").json()["product"]["category_ids"] == doc["category_ids"]
