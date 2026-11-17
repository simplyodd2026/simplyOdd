from tests.conftest import ADMIN, CUSTOMER, address
from tests.test_checkout import pay

FRAMES = [
    {"key": "unframed", "label": "Without frame", "price": 499},
    {"key": "framed", "label": "With frame", "price": 899, "compare_at_price": 999},
]


def with_frames(client, product, **extra):
    images = [
        {"url": "https://img.test/plain.jpg", "alt": ""},
        {"url": "https://img.test/framed.jpg", "alt": "", "variant": "framed"},
    ]
    r = client.patch(f"/api/admin/products/{product['id']}", headers=ADMIN,
                     json={"variant_label": "Frame", "variants": FRAMES, "images": images, **extra})
    assert r.status_code == 200, r.text
    return r.json()


def quote(client, items):
    return client.post("/api/cart/quote", json={"items": items}).json()


def test_admin_sets_up_variants(client, products):
    cup = with_frames(client, products["vortex-pen-cup"])
    assert [v["key"] for v in cup["variants"]] == ["unframed", "framed"]
    assert cup["variant_label"] == "Frame"
    # The default falls back to the first, and the headline price mirrors it.
    assert cup["default_variant"] == "unframed" and cup["price"] == 499 and cup["compare_at_price"] is None
    cup = client.patch(f"/api/admin/products/{cup['id']}", headers=ADMIN, json={"default_variant": "framed"}).json()
    assert cup["price"] == 899 and cup["compare_at_price"] == 999 and cup["discount_percent"] == 10
    # Visible on the storefront.
    shown = client.get(f"/api/products/{cup['slug']}").json()["product"]
    assert shown["variants"][1]["label"] == "With frame" and shown["images"][1]["variant"] == "framed"
    # Keys must be unique and well formed.
    dup = [FRAMES[0], {**FRAMES[1], "key": "unframed"}]
    assert client.patch(f"/api/admin/products/{cup['id']}", headers=ADMIN, json={"variants": dup}).status_code == 422
    bad = [{**FRAMES[0], "key": "No Frame"}]
    assert client.patch(f"/api/admin/products/{cup['id']}", headers=ADMIN, json={"variants": bad}).status_code == 422
    # Dropping a variant frees its photos and moves the default.
    cup = client.patch(f"/api/admin/products/{cup['id']}", headers=ADMIN, json={"variants": [FRAMES[0]]}).json()
    assert cup["default_variant"] == "unframed" and cup["price"] == 499
    assert all(i["variant"] is None for i in cup["images"])
    # Turning it off keeps the last price.
    off = client.patch(f"/api/admin/products/{cup['id']}", headers=ADMIN, json={"variants": []}).json()
    assert off["variants"] == [] and off["default_variant"] is None and off["price"] == 499


def test_quote_prices_each_variant(client, products):
    cup = with_frames(client, products["vortex-pen-cup"])
    q = quote(client, [{"product_id": cup["id"], "quantity": 1}])
    assert q["has_issues"] and q["lines"][0]["issue"] == "Choose a frame"

    q = quote(client, [{"product_id": cup["id"], "quantity": 1, "variant": "gold"}])
    assert q["has_issues"] and "isn't available" in q["lines"][0]["issue"]

    q = quote(client, [
        {"product_id": cup["id"], "quantity": 1, "variant": "unframed"},
        {"product_id": cup["id"], "quantity": 2, "variant": "framed"},
        {"product_id": cup["id"], "quantity": 1, "variant": "framed"},
    ])
    assert not q["has_issues"], q
    lines = {line["variant"]: line for line in q["lines"]}
    assert lines["unframed"]["unit_price"] == 499 and lines["unframed"]["compare_at_price"] is None
    assert lines["framed"]["quantity"] == 3 and lines["framed"]["unit_price"] == 899
    assert lines["framed"]["compare_at_price"] == 999 and lines["framed"]["variant_label"] == "With frame"
    assert lines["framed"]["variant_name"] == "Frame" and len(lines["framed"]["variants"]) == 2
    # Each line shows its own version's photo.
    assert lines["framed"]["image"] == "https://img.test/framed.jpg"
    assert lines["unframed"]["image"] == "https://img.test/plain.jpg"
    assert q["subtotal"] == 499 + 899 * 3

    # A variant sent for a piece that doesn't offer them is ignored.
    vase = products["spine-vase"]
    q = quote(client, [{"product_id": vase["id"], "quantity": 1, "color": "ivory", "variant": "framed"}])
    assert not q["has_issues"] and q["lines"][0]["variant"] is None and q["lines"][0]["unit_price"] == vase["price"]


def test_order_keeps_the_variant(client, products):
    cup = with_frames(client, products["vortex-pen-cup"])
    body = {"items": [{"product_id": cup["id"], "quantity": 1, "variant": "framed"}],
            "address": address(), "payment_provider": "mock"}
    r = pay(client, body)
    assert r.status_code == 201, r.text
    order = r.json()
    item = order["items"][0]
    assert item["variant"] == "framed" and item["variant_label"] == "With frame" and item["unit_price"] == 899
    # The admin still sees what was bought after the variant is renamed.
    client.patch(f"/api/admin/products/{cup['id']}", headers=ADMIN,
                 json={"variants": [FRAMES[0], {**FRAMES[1], "label": "Oak frame"}]})
    admin = client.get(f"/api/admin/orders/{order['id']}", headers=ADMIN).json()["order"]
    assert admin["items"][0]["variant_label"] == "With frame"


def test_saved_bag_keeps_variants_apart(client, products):
    cup = products["vortex-pen-cup"]
    items = [{"product_id": cup["id"], "quantity": 1, "variant": "framed"},
             {"product_id": cup["id"], "quantity": 2, "variant": "unframed"},
             {"product_id": cup["id"], "quantity": 1, "variant": "framed"}]
    saved = client.put("/api/me/cart", headers=CUSTOMER, json={"items": items}).json()["items"]
    assert sorted((i["variant"], i["quantity"]) for i in saved) == [("framed", 2), ("unframed", 2)]
