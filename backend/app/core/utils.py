import re
import secrets
import unicodedata
from datetime import UTC, datetime


def now() -> datetime:
    return datetime.now(UTC)


def new_id(prefix: str = "") -> str:
    return f"{prefix}{secrets.token_hex(8)}"


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def money(x: float) -> float:
    return round(x + 1e-9, 2)
