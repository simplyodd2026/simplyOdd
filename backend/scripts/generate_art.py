"""Generates the demo product renders in frontend/public/seed.

Each object is drawn the way a 3D printer builds it: as a stack of layer
lines, in soft pastel filaments. Three images per product: studio (warm cream),
a pastel backdrop with a soft glow, and a close-up detail.
Run: python scripts/generate_art.py
"""
from __future__ import annotations

import math
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / "frontend" / "public" / "seed"
W, H = 800, 1000
BASE_Y = 820
# Filament colours as (base, shade, highlight).
PALETTE = {
    "pink": ("#E9A3B0", "#B86C7B", "#F7D2D9"),
    "peach": ("#F0B48E", "#C07E58", "#FBD9C2"),
    "butter": ("#EDCF6E", "#B8963A", "#F8E7A8"),
    "mint": ("#9FCBA8", "#5F9270", "#CDE8D2"),
    "sky": ("#9DBBE0", "#6282AE", "#CFE0F4"),
    "lilac": ("#B9A6E3", "#7E6AAE", "#DDD2F4"),
    "black": ("#3A3330", "#1F1A18", "#6B625D"),
    "white": ("#ECE6DF", "#A89F96", "#FFFFFF"),
}
INK = "#43302A"
# Backdrops for the second shot, and the filament each one clashes with.
BACKDROPS = [("#F7DDE1", "pink"), ("#F8EBC4", "butter"), ("#E2DAF5", "lilac"),
             ("#DCEAD3", "mint"), ("#D8E5F4", "sky"), ("#F8E0CF", "peach")]


class Canvas:
    def __init__(self, mode: str):
        self.mode = mode
        self.defs: list[str] = []
        self.body: list[str] = []
        self.n = 0

    def uid(self, p: str) -> str:
        self.n += 1
        return f"{p}{self.n}"

    def gradient(self, color: str, x0: float, x1: float) -> str:
        base, dark, light = PALETTE[color]
        gid = self.uid("g")
        stops = [(0, dark), (0.22, base), (0.4, light), (0.62, base), (1, dark)]
        s = "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
        self.defs.append(f'<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="{x0:.1f}" x2="{x1:.1f}" y1="0" y2="0">{s}</linearGradient>')
        return gid

    def svg(self, bg: str, view: str = f"0 0 {W} {H}") -> str:
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}" width="{W}" height="{H}">'
                f'<defs><filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>'
                f'<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="60"/></filter>'
                f'{"".join(self.defs)}</defs>'
                f'<rect width="{W}" height="{H}" fill="{bg}"/>{"".join(self.body)}</svg>')


def pts(points) -> str:
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in points)


def lathe(c: Canvas, profile, height, base_y, color, *, cx=400, twist=0.0, flutes=0, wobble=0.0,
          step=5.0, open_top=True, persp=0.17, sway_freq=1.3):
    n = max(2, int(height / step))
    layers = []
    for i in range(n + 1):
        t = i / n
        r = max(0.5, profile(t))
        ox = wobble * math.sin(t * math.pi * 2 * sway_freq)
        layers.append((t, cx + ox, base_y - t * height, r))
    maxr = max(r for *_, r in layers)
    ry = lambda r: r * persp  # noqa: E731

    def arc(x, y, r, a0, a1, k=24):
        return [(x + r * math.cos(a0 + (a1 - a0) * j / k), y + ry(r) * math.sin(a0 + (a1 - a0) * j / k)) for j in range(k + 1)]

    t0, x0, y0, r0 = layers[0]
    tn, xn, yn, rn = layers[-1]
    outline = arc(x0, y0, r0, math.pi, 0)
    outline += [(x + r, y) for _, x, y, r in layers]
    outline += arc(xn, yn, rn, 0, -math.pi)
    outline += [(x - r, y) for _, x, y, r in reversed(layers)]
    gid = c.gradient(color, cx - maxr, cx + maxr)
    c.body.append(f'<polygon points="{pts(outline)}" fill="url(#{gid})"/>')

    base, dark, light = PALETTE[color]
    line = dark
    lines = []
    for _, x, y, r in layers[1:-1]:
        lines.append(f'<polyline points="{pts(arc(x, y, r, math.pi, 0, 18))}"/>')
    c.body.append(f'<g fill="none" stroke="{line}" stroke-opacity="0.28" stroke-width="1.1">{"".join(lines)}</g>')

    if flutes:
        fl = []
        for j in range(flutes):
            seg = []
            for t, x, y, r in layers:
                a = 2 * math.pi * j / flutes + twist * t
                if math.sin(a) > 0.05:
                    seg.append((x + r * math.cos(a), y + ry(r) * math.sin(a)))
                elif len(seg) > 1:
                    fl.append(seg)
                    seg = []
                else:
                    seg = []
            if len(seg) > 1:
                fl.append(seg)
        hl = light
        c.body.append(f'<g fill="none" stroke="{hl}" stroke-opacity="0.35" stroke-width="2">'
                      + "".join(f'<polyline points="{pts(s)}"/>' for s in fl) + "</g>")

    if open_top and rn > 6:
        c.body.append(f'<ellipse cx="{xn:.1f}" cy="{yn:.1f}" rx="{rn:.1f}" ry="{ry(rn):.1f}" fill="{dark}" '
                      f'stroke="{light}" stroke-opacity="0.5" stroke-width="1.5"/>')
        c.body.append(f'<ellipse cx="{xn:.1f}" cy="{yn + ry(rn) * 0.25:.1f}" rx="{rn * 0.86:.1f}" ry="{ry(rn) * 0.7:.1f}" fill="#000" opacity="0.55"/>')
    return maxr


