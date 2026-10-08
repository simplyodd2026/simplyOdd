"""Rewrite Drive image links in Firestore to this API's /api/media/drive/<id>
route at PUBLIC_BASE_URL: old lh3.googleusercontent.com/d/<id> links (which
Google rate-limits) and links pointing at a previous API host (e.g. after
moving from Render to Cloud Run).

    PUBLIC_BASE_URL=https://<new-api-host> python -m scripts.migrate_drive_urls [--dry-run]

Safe to run more than once.
"""
import re
import sys

from firebase_admin import firestore

from app.core.config import get_settings
from app.core.firebase import get_app

COLLECTIONS = ["products", "categories", "users", "orders", "reviews"]
OLD = re.compile(r"https://(?:lh3\.googleusercontent\.com/d|[^/\s\"']+/api/media/drive)/([A-Za-z0-9_-]+)")


def rewrite(value, new: str):
    if isinstance(value, str):
        return OLD.sub(new, value)
    if isinstance(value, list):
        return [rewrite(v, new) for v in value]
    if isinstance(value, dict):
        return {k: rewrite(v, new) for k, v in value.items()}
    return value


def main(dry_run: bool) -> None:
    base = get_settings().public_base_url.rstrip("/")
    if "localhost" in base or "127.0.0.1" in base:
        sys.exit(f"PUBLIC_BASE_URL is {base}; set it to the deployed API URL first.")
    new = base + r"/api/media/drive/\1"
    db = firestore.client(app=get_app())
    for coll in COLLECTIONS:
        changed = 0
        for snap in db.collection(coll).stream():
            doc = snap.to_dict()
            fixed = rewrite(doc, new)
            if fixed != doc:
                changed += 1
                if not dry_run:
                    snap.reference.set(fixed)
        print(f"{coll}: {changed} document(s) {'would change' if dry_run else 'updated'}")


if __name__ == "__main__":
    main("--dry-run" in sys.argv)
