// The Pokémon engine: pure functions over the data in js/data/kanto.js. Nothing here reads
// `player`, so scripts/simulate.js can run it under Node.

const STARTERS = [1, 4, 7]
const BASE_SEARCH_TIME = 5 // seconds per encounter
const BASE_SHINY_ODDS = 512
const MOVE_POWER = 70
const STAB = 1.5

// The highest level a Pokémon can reach before the next badge (index = badges held).
// Keeps the Gym Leaders a real wall: gear, type matchups and a full team beat them, not grinding.
const LEVEL_CAPS = [14, 21, 24, 29, 43, 43, 47, 50, 62, 100]

// Gym Leaders' and the League's teams are raised better than wild Pokémon: their stats are
// multiplied by these (tuned with scripts/simulate.js).
const GYM_STRENGTH = [1, 1.8, 2.6, 3.6, 5.2, 6.8, 8.4, 9.2]
const ELITE_FOUR_STRENGTH = 9.2
const CHAMPION_STRENGTH = 8.4

// The key items each badge brings (the Gym's town or the road after it).
const KEY_ITEMS = {
	oldRod: { badges: 2, name: "Old Rod" },
	bicycle: { badges: 3, name: "Bicycle" },
	goodRod: { badges: 4, name: "Good Rod" },
	pokeFlute: { badges: 4, name: "Poké Flute" },
	surf: { badges: 5, name: "Surf" },
	superRod: { badges: 5, name: "Super Rod" },
}
const POOL_KEY = { surf: "surf", oldRod: "oldRod", goodRod: "goodRod", superRod: "superRod", headbutt: "headbutt", rockSmash: "rockSmash", dive: "dive" }
const POOL_WEIGHT = { walk: 2, surf: 2, oldRod: 1, goodRod: 1, superRod: 1, headbutt: 1, rockSmash: 1, dive: 2 }
const POOL_NAMES = { walk: "Grass & caves", surf: "Surfing", oldRod: "Old Rod", goodRod: "Good Rod", superRod: "Super Rod", headbutt: "Headbutt trees", rockSmash: "Rock Smash", dive: "Diving" }
const ROD_POOLS = ["oldRod", "goodRod", "superRod"]

// Evolution items, and the badges needed before you can get them.
const STONE_BADGES = { moonStone: 1, fireStone: 3, waterStone: 3, thunderStone: 3, leafStone: 3 }
const TRADE_BADGES = 3
/** The current region's rules (logic.js swaps them when the journey moves on to Johto). */
var REGION_RULES = { keyItems: KEY_ITEMS, levelCaps: LEVEL_CAPS, stoneBadges: STONE_BADGES, tradeBadges: TRADE_BADGES }

// Forms: looks of a species seen in the anime, kept as variants (box keys like "150-clone").
// sprite: its own image (resources/pokemon/<id>-<form>.png); filter/accessory: drawn over the
// species' sprite. Forms don't evolve (a clone or a giant stays as it is).
const FORMS = {
	clone: { name: "Clone", sprite: true, text: "One of Mewtwo's clones from New Island, marked with stripes." },
	giant: { name: "Giant", sprite: true, atk: 1.2, def: 1.1, catchRate: 3, text: "A towering giant: Attack ×1.2, Defense ×1.1." },
	pink: { name: "Pink", filter: "sepia(1) saturate(3) hue-rotate(290deg) brightness(1.15)", catchRate: 25, text: "The pink Butterfree that leads the migration out to sea." },
	balloon: { name: "Flying", accessory: "🎈", catchRate: 45, text: "A Pikachu that floats on a bunch of balloons." },
	originalCap: { name: "Original Cap", sprite: true, catchRate: 45, text: "Wearing Ash's original cap." },
	// Johto's anime and movies.
	pudgy: { name: "Pudgy", sprite: true, catchRate: 120, text: "A Pidgey of Pudgy Pidgey Isle, too well fed to fly." },
	young: { name: "Young", sprite: true, text: "Silver, Lugia's child, born on Ogi Isle." },
	unown: { name: "Unown", sprite: true, atk: 1.1, text: "The Entei the Unown conjured from Molly's wishes: Attack ×1.1." },
	dark: { name: "Dark", sprite: true, atk: 1.15, text: "Corrupted by the Iron-Masked Marauder's Dark Ball: Attack ×1.15." },
}
// Unown's 28 letters (the Ruins of Alph chambers): "Unown B", "Unown !"...
if (typeof UNOWN_FORMS !== "undefined") UNOWN_FORMS.forEach(f => {
	const letter = f.slice(5)
	FORMS[f] = { name: letter === "Exclamation" ? "!" : letter === "Question" ? "?" : letter, suffix: true, sprite: true, text: "One of the Unown letters from the Ruins of Alph." }
})

