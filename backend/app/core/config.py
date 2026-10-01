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
    public_base_url: str = "http://localhost:8000"

    firebase_project_id: str | None = None
    firebase_storage_bucket: str | None = None
    admin_emails: Csv = ["admin@simplyodd.dev"]

    currency: str = "INR"
    tax_rate: float = 0.18
    free_shipping_threshold: float = 1999
    standard_shipping_fee: float = 99
    express_shipping_fee: float = 249

    payment_providers: Csv = ["mock", "cod"]
    razorpay_key_id: str | None = None
    razorpay_key_secret: str | None = None

    catalog_cache_seconds: int = 30

    @field_validator("cors_origins", "admin_emails", "payment_providers", mode="before")
    @classmethod
    def _split_csv(cls, v):
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return v

    @field_validator("memory_persist_path", "firebase_project_id", "firebase_storage_bucket",
                     "razorpay_key_id", "razorpay_key_secret", mode="before")
    @classmethod
    def _empty_to_none(cls, v):
        return v or None

    @property
    def is_production(self) -> bool:
        return self.env == "production"


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.is_production and s.allow_dev_auth:
        raise RuntimeError("ALLOW_DEV_AUTH must be false in production")
    return s
