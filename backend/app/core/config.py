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
    # Off unless asked for, so a deploy that forgets ENV=production still can't accept dev tokens.
    allow_dev_auth: bool = False
    rate_limit: bool = True

    cors_origins: Csv = ["http://localhost:5173"]
    # Public URL of this API, used to build local-disk image links.
    public_base_url: str = "http://localhost:8000"

    firebase_project_id: str | None = None
    firebase_storage_bucket: str | None = None
    google_application_credentials: str | None = None
    # Service-account JSON passed inline (raw or base64) for hosts without
    # Application Default Credentials. Not needed on Cloud Run.
    firebase_credentials_json: str | None = None

    # Where uploaded images go. Unset = Firebase Storage on the firestore
    # backend, local disk on the memory backend.
    media_backend: Literal["local", "firebase"] | None = None

    payment_providers: Csv = ["mock"]
    razorpay_key_id: str | None = None
    razorpay_key_secret: str | None = None

    catalog_cache_seconds: int = 30

    # ---- Oddly Assistant (chat) ------------------------------------------
    # Without a key the assistant still works: it answers from the catalogue and FAQ directly.
    groq_api_key: str | None = None
    # Tried in order; a model Groq has retired or doesn't serve falls through to the next.
    groq_model: str = "openai/gpt-oss-20b"
    # Each Groq model has its own free-tier quota, so listing several multiplies capacity.
    groq_fallback_models: Csv = ["openai/gpt-oss-120b"]
    groq_timeout_seconds: float = 12.0
    groq_max_tokens: int = 400
    # Stay under the free tier: past this many Groq calls a minute (whole process), replies come from the fallback.
    groq_max_calls_per_minute: int = 25
    # Claude API: the backup when Groq is rate limited, slow or down. Unset = no backup (the built-in fallback answers).
    # Paid per token, unlike Groq's free tier; ANTHROPIC_MAX_CALLS_PER_MINUTE caps the spend rate.
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-opus-5-5"
    anthropic_effort: Literal["low", "medium", "high"] = "low"  # chat replies don't need deep reasoning
    anthropic_max_tokens: int = 16000
    anthropic_timeout_seconds: float = 30.0
    anthropic_max_calls_per_minute: int = 10
    chat_history_limit: int = 6          # past turns sent to the model
    chat_session_ttl_hours: int = 2      # a conversation's working memory is deleted after this long idle
    chat_max_message_chars: int = 600
    # Per visitor or signed-in customer, on top of the per-IP limits in main.py.
    chat_messages_per_minute: int = 12
    chat_messages_per_day: int = 200

    @field_validator("cors_origins", "payment_providers", "groq_fallback_models", mode="before")
    @classmethod
    def _split_csv(cls, v):
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return v

    @field_validator("memory_persist_path", "firebase_project_id", "firebase_storage_bucket",
                     "google_application_credentials", "firebase_credentials_json", "media_backend",
                     "razorpay_key_id", "razorpay_key_secret", "groq_api_key", "anthropic_api_key", mode="before")
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
