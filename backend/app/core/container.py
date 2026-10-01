"""Wires the store and services together once per process."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from fastapi import Request

from app.core.config import Settings
from app.repositories.store import DocumentStore
from app.services.accounts import AccountService
from app.services.catalog import CatalogService
from app.services.coupons import CouponService
from app.services.insights import InsightsService
from app.services.media import FirebaseMediaStorage, GoogleDriveMediaStorage, LocalMediaStorage, MediaStorage
from app.services.orders import OrderService
from app.services.payments import PaymentRegistry, build_registry
from app.services.pricing import PricingService
from app.services.reviews import ReviewService

LOCAL_MEDIA_ROOT = Path(".data/media")


@dataclass
class Services:
    settings: Settings
    store: DocumentStore
    media: MediaStorage
    catalog: CatalogService
    coupons: CouponService
    pricing: PricingService
    payments: PaymentRegistry
    orders: OrderService
    accounts: AccountService
    reviews: ReviewService
    insights: InsightsService


def build_media(settings: Settings) -> MediaStorage:
    backend = settings.resolved_media_backend
    if backend == "firebase":
        return FirebaseMediaStorage()
    if backend == "drive":
        drive = (settings.google_oauth_client_id, settings.google_oauth_client_secret,
                 settings.google_drive_refresh_token, settings.google_drive_folder_id)
        if not all(drive):
            raise RuntimeError("MEDIA_BACKEND=drive needs GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, "
                               "GOOGLE_DRIVE_REFRESH_TOKEN and GOOGLE_DRIVE_FOLDER_ID (run scripts/drive_auth.py)")
        return GoogleDriveMediaStorage(*drive, base_url=settings.public_base_url)
    return LocalMediaStorage(str(LOCAL_MEDIA_ROOT), settings.public_base_url)


def build_services(settings: Settings, store: DocumentStore | None = None) -> Services:
    if store is None:
        if settings.data_backend == "firestore":
            from app.repositories.firestore import FirestoreStore
            store = FirestoreStore()
        else:
            from app.repositories.memory import MemoryStore
            store = MemoryStore(settings.memory_persist_path)

    media = build_media(settings)
    catalog = CatalogService(store, settings.catalog_cache_seconds)
    coupons = CouponService(store)
    pricing = PricingService(settings, catalog, coupons)
    payments = build_registry(settings)
    orders = OrderService(store, catalog, pricing, coupons, payments)
    accounts = AccountService(store)
    reviews = ReviewService(store, catalog, orders)
    insights = InsightsService(store, catalog, orders, accounts)
    return Services(settings, store, media, catalog, coupons, pricing, payments, orders, accounts, reviews, insights)


def services(request: Request) -> Services:
    return request.app.state.services
