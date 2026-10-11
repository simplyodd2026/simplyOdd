from app.models.filament import FILAMENTS
from tests.conftest import ADMIN, CUSTOMER, address


def test_palette_is_served_with_all_28_options(client):
    palette = client.get("/api/config").json()["filaments"]
    assert len(palette) == len(FILAMENTS) == 28
    assert len({f["id"] for f in palette}) == 28
    by_id = {f["id"]: f for f in palette}
    assert by_id["matte-black"]["hex"] == "#252525" and by_id["matte-black"]["finish_label"] == "Solid"
    assert {f["id"] for f in palette if f["group"] == "special"} == {"clear", "translucent-amber", "silk-gold", "silk-silver"}
    assert by_id["silk-gold"]["finish"] == "silk" and by_id["clear"]["finish"] == "transparent"


def test_products_carry_only_their_own_options(client, products):
    lamp = products["fungal-lamp"]
    assert lamp["colors"] == ["pure-white", "ivory", "warm-beige", "clear", "translucent-amber"]
    assert lamp["default_color"] == "pure-white"
    assert "silk-gold" not in products["spine-vase"]["colors"]
    assert products["vortex-pen-cup"]["colors"] == [] and products["vortex-pen-cup"]["default_color"] is None


def test_quote_keeps_colours_as_separate_lines_and_validates_them(client, products):
    vase = products["spine-vase"]  # stock 22, essentials only
    q = client.post("/api/cart/quote", json={"items": [
        {"product_id": vase["id"], "quantity": 1, "color": "sage-green"},
        {"product_id": vase["id"], "quantity": 2, "color": "navy-blue"},
        {"product_id": vase["id"], "quantity": 1, "color": "sage-green"},
    ]}).json()
    assert not q["has_issues"]
    lines = {line["color"]: line for line in q["lines"]}
    assert lines.keys() == {"sage-green", "navy-blue"}
    assert lines["sage-green"]["quantity"] == 2 and lines["navy-blue"]["quantity"] == 2
    assert lines["navy-blue"]["filament"]["name"] == "Navy Blue"
    assert q["subtotal"] == vase["price"] * 4

    # Not offered for this piece, unknown, or missing altogether.
    for color, issue in (("silk-gold", "isn't available"), ("plaid", "isn't available"), (None, "Choose a colour")):
        q = client.post("/api/cart/quote", json={"items": [{"product_id": vase["id"], "quantity": 1, "color": color}]}).json()
        assert q["has_issues"] and issue in q["lines"][0]["issue"] and q["lines"][0]["filament"] is None

    # A colour sent for a piece without colour options is ignored.
    cup = products["vortex-pen-cup"]
    q = client.post("/api/cart/quote", json={"items": [{"product_id": cup["id"], "quantity": 1, "color": "red"}]}).json()
    assert not q["has_issues"] and q["lines"][0]["color"] is None


def test_stock_is_shared_across_colours(client, products):
    bell = products["hanging-bell"]  # stock 4
    items = [{"product_id": bell["id"], "quantity": 3, "color": "ivory"},
             {"product_id": bell["id"], "quantity": 2, "color": "matte-black"}]
    q = client.post("/api/cart/quote", json={"items": items}).json()
    assert q["has_issues"] and all(line["issue"] == "Only 4 left" for line in q["lines"])


def test_checkout_records_colour_and_reserves_stock_per_product(client, products):
    lamp = products["fungal-lamp"]  # stock 9
    body = {"items": [{"product_id": lamp["id"], "quantity": 2, "color": "translucent-amber"},
                      {"product_id": lamp["id"], "quantity": 1, "color": "ivory"}],
            "address": address(), "payment_provider": "mock"}
    r = client.post("/api/checkout", json=body, headers=CUSTOMER)
    assert r.status_code == 201, r.text
    order = r.json()["order"]
    items = {i["color"]: i for i in order["items"]}
    assert items["translucent-amber"]["filament"] == {
        "id": "translucent-amber", "name": "Translucent Amber", "finish": "translucent",
        "finish_label": "Translucent", "hex": "#C98A2E"}
    assert items["ivory"]["quantity"] == 1
    assert client.get("/api/products/fungal-lamp").json()["product"]["stock"] == 6

    # The seller sees the same detail.
    admin_view = client.get(f"/api/admin/orders/{order['id']}", headers=ADMIN).json()["order"]
    assert {i["filament"]["name"] for i in admin_view["items"]} == {"Translucent Amber", "Ivory"}

    # Cancelling returns all three to stock.
    client.post(f"/api/me/orders/{order['id']}/cancel", headers=CUSTOMER)
    assert client.get("/api/products/fungal-lamp").json()["product"]["stock"] == 9

    # Checkout refuses a colour the piece isn't offered in.
    bad = {**body, "items": [{"product_id": lamp["id"], "quantity": 1, "color": "silk-gold"}]}
    assert client.post("/api/checkout", json=bad, headers=CUSTOMER).status_code == 409


