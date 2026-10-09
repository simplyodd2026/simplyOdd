from tests.conftest import ADMIN, CUSTOMER


def test_homepage_is_automatic_until_set(client):
    body = client.get("/api/homepage").json()
    assert body["layout"]["spotlight"] is None
    assert body["layout"]["collection"] == []
    assert body["products"] == []


def test_admin_sets_homepage_and_storefront_sees_it(client, products):
    a, b, c = list(products.values())[:3]
    layout = {
        "spotlight": {"product_id": a["id"], "image": a["images"][0]["url"]},
        "spotlight_inset": "https://example.com/inset.jpg",
        "collection": [{"product_id": b["id"]}, {"product_id": c["id"]}],
        "collection_row": [{"product_id": a["id"]}],
        "room": {"product_id": c["id"], "image": "https://example.com/room.jpg"},
        "moodboard": [{"product_id": a["id"]}],
        "studio_image": "https://example.com/studio.jpg",
    }
    assert client.put("/api/admin/homepage", json=layout, headers=CUSTOMER).status_code == 403
    saved = client.put("/api/admin/homepage", json=layout, headers=ADMIN)
    assert saved.status_code == 200, saved.text
    assert client.get("/api/admin/homepage", headers=ADMIN).json()["room"]["image"] == "https://example.com/room.jpg"

    public = client.get("/api/homepage").json()
    assert public["layout"]["spotlight"]["product_id"] == a["id"]
    assert [s["product_id"] for s in public["layout"]["collection"]] == [b["id"], c["id"]]
    assert [s["product_id"] for s in public["layout"]["collection_row"]] == [a["id"]]
    assert {p["id"] for p in public["products"]} == {a["id"], b["id"], c["id"]}


def test_unpublished_products_drop_out_of_the_public_homepage(client, products):
    a, b = list(products.values())[:2]
    client.put("/api/admin/homepage", headers=ADMIN, json={
        "spotlight": {"product_id": a["id"]}, "collection": [{"product_id": a["id"]}, {"product_id": b["id"]}]})
    client.patch(f"/api/admin/products/{a['id']}", json={"is_published": False}, headers=ADMIN)

    public = client.get("/api/homepage").json()
    assert public["layout"]["spotlight"] is None
    assert [s["product_id"] for s in public["layout"]["collection"]] == [b["id"]]


def test_homepage_rejects_unknown_products(client):
    r = client.put("/api/admin/homepage", json={"room": {"product_id": "nope"}}, headers=ADMIN)
    assert r.status_code == 400


def test_older_layouts_move_extra_collection_pieces_into_the_row(client, products):
    ids = [p["id"] for p in products.values()][:4]
    store = client.app.state.services.store
    client.portal.call(store.set, "settings", "homepage", {"collection": [{"product_id": i} for i in ids]})
    layout = client.get("/api/admin/homepage", headers=ADMIN).json()
    assert [s["product_id"] for s in layout["collection"]] == ids[:2]
    assert [s["product_id"] for s in layout["collection_row"]] == ids[2:]


def test_large_collection_is_limited_to_two(client, products):
    ids = [p["id"] for p in products.values()][:3]
    r = client.put("/api/admin/homepage", json={"collection": [{"product_id": i} for i in ids], "collection_row": [{"product_id": ids[0]}]},
                   headers=ADMIN)
    assert r.status_code == 422
