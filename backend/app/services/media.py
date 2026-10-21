"""Product media storage: Firebase Cloud Storage, or local disk (served under
/media). Chosen by MEDIA_BACKEND; see app/core/container.py.

Photos are re-encoded as WebP on the way in, and each one is stored with smaller
siblings for srcset: `abc.webp` (full size), `abc.w480.webp` and `abc.w960.webp`.
The storefront derives the sibling URLs from the full one (frontend/src/lib/image.ts),
so every `.webp` object this module writes always has both siblings."""
from __future__ import annotations

import asyncio
import io
import mimetypes
from pathlib import Path
from typing import Protocol
from urllib.parse import quote, unquote, urlsplit
from uuid import uuid4

from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.errors import BadRequest

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/svg+xml"}
MAX_BYTES = 10 * 1024 * 1024

WIDTHS = (480, 960)  # the smaller copies kept beside each photo; keep in step with frontend/src/lib/image.ts
MAX_EDGE = 2000  # longest side of the full-size copy
WEBP_QUALITY = 82
PASSTHROUGH = {"image/gif", "image/svg+xml"}  # animation and vectors are stored as uploaded


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
    if content_type == "image/webp":
        ext = ".webp"  # whatever the upload was called, so the copies can be found from the name
    else:
        ext = Path(filename).suffix.lower() or mimetypes.guess_extension(content_type) or ""
    return f"{folder.strip('/')}/{uuid4().hex}{ext}"


def variant_name(name: str, width: int) -> str:
    """`products/x/abc.webp` -> `products/x/abc.w480.webp`."""
    return f"{name[:-len('.webp')]}.w{width}.webp"


def _with_variants(name: str) -> list[str]:
    return [name, *(variant_name(name, w) for w in WIDTHS)] if name.endswith(".webp") else [name]


def _encode(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, "WEBP", quality=WEBP_QUALITY, method=5)
    return buf.getvalue()


def optimize(data: bytes, content_type: str) -> tuple[str, list[bytes]]:
    """Re-encodes a photo as WebP no larger than MAX_EDGE, plus one copy per WIDTHS entry.
    Returns (content_type, [full, *copies]); GIFs, SVGs and animated images come back untouched,
    with an animated WebP's copies being the original bytes so its srcset still resolves."""
    if content_type in PASSTHROUGH:
        return content_type, [data]
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise BadRequest("That file couldn't be read as an image")
    if getattr(img, "is_animated", False):
        return content_type, [data] * (1 + len(WIDTHS) if content_type == "image/webp" else 1)
    img = ImageOps.exif_transpose(img)
    img = img.convert("RGBA" if img.mode in ("RGBA", "LA", "PA") or "transparency" in img.info else "RGB")
    img.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
    full = _encode(img)
    copies = [_encode(img.resize((w, round(img.height * w / img.width)), Image.Resampling.LANCZOS))
              if w < img.width else full for w in WIDTHS]
    return "image/webp", [full, *copies]


class LocalMediaStorage:
    def __init__(self, root: str, base_url: str):
        self.root = Path(root)
        self.base_url = base_url.rstrip("/")

    async def upload(self, folder, filename, data, content_type):
        content_type, renditions = await asyncio.to_thread(optimize, data, content_type)
        name = _object_name(folder, filename, content_type)
        (self.root / name).parent.mkdir(parents=True, exist_ok=True)
        for object_name, body in zip(_with_variants(name), renditions):
            await asyncio.to_thread((self.root / object_name).write_bytes, body)
        return f"{self.base_url}/media/{name}", name

    async def delete(self, path):
        for name in _with_variants(path):
            target = (self.root / name).resolve()
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
        content_type, renditions = await asyncio.to_thread(optimize, data, content_type)
        name = _object_name(folder, filename, content_type)
        # A download token gives a stable URL that works with Storage rules that
        # allow public reads of /products/** (see firebase/storage.rules). The copies
        # share it, so their URLs differ from the full one only in the object name.
        token = uuid4().hex

        def put(object_name: str, body: bytes) -> None:
            blob = self.bucket.blob(object_name)
            blob.metadata = {"firebaseStorageDownloadTokens": token}
            blob.cache_control = "public, max-age=31536000, immutable"
            blob.upload_from_string(body, content_type=content_type)

        await asyncio.gather(*(asyncio.to_thread(put, n, b) for n, b in zip(_with_variants(name), renditions)))
        url = (f"https://firebasestorage.googleapis.com{self._url_prefix}"
               f"{quote(name, safe='')}?alt=media&token={token}")
        return url, name

    async def delete(self, path):
        for name in _with_variants(path):
            try:
                await asyncio.to_thread(self.bucket.blob(name).delete)
            except Exception:
                pass

    def path_from_url(self, url):
        parts = urlsplit(url or "")
        if parts.netloc != "firebasestorage.googleapis.com" or not parts.path.startswith(self._url_prefix):
            return None
        return unquote(parts.path[len(self._url_prefix):]) or None
