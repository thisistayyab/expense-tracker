"""Generate Suffice's launch assets from one deterministic mark.

Run from the repository root: python scripts/generate-brand-assets.py
Requires Pillow and assets/fonts/Geist-Variable.ttf.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "images"
FONT = ROOT / "assets" / "fonts" / "Geist-Variable.ttf"

INK = (18, 19, 23)
INK_LIFT = (28, 32, 48)
IRIS = (91, 91, 247)
CREAM = (250, 247, 240)


def geist(size: int, weight: int = 700) -> ImageFont.FreeTypeFont:
    font = ImageFont.truetype(str(FONT), size)
    font.set_variation_by_axes([weight])
    return font


def backdrop(size: int) -> Image.Image:
    """Ink with a quiet iris aurora, kept dark enough for both icon shapes."""
    small = Image.new("RGB", (48, 48), INK)
    pixels = small.load()
    for y in range(48):
        for x in range(48):
            t = max(0.0, 1.0 - (((x - 38) / 34) ** 2 + ((y - 10) / 38) ** 2))
            pixels[x, y] = tuple(
                round(INK[channel] + (INK_LIFT[channel] - INK[channel]) * t) for channel in range(3)
            )
    base = small.resize((size, size), Image.Resampling.BICUBIC)

    glow = Image.new("L", (size, size), 0)
    ImageDraw.Draw(glow).ellipse(
        (size * 0.48, -size * 0.28, size * 1.32, size * 0.62), fill=255
    )
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.16))
    iris = Image.new("RGB", (size, size), IRIS)
    return Image.composite(iris, base, glow.point(lambda value: round(value * 0.25)))


def mark(size: int, scale: float, foreground: tuple[int, int, int] = CREAM) -> Image.Image:
    """Cream S with an iris ledger rule; the S is the brand, the rule is the ledger."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    font = geist(round(size * scale), 780)
    draw.text(
        (size * 0.5, size * 0.455),
        "S",
        font=font,
        fill=(*foreground, 255),
        anchor="mm",
    )
    rule_width = size * scale * 0.35
    rule_y = size * 0.735
    draw.rounded_rectangle(
        (
            size * 0.5 - rule_width / 2,
            rule_y,
            size * 0.5 + rule_width / 2,
            rule_y + size * scale * 0.055,
        ),
        radius=size * scale * 0.03,
        fill=(*IRIS, 255) if foreground == CREAM else (*foreground, 255),
    )
    return layer


def save_png(image: Image.Image, name: str) -> None:
    image.save(OUT / name, "PNG", optimize=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    icon = backdrop(1024).convert("RGBA")
    icon.alpha_composite(mark(1024, 0.62))
    save_png(icon.convert("RGB"), "icon.png")

    foreground = mark(1024, 0.40)
    save_png(foreground, "android-icon-foreground.png")

    monochrome = mark(1024, 0.40, (255, 255, 255))
    save_png(monochrome, "android-icon-monochrome.png")

    splash = mark(1024, 0.38)
    save_png(splash, "splash-icon.png")

    favicon = icon.resize((64, 64), Image.Resampling.LANCZOS)
    save_png(favicon.convert("RGB"), "favicon.png")


if __name__ == "__main__":
    main()
