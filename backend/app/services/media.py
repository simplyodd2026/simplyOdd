"""Product media storage: Firebase Cloud Storage, Google Drive, or local disk
(served under /media). Chosen by MEDIA_BACKEND; see app/core/container.py."""
from __future__ import annotations

import asyncio
import json
import mimetypes
import re
from collections import OrderedDict
from pathlib import Path
from typing import Protocol
from urllib.parse import quote
from uuid import uuid4

from app.core.errors import BadRequest
from app.core.utils import slugify

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/svg+xml"}
MAX_BYTES = 10 * 1024 * 1024


# A label is a human-readable location, e.g. ["Products", "Lighting", "Ghost Lamp"].
# Drive builds real folders from it; the other backends keep their id-based
# paths and ignore it.
Label = list[str]


class MediaStorage(Protocol):
    async def upload(self, folder: str, filename: str, data: bytes, content_type: str,
                     label: Label | None = None) -> tuple[str, str]:
        """Returns (public_url, storage_path)."""
        ...

    async def delete(self, path: str) -> None: ...

    async def organize(self, path: str, label: Label) -> None:
        """Move a stored file to match a new label (e.g. after a rename)."""
        ...

    def path_from_url(self, url: str | None) -> str | None:
        """The storage path behind a URL this backend issued, if any."""
        ...


class _NoOrganize:
    async def organize(self, path: str, label: Label) -> None:
        pass

    def path_from_url(self, url: str | None) -> str | None:
        return None


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


class LocalMediaStorage(_NoOrganize):
    def __init__(self, root: str, base_url: str):
        self.root = Path(root)
        self.base_url = base_url.rstrip("/")

    async def upload(self, folder, filename, data, content_type, label=None):
        name = _object_name(folder, filename, content_type)
        dest = self.root / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        await asyncio.to_thread(dest.write_bytes, data)
        return f"{self.base_url}/media/{name}", name

    async def delete(self, path):
        target = (self.root / path).resolve()
        if self.root.resolve() in target.parents and target.exists():
            await asyncio.to_thread(target.unlink)


