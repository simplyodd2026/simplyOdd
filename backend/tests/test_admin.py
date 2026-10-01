from tests.conftest import ADMIN, CUSTOMER


def test_admin_comes_only_from_user_document(client):
    assert client.get("/api/admin/dashboard", headers=CUSTOMER).status_code == 403
    assert client.get("/api/admin/dashboard", headers=ADMIN).status_code == 200

    store = client.app.state.services.store
    client.get("/api/me", headers=CUSTOMER)  # creates the profile
    client.portal.call(store.update, "users", "u-test", {"is_admin": True})
    assert client.get("/api/admin/dashboard", headers=CUSTOMER).status_code == 200

    # Signing in again must not reset the flag.
    assert client.get("/api/me", headers=CUSTOMER).json()["is_admin"] is True
    client.portal.call(store.update, "users", "u-test", {"is_admin": False})
    assert client.get("/api/admin/dashboard", headers=CUSTOMER).status_code == 403
