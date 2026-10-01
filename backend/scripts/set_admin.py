"""Grant or revoke admin access by setting `is_admin` on the user's document.

    python -m scripts.set_admin someone@example.com [--revoke]

The person must have signed in once so their `users/{uid}` document exists.
Takes effect on their next request; no need to sign out. Editing the field in
the Firestore console does the same thing.
"""
import asyncio
import sys

from app.core.config import get_settings
from app.core.container import build_services
from app.core.utils import now
from app.services.accounts import USERS


async def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    email = sys.argv[1].strip().lower()
    store = build_services(get_settings()).store
    docs = await store.list(USERS, where=[("email", "==", email)], limit=1)
    if not docs:
        sys.exit(f"No user with email {email}. They need to sign in once first.")
    is_admin = "--revoke" not in sys.argv
    await store.update(USERS, docs[0]["user_id"], {"is_admin": is_admin, "updated_at": now()})
    print(f"{email}: is_admin={is_admin}")


if __name__ == "__main__":
    asyncio.run(main())