def test_saved_bag_keeps_colours_apart(client, products):
    vase = products["spine-vase"]["id"]
    items = [{"product_id": vase, "quantity": 1, "color": "ivory"}, {"product_id": vase, "quantity": 1, "color": "ivory"},
             {"product_id": vase, "quantity": 1, "color": "charcoal"}]
    cart = client.put("/api/me/cart", json={"items": items}, headers=CUSTOMER).json()
    assert sorted((i["color"], i["quantity"]) for i in cart["items"]) == [("charcoal", 1), ("ivory", 2)]
    merged = client.post("/api/me/cart/merge", json={"items": [{"product_id": vase, "quantity": 3, "color": "charcoal"}]},
                         headers=CUSTOMER).json()
    assert sorted((i["color"], i["quantity"]) for i in merged["items"]) == [("charcoal", 3), ("ivory", 2)]


def test_admin_configures_colours(client, products):
    pid = products["spine-vase"]["id"]
    r = client.patch(f"/api/admin/products/{pid}", json={"colors": ["plaid"]}, headers=ADMIN)
    assert r.status_code == 400

    images = products["spine-vase"]["images"]
    images[1]["color"] = "charcoal"
    r = client.patch(f"/api/admin/products/{pid}", json={"colors": ["charcoal", "ivory", "charcoal"], "images": images},
                     headers=ADMIN).json()
    assert r["colors"] == ["charcoal", "ivory"] and r["default_color"] == "charcoal"
    assert r["images"][1]["color"] == "charcoal"

    # The quote shows the photo of the chosen colour when there is one.
    q = client.post("/api/cart/quote", json={"items": [{"product_id": pid, "quantity": 1, "color": "charcoal"}]}).json()
    assert q["lines"][0]["image"] == images[1]["url"]
    q = client.post("/api/cart/quote", json={"items": [{"product_id": pid, "quantity": 1, "color": "ivory"}]}).json()
    assert q["lines"][0]["image"] == images[0]["url"]

    # Dropping a colour clears the default and the photo tag that pointed at it.
    r = client.patch(f"/api/admin/products/{pid}", json={"colors": ["ivory"]}, headers=ADMIN).json()
    assert r["default_color"] == "ivory" and r["images"][1]["color"] is None

    r = client.patch(f"/api/admin/products/{pid}", json={"colors": []}, headers=ADMIN).json()
    assert r["colors"] == [] and r["default_color"] is None


def test_customise_request_is_linked_to_the_product(client, products):
    bell = products["hanging-bell"]
    body = {"name": "Asha", "email": "Asha@Example.com", "idea": "Could this be twice the size, in sage?", "kind": "lighting",
            "colours": ["Sage Green"], "product_id": bell["id"], "changes": ["size", "colour", "size"]}
    assert client.post("/api/custom-requests", json=body).status_code == 201
    saved = client.get("/api/admin/custom-requests", headers=ADMIN).json()[0]
    assert saved["product_name"] == "Hanging Bell" and saved["product_slug"] == "hanging-bell"
    assert saved["changes"] == ["size", "colour"] and saved["colours"] == ["Sage Green"]

    # Name and slug come from the catalogue, not the request; unknown products are refused.
    assert client.post("/api/custom-requests", json={**body, "product_name": "Free Lamp"}).status_code == 201
    assert client.get("/api/admin/custom-requests", headers=ADMIN).json()[0]["product_name"] == "Hanging Bell"
    assert client.post("/api/custom-requests", json={**body, "product_id": "p_nope"}).status_code == 400

    # The general brief still works without a product.
    plain = {k: v for k, v in body.items() if k not in ("product_id", "changes")}
    assert client.post("/api/custom-requests", json=plain).status_code == 201
