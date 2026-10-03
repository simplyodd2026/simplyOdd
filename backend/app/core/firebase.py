"""Lazy firebase-admin initialisation. Only touched when DATA_BACKEND=firestore
or when a real Firebase ID token needs verifying."""
import base64
import json
from functools import lru_cache

import firebase_admin
from firebase_admin import credentials

from app.core.config import get_settings


@lru_cache
def get_app() -> firebase_admin.App:
    s = get_settings()
    options: dict = {}
    if s.firebase_project_id:
        options["projectId"] = s.firebase_project_id
    if s.firebase_storage_bucket:
        options["storageBucket"] = s.firebase_storage_bucket
    # Inline JSON wins (Render), then a key file named in .env; otherwise
    # ApplicationDefault picks up the GOOGLE_APPLICATION_CREDENTIALS env var
    # locally and the attached service account on Cloud Run.
    if s.firebase_credentials_json:
        cred = credentials.Certificate(_parse_credentials(s.firebase_credentials_json))
    elif s.google_application_credentials:
        cred = credentials.Certificate(s.google_application_credentials)
    else:
        cred = credentials.ApplicationDefault()
    return firebase_admin.initialize_app(cred, options)


def _parse_credentials(raw: str) -> dict:
    raw = raw.strip()
    if not raw.startswith("{"):
        raw = base64.b64decode(raw).decode()
    return json.loads(raw)
