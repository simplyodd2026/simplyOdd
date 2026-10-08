from functools import lru_cache
from typing import Annotated, Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

Csv = Annotated[list[str], NoDecode]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: Literal["development", "production", "test"] = "development"
    data_backend: Literal["memory", "firestore"] = "memory"
    memory_persist_path: str | None = ".data/store.json"
    seed_demo_data: bool = True
    allow_dev_auth: bool = True

    cors_origins: Csv = ["http://localhost:5173"]
    # Public URL of this API, used to build image links. The deploy workflow
    # sets it to the Cloud Run URL.
    public_base_url: str = "http://localhost:8000"

    firebase_project_id: str | None = None
    firebase_storage_bucket: str | None = None
    google_application_credentials: str | None = None
    # Service-account JSON passed inline (raw or base64) for hosts without
    # Application Default Credentials. Not needed on Cloud Run.
    firebase_credentials_json: str | None = None

    # Where uploaded images go. Unset = Firebase Storage on the firestore
    # backend, local disk on the memory backend.
    media_backend: Literal["local", "firebase", "drive"] | None = None
    google_oauth_client_id: str | None = None
    google_oauth_client_secret: str | None = None
    google_drive_refresh_token: str | None = None
    google_drive_folder_id: str | None = None

    currency: str = "INR"
    tax_rate: float = 0.18
    free_shipping_threshold: float = 1999
    standard_shipping_fee: float = 99
    express_shipping_fee: float = 249

    payment_providers: Csv = ["mock", "cod"]
    razorpay_key_id: str | None = None
    razorpay_key_secret: str | None = None

    catalog_cache_seconds: int = 30

    @field_validator("cors_origins", "payment_providers", mode="before")
    @classmethod
    def _split_csv(cls, v):
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return v

    @field_validator("memory_persist_path", "firebase_project_id", "firebase_storage_bucket",
                     "google_application_credentials", "firebase_credentials_json", "media_backend", "google_oauth_client_id",
                     "google_oauth_client_secret", "google_drive_refresh_token", "google_drive_folder_id",
                     "razorpay_key_id", "razorpay_key_secret", mode="before")
    @classmethod
    def _empty_to_none(cls, v):
        return v or None

    @property
    def resolved_media_backend(self) -> str:
        return self.media_backend or ("firebase" if self.data_backend == "firestore" else "local")

    @property
    def is_production(self) -> bool:
        return self.env == "production"


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.is_production and s.allow_dev_auth:
        raise RuntimeError("ALLOW_DEV_AUTH must be false in production")
    return s