def shadow(c: Canvas, rx: float, y: float = BASE_Y):
    op = 0.3
    c.body.append(f'<ellipse cx="400" cy="{y + 18}" rx="{rx * 1.25:.1f}" ry="{rx * 0.16 + 8:.1f}" fill="#000" opacity="{op}" filter="url(#blur)"/>')


def glow(c: Canvas, y: float, r: float, color="#FFFFFF", op=0.7):
    """A soft pool of light behind the object, only on the backdrop shot."""
    if c.mode == "glow":
        c.body.append(f'<circle cx="400" cy="{y}" r="{r}" fill="{color}" opacity="{op}" filter="url(#soft)"/>')


def iso_cube(c: Canvas, x, y, s, color, hgt=None):
    """Isometric block with its top face centred at (x, y)."""
    hgt = hgt or s
    base, dark, light = PALETTE[color]
    dx, dy = s * math.cos(math.pi / 6), s * math.sin(math.pi / 6)
    top = [(x, y - dy), (x + dx, y), (x, y + dy), (x - dx, y)]
    left = [(x - dx, y), (x, y + dy), (x, y + dy + hgt), (x - dx, y + hgt)]
    right = [(x, y + dy), (x + dx, y), (x + dx, y + hgt), (x, y + dy + hgt)]
    ft, fl, fr = light, base, dark
    for face, fill in ((top, ft), (left, fl), (right, fr)):
        c.body.append(f'<polygon points="{pts(face)}" fill="{fill}"/>')
    k = int(hgt / 5)
    ls = []
    for i in range(1, k):
        yy = i * hgt / k
        ls.append(f'<polyline points="{pts([(x - dx, y + yy), (x, y + dy + yy), (x + dx, y + yy)])}"/>')
    c.body.append(f'<g fill="none" stroke="#000" stroke-opacity="0.16" stroke-width="1">{"".join(ls)}</g>')


# ----------------------------------------------------------------- objects
def melt_vase(c, color):
    glow(c, 520, 220)
    r = lathe(c, lambda t: 105 + 45 * math.sin(math.pi * t * 1.1) - 30 * t, 470, BASE_Y, color,
              twist=1.6, flutes=16, wobble=22)
    shadow(c, r)


def spine_vase(c, color):
    glow(c, 480, 180)
    lathe(c, lambda t: 52 + 22 * abs(math.sin(t * math.pi * 7)) - 14 * t, 600, BASE_Y, color)
    shadow(c, 70)


def gourd(c, color):
    glow(c, 560, 230)
    r = lathe(c, lambda t: 40 + 140 * math.sin(math.pi * min(1, t * 1.25)) ** 1.5 if t < 0.8 else 40 + 20 * (t - 0.8) * 5,
              500, BASE_Y, color, flutes=10)
    shadow(c, r * 0.8)


