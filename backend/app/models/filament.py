"""The filament palette: every colour and finish the studio can print in.

This is the single source of truth. The storefront receives it through
`/config`, products list the ids they can be printed in, and carts and orders
refer to entries by id. To add a colour, append it here; nothing else changes.
"""
from __future__ import annotations

from typing import Literal

from pydantic import computed_field

from app.models.common import Schema

FilamentGroup = Literal["essential", "extended", "special"]
# solid: an opaque colour a flat swatch shows faithfully. The others are looks a
# flat colour can't capture, so the storefront draws them as textures; `hex` is
# only their base tint.
FilamentFinish = Literal["solid", "transparent", "translucent", "silk"]

FINISH_LABELS: dict[str, str] = {
    "solid": "Solid", "transparent": "Transparent", "translucent": "Translucent", "silk": "Silk",
}


class Filament(Schema):
    id: str
    name: str
    group: FilamentGroup
    finish: FilamentFinish = "solid"
    hex: str

    @computed_field
    @property
    def finish_label(self) -> str:
        return FINISH_LABELS[self.finish]


class FilamentChoice(Schema):
    """A snapshot of the chosen filament, kept on quote lines and order items so
    an order still reads correctly if the palette changes later."""
    id: str
    name: str
    finish: str
    finish_label: str
    hex: str

    @classmethod
    def of(cls, f: Filament) -> FilamentChoice:
        return cls(id=f.id, name=f.name, finish=f.finish, finish_label=f.finish_label, hex=f.hex)


def _f(id: str, name: str, group: FilamentGroup, hex: str, finish: FilamentFinish = "solid") -> Filament:
    return Filament(id=id, name=name, group=group, finish=finish, hex=hex)


FILAMENTS: list[Filament] = [
    # Essentials
    _f("matte-black", "Matte Black", "essential", "#252525"),
    _f("pure-white", "Pure White", "essential", "#F5F4F0"),
    _f("ivory", "Ivory", "essential", "#E8DDC8"),
    _f("warm-beige", "Warm Beige", "essential", "#C9B69A"),
    _f("stone-grey", "Stone Grey", "essential", "#929292"),
    _f("charcoal", "Charcoal", "essential", "#454545"),
    _f("chocolate-brown", "Chocolate Brown", "essential", "#593D30"),
    _f("terracotta", "Terracotta", "essential", "#BB7055"),
    _f("olive-green", "Olive Green", "essential", "#777B4B"),
    _f("sage-green", "Sage Green", "essential", "#A3B09A"),
    _f("navy-blue", "Navy Blue", "essential", "#283D59"),
    _f("dusty-pink", "Dusty Pink", "essential", "#D4A0A0"),
    # Extended
    _f("red", "Red", "extended", "#C93636"),
    _f("burgundy", "Burgundy", "extended", "#702C3B"),
    _f("mustard-yellow", "Mustard Yellow", "extended", "#D5A62D"),
    _f("sunshine-yellow", "Sunshine Yellow", "extended", "#F4D34E"),
    _f("forest-green", "Forest Green", "extended", "#285C46"),
    _f("emerald-green", "Emerald Green", "extended", "#18866B"),
    _f("sky-blue", "Sky Blue", "extended", "#87BCE0"),
    _f("royal-blue", "Royal Blue", "extended", "#3156A4"),
    _f("lavender", "Lavender", "extended", "#B6A3D5"),
    _f("lilac", "Lilac", "extended", "#D3B9DD"),
    _f("mint-green", "Mint Green", "extended", "#B5D9C4"),
    _f("orange", "Orange", "extended", "#E88935"),
    # Special finishes: offered only on products that list them explicitly.
    _f("clear", "Transparent / Clear", "special", "#E4ECEE", "transparent"),
    _f("translucent-amber", "Translucent Amber", "special", "#C98A2E", "translucent"),
    _f("silk-gold", "Silk Gold", "special", "#C9A14A", "silk"),
    _f("silk-silver", "Silk Silver", "special", "#B4B8BE", "silk"),
]

FILAMENTS_BY_ID: dict[str, Filament] = {f.id: f for f in FILAMENTS}
