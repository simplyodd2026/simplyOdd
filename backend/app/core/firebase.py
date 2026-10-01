"""Lazy firebase-admin initialisation. Only touched when DATA_BACKEND=firestore
or when a real Firebase ID token needs verifying."""
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
    # ApplicationDefault picks up GOOGLE_APPLICATION_CREDENTIALS locally and
    # the attached service account on Cloud Run.
    return firebase_admin.initialize_app(credentials.ApplicationDefault(), options)