def mushroom_lamp(c, color):
    glow(c, 380, 260, "#FFF3D6", 0.9)
    lathe(c, lambda t: 110 - 20 * t, 26, BASE_Y, "white" if color != "white" else "black", open_top=False, step=4)
    lathe(c, lambda t: 22, 300, BASE_Y - 26, color, open_top=False, flutes=6)
    if c.mode == "glow":
        c.body.append('<ellipse cx="400" cy="470" rx="170" ry="40" fill="#FFF6E0" opacity="0.7" filter="url(#blur)"/>')
    lathe(c, lambda t: 220 * math.cos(t * math.pi / 2) ** 0.7 + 1, 190, 480, color, open_top=False, flutes=28, step=4)
    shadow(c, 110)


def pendant_lamp(c, color):
    c.body.append(f'<line x1="400" y1="0" x2="400" y2="330" stroke="{INK}" stroke-width="3"/>')
    lathe(c, lambda t: 30 - 10 * t, 40, 370, "black", open_top=False)
    if c.mode == "glow":
        c.body.append('<ellipse cx="400" cy="620" rx="200" ry="60" fill="#FFF6E0" opacity="0.7" filter="url(#soft)"/>')
        glow(c, 700, 260, "#FFF3D6", 0.8)
    lathe(c, lambda t: 190 * (1 - t) ** 0.55 + 28 * t, 250, 620, color, open_top=False, flutes=20, twist=0.6)
    c.body.append('<ellipse cx="400" cy="620" rx="175" ry="30" fill="#000" opacity="0.35"/>')
    if c.mode == "glow":
        c.body.append('<ellipse cx="400" cy="622" rx="150" ry="22" fill="#FFF8E8" opacity="0.95" filter="url(#blur)"/>')


def ghost_lamp(c, color):
    glow(c, 500, 280)
    r = lathe(c, lambda t: 150 * math.sin(math.pi * (0.5 + 0.5 * t)) ** 0.6 + 18 * math.sin(t * 40) * (1 - t), 560, BASE_Y,
              color, open_top=False, wobble=10, step=4)
    if c.mode == "glow":
        c.body.append('<ellipse cx="400" cy="520" rx="110" ry="200" fill="#fff" opacity="0.35" filter="url(#soft)"/>')
    shadow(c, r)


def pebbles(c, color):
    glow(c, 520, 220)

    def prof(t):
        spheres = [(0.0, 0.38, 150), (0.36, 0.7, 110), (0.68, 1.0, 72)]
        for a, b, R in spheres:
            if a <= t <= b:
                u = (t - a) / (b - a)
                return R * math.sqrt(max(0, math.sin(math.pi * u))) + 4
        return 4
    lathe(c, prof, 560, BASE_Y, color, open_top=False, wobble=16, step=4, sway_freq=0.8)
    shadow(c, 150)


def egg_legs(c, color):
    glow(c, 450, 220)
    leg = INK
    for x2, y2 in ((270, BASE_Y + 20), (530, BASE_Y + 20), (420, BASE_Y - 10)):
        c.body.append(f'<line x1="400" y1="600" x2="{x2}" y2="{y2}" stroke="{leg}" stroke-width="9" stroke-linecap="round"/>')
    lathe(c, lambda t: 150 * math.sqrt(max(0, math.sin(math.pi * t))) * (1 - 0.18 * t) + 2, 400, 640, color,
          open_top=False, step=4)
    shadow(c, 170)


def twist_cup(c, color):
    glow(c, 600, 180)
    lathe(c, lambda t: 85 - 6 * t, 330, BASE_Y, color, flutes=24, twist=2.4)
    for i, (dx, h, col) in enumerate(((-30, 170, INK), (20, 200, "#E9A3B0"), (45, 150, "#9DBBE0"))):
        c.body.insert(len(c.body) - 3, f'<rect x="{400 + dx}" y="{BASE_Y - 330 - h}" width="10" height="{h + 30}" rx="3" fill="{col}" transform="rotate({(i - 1) * 8} {400 + dx} {BASE_Y - 330})"/>')
    shadow(c, 90)


def knuckle_holder(c, color):
    glow(c, 600, 170)
    lathe(c, lambda t: 70 + 16 * abs(math.sin(t * math.pi * 5)), 340, BASE_Y, color, step=4)
    shadow(c, 90)