class FirebaseMediaStorage(_NoOrganize):
    def __init__(self):
        from firebase_admin import storage

        from app.core.firebase import get_app

        self.bucket = storage.bucket(app=get_app())

    async def upload(self, folder, filename, data, content_type, label=None):
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
    """Stores images in a Google Drive folder, uploading as the Drive owner via
    an OAuth refresh token (see scripts/drive_auth.py). Files are filed into
    readable folders built from each upload's label:

        <root>/Products/<Category>/<Product>/   <root>/Categories/<Category>/
        <root>/Avatars/<email>/                  <root>/Misc/

    organize() moves files when a product or category is renamed, and folders
    left empty by a move or delete are removed.

    Files stay private. The API serves them at /api/media/drive/{file_id}
    (app/api/routes/media.py), fetching through the Drive API and keeping
    recent files in memory. Google's public image host rate-limits hotlinked
    Drive files with 429s, so it is not used. Browsers cache each image
    forever, since a file id never changes content."""

    API = "https://www.googleapis.com/drive/v3/files"
    UPLOAD = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id"
    FOLDER = "application/vnd.google-apps.folder"
    CACHE_BYTES = 200 * 1024 * 1024

    def __init__(self, client_id: str, client_secret: str, refresh_token: str, folder_id: str, base_url: str):
        from google.auth.transport.requests import AuthorizedSession
        from google.oauth2.credentials import Credentials
        from requests.adapters import HTTPAdapter

        creds = Credentials(None, refresh_token=refresh_token, client_id=client_id,
                            client_secret=client_secret, token_uri="https://oauth2.googleapis.com/token",
                            scopes=DRIVE_SCOPES)
        self.session = AuthorizedSession(creds)
        # Image requests hit Drive from asyncio.to_thread workers, often more
        # than requests' default 10 at once; keep those connections pooled.
        self.session.mount("https://", HTTPAdapter(pool_connections=4, pool_maxsize=32))
        self.folder_id = folder_id
        self.base_url = base_url.rstrip("/")
        self._cache: OrderedDict[str, tuple[bytes, str]] = OrderedDict()
        self._cache_size = 0
        self._folders: dict[tuple[str, ...], str] = {}
        # Serialises folder creation and moves so two uploads can't create twin folders.
        self._lock = asyncio.Lock()

    def url_for(self, file_id: str) -> str:
        return f"{self.base_url}/api/media/drive/{file_id}"

    def path_from_url(self, url: str | None) -> str | None:
        m = re.search(r"/api/media/drive/([A-Za-z0-9_-]+)$", url or "")
        return m.group(1) if m else None

    # ---------------------------------------------------------------- folders
    @staticmethod
    def _clean(name: str) -> str:
        return re.sub(r"[/\\]+", "-", name).strip() or "Untitled"

    def _child_folder(self, parent: str, name: str) -> str:
        escaped = name.replace("\\", "\\\\").replace("'", "\\'")  # Drive query string literal
        q = f"name = '{escaped}' and mimeType = '{self.FOLDER}' and '{parent}' in parents and trashed = false"
        r = self.session.get(self.API, params={"q": q, "fields": "files(id)", "pageSize": 1}, timeout=30)
        r.raise_for_status()
        if found := r.json()["files"]:
            return found[0]["id"]
        r = self.session.post(f"{self.API}?fields=id", timeout=30,
                              json={"name": name, "mimeType": self.FOLDER, "parents": [parent]})
        r.raise_for_status()
        return r.json()["id"]

    def _folder(self, label: Label) -> str:
        key: tuple[str, ...] = ()
        folder = self.folder_id
        for part in (self._clean(p) for p in label):
            key += (part,)
            if key not in self._folders:
                self._folders[key] = self._child_folder(folder, part)
            folder = self._folders[key]
        return folder

    def _meta(self, file_id: str) -> dict:
        r = self.session.get(f"{self.API}/{file_id}", params={"fields": "name,parents"}, timeout=30)
        if r.status_code == 404:
            return {}
        r.raise_for_status()
        return r.json()

    def _parents(self, file_id: str) -> list[str]:
        return self._meta(file_id).get("parents", [])

    @staticmethod
    def _file_name(label: Label, ext: str, unique: str) -> str:
        return f"{slugify(label[-1]) or 'image'}-{unique}{ext}"

    def _prune(self, folder: str) -> None:
        """Delete folder if empty, then its parent, never touching the root or
        the top-level Products/Categories/... folders."""
        while folder != self.folder_id:
            parents = self._parents(folder)
            if not parents or self.folder_id in parents:
                return
            r = self.session.get(self.API, params={"q": f"'{folder}' in parents and trashed = false",
                                                   "fields": "files(id)", "pageSize": 1}, timeout=30)
            r.raise_for_status()
            if r.json()["files"]:
                return
            self.session.delete(f"{self.API}/{folder}", timeout=30)
            self._folders = {k: v for k, v in self._folders.items() if v != folder}
            folder = parents[0]

    # ------------------------------------------------------------------ files
    def _upload(self, parent: str, name: str, data: bytes, content_type: str) -> str:
        meta = json.dumps({"name": name, "parents": [parent]}).encode()
        boundary = uuid4().hex
        body = (f"--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n".encode() + meta
                + f"\r\n--{boundary}\r\nContent-Type: {content_type}\r\n\r\n".encode() + data
                + f"\r\n--{boundary}--".encode())
        r = self.session.post(self.UPLOAD, data=body, timeout=60,
                              headers={"Content-Type": f"multipart/related; boundary={boundary}"})
        r.raise_for_status()
        return r.json()["id"]

    async def upload(self, folder, filename, data, content_type, label=None):
        label = label or [folder.split("/")[0].capitalize()]
        ext = Path(filename).suffix.lower() or mimetypes.guess_extension(content_type) or ""
        name = self._file_name(label, ext, uuid4().hex[:8])
        async with self._lock:
            parent = await asyncio.to_thread(self._folder, label)
        file_id = await asyncio.to_thread(self._upload, parent, name, data, content_type)
        self._remember(file_id, data, content_type)
        return self.url_for(file_id), file_id

    def _move(self, file_id: str, label: Label) -> None:
        target = self._folder(label)
        meta = self._meta(file_id)
        parents = meta.get("parents", [])
        name = self._file_name(label, Path(meta.get("name", "")).suffix.lower(), file_id[-8:])
        if not parents or (parents == [target] and meta["name"] == name):
            return
        r = self.session.patch(f"{self.API}/{file_id}", json={"name": name}, timeout=30, params={
            "addParents": target, "removeParents": ",".join(p for p in parents if p != target)})
        r.raise_for_status()
        for old in parents:
            if old != target:
                self._prune(old)

    async def organize(self, path, label):
        async with self._lock:
            await asyncio.to_thread(self._move, path, label)

    def _delete(self, file_id: str) -> None:
        parents = self._parents(file_id)
        self.session.delete(f"{self.API}/{quote(file_id, safe='')}", timeout=30)
        for p in parents:
            self._prune(p)

    async def delete(self, path):
        self._cache.pop(path, None)
        try:
            async with self._lock:
                await asyncio.to_thread(self._delete, path)
        except Exception:
            pass

    # ------------------------------------------------------------------ reads
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
