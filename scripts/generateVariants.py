"""Draws the Albino and Melanistic sprites from our own sprites (like Idle Pokémon's generate*.py).

Albino: the normal sprite bleached towards a warm white, shading kept and outlines kept dark.
Melanistic: the shiny sprite darkened towards black, keeping a little of its colour.

Usage: python3 scripts/generateVariants.py  (writes resources/pokemon/albino/ and melanistic/)
"""
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..", "resources", "pokemon")


def luminance(r, g, b):
    return 0.299 * r + 0.587 * g + 0.114 * b


def albino(r, g, b):
    lum = luminance(r, g, b)
    if lum < 80:  # outline and deep shadow
        return (int(lum * 0.7 + 25), int(lum * 0.6 + 22), int(lum * 0.6 + 26))
    v = 255 - (255 - lum) * 0.62
    return (min(255, int(v + 4)), int(v - 2), int(v - 4))


def melanistic(r, g, b):
    lum = luminance(r, g, b)
    if lum < 45:  # outline
        return (8, 8, 10)
    v = 34 + lum * 0.4
    # A little of the shiny colour shows through.
    return tuple(min(255, int(v * 0.78 + c * 0.14)) for c in (r, g, b))


def recolor(src, dst, fn):
    im = Image.open(src).convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            px[x, y] = (*fn(r, g, b), a)
    im.save(dst, optimize=True)


def main():
    for variant, source, fn in (("albino", ROOT, albino), ("melanistic", os.path.join(ROOT, "shiny"), melanistic)):
        out = os.path.join(ROOT, variant)
        os.makedirs(out, exist_ok=True)
        files = [f for f in os.listdir(source) if f.endswith(".png")]
        for f in files:
            recolor(os.path.join(source, f), os.path.join(out, f), fn)
        print(f"{variant}: {len(files)} sprites")


if __name__ == "__main__":
    main()
