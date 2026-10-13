"""Generates Orbit's app icons and splash screens.

Usage: python scripts/generate_icons.py   (requires Pillow)

The mark: a gold crescent moon circled by a tilted orbit ring, with a small
glowing sun riding the ring, on the app's night-sky gradient.
"""

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SUPERSAMPLE = 4

# Palette (matches the app's night sky and accent tokens).
SKY_TOP = (12, 19, 48)
SKY_MID = (26, 33, 80)
SKY_BOTTOM = (44, 37, 88)
GOLD = (227, 189, 114)
GOLD_LIGHT = (248, 226, 170)
GOLD_DEEP = (196, 150, 74)
SUN = (255, 246, 222)
SPLASH_BG = (11, 13, 18)

RING_TILT = 20  # degrees, rising to the right
STARS = [  # (x, y, radius, alpha) in 1024-unit space
    (190, 210, 5, 200),
    (300, 120, 3, 150),
    (820, 190, 4, 190),
    (880, 330, 3, 130),
    (160, 760, 3, 120),
    (760, 860, 4, 160),
    (610, 150, 2.5, 120),
    (420, 900, 2.5, 110),
]


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def sky_gradient(size):
    """Diagonal three-stop gradient, built small and upscaled for smoothness."""
    small = 96
    img = Image.new("RGB", (small, small))
    px = img.load()
    for y in range(small):
        for x in range(small):
            t = (x * 0.35 + y) / (small * 1.35)
            px[x, y] = lerp(SKY_TOP, SKY_MID, t / 0.55) if t < 0.55 else lerp(SKY_MID, SKY_BOTTOM, (t - 0.55) / 0.45)
    return img.resize((size, size), Image.BICUBIC)


def vertical_gradient(size, top, bottom):
    img = Image.new("RGB", (1, 256))
    for y in range(256):
        img.putpixel((0, y), lerp(top, bottom, y / 255))
    return img.resize((size, size), Image.BICUBIC)


def ellipse_point(cx, cy, rx, ry, theta_deg, tilt_deg):
    """Point on an ellipse, then rotated by tilt (counter-clockwise on screen)."""
    t = math.radians(theta_deg)
    x, y = rx * math.cos(t), ry * math.sin(t)
    a = math.radians(-tilt_deg)
    return cx + x * math.cos(a) - y * math.sin(a), cy + x * math.sin(a) + y * math.cos(a)


def draw_mark(size, scale=1.0):
    """The moon + orbit mark on a transparent canvas."""
    W = size * SUPERSAMPLE
    u = W * scale / 1024
    c = W / 2
    canvas = Image.new("RGBA", (W, W), (0, 0, 0, 0))

    # Warm glow behind the moon.
    glow = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    r = 300 * u
    ImageDraw.Draw(glow).ellipse([c - r, c - r, c + r, c + r], fill=(255, 220, 150, 34))
    canvas.alpha_composite(glow.filter(ImageFilter.GaussianBlur(140 * u)))

    # Orbit ring, split into the half behind the moon and the half in front.
    rx, ry, width = 410 * u, 128 * u, max(1, round(24 * u))
    ring = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    ImageDraw.Draw(ring).ellipse([c - rx, c - ry, c + rx, c + ry], outline=GOLD + (255,), width=width)
    back, front = ring.copy(), ring.copy()
    ImageDraw.Draw(back).rectangle([0, c, W, W], fill=(0, 0, 0, 0))
    ImageDraw.Draw(front).rectangle([0, 0, W, c - 1], fill=(0, 0, 0, 0))
    back = back.rotate(RING_TILT, resample=Image.BICUBIC, center=(c, c))
    front = front.rotate(RING_TILT, resample=Image.BICUBIC, center=(c, c))
    canvas.alpha_composite(back)

    # Crescent moon: a disc with an offset disc carved out.
    R = 238 * u
    moon_mask = Image.new("L", (W, W), 0)
    md = ImageDraw.Draw(moon_mask)
    md.ellipse([c - R, c - R, c + R, c + R], fill=255)
    ox, oy, r2 = 112 * u, -78 * u, 208 * u
    md.ellipse([c + ox - r2, c + oy - r2, c + ox + r2, c + oy + r2], fill=0)
    moon = vertical_gradient(W, GOLD_LIGHT, GOLD_DEEP).convert("RGBA")
    moon.putalpha(moon_mask)
    canvas.alpha_composite(moon)

    # A thin gap around the front ring where it crosses the moon, so the two read apart.
    gap = Image.new("L", (W, W), 0)
    ImageDraw.Draw(gap).ellipse(
        [c - rx, c - ry, c + rx, c + ry], outline=255, width=width + round(26 * u)
    )
    ImageDraw.Draw(gap).rectangle([0, 0, W, c - 1], fill=0)
    gap = gap.rotate(RING_TILT, resample=Image.BICUBIC, center=(c, c))
    gap_alpha = Image.new("L", (W, W), 0)
    gap_alpha.paste(gap, mask=moon_mask)
    cut = canvas.getchannel("A").point(lambda a: a)
    cut.paste(0, mask=gap_alpha)
    canvas.putalpha(cut)

    canvas.alpha_composite(front)

    # The sun riding the front of the orbit.
    sx, sy = ellipse_point(c, c, rx, ry, 38, RING_TILT)
    sun_glow = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    gr = 70 * u
    ImageDraw.Draw(sun_glow).ellipse([sx - gr, sy - gr, sx + gr, sy + gr], fill=SUN + (150,))
    canvas.alpha_composite(sun_glow.filter(ImageFilter.GaussianBlur(26 * u)))
    sr = 34 * u
    ImageDraw.Draw(canvas).ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=SUN + (255,))

    return canvas.resize((size, size), Image.LANCZOS)


