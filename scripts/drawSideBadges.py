"""Draws the side journeys' badges, our own artwork:
- the Orange League's (resources/badges/25-28.png), after the anime's: the Coral-Eye Badge (pink coral
  round an eye), the Sea Ruby Badge (a red gem), the Spike Shell Badge (a spiral shell) and the Jade
  Star Badge (a green star);
- the Sevii Islands' quest rewards (29-33): the Ruby, Lostelle's Thanks (a heart), Lorelei's Trust (a
  snowflake), the Warehouse Key and the Sapphire;
- Orre's Cipher admins beaten (34-37): Pyrite Town freed (a sun over the desert), Mt. Battle saved (a
  mountain), The Under's broadcasts stopped (a broken antenna) and the Shadow Pokémon Lab shut down (a
  shattered purple crystal).

Usage: python3 scripts/drawSideBadges.py  (needs Pillow)
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


def round_gem(n, fill, light, dark):
    im, d = canvas()
    c = SIZE * S / 2
    pts = [(c + 105 * math.cos(a), c + 105 * math.sin(a)) for a in [i * math.pi / 4 + math.pi / 8 for i in range(8)]]
    d.polygon(pts, fill=fill, outline=dark, width=10)
    inner = [(c + 55 * math.cos(a), c + 55 * math.sin(a)) for a in [i * math.pi / 4 + math.pi / 8 for i in range(8)]]
    d.polygon(inner, fill=light)
    for (x1, y1), (x2, y2) in zip(pts, inner):
        d.line([(x1, y1), (x2, y2)], fill=dark, width=5)
    save(im, n)


def heart():
    im, d = canvas()
    c = SIZE * S / 2
    d.ellipse([c - 100, c - 85, c + 5, c + 20], fill=(240, 110, 150, 255))
    d.ellipse([c - 5, c - 85, c + 100, c + 20], fill=(240, 110, 150, 255))
    d.polygon([(c - 96, c - 15), (c + 96, c - 15), (c, c + 105)], fill=(240, 110, 150, 255))
    d.ellipse([c - 70, c - 65, c - 30, c - 25], fill=(255, 200, 215, 255))
    save(im, 30)


def snowflake():
    im, d = canvas()
    c = SIZE * S / 2
    for i in range(6):
        a = i * math.pi / 3
        x, y = c + 110 * math.cos(a), c + 110 * math.sin(a)
        d.line([(c, c), (x, y)], fill=(120, 200, 240, 255), width=18)
        for side in (-1, 1):
            mx, my = c + 65 * math.cos(a), c + 65 * math.sin(a)
            b = a + side * math.pi / 4
            d.line([(mx, my), (mx + 35 * math.cos(b), my + 35 * math.sin(b))], fill=(120, 200, 240, 255), width=12)
    d.ellipse([c - 22, c - 22, c + 22, c + 22], fill=(230, 245, 255, 255))
    save(im, 31)


def key():
    im, d = canvas()
    c = SIZE * S / 2
    d.ellipse([c - 105, c - 55, c - 5, c + 45], fill=(220, 180, 70, 255), outline=(110, 80, 20, 255), width=10)
    d.ellipse([c - 75, c - 25, c - 35, c + 15], fill=(0, 0, 0, 0))
    d.rectangle([c - 10, c - 14, c + 110, c + 6], fill=(220, 180, 70, 255), outline=(110, 80, 20, 255), width=6)
    for x in (c + 55, c + 90):
        d.rectangle([x, c + 6, x + 16, c + 40], fill=(220, 180, 70, 255), outline=(110, 80, 20, 255), width=5)
    save(im, 32)


def pyrite():
    im, d = canvas()
    c = SIZE * S / 2
    d.rectangle([c - 110, c + 30, c + 110, c + 100], fill=(210, 160, 90, 255), outline=(110, 70, 30, 255), width=8)
    d.ellipse([c - 60, c - 100, c + 60, c + 20], fill=(250, 190, 60, 255), outline=(150, 90, 20, 255), width=8)
    for i in range(8):
        a = i * math.pi / 4
        d.line([(c + 70 * math.cos(a), c - 40 + 70 * math.sin(a)), (c + 95 * math.cos(a), c - 40 + 95 * math.sin(a))], fill=(250, 190, 60, 255), width=10)
    save(im, 34)


def mountain():
    im, d = canvas()
    c = SIZE * S / 2
    d.polygon([(c - 120, c + 90), (c - 20, c - 100), (c + 120, c + 90)], fill=(140, 110, 90, 255), outline=(70, 50, 40, 255), width=8)
    d.polygon([(c - 20, c - 100), (c - 55, c - 35), (c + 15, c - 35)], fill=(240, 240, 250, 255))
    save(im, 35)


def antenna():
    im, d = canvas()
    c = SIZE * S / 2
    d.rectangle([c - 90, c - 10, c + 90, c + 100], fill=(90, 100, 130, 255), outline=(30, 35, 55, 255), width=8)
    d.rectangle([c - 65, c + 10, c + 65, c + 80], fill=(40, 200, 220, 255))
    d.line([(c, c - 10), (c - 70, c - 110)], fill=(200, 205, 225, 255), width=10)
    d.line([(c, c - 10), (c + 40, c - 60), (c + 70, c - 50)], fill=(200, 205, 225, 255), width=10)
    save(im, 36)


def shard():
    im, d = canvas()
    c = SIZE * S / 2
    d.polygon([(c - 20, c - 115), (c + 55, c - 20), (c + 15, c + 110), (c - 60, c + 10)], fill=(130, 60, 190, 255), outline=(50, 15, 80, 255), width=8)
    d.polygon([(c - 20, c - 115), (c + 5, c - 20), (c - 60, c + 10)], fill=(190, 140, 240, 255))
    d.line([(c + 30, c - 60), (c - 10, c + 30), (c + 25, c + 60)], fill=(30, 10, 50, 255), width=8)
    save(im, 37)


if __name__ == "__main__":
    coral_eye()
    sea_ruby()
    spike_shell()
    jade_star()
    round_gem(29, (210, 30, 50, 255), (250, 110, 120, 255), (100, 0, 20, 255))
    heart()
    snowflake()
    key()
    round_gem(33, (40, 90, 220, 255), (120, 170, 250, 255), (10, 30, 110, 255))
    pyrite()
    mountain()
    antenna()
    shard()
