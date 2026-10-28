"""Draws the Orange League's four badges (resources/badges/25-28.png), our own artwork after the anime's:
the Coral-Eye Badge (pink coral round an eye), the Sea Ruby Badge (a red gem), the Spike Shell Badge
(a spiral shell) and the Jade Star Badge (a green star).

Usage: python3 scripts/drawOrangeBadges.py  (needs Pillow)
"""
import math
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "resources", "badges")
S = 4  # drawn large, then scaled down for smooth edges
OUT_SIZE = 85  # the size of the other badges
SIZE = 64


def canvas():
    im = Image.new("RGBA", (SIZE * S, SIZE * S), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def star(cx, cy, r_out, r_in, points=5, turn=-math.pi / 2):
    pts = []
    for i in range(points * 2):
        r = r_out if i % 2 == 0 else r_in
        a = turn + i * math.pi / points
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def save(im, n):
    im.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS).save(os.path.join(OUT, f"{n}.png"))


def coral_eye():
    im, d = canvas()
    c = SIZE * S / 2
    for i in range(8):  # coral branches
        a = i * math.pi / 4
        x, y = c + 92 * math.cos(a), c + 92 * math.sin(a)
        d.line([(c, c), (x, y)], fill=(240, 110, 150, 255), width=34)
        d.ellipse([x - 24, y - 24, x + 24, y + 24], fill=(250, 140, 175, 255), outline=(150, 40, 80, 255), width=6)
    d.ellipse([c - 70, c - 70, c + 70, c + 70], fill=(255, 245, 235, 255), outline=(150, 40, 80, 255), width=8)
    d.ellipse([c - 36, c - 36, c + 36, c + 36], fill=(60, 140, 200, 255))
    d.ellipse([c - 16, c - 16, c + 16, c + 16], fill=(20, 30, 50, 255))
    save(im, 25)


def sea_ruby():
    im, d = canvas()
    c = SIZE * S / 2
    gem = [(c, c - 110), (c + 95, c - 30), (c + 60, c + 100), (c - 60, c + 100), (c - 95, c - 30)]
    d.polygon(gem, fill=(210, 30, 50, 255), outline=(100, 0, 20, 255), width=10)
    d.polygon([(c, c - 110), (c + 40, c - 30), (c - 40, c - 30)], fill=(250, 110, 120, 255))
    d.line([(c - 95, c - 30), (c + 95, c - 30)], fill=(120, 0, 25, 255), width=6)
    d.line([(c - 40, c - 30), (c - 60, c + 100)], fill=(150, 10, 35, 255), width=5)
    d.line([(c + 40, c - 30), (c + 60, c + 100)], fill=(150, 10, 35, 255), width=5)
    save(im, 26)


def spike_shell():
    im, d = canvas()
    c = SIZE * S / 2
    pts = []
    for i in range(160):  # a spiral shell
        t = i / 159 * 4.2 * math.pi
        r = 8 + 9 * t
        pts.append((c + r * math.cos(t), c + r * math.sin(t) * 0.9))
    d.ellipse([c - 110, c - 100, c + 110, c + 100], fill=(240, 200, 120, 255), outline=(120, 70, 20, 255), width=10)
    d.line(pts, fill=(130, 80, 25, 255), width=12, joint="curve")
    for i in range(7):  # spikes on the rim
        a = -math.pi / 2 + (i - 3) * 0.32
        x, y = c + 110 * math.cos(a), c + 100 * math.sin(a)
        d.polygon([(x - 14, y + 6), (x + 14, y + 6), (c + 150 * math.cos(a), c + 140 * math.sin(a))], fill=(220, 170, 90, 255), outline=(120, 70, 20, 255))
    save(im, 27)


def jade_star():
    im, d = canvas()
    c = SIZE * S / 2
    d.polygon(star(c, c + 8, 120, 52), fill=(40, 170, 110, 255), outline=(10, 80, 50, 255), width=10)
    d.polygon(star(c, c + 8, 70, 30), fill=(130, 220, 170, 255))
    save(im, 28)


if __name__ == "__main__":
    coral_eye()
    sea_ruby()
    spike_shell()
    jade_star()