function speciesName(id) { return SPECIES[id] ? SPECIES[id].name : "???" }
function formName(id, form) {
	if (!form) return speciesName(id)
	return FORMS[form].suffix ? `${speciesName(id)} ${FORMS[form].name}` : `${FORMS[form].name} ${speciesName(id)}`
}
function spriteOf(id, shiny, form) {
	const file = form && FORMS[form].sprite ? `${id}-${form}` : id
	return `resources/pokemon/${shiny ? "shiny/" : ""}${file}.png`
}
function hasKeyItem(item, badges) { return badges >= (REGION_RULES.keyItems[item]?.badges ?? 99) }
function levelCap(badges) { const caps = REGION_RULES.levelCaps; return caps[Math.min(badges, caps.length - 1)] }

// ---- Experience ----

function xpForLevel(growth, level) {
	if (level <= 1) return 0
	const n = level
	switch (growth) {
		case "fast": return Math.floor(0.8 * n ** 3)
		case "mediumSlow": return Math.max(0, Math.floor(1.2 * n ** 3 - 15 * n ** 2 + 100 * n - 140))
		case "slow": return Math.floor(1.25 * n ** 3)
		default: return n ** 3
	}
}

/** Experience for beating a wild Pokémon, as in the games (before multipliers). */
function xpYield(id, level) { return SPECIES[id].baseExp * level / 7 }

/** Adds experience to a box entry, levelling it up to the cap. Returns the levels gained. */
function gainXp(entry, id, xp, cap) {
	const growth = SPECIES[id].growth
	const start = entry.level
	entry.xp += xp
	while (entry.level < cap && entry.xp >= xpForLevel(growth, entry.level + 1)) entry.level++
	if (entry.level >= cap) entry.xp = Math.min(entry.xp, xpForLevel(growth, cap))
	return entry.level - start
}

/**
 * Whether an evolution (or breeding link) between Gen 1 and Gen 2 is open: logic.js replaces this
 * so Crobat, Pichu and the like wait until Johto has been beaten once.
 */
/** The generation a species comes from (1: #1-151, 2: #152-251, 3: #252-386). */
function generation(id) { return id <= 151 ? 1 : id <= 251 ? 2 : 3 }
/** Whether links into generation `gen` from older species are open (logic.js: that region beaten). */
var crossGenOpen = gen => true
function evolutionOpen(from, into) {
	const a = generation(from), b = generation(into)
	return a === b || crossGenOpen(Math.max(a, b))
}

/** The species this Pokémon evolves into by levelling at its current level, if any. */
function levelEvolution(id, level) {
	const evo = SPECIES[id].evolutions.find(e => e.method === "level" && e.level != null && level >= e.level && evolutionOpen(id, e.into))
	return evo ? evo.into : null
}

/** Evolutions that need an item or a trade, and whether the badges allow them yet. */
function itemEvolutions(id, badges) {
	return SPECIES[id].evolutions
		.filter(e => e.method !== "level" && evolutionOpen(id, e.into))
		.map(e => ({
			...e,
			open: e.method === "trade" ? badges >= REGION_RULES.tradeBadges : badges >= (REGION_RULES.stoneBadges[e.stone] ?? 99),
		}))
}

function evolutionLabel(e) {
	if (e.method === "level") return `Lv. ${e.level}`
	if (e.method === "trade") return e.item ? `Trade holding ${e.item.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase())}` : "Trade"
	return (e.stone || "").replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase())
}

