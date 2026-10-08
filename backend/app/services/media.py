"""Product media storage: Firebase Cloud Storage, or local disk (served under
/media). Chosen by MEDIA_BACKEND; see app/core/container.py."""
from __future__ import annotations

import asyncio
import mimetypes
from pathlib import Path
from typing import Protocol
from urllib.parse import quote, unquote, urlsplit
from uuid import uuid4

from app.core.errors import BadRequest

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/svg+xml"}
MAX_BYTES = 10 * 1024 * 1024


class MediaStorage(Protocol):
    async def upload(self, folder: str, filename: str, data: bytes, content_type: str) -> tuple[str, str]:
        """Returns (public_url, storage_path)."""
        ...

    async def delete(self, path: str) -> None: ...

    def path_from_url(self, url: str | None) -> str | None:
        """The storage path behind a URL this backend issued, if any."""
        ...


def validate_upload(data: bytes, content_type: str | None) -> str:
    ct = content_type or "application/octet-stream"
    if ct not in ALLOWED_TYPES:
        raise BadRequest("Upload a JPEG, PNG, WebP, AVIF, GIF or SVG image")
    if len(data) > MAX_BYTES:
        raise BadRequest("Images must be 10 MB or smaller")
    return ct


def _object_name(folder: str, filename: str, content_type: str) -> str:
    ext = Path(filename).suffix.lower() or mimetypes.guess_extension(content_type) or ""
    return f"{folder.strip('/')}/{uuid4().hex}{ext}"


class LocalMediaStorage:
    def __init__(self, root: str, base_url: str):
        self.root = Path(root)
        self.base_url = base_url.rstrip("/")

    async def upload(self, folder, filename, data, content_type):
        name = _object_name(folder, filename, content_type)
        dest = self.root / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        await asyncio.to_thread(dest.write_bytes, data)
        return f"{self.base_url}/media/{name}", name

    async def delete(self, path):
        target = (self.root / path).resolve()
        if self.root.resolve() in target.parents and target.exists():
            await asyncio.to_thread(target.unlink)

    def path_from_url(self, url):
        prefix = f"{self.base_url}/media/"
        return url[len(prefix):] if url and url.startswith(prefix) else None


class FirebaseMediaStorage:
    def __init__(self):
        from firebase_admin import storage

        from app.core.firebase import get_app

        self.bucket = storage.bucket(app=get_app())
        self._url_prefix = f"/v0/b/{self.bucket.name}/o/"

    async def upload(self, folder, filename, data, content_type):
        name = _object_name(folder, filename, content_type)
        token = uuid4().hex
        blob = self.bucket.blob(name)
        # A download token gives a stable URL that works with Storage rules that
        # allow public reads of /products/** (see firebase/storage.rules).
        blob.metadata = {"firebaseStorageDownloadTokens": token}
        blob.cache_control = "public, max-age=31536000, immutable"
        await asyncio.to_thread(blob.upload_from_string, data, content_type=content_type)
        url = (f"https://firebasestorage.googleapis.com{self._url_prefix}"
               f"{quote(name, safe='')}?alt=media&token={token}")
        return url, name

    async def delete(self, path):
        blob = self.bucket.blob(path)
        try:
            await asyncio.to_thread(blob.delete)
        except Exception:
            pass

    def path_from_url(self, url):
        parts = urlsplit(url or "")
        if parts.netloc != "firebasestorage.googleapis.com" or not parts.path.startswith(self._url_prefix):
            return None
        return unquote(parts.path[len(self._url_prefix):]) or None
