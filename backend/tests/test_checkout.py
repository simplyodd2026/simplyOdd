from app.core.container import LOCAL_MEDIA_ROOT
from tests.conftest import ADMIN, CUSTOMER, OTHER, address


def test_quote_applies_shipping_and_coupon(client, products):
    pid = products["vortex-pen-cup"]["id"]  # 1290
    q = client.post("/api/cart/quote", json={"items": [{"product_id": pid, "quantity": 1}]}).json()
    assert q["subtotal"] == 1290 and q["shipping"] == 99 and q["total"] == 1389 and q["deposit"] == 694.5
    assert "tax" not in q

    q = client.post("/api/cart/quote", json={"items": [{"product_id": pid, "quantity": 2}], "coupon_code": "oddone"}).json()
    assert q["coupon_code"] == "ODDONE" and q["discount"] == 258 and q["shipping"] == 0

    q = client.post("/api/cart/quote", json={"items": [{"product_id": pid, "quantity": 1}], "coupon_code": "BOGUS"}).json()
    assert q["discount"] == 0 and q["coupon_code"] is None and "isn't a valid code" in q["coupon_message"]


def test_quote_flags_stock_problems(client, products):
    ghost = products["ghost-lamp"]["id"]
    q = client.post("/api/cart/quote", json={"items": [{"product_id": ghost, "quantity": 1}]}).json()
    assert q["has_issues"] and q["lines"][0]["issue"] == "Out of stock" and q["subtotal"] == 0


def test_checkout_requires_auth(client, products):
    r = client.post("/api/checkout", json={})
    assert r.status_code == 401


def test_mock_payment_flow_reserves_and_releases_stock(client, products):
    p = products["facet-planter"]  # stock 3
    body = {"items": [{"product_id": p["id"], "quantity": 2}], "address": address(), "payment_provider": "mock"}
    r = client.post("/api/checkout", json=body, headers=CUSTOMER)
    assert r.status_code == 201, r.text
    order = r.json()["order"]
    assert order["status"] == "pending" and order["number"].startswith("OM-")
    assert order["payment"]["plan"] == "full" and order["payment"]["amount"] == order["total"]
    assert client.get("/api/products/facet-planter").json()["product"]["stock"] == 1

    # Can't oversell the remaining 1
    r2 = client.post("/api/checkout", json=body, headers=CUSTOMER)
    assert r2.status_code == 409

    # Declined, then paid
    bad = client.post(f"/api/orders/{order['id']}/payment/confirm", json={"payload": {"outcome": "failure"}}, headers=CUSTOMER)
    assert bad.status_code == 400
    assert client.post(f"/api/orders/{order['id']}/payment/confirm", json={"payload": {}}, headers=OTHER).status_code == 404
    ok = client.post(f"/api/orders/{order['id']}/payment/confirm", json={"payload": {"outcome": "success"}}, headers=CUSTOMER).json()
    assert ok["status"] == "confirmed" and ok["payment"]["status"] == "paid"

    # Customer cancels → stock returns, payment awaits refund
    c = client.post(f"/api/me/orders/{order['id']}/cancel", headers=CUSTOMER).json()
    assert c["status"] == "cancelled" and c["payment"]["status"] == "refund_pending"
    assert client.get("/api/products/facet-planter").json()["product"]["stock"] == 3

    # Admin refunds
    rf = client.post(f"/api/admin/orders/{order['id']}/refund", json={"status": "refunded"}, headers=ADMIN).json()
    assert rf["status"] == "refunded" and rf["payment"]["status"] == "refunded"


def test_admin_status_flow_and_reviews(client, products):
    pid = products["grid-tray"]["id"]
    body = {"items": [{"product_id": pid, "quantity": 1}], "address": address(), "payment_provider": "mock",
            "payment_plan": "partial"}
    order = client.post("/api/checkout", json=body, headers=CUSTOMER).json()["order"]
    assert order["payment"]["amount"] + order["payment"]["balance"] == order["total"]
    assert order["payment"]["amount"] == round(order["total"] / 2, 2)
    order = client.post(f"/api/orders/{order['id']}/payment/confirm", json={"payload": {"outcome": "success"}},
                        headers=CUSTOMER).json()
    assert order["status"] == "confirmed" and order["payment"]["status"] == "partially_paid"

    # Non-admins are refused
    assert client.post(f"/api/admin/orders/{order['id']}/status", json={"status": "processing"}, headers=CUSTOMER).status_code == 403
    # Invalid jump
    assert client.post(f"/api/admin/orders/{order['id']}/status", json={"status": "delivered"}, headers=ADMIN).status_code == 409
    for s in ("processing", "shipped", "delivered"):
        r = client.post(f"/api/admin/orders/{order['id']}/status", json={"status": s, "tracking_number": "T1"}, headers=ADMIN)
        assert r.status_code == 200, r.text
    assert r.json()["payment"]["status"] == "paid"

    # Verified purchaser can review; others can't
    review = {"rating": 4, "title": "Tidy", "body": "Holds everything"}
    assert client.post(f"/api/products/{pid}/reviews", json=review, headers=OTHER).status_code == 403
    created = client.post(f"/api/products/{pid}/reviews", json=review, headers=CUSTOMER)
    assert created.status_code == 201
    assert client.post(f"/api/products/{pid}/reviews", json=review, headers=CUSTOMER).status_code == 409
    rating = client.get("/api/products/grid-tray").json()["product"]["rating"]
    assert rating["count"] >= 1
    rid = created.json()["id"]
    assert client.patch(f"/api/reviews/{rid}", json={**review, "rating": 5}, headers=OTHER).status_code == 403
    assert client.patch(f"/api/reviews/{rid}", json={**review, "rating": 5}, headers=CUSTOMER).json()["rating"] == 5
    assert client.delete(f"/api/reviews/{rid}", headers=CUSTOMER).status_code == 204