def hourglass(c, color):
    glow(c, 520, 220)
    r = lathe(c, lambda t: 58 + 115 * abs(t - 0.5) ** 1.2 * 2, 520, BASE_Y, color, flutes=12, twist=-1.2)
    shadow(c, r * 0.9)


def column(c, color):
    glow(c, 500, 200)
    lathe(c, lambda t: 110, 30, BASE_Y, color, open_top=False, step=5)
    lathe(c, lambda t: 70 - 8 * t, 420, BASE_Y - 30, color, flutes=18, open_top=False)
    lathe(c, lambda t: 70 + 50 * t ** 2, 60, BASE_Y - 450, color, open_top=True)
    if c.mode == "glow":
        c.body.append('<ellipse cx="400" cy="300" rx="40" ry="70" fill="#FFE2A8" opacity="0.8" filter="url(#blur)"/>')
    c.body.append('<rect x="382" y="200" width="36" height="120" rx="6" fill="#FBF7F0"/>')
    c.body.append('<path d="M400 160 C 380 185 388 200 400 200 C 412 200 420 185 400 160 Z" fill="#F2A541"/>')
    shadow(c, 110)


def wave_bowl(c, color):
    glow(c, 640, 240)
    r = lathe(c, lambda t: 110 + 140 * t ** 0.7, 190, BASE_Y, color, flutes=30, twist=1.0, step=4, persp=0.3)
    shadow(c, 150)


def blob_bookend(c, color):
    glow(c, 620, 200)
    r = lathe(c, lambda t: 170 * math.sqrt(max(0, math.sin(math.pi * (0.1 + 0.9 * t)))) + 10 * math.sin(t * 20), 300,
              BASE_Y, color, open_top=False, wobble=30, step=4, sway_freq=1.1)
    shadow(c, r)


def faceted(c, color):
    glow(c, 580, 200)
    lathe(c, lambda t: 120 - 30 * t, 360, BASE_Y, color, flutes=8, step=5)
    for i in range(7):  # little leaves
        a = -0.9 + i * 0.3
        x2, y2 = 400 + math.sin(a) * 180, BASE_Y - 360 - math.cos(a) * 170
        c.body.append(f'<path d="M400 {BASE_Y - 350} Q {400 + math.sin(a) * 60 - 30} {BASE_Y - 420} {x2:.0f} {y2:.0f} Q {400 + math.sin(a) * 60 + 30} {BASE_Y - 400} 400 {BASE_Y - 350}" fill="#7FAE6F"/>')
    shadow(c, 120)


def totem(c, color):
    glow(c, 450, 240)
    alt = "white" if color != "white" else "black"
    y = BASE_Y
    for i, (prof, h, col) in enumerate([
        (lambda t: 90, 80, color), (lambda t: 60 + 50 * math.sin(math.pi * t), 110, alt),
        (lambda t: 95 - 60 * t, 90, color), (lambda t: 40 + 60 * math.sin(math.pi * t) ** 0.5, 130, "pink" if color != "pink" else "black"),
        (lambda t: 50 * math.sqrt(max(0, 1 - t)) + 1, 80, color),
    ]):
        lathe(c, prof, h, y, col, open_top=False, step=4, flutes=10 if i % 2 else 0)
        y -= h
    shadow(c, 100)


def stairs(c, color):
    glow(c, 520, 240)
    s = 70
    blocks = [(i, j, k) for i in range(5) for j in range(2) for k in range(i + 1)]
    ox, oy = 400 - 2 * s * math.cos(math.pi / 6), 760
    for i, j, k in sorted(blocks, key=lambda b: (b[0] - b[1], b[2])):
        x = ox + (i - j) * s * math.cos(math.pi / 6)
        yy = oy - (i + j) * s * math.sin(math.pi / 6) - k * s
        iso_cube(c, x, yy - s, s, color, s)
    shadow(c, 230, 800)


def grid_tray(c, color):
    glow(c, 620, 250)
    s = 62
    cells = [(i, j) for i in range(4) for j in range(3)]
    ox, oy = 400, 520
    for i, j in sorted(cells, key=lambda b: (b[0] + b[1], b[0])):
        x = ox + (i - j) * s * math.cos(math.pi / 6) - s * 0.5
        y = oy + (i + j) * s * math.sin(math.pi / 6)
        iso_cube(c, x, y, s * 0.96, color, 50 if (i + j) % 3 else 90)
    shadow(c, 250, 820)


