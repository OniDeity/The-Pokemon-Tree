"""Builds js/data/kanto.js and js/data/johto.js from Idle Pokémon's data.

Usage: python3 scripts/buildData.py <idle-pokemon checkout> <kanto.json> <anime.json> <johto.json> <hoenn.json>

kanto.json is Idle Pokémon's Kanto zones, Gyms, Elite Four, Champions and special encounters,
dumped as JSON from its TypeScript (src/game/pokemon/zones.ts, trainers.ts, specials.ts).
anime.json is its Kanto anime places (`zones`: ZONES with `anime`) and Kanto `specials`.
johto.json is its src/game/pokemon/johto.ts: JOHTO_ZONES, JOHTO_GYMS, johtoFinale() and
JOHTO_SPECIALS, JOHTO_SWARMS, BUG_CONTEST_POOL, plus johtoAnime.ts's JOHTO_ANIME_ZONES and
JOHTO_ANIME_SPECIALS as `animeZones`/`animeSpecials` (dumped with tsx). hoenn.json is its hoenn.ts:
HOENN_ZONES, HOENN_GYMS, hoennFinale() and HOENN_SPECIALS (`finale`), plus hoennAnime.ts's
HOENN_ANIME_ZONES and HOENN_ANIME_SPECIALS as `animeZones`/`animeSpecials`.
"""
import json
import sys

idle, extra, anime_file, johto_file, hoenn_file = sys.argv[1:6]
species = json.load(open(f"{idle}/src/data/pokemon/species.json"))
encounters = json.load(open(f"{idle}/src/data/pokemon/encounters.json"))
type_chart = json.load(open(f"{idle}/src/data/pokemon/typeChart.json"))
kanto = json.load(open(extra))

POOLS = ["walk", "surf", "oldRod", "goodRod", "superRod"]
# Kanto's places and gifts keep to #1-151, Johto's to #251; species data goes to #386 for Hoenn.
MAX_ID = 151
JOHTO_MAX = 251
MAX_SPECIES = 386


def evolution(e):
    out = {k: v for k, v in e.items() if k in ("into", "method", "level", "stone")}
    # Gen 2's friendship evolutions level up for now; held-item trades are trades with an item.
    if e.get("friendship"):
        out["friendship"] = True
    if e.get("heldItem"):
        out["item"] = e["heldItem"]
    return out


SPECIES = {}
for s in species[:MAX_SPECIES]:
    SPECIES[s["id"]] = {
        "name": s["name"],
        "types": s["types"],
        "stats": s["baseStats"],
        "baseExp": s["baseExp"],
        "catchRate": s["captureRate"],
        "growth": s["growthRate"],
        # -1 genderless, 0 always male, 8 always female, else eighths female (Day Care breeding).
        "gender": s["genderRate"],
        "legendary": s["legendary"],
        "evolutions": [evolution(e) for e in s["evolutions"] if e["into"] <= MAX_SPECIES],
    }

ZONES = []
for z in kanto["zones"]:
    pools = {
        p: [[e["id"], e["weight"], e["minLevel"], e["maxLevel"]] for e in v if e["id"] <= MAX_ID]
        for p, v in encounters.get(z["id"], {}).items()
        if p in POOLS
    }
    if not pools:
        continue
    zone = {"id": z["id"], "name": z["name"], "badges": z["badgesRequired"], "blurb": z["blurb"], "pools": pools}
    if z.get("postGame"):
        zone["postGame"] = True
    ZONES.append(zone)


def trainer(t, keys=()):
    out = {k: t[k] for k in ("id", "name", "title", "specialty", "team", "quote")}
    out["team"] = [[p["id"], p["level"]] for p in t["team"]]
    for k in keys:
        if k in t:
            out[k] = t[k]
    return out


GYMS = [trainer(g, ("town", "badge", "keyItems", "rewardText")) for g in kanto["gyms"]]
ELITE_FOUR = [trainer(t) for t in kanto["e4"]]
CHAMPIONS = {starter: trainer(c) for starter, c in zip((1, 4, 7), kanto["champ"])}

SPECIALS = []
for s in kanto["specials"]:
    sid = 143 if s["speciesId"] == 7020 else s["speciesId"]
    if sid > MAX_ID or s["id"] in ("pinkButterfree",):
        continue
    out = {k: s[k] for k in ("kind", "id", "level", "place", "badgesRequired", "text") if k in s}
    out["species"] = sid
    for k in ("price", "wants", "strength", "keyItem", "postGame"):
        if k in s:
            out[k] = s[k]
    if s["id"] == "treeMew":
        out["place"] = "Faraway Island"
        out["text"] = "An Old Sea Map leads to a far-off island, where Mew plays in the tall grass."
    SPECIALS.append(out)

