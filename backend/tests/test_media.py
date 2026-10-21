import asyncio
import io

import pytest
from PIL import Image

from app.core.errors import BadRequest
from app.services.media import WIDTHS, LocalMediaStorage, optimize, variant_name


def photo(size=(1600, 2000), fmt="PNG", mode="RGB") -> bytes:
    buf = io.BytesIO()
    Image.new(mode, size, (180, 120, 90) if mode == "RGB" else (180, 120, 90, 128)).save(buf, fmt)
    return buf.getvalue()


def widths(renditions):
    return [Image.open(io.BytesIO(r)).width for r in renditions]


def test_photos_become_webp_with_smaller_copies():
    ct, renditions = optimize(photo(), "image/png")
    assert ct == "image/webp"
    assert widths(renditions) == [1600, *WIDTHS]
    assert all(Image.open(io.BytesIO(r)).format == "WEBP" for r in renditions)


def test_large_photos_are_capped_and_small_ones_never_enlarged():
    _, renditions = optimize(photo((4000, 3000), "JPEG"), "image/jpeg")
    assert widths(renditions)[0] == 2000
    _, renditions = optimize(photo((600, 600), "JPEG"), "image/jpeg")
    assert widths(renditions) == [600, 480, 600]


def test_transparency_survives():
    _, renditions = optimize(photo(mode="RGBA"), "image/png")
    assert Image.open(io.BytesIO(renditions[0])).mode == "RGBA"


def test_gifs_and_svgs_pass_through():
    svg = b'<svg xmlns="http://www.w3.org/2000/svg"/>'
    assert optimize(svg, "image/svg+xml") == ("image/svg+xml", [svg])
    gif = photo(fmt="GIF")
    assert optimize(gif, "image/gif") == ("image/gif", [gif])


def test_unreadable_file_is_rejected():
    with pytest.raises(BadRequest):
        optimize(b"not an image", "image/png")


def test_local_storage_writes_and_deletes_every_copy(tmp_path):
    media = LocalMediaStorage(str(tmp_path), "http://api")
    url, path = asyncio.run(media.upload("products/vase", "vase.png", photo(), "image/png"))
    assert path.startswith("products/vase/") and path.endswith(".webp")
    assert url == f"http://api/media/{path}"
    names = [path, *(variant_name(path, w) for w in WIDTHS)]
    assert all((tmp_path / n).exists() for n in names)

    asyncio.run(media.delete(path))
    assert not any((tmp_path / n).exists() for n in names)
