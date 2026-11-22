import xml.etree.ElementTree as ET

from tests.conftest import ADMIN

NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}


def _locs(client):
    r = client.get("/api/sitemap.xml")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/xml")
    root = ET.fromstring(r.content)
    assert root.tag == "{http://www.sitemaps.org/schemas/sitemap/0.9}urlset"
    return [u.findtext("s:loc", namespaces=NS) for u in root.findall("s:url", NS)], root


def test_sitemap_lists_public_pages_products_and_collections(client, products):
    locs, root = _locs(client)
    assert len(locs) == len(set(locs)), "no duplicates"
    assert all(loc.startswith("https://simplyodd.in/") for loc in locs)
    assert "https://simplyodd.in/" in locs and "https://simplyodd.in/about" in locs
    assert "https://simplyodd.in/help/faq" in locs
    assert {f"https://simplyodd.in/product/{slug}" for slug in products} <= set(locs)
    assert "https://simplyodd.in/collections/lighting" in locs
    for private in ("/admin", "/account", "/checkout", "/cart", "/login", "/search", "/wishlist"):
        assert not any(loc.removeprefix("https://simplyodd.in").startswith(private) for loc in locs)
    product_entry = next(u for u in root.findall("s:url", NS) if "/product/" in u.findtext("s:loc", namespaces=NS))
    assert product_entry.findtext("s:lastmod", namespaces=NS).endswith("Z")


def test_sitemap_follows_publishing(client, products):
    slug, product = next(iter(products.items()))
    url = f"https://simplyodd.in/product/{slug}"
    assert url in _locs(client)[0]

    client.patch(f"/api/admin/products/{product['id']}", json={"is_published": False}, headers=ADMIN)
    assert url not in _locs(client)[0]

    client.patch(f"/api/admin/products/{product['id']}", json={"is_published": True}, headers=ADMIN)
    assert url in _locs(client)[0]

    client.delete(f"/api/admin/products/{product['id']}", headers=ADMIN)
    assert url not in _locs(client)[0]
