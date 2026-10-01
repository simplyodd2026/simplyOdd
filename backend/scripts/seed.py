"""Seed the configured backend (e.g. Firestore) with the demo catalogue.

    DATA_BACKEND=firestore python -m scripts.seed [--force]
"""
import asyncio
import sys

from app.core.config import get_settings
from app.core.container import build_services
from app.seed import seed_catalogue


async def main(force: bool) -> None:
    svc = build_services(get_settings())
    if await svc.store.list("products", limit=1) and not force:
        print("Products already exist; pass --force to seed anyway.")
        return
    await seed_catalogue(svc)
    print("Seeded.")


if __name__ == "__main__":
    asyncio.run(main("--force" in sys.argv))