// ---- Battles ----

function statAt(base, level) { return Math.floor((2 * base + 31) * level / 100) + 5 }
function hpAt(base, level) { return Math.floor((2 * base + 31) * level / 100) + level + 10 }

/** A battler: species, level, and multipliers on attack (atk) and on bulk (def). */
function battler(id, level, atk = 1, def = 1) {
	const s = SPECIES[id].stats
	return {
		id, level,
		hp: hpAt(s[0], level) * def,
		atk: statAt(s[1], level) * atk,
		def: statAt(s[2], level) * def,
		spa: statAt(s[3], level) * atk,
		spd: statAt(s[4], level) * def,
		spe: statAt(s[5], level),
	}
}

function effectiveness(attackType, defenderTypes) {
	return defenderTypes.reduce((m, t) => m * (TYPE_CHART[attackType]?.[t] ?? 1), 1)
}

/** Damage per hit: the attacker's best STAB move type against the defender. */
function damage(a, d) {
	const physical = a.atk >= a.spa
	const A = physical ? a.atk : a.spa
	const D = physical ? d.def : d.spd
	const eff = Math.max(0.25, ...SPECIES[a.id].types.map(t => effectiveness(t, SPECIES[d.id].types)))
	return Math.max(1, ((2 * a.level / 5 + 2) * MOVE_POWER * A / D / 50 + 2) * STAB * eff)
}

/**
 * Fights one side against the other, in order, each Pokémon staying out until it faints.
 * Deterministic: faster Pokémon hit first (the player's on a tie). Returns whether the player won,
 * how many foes fell, and who on the player's side fought.
 */
/**
 * Double battles (logic.js points this at the mechanic): the party member after the lead fights
 * beside it, adding this share of its own damage each turn; the foe only attacks the lead.
 */
var partnerDamage = () => 0
function battle(team, foes) {
	let i = 0, j = 0
	let hpA = team[0]?.hp ?? 0, hpB = foes[0]?.hp ?? 0
	const fought = new Set()
	const share = partnerDamage()
	// The lead's damage plus its partner's (the next Pokémon in the party, if any).
	const hit = (a, b) => damage(a, b) + (share && team[i + 1] ? share * damage(team[i + 1], b) : 0)
	for (let turn = 0; turn < 10000 && i < team.length && j < foes.length; turn++) {
		const a = team[i], b = foes[j]
		fought.add(i)
		const first = a.spe >= b.spe
		if (first) {
			hpB -= hit(a, b)
			if (hpB <= 0) { j++; hpB = foes[j]?.hp ?? 0; continue }
			hpA -= damage(b, a)
			if (hpA <= 0) { i++; hpA = team[i]?.hp ?? 0 }
		} else {
			hpA -= damage(b, a)
			if (hpA <= 0) { i++; hpA = team[i]?.hp ?? 0; continue }
			hpB -= hit(a, b)
			if (hpB <= 0) { j++; hpB = foes[j]?.hp ?? 0 }
		}
	}
	const win = j >= foes.length
	// fainted: how many of the player's Pokémon fainted, from the front of the team.
	return { win, defeated: j, fainted: i, fought: [...fought], hpLeft: win ? hpA / team[i].hp : 0, stoppedBy: win ? null : foes[j] }
}

// ---- Encounters ----

function rand(rng) { return (rng || Math.random)() }

function pickWeighted(entries, weight, rng) {
	const total = entries.reduce((s, e) => s + weight(e), 0)
	let r = rand(rng) * total
	for (const e of entries) { r -= weight(e); if (r < 0) return e }
	return entries[entries.length - 1]
}

/** The encounter pools of a zone open with this many badges. */
function zonePools(zone, badges) {
	return Object.keys(zone.pools).filter(p => !POOL_KEY[p] || hasKeyItem(POOL_KEY[p], badges))
}

function zoneSpecies(zone, badges) {
	const ids = new Set()
	for (const p of zonePools(zone, badges)) for (const e of zone.pools[p]) ids.add(e[0])
	return [...ids]
}

