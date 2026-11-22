from tests.conftest import ADMIN, CUSTOMER, address
from tests.test_checkout import pay

FIELDS = [
    {"key": "name", "label": "Name", "placeholder": "e.g. Aanya", "max_length": 12, "required": True},
    {"key": "line2", "label": "Second line", "max_length": 20, "required": False},
]


def personalise(client, product, fee=50, fields=FIELDS):
    r = client.patch(f"/api/admin/products/{product['id']}", headers=ADMIN,
                     json={"personalization": fields, "personalization_fee": fee})
    assert r.status_code == 200, r.text
    return r.json()


def test_admin_sets_up_personalisation(client, products):
    cup = personalise(client, products["vortex-pen-cup"])
    assert [f["key"] for f in cup["personalization"]] == ["name", "line2"]
    assert cup["personalization_fee"] == 50
    # Visible on the storefront.
    assert client.get(f"/api/products/{cup['slug']}").json()["product"]["personalization"][0]["label"] == "Name"
    # Keys must be unique and well formed.
    dup = [FIELDS[0], {**FIELDS[1], "key": "name"}]
    assert client.patch(f"/api/admin/products/{cup['id']}", headers=ADMIN, json={"personalization": dup}).status_code == 422
    bad = [{**FIELDS[0], "key": "Has Space"}]
    assert client.patch(f"/api/admin/products/{cup['id']}", headers=ADMIN, json={"personalization": bad}).status_code == 422
    # Turning it off.
    off = client.patch(f"/api/admin/products/{cup['id']}", headers=ADMIN, json={"personalization": []}).json()
    assert off["personalization"] == []


def test_quote_validates_prices_and_splits_personalised_lines(client, products):
    cup = personalise(client, products["vortex-pen-cup"])
    quote = lambda items: client.post("/api/cart/quote", json={"items": items}).json()  # noqa: E731

    q = quote([{"product_id": cup["id"], "quantity": 1}])
    assert q["has_issues"] and "Add the name" in q["lines"][0]["issue"]

    q = quote([{"product_id": cup["id"], "quantity": 1, "personalization": {"name": "x" * 13}}])
    assert q["has_issues"] and "up to 12 characters" in q["lines"][0]["issue"]

    q = quote([{"product_id": cup["id"], "quantity": 1, "personalization": {"name": "Aanya", "bogus": "1"}}])
    assert q["has_issues"] and "changed" in q["lines"][0]["issue"]

    q = quote([
        {"product_id": cup["id"], "quantity": 1, "personalization": {"name": "  Aanya  "}},
        {"product_id": cup["id"], "quantity": 2, "personalization": {"name": "Rohan", "line2": "Desk"}},
        {"product_id": cup["id"], "quantity": 1, "personalization": {"name": "Aanya", "line2": " "}},
    ])
    assert not q["has_issues"], q
    lines = {line["personalization"]["name"]: line for line in q["lines"]}
    assert lines["Aanya"]["quantity"] == 2 and lines["Rohan"]["quantity"] == 2
    assert lines["Aanya"]["personalization"] == {"name": "Aanya"}
    assert lines["Rohan"]["personalization_details"] == [
        {"key": "name", "label": "Name", "value": "Rohan"}, {"key": "line2", "label": "Second line", "value": "Desk"}]
    assert lines["Aanya"]["unit_price"] == cup["price"] + 50
    assert q["subtotal"] == (cup["price"] + 50) * 4

    # Personalisation sent for a piece that doesn't offer it is ignored.
    vase = products["spine-vase"]
    q = quote([{"product_id": vase["id"], "quantity": 1, "color": "ivory", "personalization": {"name": "Hi"}}])
    assert not q["has_issues"] and q["lines"][0]["personalization"] is None and q["lines"][0]["unit_price"] == vase["price"]


def test_optional_fields_only_cost_extra_when_used(client, products):
    cup = personalise(client, products["vortex-pen-cup"], fields=[{**FIELDS[0], "required": False}])
    q = client.post("/api/cart/quote", json={"items": [{"product_id": cup["id"], "quantity": 1}]}).json()
    assert not q["has_issues"] and q["lines"][0]["unit_price"] == cup["price"]


def test_order_keeps_the_personalisation(client, products):
    cup = personalise(client, products["vortex-pen-cup"])
    body = {"items": [{"product_id": cup["id"], "quantity": 1, "personalization": {"name": "Aanya"}}],
            "address": address(), "payment_provider": "mock", "payment_plan": "partial"}
    r = pay(client, body)
    assert r.status_code == 201, r.text
    order = r.json()
    item = order["items"][0]
    assert item["personalization_details"] == [{"key": "name", "label": "Name", "value": "Aanya"}]
    assert item["unit_price"] == cup["price"] + 50
    # The admin sees it, even after the product's fields change.
    personalise(client, cup, fields=[{**FIELDS[0], "label": "Your name"}])
    admin = client.get(f"/api/admin/orders/{order['id']}", headers=ADMIN).json()["order"]
    assert admin["items"][0]["personalization_details"][0]["label"] == "Name"


def test_saved_bag_keeps_personalised_lines_apart(client, products):
    cup = products["vortex-pen-cup"]
    items = [{"product_id": cup["id"], "quantity": 1, "personalization": {"name": "A"}},
             {"product_id": cup["id"], "quantity": 2, "personalization": {"name": "B"}},
             {"product_id": cup["id"], "quantity": 1, "personalization": {"name": "A"}}]
    saved = client.put("/api/me/cart", headers=CUSTOMER, json={"items": items}).json()["items"]
    assert sorted((i["personalization"]["name"], i["quantity"]) for i in saved) == [("A", 2), ("B", 2)]
    merged = client.post("/api/me/cart/merge", headers=CUSTOMER, json={"items": [items[1]]}).json()["items"]
    assert sorted((i["personalization"]["name"], i["quantity"]) for i in merged) == [("A", 2), ("B", 2)]