def test_cart_wishlist_and_addresses(client, products):
    a, b = products["melt-vase"]["id"], products["spine-vase"]["id"]
    client.put("/api/me/cart", json={"items": [{"product_id": a, "quantity": 2}]}, headers=CUSTOMER)
    merged = client.post("/api/me/cart/merge", json={"items": [{"product_id": a, "quantity": 1}, {"product_id": b, "quantity": 1}]},
                         headers=CUSTOMER).json()
    assert {i["product_id"]: i["quantity"] for i in merged["items"]} == {a: 2, b: 1}

    w = client.post("/api/me/wishlist", json={"product_ids": [a, a, b]}, headers=CUSTOMER).json()
    assert w["product_ids"] == [a, b]
    assert client.delete(f"/api/me/wishlist/{a}", headers=CUSTOMER).json()["product_ids"] == [b]

    addr = {k: v for k, v in address().items() if k != "email"}
    first = client.post("/api/me/addresses", json=addr, headers=CUSTOMER).json()
    assert first[0]["is_default"]
    both = client.post("/api/me/addresses", json={**addr, "label": "Work"}, headers=CUSTOMER).json()
    both = client.post(f"/api/me/addresses/{both[1]['id']}/default", headers=CUSTOMER).json()
    assert [x["is_default"] for x in both] == [False, True]
    left = client.delete(f"/api/me/addresses/{both[1]['id']}", headers=CUSTOMER).json()
    assert len(left) == 1 and left[0]["is_default"]


def test_admin_product_crud(client):
    assert client.post("/api/admin/products", json={"name": "X", "price": 1}, headers=CUSTOMER).status_code == 403
    p = client.post("/api/admin/products", json={"name": "Odd Thing", "price": 999, "stock": 2, "is_published": False},
                    headers=ADMIN).json()
    assert p["slug"] == "odd-thing"
    assert client.get("/api/products/odd-thing").status_code == 404  # draft hidden
    client.patch(f"/api/admin/products/{p['id']}", json={"is_published": True}, headers=ADMIN)
    assert client.get("/api/products/odd-thing").status_code == 200
    img = client.post(f"/api/admin/products/{p['id']}/images", headers=ADMIN,
                      files=[("files", ("a.png", b"\x89PNG....", "image/png"))]).json()
    assert len(img["images"]) == 1
    assert img["images"][0]["path"].startswith("products/odd-thing/")
    stored = LOCAL_MEDIA_ROOT / img["images"][0]["path"]
    assert stored.exists()
    # Saving the product without an image deletes that image's file.
    saved = client.patch(f"/api/admin/products/{p['id']}", json={"images": []}, headers=ADMIN)
    assert saved.status_code == 200 and saved.json()["images"] == []
    assert not stored.exists()
    assert client.delete(f"/api/admin/products/{p['id']}", headers=ADMIN).status_code == 204
    dash = client.get("/api/admin/dashboard", headers=ADMIN).json()
    assert "revenue_series" in dash and len(dash["revenue_series"]) == 30


def test_custom_requests_flow(client):
    idea = {"name": "Mira", "email": "Mira@Example.com", "idea": "A lamp shaped like a sleepy cat curled up",
            "kind": "lighting", "size": "medium", "colours": ["lilac", " mint "], "budget": "2500_5000"}
    created = client.post("/api/custom-requests", json=idea)
    assert created.status_code == 201 and created.json()["ok"]
    rid = created.json()["id"]

    assert client.post("/api/custom-requests", json={**idea, "idea": "too short"}).status_code == 422
    assert client.post("/api/custom-requests", json={**idea, "email": "nope"}).status_code == 422

    assert client.get("/api/admin/custom-requests", headers=CUSTOMER).status_code == 403
    listed = client.get("/api/admin/custom-requests", headers=ADMIN).json()
    assert listed[0]["id"] == rid and listed[0]["email"] == "mira@example.com"
    assert listed[0]["colours"] == ["lilac", "mint"] and listed[0]["status"] == "new"

    upd = client.patch(f"/api/admin/custom-requests/{rid}", json={"status": "replied"}, headers=ADMIN)
    assert upd.json()["status"] == "replied"
    assert client.patch("/api/admin/custom-requests/missing", json={"status": "closed"}, headers=ADMIN).status_code == 404
    assert client.delete(f"/api/admin/custom-requests/{rid}", headers=ADMIN).status_code == 204
    assert client.get("/api/admin/custom-requests", headers=ADMIN).json() == []
