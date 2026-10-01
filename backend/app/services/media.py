"""Product media storage: Firebase Cloud Storage, Google Drive, or local disk
(served under /media). Chosen by MEDIA_BACKEND; see app/core/container.py."""
from __future__ import annotations

import asyncio
import json
import mimetypes
from collections import OrderedDict
from pathlib import Path
from typing import Protocol
from urllib.parse import quote
from uuid import uuid4

from app.core.errors import BadRequest

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/svg+xml"}
MAX_BYTES = 10 * 1024 * 1024


class MediaStorage(Protocol):
    async def upload(self, folder: str, filename: str, data: bytes, content_type: str) -> tuple[str, str]:
        """Returns (public_url, storage_path)."""
        ...

    async def delete(self, path: str) -> None: ...


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


class FirebaseMediaStorage:
    def __init__(self):
        from firebase_admin import storage

        from app.core.firebase import get_app

        self.bucket = storage.bucket(app=get_app())

    async def upload(self, folder, filename, data, content_type):
        name = _object_name(folder, filename, content_type)
        token = uuid4().hex
        blob = self.bucket.blob(name)
        # A download token gives a stable URL that works with Storage rules that
        # allow public reads of /products/** (see firebase/storage.rules).
        blob.metadata = {"firebaseStorageDownloadTokens": token}
        blob.cache_control = "public, max-age=31536000, immutable"
        await asyncio.to_thread(blob.upload_from_string, data, content_type=content_type)
        url = (f"https://firebasestorage.googleapis.com/v0/b/{self.bucket.name}/o/"
               f"{quote(name, safe='')}?alt=media&token={token}")
        return url, name

    async def delete(self, path):
        blob = self.bucket.blob(path)
        try:
            await asyncio.to_thread(blob.delete)
        except Exception:
            pass


DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.file"]


class GoogleDriveMediaStorage:
    """Stores images in one Google Drive folder, uploading as the Drive owner
    via an OAuth refresh token (see scripts/drive_auth.py).

    Files stay private. The API serves them at /api/media/drive/{file_id}
    (app/api/routes/media.py), fetching through the Drive API and keeping
    recent files in memory. Google's public image host rate-limits hotlinked
    Drive files with 429s, so it is not used. Browsers cache each image
    forever, since a file id never changes content."""

    API = "https://www.googleapis.com/drive/v3/files"
    UPLOAD = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id"
    CACHE_BYTES = 200 * 1024 * 1024

    def __init__(self, client_id: str, client_secret: str, refresh_token: str, folder_id: str, base_url: str):
        from google.auth.transport.requests import AuthorizedSession
        from google.oauth2.credentials import Credentials

        creds = Credentials(None, refresh_token=refresh_token, client_id=client_id,
                            client_secret=client_secret, token_uri="https://oauth2.googleapis.com/token",
                            scopes=DRIVE_SCOPES)
        self.session = AuthorizedSession(creds)
        self.folder_id = folder_id
        self.base_url = base_url.rstrip("/")
        self._cache: OrderedDict[str, tuple[bytes, str]] = OrderedDict()
        self._cache_size = 0

    def url_for(self, file_id: str) -> str:
        return f"{self.base_url}/api/media/drive/{file_id}"

    def _upload(self, name: str, data: bytes, content_type: str) -> str:
        meta = json.dumps({"name": name, "parents": [self.folder_id]}).encode()
        boundary = uuid4().hex
        body = (f"--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n".encode() + meta
                + f"\r\n--{boundary}\r\nContent-Type: {content_type}\r\n\r\n".encode() + data
                + f"\r\n--{boundary}--".encode())
        r = self.session.post(self.UPLOAD, data=body, timeout=60,
                              headers={"Content-Type": f"multipart/related; boundary={boundary}"})
        r.raise_for_status()
        return r.json()["id"]

    async def upload(self, folder, filename, data, content_type):
        # Drive folders are flat here; keep the logical folder in the file name.
        name = _object_name(folder, filename, content_type).replace("/", "_")
        file_id = await asyncio.to_thread(self._upload, name, data, content_type)
        self._remember(file_id, data, content_type)
        return self.url_for(file_id), file_id

    def _remember(self, file_id: str, data: bytes, content_type: str) -> None:
        if len(data) > self.CACHE_BYTES // 10:
            return
        self._cache[file_id] = (data, content_type)
        self._cache_size += len(data)
        while self._cache_size > self.CACHE_BYTES:
            _, (old, _) = self._cache.popitem(last=False)
            self._cache_size -= len(old)

    def _download(self, file_id: str) -> tuple[bytes, str] | None:
        r = self.session.get(f"{self.API}/{file_id}", params={"alt": "media"}, timeout=60)
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r.content, r.headers.get("Content-Type", "application/octet-stream")

    async def download(self, file_id: str) -> tuple[bytes, str] | None:
        if file_id in self._cache:
            self._cache.move_to_end(file_id)
            return self._cache[file_id]
        found = await asyncio.to_thread(self._download, file_id)
        if found:
            self._remember(file_id, *found)
        return found

    async def delete(self, path):
        self._cache.pop(path, None)
        try:
            await asyncio.to_thread(self.session.delete, f"{self.API}/{quote(path, safe='')}", timeout=30)
        except Exception:
            pass
