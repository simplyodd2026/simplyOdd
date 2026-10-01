"""Serves Drive-hosted images (MEDIA_BACKEND=drive). See GoogleDriveMediaStorage."""
from fastapi import APIRouter, Depends, Path, Response

from app.core.container import Services, services
from app.core.errors import NotFound
from app.services.media import ALLOWED_TYPES, GoogleDriveMediaStorage

router = APIRouter(tags=["media"])


@router.get("/media/drive/{file_id}", include_in_schema=False)
async def drive_image(file_id: str = Path(pattern=r"^[A-Za-z0-9_-]{10,128}$"), svc: Services = Depends(services)):
    if not isinstance(svc.media, GoogleDriveMediaStorage):
        raise NotFound("Image")
    found = await svc.media.download(file_id)
    # drive.file scope already limits this to files the app uploaded; the type
    # check keeps it to images.
    if not found or found[1] not in ALLOWED_TYPES:
        raise NotFound("Image")
    data, content_type = found
    return Response(data, media_type=content_type, headers={
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        # SVGs are served as images only, never as a page that could run script.
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    })