def nothing_box(c, color):
    glow(c, 520, 240)
    iso_cube(c, 400, 420, 210, color, 260)
    base, dark, light = PALETTE[color]
    c.body.append(f'<text x="400" y="430" font-family="Arial Black, sans-serif" font-size="30" text-anchor="middle" fill="{dark}" opacity="0.8">NOTHING</text>')
    shadow(c, 220, 870)


def drip_candle(c, color):
    glow(c, 520, 200)
    lathe(c, lambda t: 130 - 50 * t, 60, BASE_Y, "sky" if color != "sky" else "white", open_top=False)
    lathe(c, lambda t: 38 + 8 * math.sin(t * 13) * (1 - t), 380, BASE_Y - 60, color, open_top=False, wobble=6, step=4)
    if c.mode == "glow":
        c.body.append('<ellipse cx="400" cy="330" rx="45" ry="80" fill="#FFE2A8" opacity="0.8" filter="url(#blur)"/>')
    c.body.append('<path d="M400 300 C 378 335 388 360 400 360 C 412 360 422 335 400 300 Z" fill="#F2A541"/>')
    for dx, L in ((-30, 90), (18, 150), (34, 60)):
        c.body.append(f'<path d="M{400 + dx} 440 q -6 {L / 2} 0 {L} a 6 6 0 0 0 10 0 q 4 {-L / 2} -2 {-L}" fill="{PALETTE[color][2]}"/>')
    shadow(c, 130)


def hand_hook(c, color):
    glow(c, 480, 220)
    base, dark, light = PALETTE[color]
    c.body.append(f'<rect x="250" y="160" width="300" height="60" fill="{dark}"/>')
    for i, (dx, h) in enumerate(((-90, 330), (-30, 420), (30, 440), (90, 400))):
        lathe(c, lambda t, h=h: 26 - 4 * t, h, 220 + h, color, cx=400 + dx, open_top=False, step=4, wobble=4 + i, persp=0.35)
    lathe(c, lambda t: 30 - 6 * t, 200, 560, color, cx=250, open_top=False, persp=0.35)
    shadow(c, 150, 840)


OBJECTS = {
    "melt-vase": (melt_vase, "pink"),
    "spine-vase": (spine_vase, "black"),
    "gourd-of-questions": (gourd, "white"),
    "fungal-lamp": (mushroom_lamp, "peach"),
    "hanging-bell": (pendant_lamp, "white"),
    "ghost-lamp": (ghost_lamp, "white"),
    "pebble-tower": (pebbles, "black"),
    "egg-on-legs": (egg_legs, "white"),
    "vortex-pen-cup": (twist_cup, "black"),
    "knuckle-holder": (knuckle_holder, "mint"),
    "hourglass-planter": (hourglass, "black"),
    "ruin-candle-column": (column, "white"),
    "tidal-bowl": (wave_bowl, "sky"),
    "lump-bookend": (blob_bookend, "lilac"),
    "facet-planter": (faceted, "white"),
    "totem-no-5": (totem, "black"),
    "stair-to-nowhere": (stairs, "white"),
    "grid-tray": (grid_tray, "black"),
    "box-of-nothing": (nothing_box, "butter"),
    "drip-candle-stand": (drip_candle, "white"),
    "hand-of-keys": (hand_hook, "black"),
}


def render(fn, color, mode):
    c = Canvas(mode)
    fn(c, color)
    return c


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for i, (slug, (fn, color)) in enumerate(OBJECTS.items()):
        # Rotate through the backdrops, skipping any that match the object's own colour.
        options = [bg for bg, clash in BACKDROPS if clash != color]
        backdrop = options[i % len(options)]
        (OUT / f"{slug}-1.svg").write_text(render(fn, color, "light").svg("#F4EFE8"))
        (OUT / f"{slug}-2.svg").write_text(render(fn, color, "glow").svg(backdrop))
        (OUT / f"{slug}-3.svg").write_text(render(fn, color, "light").svg("#FBF7F0", "150 250 500 625"))
    print(f"wrote {len(OBJECTS) * 3} files to {OUT}")


if __name__ == "__main__":
    main()
