#!/usr/bin/env python3
"""Generate Microsoft Store assets from lf-icon.png."""

import argparse
import os
from collections import Counter
from pathlib import Path

from PIL import Image


def get_dominant_color(img: Image.Image) -> tuple[int, int, int]:
    """Sample dominant non-transparent color from image."""
    small = img.copy()
    small.thumbnail((64, 64))
    pixels = list(small.getdata())
    opaque = [p[:3] for p in pixels if len(p) == 4 and p[3] > 128]
    if not opaque:
        return (30, 30, 30)
    quantized = [tuple((c // 16) * 16 for c in px) for px in opaque]
    return Counter(quantized).most_common(1)[0][0]


def generate_store_icon(src: Image.Image, out: Path) -> None:
    icon = src.resize((1080, 1080), Image.LANCZOS)
    icon.save(out, "PNG")
    print(f"  {out.name} ({icon.size[0]}x{icon.size[1]})")


def generate_poster(src: Image.Image, out: Path, bg_color: tuple[int, int, int]) -> None:
    canvas = Image.new("RGB", (720, 1080), bg_color)
    icon_size = int(720 * 0.65)
    icon = src.resize((icon_size, icon_size), Image.LANCZOS)
    x = (720 - icon_size) // 2
    y = (1080 - icon_size) // 2
    if icon.mode == "RGBA":
        canvas.paste(icon, (x, y), icon)
    else:
        canvas.paste(icon, (x, y))
    canvas.save(out, "PNG")
    print(f"  {out.name} ({canvas.size[0]}x{canvas.size[1]}, bg=rgb{bg_color})")


def main():
    parser = argparse.ArgumentParser(description="Generate MS Store assets")
    parser.add_argument("source", help="Source icon path")
    parser.add_argument("-o", "--output", default="src-tauri/icons", help="Output directory")
    parser.add_argument("--bg-color", help="Poster bg as R,G,B (auto-sampled if omitted)")
    args = parser.parse_args()

    src = Image.open(args.source).convert("RGBA")
    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Source: {args.source} ({src.size[0]}x{src.size[1]})")

    bg = tuple(int(c) for c in args.bg_color.split(",")) if args.bg_color else get_dominant_color(src)

    generate_store_icon(src, out_dir / "Square1080x1080Logo.png")
    generate_poster(src, out_dir / "poster.png", bg)

    print("Done.")


if __name__ == "__main__":
    main()