def draw_background(size):
    """Night sky with stars and a soft central light (no mark)."""
    W = size * SUPERSAMPLE
    u = W / 1024
    bg = sky_gradient(W).convert("RGBA")

    light = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    r = 430 * u
    ImageDraw.Draw(light).ellipse([W / 2 - r, W / 2 - r, W / 2 + r, W / 2 + r], fill=(120, 110, 200, 60))
    bg.alpha_composite(light.filter(ImageFilter.GaussianBlur(160 * u)))

    stars = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    sd = ImageDraw.Draw(stars)
    for x, y, rad, alpha in STARS:
        sd.ellipse([(x - rad) * u, (y - rad) * u, (x + rad) * u, (y + rad) * u], fill=(255, 255, 255, alpha))
    bg.alpha_composite(stars)

    return bg.resize((size, size), Image.LANCZOS)


def draw_full_icon(size, mark_scale=1.0):
    icon = draw_background(size)
    icon.alpha_composite(draw_mark(size, mark_scale))
    return icon


def masked(img, shape):
    W = img.width * SUPERSAMPLE
    mask = Image.new("L", (W, W), 0)
    d = ImageDraw.Draw(mask)
    if shape == "circle":
        d.ellipse([0, 0, W - 1, W - 1], fill=255)
    else:
        d.rounded_rectangle([0, 0, W - 1, W - 1], radius=W * 0.22, fill=255)
    out = img.copy()
    out.putalpha(mask.resize(img.size, Image.LANCZOS))
    return out


def save(img, path, rgb=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    (img.convert("RGB") if rgb else img).save(path, optimize=True)
    print("wrote", path.relative_to(ROOT), img.size)


def main():
    res = ROOT / "android/app/src/main/res"
    densities = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}

    for name, factor in densities.items():
        legacy = round(48 * factor)
        adaptive = round(108 * factor)
        full = draw_full_icon(legacy, 0.98)
        save(masked(full, "rounded"), res / f"mipmap-{name}/ic_launcher.png")
        save(masked(full, "circle"), res / f"mipmap-{name}/ic_launcher_round.png")
        # Adaptive icon: keep the mark inside the 66dp safe zone of the 108dp canvas.
        save(draw_mark(adaptive, 0.78), res / f"mipmap-{name}/ic_launcher_foreground.png")
        save(draw_background(adaptive), res / f"mipmap-{name}/ic_launcher_background.png", rgb=True)

    # iOS: one 1024 full-bleed, opaque icon (the system applies the mask).
    save(
        draw_full_icon(1024),
        ROOT / "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
        rgb=True,
    )

    # Web icons.
    save(masked(draw_full_icon(180), "rounded"), ROOT / "public/apple-touch-icon.png")
    save(masked(draw_full_icon(512), "rounded"), ROOT / "public/icon-512.png")

    # Splash screens: the mark centred on the app's dark background.
    splash_files = list(res.glob("drawable*/splash.png")) + list(
        (ROOT / "ios/App/App/Assets.xcassets/Splash.imageset").glob("*.png")
    )
    for path in splash_files:
        w, h = Image.open(path).size
        canvas = Image.new("RGBA", (w, h), SPLASH_BG + (255,))
        mark_size = round(min(w, h) * 0.5)
        mark = draw_mark(mark_size)
        canvas.alpha_composite(mark, ((w - mark_size) // 2, (h - mark_size) // 2))
        save(canvas, path, rgb=True)


if __name__ == "__main__":
    main()