# ---- The anime ----
# Idle Pokémon numbers its one-of-a-kind forms; here they're forms of the species (box keys like
# "150-clone"). Gen 2 species seen in the anime places wait for Johto.
FORM_IDS = {3012: (12, "pink"), 3101: (25, "balloon"), 10094: (25, "originalCap"),
            7150: (65, "giant"), 7151: (94, "giant"), 7152: (39, "giant"), 7153: (149, "giant"), 7020: (143, None),
            # Johto's: Pudgy Pidgey, Silver (the young Lugia), the Unown's Entei, the Dark Ball's Celebi and Tyranitar.
            3016: (16, "pudgy"), 3249: (249, "young"), 3244: (244, "unown"), 3251: (251, "dark"), 3248: (248, "dark"),
            # Hoenn's: Meta Groudon ("Jirachi: Wish Maker") and Hoenn Cap Pikachu.
            3383: (383, "meta"), 10095: (25, "hoennCap")}


def form_of(vid, max_id=MAX_ID):
    if vid in FORM_IDS:
        return FORM_IDS[vid]
    if 7200 < vid <= 7200 + MAX_ID:
        return (vid - 7200, "clone")
    return (vid, None) if vid <= max_id else None


# Anime places open after more and more Hall of Fame entries, by their badge tier.
def hof_for(badges, post_game=False):
    return 5 if post_game else [1, 1, 2, 2, 3, 3, 4, 4, 5][badges]


anime = json.load(open(anime_file))
ANIME_ZONES = []
for z in anime["zones"]:
    entries = []
    for e in z["encounters"].get("walk", []):
        f = form_of(e["id"])
        if not f:
            continue
        entry = [f[0], e["weight"], e["minLevel"], e["maxLevel"]]
        if f[1]:
            entry.append(f[1])
        entries.append(entry)
    if not entries:
        continue
    zone = {"id": z["id"], "name": z["name"], "badges": z["badgesRequired"], "blurb": z["blurb"],
            "anime": True, "hof": hof_for(z["badgesRequired"], z.get("postGame")), "pools": {"walk": entries}}
    if z.get("postGame"):
        zone["postGame"] = True
    ANIME_ZONES.append(zone)
ZONES.extend(ANIME_ZONES)

anime_zone_ids = {z["id"] for z in ANIME_ZONES}
for s in anime["specials"]:
    in_anime = s.get("zoneId") in anime_zone_ids or s["speciesId"] in (3101, 10094)
    if not in_anime or s["id"] == "treeMew":
        continue
    f = form_of(s["speciesId"])
    out = {k: s[k] for k in ("kind", "id", "level", "place", "badgesRequired", "text") if k in s}
    out["species"] = f[0]
    if f[1]:
        out["form"] = f[1]
    for k in ("price", "strength", "postGame"):
        if k in s:
            out[k] = s[k]
    out["anime"] = True
    out["hof"] = hof_for(s["badgesRequired"], s.get("postGame"))
    SPECIALS.append(out)