/**
 * Rolls a wild Pokémon in a zone: {id, level, pool, form}. `lure` ({id, mult}) makes one species
 * (its plain look) turn up more often within its pools.
 */
function rollEncounter(zone, badges, rng, lure = null) {
	const pool = pickWeighted(zonePools(zone, badges), p => POOL_WEIGHT[p], rng)
	const [id, , min, max, form] = pickWeighted(zone.pools[pool], e => e[1] * (lure && e[0] === lure.id && !e[4] ? lure.mult : 1), rng)
	return { id, level: min + Math.floor(rand(rng) * (max - min + 1)), pool, form: form || null }
}

/** Chance a beaten wild Pokémon is caught. */
function catchChance(id, mult, form) {
	const rate = (form && FORMS[form].catchRate) || SPECIES[id].catchRate
	return Math.min(1, Math.pow(rate / 255, 0.6) * 0.6 * mult)
}

/** Research Points for beating a wild Pokémon (before multipliers). */
function researchYield(id, level) { return SPECIES[id].baseExp * level / 40 }

/** The strongest team of `size` from the box, scored against nothing in particular. */
function battlerScore(id, level) {
	const b = battler(id, level)
	return b.hp * Math.max(b.atk, b.spa) * (b.def + b.spd) / 2
}

// ---- Breeding ----

const DITTO = 132
/** Each species' pre-evolution, from the evolution data. */
const PRE_EVOLUTION = {}
for (const id in SPECIES) for (const e of SPECIES[id].evolutions) PRE_EVOLUTION[e.into] = Number(id)
/** The first stage of a species' family: what its Eggs hatch into. */
function familyBase(id) {
	while (PRE_EVOLUTION[id] && evolutionOpen(PRE_EVOLUTION[id], id)) id = PRE_EVOLUTION[id]
	return id
}
// Nidoran♀ and Nidoran♂ are one family for breeding: their Eggs hatch into either.
const BREEDING_FAMILY = { 32: 29 }
function breedingFamily(id) { const base = familyBase(id); return BREEDING_FAMILY[base] ?? base }
function canBeMale(id) { const g = SPECIES[id].gender; return g >= 0 && g < 8 }
function canBeFemale(id) { return SPECIES[id].gender > 0 }

/**
 * What two Day Care Pokémon's Eggs hatch into, or null if they won't breed: the same family
 * with a male and a female, or anything (but another Ditto) with Ditto. Legendaries don't breed.
 */
function eggSpecies(a, b) {
	if (SPECIES[a].legendary || SPECIES[b].legendary) return null
	if (a === DITTO && b === DITTO) return null
	if (a === DITTO || b === DITTO) return eggOptions(a === DITTO ? b : a)
	if (breedingFamily(a) !== breedingFamily(b)) return null
	const pair = (canBeMale(a) && canBeFemale(b)) || (canBeFemale(a) && canBeMale(b))
	return pair ? eggOptions(a) : null
}
/** Every species up to `maxId` an Egg can hatch into: first stages that breed (with a partner or Ditto). */
function hatchable(maxId = 151) {
	return Object.keys(SPECIES).map(Number)
		.filter(id => id <= maxId && !SPECIES[id].legendary && id !== DITTO && eggSpecies(id, DITTO)?.includes(id))
}
function eggOptions(id) {
	const base = breedingFamily(id)
	return base === 29 ? [29, 32] : [base]
}

if (typeof module !== "undefined") module.exports = {
	STARTERS, BASE_SEARCH_TIME, BASE_SHINY_ODDS, LEVEL_CAPS, GYM_STRENGTH, ELITE_FOUR_STRENGTH,
	CHAMPION_STRENGTH, KEY_ITEMS, STONE_BADGES, TRADE_BADGES, xpForLevel, xpYield, gainXp, levelEvolution,
	itemEvolutions, battler, battle, damage, zonePools, zoneSpecies, rollEncounter, catchChance,
	researchYield, battlerScore, levelCap, hasKeyItem,
}