# ---- Johto (HeartGold/SoulSilver) ----
johto = json.load(open(johto_file))
JOHTO_POOLS = POOLS + ["headbutt", "rockSmash"]
# Unown's letters (Idle Pokémon's 4000-4027: A-Z, then ! and ?) become forms of #201.
UNOWN_FORMS = ["unown" + c for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ"] + ["unownExclamation", "unownQuestion"]


def johto_entry(e):
    if 4000 <= e["id"] <= 4027:
        return [201, round(e["weight"], 2), e["minLevel"], e["maxLevel"], UNOWN_FORMS[e["id"] - 4000]]
    if e["id"] > JOHTO_MAX:
        return None
    return [e["id"], round(e["weight"], 2), e["minLevel"], e["maxLevel"]]


JOHTO_ZONES = []
for z in johto["zones"]:
    source = z.get("encounters") or encounters.get(z["id"], {})
    pools = {
        p: [x for x in (johto_entry(e) for e in v) if x]
        for p, v in source.items()
        if p in JOHTO_POOLS
    }
    if not pools:
        continue
    zone = {"id": z["id"], "name": z["name"], "badges": z["badgesRequired"], "blurb": z["blurb"], "pools": pools}
    if z.get("postGame"):
        zone["postGame"] = True
    JOHTO_ZONES.append(zone)

JOHTO_GYMS = [trainer(g, ("town", "badge", "keyItems", "rewardText")) for g in johto["gyms"]]
JOHTO_ELITE_FOUR = [trainer(t) for t in johto["finale"][:4]]
JOHTO_CHAMPION = trainer(johto["finale"][4])

JOHTO_SPECIALS = []
JOHTO_RED = None
for s in johto["specials"]:
    if s["kind"] == "boss":
        JOHTO_RED = trainer(s["trainer"])
        continue
    sid, shiny = s["speciesId"], False
    if sid == 7022:  # The Lake of Rage's red Gyarados
        sid, shiny = 130, True
    if sid > JOHTO_MAX:
        continue  # one-of-a-kind forms wait for Johto's anime places
    out = {k: s[k] for k in ("kind", "id", "level", "place", "badgesRequired", "text") if k in s}
    out["species"] = sid
    if shiny:
        out["shiny"] = True
    for k in ("price", "wants", "strength", "keyItem", "postGame"):
        if k in s:
            out[k] = s[k]
    JOHTO_SPECIALS.append(out)

# Johto's anime places open with badges, and with Johto Hall of Fame entries for the later tiers.
def johto_hof_for(badges, post_game=False):
    return 2 if post_game else [0, 0, 0, 0, 1, 1, 1, 1, 2][badges]


for z in johto["animeZones"]:
    pools = {}
    for p, v in z["encounters"].items():
        entries = []
        for e in v:
            f = form_of(e["id"], JOHTO_MAX)
            if not f:
                continue
            entry = [f[0], e["weight"], e["minLevel"], e["maxLevel"]]
            if f[1]:
                entry.append(f[1])
            entries.append(entry)
        if entries:
            pools[p] = entries
    if not pools:
        continue
    zone = {"id": z["id"], "name": z["name"], "badges": z["badgesRequired"], "blurb": z["blurb"],
            "anime": True, "hof": johto_hof_for(z["badgesRequired"], z.get("postGame")), "pools": pools}
    if z.get("postGame"):
        zone["postGame"] = True
    JOHTO_ZONES.append(zone)

for s in johto["animeSpecials"]:
    f = form_of(s["speciesId"], JOHTO_MAX)
    out = {k: s[k] for k in ("kind", "id", "level", "place", "badgesRequired", "text") if k in s}
    out["species"] = f[0]
    if f[1]:
        out["form"] = f[1]
    for k in ("price", "strength", "postGame"):
        if k in s:
            out[k] = s[k]
    out["anime"] = True
    out["hof"] = johto_hof_for(s["badgesRequired"], s.get("postGame"))
    JOHTO_SPECIALS.append(out)

# The radio's swarms (one species joins a place's pools) and the Bug-Catching Contest's grass.
JOHTO_SWARMS = [
    {"zone": w["zoneId"], "species": w["speciesId"],
     "pools": {p: [[e["id"], e["weight"], e["minLevel"], e["maxLevel"]] for e in v] for p, v in w["pools"].items()}}
    for w in johto["swarms"]
]
BUG_CONTEST = [[e["id"], e["weight"], e["minLevel"], e["maxLevel"]] for e in johto["bugContest"]]

with open("js/data/johto.js", "w") as f:
    f.write("// Generated by scripts/buildData.py from Idle Pokémon's data. Don't edit by hand.\n")
    for name, value in [
        ("JOHTO_ZONES", JOHTO_ZONES),
        ("JOHTO_GYMS", JOHTO_GYMS),
        ("JOHTO_ELITE_FOUR", JOHTO_ELITE_FOUR),
        ("JOHTO_CHAMPION", JOHTO_CHAMPION),
        ("JOHTO_SPECIALS", JOHTO_SPECIALS),
        ("JOHTO_RED", JOHTO_RED),
        ("JOHTO_SWARMS", JOHTO_SWARMS),
        ("BUG_CONTEST", BUG_CONTEST),
        ("UNOWN_FORMS", UNOWN_FORMS),
    ]:
        f.write(f"const {name} = {json.dumps(value, ensure_ascii=False, separators=(',', ':'))}\n")

# ---- Hoenn (Emerald) ----
hoenn = json.load(open(hoenn_file))
HOENN_POOLS = POOLS + ["rockSmash", "dive"]
# Feebas lives under a few tiles of Route 119's river: about 1 cast in 20 there (Idle Pokémon's EXTRA_ENCOUNTERS).
HOENN_EXTRA = {"route119": {rod: [{"id": 349, "weight": 15, "minLevel": 20, "maxLevel": 25}] for rod in ("oldRod", "goodRod", "superRod")}}
HOENN_ZONES = []
for z in hoenn["zones"]:
    source = dict(z.get("encounters") or encounters.get(z["id"], {}))
    for p, extra in HOENN_EXTRA.get(z["id"], {}).items():
        source[p] = list(source.get(p, [])) + extra
    pools = {
        p: [[e["id"], round(e["weight"], 2), e["minLevel"], e["maxLevel"]] for e in v if e["id"] <= MAX_SPECIES]
        for p, v in source.items()
        if p in HOENN_POOLS
    }
    pools = {p: v for p, v in pools.items() if v}
    if not pools:
        continue
    zone = {"id": z["id"], "name": z["name"], "badges": z["badgesRequired"], "blurb": z["blurb"], "pools": pools}
    if z.get("postGame"):
        zone["postGame"] = True
    HOENN_ZONES.append(zone)
HOENN_GYMS = [trainer(g, ("town", "badge", "keyItems", "rewardText")) for g in hoenn["gyms"]]
HOENN_ELITE_FOUR = [trainer(t) for t in hoenn["finale"][:4]]
HOENN_CHAMPION = trainer(hoenn["finale"][4])
HOENN_SPECIALS = []
for s in hoenn["specials"]:
    out = {k: s[k] for k in ("kind", "id", "level", "place", "badgesRequired", "text") if k in s}
    out["species"] = s["speciesId"]
    for k in ("price", "wants", "strength", "keyItem", "postGame"):
        if k in s:
            out[k] = s[k]
    HOENN_SPECIALS.append(out)

# Hoenn's anime places open like Johto's, by Hoenn Hall of Fame entries for the later tiers.
for z in hoenn["animeZones"]:
    pools = {}
    for p, v in z["encounters"].items():
        entries = []
        for e in v:
            f = form_of(e["id"], MAX_SPECIES)
            if not f:
                continue
            entry = [f[0], e["weight"], e["minLevel"], e["maxLevel"]]
            if f[1]:
                entry.append(f[1])
            entries.append(entry)
        if entries:
            pools[p] = entries
    if not pools:
        continue
    zone = {"id": z["id"], "name": z["name"], "badges": z["badgesRequired"], "blurb": z["blurb"],
            "anime": True, "hof": johto_hof_for(z["badgesRequired"], z.get("postGame")), "pools": pools}
    if z.get("postGame"):
        zone["postGame"] = True
    HOENN_ZONES.append(zone)

for s in hoenn["animeSpecials"]:
    f = form_of(s["speciesId"], MAX_SPECIES)
    out = {k: s[k] for k in ("kind", "id", "level", "place", "badgesRequired", "text") if k in s}
    out["species"] = f[0]
    if f[1]:
        out["form"] = f[1]
    for k in ("price", "strength", "postGame"):
        if k in s:
            out[k] = s[k]
    out["anime"] = True
    out["hof"] = johto_hof_for(s["badgesRequired"], s.get("postGame"))
    HOENN_SPECIALS.append(out)

with open("js/data/hoenn.js", "w") as f:
    f.write("// Generated by scripts/buildData.py from Idle Pokémon's data. Don't edit by hand.\n")
    for name, value in [
        ("HOENN_ZONES", HOENN_ZONES),
        ("HOENN_GYMS", HOENN_GYMS),
        ("HOENN_ELITE_FOUR", HOENN_ELITE_FOUR),
        ("HOENN_CHAMPION", HOENN_CHAMPION),
        ("HOENN_SPECIALS", HOENN_SPECIALS),
    ]:
        f.write(f"const {name} = {json.dumps(value, ensure_ascii=False, separators=(',', ':'))}\n")

with open("js/data/kanto.js", "w") as f:
    f.write("// Generated by scripts/buildData.py from Idle Pokémon's data. Don't edit by hand.\n")
    for name, value in [
        ("SPECIES", SPECIES),
        ("TYPE_CHART", type_chart),
        ("ZONES", ZONES),
        ("GYMS", GYMS),
        ("ELITE_FOUR", ELITE_FOUR),
        ("CHAMPIONS", CHAMPIONS),
        ("SPECIALS", SPECIALS),
    ]:
        f.write(f"const {name} = {json.dumps(value, ensure_ascii=False, separators=(',', ':'))}\n")
