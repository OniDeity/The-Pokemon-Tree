// Game rules over `player`: multipliers, encounters, the box and evolutions, Gym and League
// battles. Kept free of TMT's layer helpers so scripts/simulate.js can run it with a fake player.

// Field research (the "f" layer): repeatable buyables and one-off upgrades, paid in Research Points.
const FIELD_BUYABLES = {
	11: { title: "Field Notebook", base: 10, growth: 1.9, badges: 0, text: "Organized notes: search 25% faster per level." },
	12: { title: "Quality Traps", base: 15, growth: 1.9, badges: 0, text: "+15% catch chance per level." },
	13: { title: "Battle Gear", base: 25, growth: 2.2, badges: 0, text: "+15% Attack and Defense for your Pokémon per level." },
	14: { title: "Training Weights", base: 100, growth: 1.9, badges: 1, text: "+25% experience per level." },
}
const FIELD_UPGRADES = {
	11: { title: "Auto-Search Drone", cost: 50, badges: 0, text: "Starts the next search as soon as one ends." },
	12: { title: "Running Shoes", cost: 250, badges: 0, text: "Search twice as fast." },
	13: { title: "Research Grant", cost: 600, badges: 0, text: "Research Points ×(1 + species caught ÷ 50)." },
	14: { title: "Exp. Share", cost: 150, badges: 0, text: "Party Pokémon that didn't fight get half the experience." },
	15: { title: "Lucky Charm", cost: 2500, badges: 2, text: "Shiny Pokémon are twice as common." },
	21: { title: "Survey Map", cost: 8000, badges: 3, text: "Wild battles give 50% more Research Points." },
	22: { title: "Silph Scope", cost: 40000, badges: 4, text: "Your team's Attack ×1.25 (and the Pokémon Tower's ghosts show their faces)." },
	23: { title: "Field Lab", cost: 250000, badges: 6, text: "Passive Research Points ×5." },
}

// Badge rewards: the badge itself boosts your Pokémon, as Kanto's badges did.
const BADGE_STAT_BOOST = 1.05
const BADGE_RP_BOOST = 1.3

function badges() { return player.g ? Math.round(new Decimal(player.g.points).toNumber()) : 0 }
function isChampion() { return !!(player.l && player.l.champion) }
function hasFieldUpgrade(id) { return player.f.upgrades.map(Number).includes(Number(id)) }
function fieldBuyable(id) { return new Decimal(player.f.buyables[id] ?? 0).toNumber() }
/** Light Pack runs can't buy the Field Notebook, Quality Traps or Training Weights. */
const LIGHT_PACK_ITEMS = [11, 12, 14]
function fieldBuyableAllowed(id) { return !(inChallenge(21) && LIGHT_PACK_ITEMS.includes(Number(id))) }
/** Each level's effect: the Light Pack reward makes the packed items 25% stronger. */
function fieldBuyableStep(id, base) { return base * (beatChallenge(21) && LIGHT_PACK_ITEMS.includes(Number(id)) ? 1.25 : 1) }
function caughtCount() { return Object.keys(player.d.caught).length }
function seenCount() { return Object.keys(player.d.seen).length }
function dexMilestone(n) { return !inChallenge(51) && caughtCount() >= n }
function currentCap() {
	return levelCap(badges() + (isChampion() ? 1 : 0)) - (inChallenge(22) ? 5 : 0) + (beatChallenge(22) ? 2 : 0)
}

// Pokédex milestones: species caught → reward.
const DEX_MILESTONES = [
	[10, "Research Points ×1.5."],
	[25, "+25% catch chance."],
	[40, "Search 50% faster."],
	[60, "Experience ×2."],
	[80, "Research Points ×2."],
	[100, "The Shiny Charm: shiny Pokémon are three times as common."],
	[120, "Your team's Attack and Defense ×1.2."],
	[150, "Professor Oak's thesis: Research Points ×5."],
]

function fieldBuyableCost(id, amount = fieldBuyable(id)) {
	const b = FIELD_BUYABLES[id]
	return new Decimal(b.base).times(Decimal.pow(b.growth, amount)).times(inChallenge(43) ? 4 : 1)
}

function rpMult() {
	let m = Math.pow(BADGE_RP_BOOST, badges() + kantoBadges()) * (1 + 0.25 * hofBuyable(11)) * (inChallenge(31) ? 0.25 : 1)
	if (hasFieldUpgrade(13)) m *= 1 + caughtCount() / 50
	if (dexMilestone(10)) m *= 1.5
	if (dexMilestone(80)) m *= 2
	if (dexMilestone(150)) m *= 5
	if (formMilestone(3)) m *= 1.25
	m *= 1 + 0.02 * hatchedSpecies()
	if (wardenMilestone(25)) m *= 1.2
	m *= 1 + 0.1 * gameCornerBuyable(12)
	if (jackpotMilestone(5)) m *= 1.1
	m *= 1 + 0.01 * shinySpecies() + 0.02 * melanisticSpecies()
	if (rocketMilestone(10)) m *= 1.1
	if (rivalMilestone(15)) m *= 1.1
	if (rocketMilestone(75)) m *= 1.15
	if (rocketMilestone(500)) m *= 1.25
	if (rivalMilestone(100)) m *= 1.2
	if (storyMilestone(10)) m *= 1.1
	if (storyMilestone(500)) m *= 1.25
	m *= 1 + 0.005 * ribbonCount()
	if (ribbonMilestone(60)) m *= 1.25
	return m
}
function wildRpMult() { return rpMult() * (hasFieldUpgrade(21) ? 1.5 : 1) * (inChallenge(52) ? 0.5 : 1) }
function passiveRp() {
	if (!player.t.starter || inChallenge(51)) return 0
	return caughtCount() * 0.05 * rpMult() * (hasFieldUpgrade(23) ? 5 : 1) * (hofUpgrade(22) ? 3 : 1) / pace()
}
function xpMult() {
	let m = (1 + fieldBuyableStep(14, 0.25) * fieldBuyable(14)) * (1 + 0.25 * hofBuyable(12))
	if (dexMilestone(60)) m *= 2
	if (formMilestone(ALL_FORMS.length)) m *= 1.5
	m *= 1 + 0.1 * gameCornerBuyable(13)
	if (rivalMilestone(3)) m *= 1.2
	if (rivalMilestone(30)) m *= 1.25
	if (storyMilestone(50)) m *= 1.15
	m *= 1 + 0.01 * albinoSpecies() + 0.02 * melanisticSpecies()
	if (albinoMilestone(25)) m *= 1.25
	return m
}
function searchTime() {
	// Searching by hand (before the Auto-Search Drone) keeps the base speed.
	let t = BASE_SEARCH_TIME * (hasFieldUpgrade(11) ? pace() : 1) / (1 + fieldBuyableStep(11, 0.25) * fieldBuyable(11)) / (1 + 0.1 * hofBuyable(14))
	if (hasFieldUpgrade(12)) t /= 2
	if (hasKeyItem("bicycle", badges())) t /= 1.5
	if (dexMilestone(40)) t /= 1.5
	return t
}
function catchMult() {
	let m = (1 + fieldBuyableStep(12, 0.15) * fieldBuyable(12)) * (1 + 0.1 * hofBuyable(15)) * (inChallenge(33) ? 0.1 : 1) * 1
	if (dexMilestone(25)) m *= 1.25
	if (formMilestone(10)) m *= 1.25
	if (wardenMilestone(50)) m *= 1.1
	if (rocketMilestone(20)) m *= 1.1
	if (rocketMilestone(150)) m *= 1.15
	return m
}
function gearMult() { return 1 + 0.15 * fieldBuyable(13) }
function atkMult() {
	let m = gearMult() * Math.pow(BADGE_STAT_BOOST, badges()) * (1 + 0.05 * hofBuyable(13))
	if (hasFieldUpgrade(22)) m *= 1.25
	if (dexMilestone(120)) m *= 1.2
	if (rocketMilestone(40)) m *= 1.1
	if (rivalMilestone(60)) m *= 1.1
	if (rivalMilestone(200)) m *= 1.1
	if (storyMilestone(200)) m *= 1.1
	if (hasDiploma()) m *= 1.1
	return m
}
function defMult() {
	let m = gearMult() * Math.pow(BADGE_STAT_BOOST, badges()) * (1 + 0.05 * hofBuyable(13))
	if (dexMilestone(120)) m *= 1.2
	if (rivalMilestone(7)) m *= 1.1
	if (rocketMilestone(300)) m *= 1.15
	if (rivalMilestone(200)) m *= 1.1
	if (storyMilestone(750)) m *= 1.1
	if (hasDiploma()) m *= 1.1
	return m
}
function shinyOdds() {
	let odds = BASE_SHINY_ODDS
	if (hasFieldUpgrade(15)) odds /= 2
	if (hofUpgrade(15)) odds /= 2
	if (dexMilestone(100)) odds /= 3
	if (shinyMilestone(10)) odds /= 2
	odds /= 1 + 0.1 * huntBuyable(13)
	if (inChallenge(53)) odds *= 4
	return odds
}
function partySize() {
	if (inChallenge(13)) return 1
	return Math.min(6, 3 + Math.floor(badges() / 2) + (hofUpgrade(14) ? 1 : 0))
}
/** The types of this run's starter (its original species, even after it evolves). */
function starterTypes() { return SPECIES[player.t.starter]?.types ?? [] }
function sharesStarterType(key) { return SPECIES[speciesOf(key)].types.some(t => starterTypes().includes(t)) }
/** Monotype runs only let Pokémon sharing a type with the starter into the party. */
function canJoinParty(key) { return !inChallenge(12) || sharesStarterType(key) }

// ---- Map ----

function zoneById(id) { return ALL_ZONES.find(z => z.id === id) }

/** Zones of the area you're surveying now: they open one by one, for Research Points. */
function frontierZones() {
	const b = badges()
	return regionZones().filter(z => z.badges === b && !z.postGame && !z.anime)
}
/** Each route of an area costs ×1.8 the last, up to the 8th (Hoenn's larger areas go ×1.2 after). */
function zoneUnlockCost(index) {
	return new Decimal(25).times(Decimal.pow(1.8, Math.min(index, 7))).times(Decimal.pow(1.2, Math.max(0, index - 7))).times(Decimal.pow(5, badges())).times(hofUpgrade(12) ? 0.5 : 1).times(region().zoneCost)
}
function zoneOpen(zone) {
	if (zone.region !== currentRegion()) return revisitOpen(zone)
	if (zone.anime) return animeOpen(zone)
	if (zone.mirage) return isChampion() && mirageVisible()
	if (zone.postGame) return isChampion()
	if (zone.badges < badges()) return true
	if (zone.badges > badges()) return false
	return frontierZones()[0] === zone || !!player.f.unlocked[zone.id]
}
function nextFrontierZone() {
	const zones = frontierZones()
	const i = zones.findIndex(z => !zoneOpen(z))
	return i < 0 ? null : { zone: zones[i], cost: zoneUnlockCost(i) }
}
function unlockNextZone() {
	const next = nextFrontierZone()
	if (!next || player.points.lt(next.cost)) return false
	player.points = player.points.sub(next.cost)
	player.f.unlocked[next.zone.id] = true
	return true
}

/** The survey a Gym Leader (or the League) wants: every zone of the area open and every species there seen. */
function surveyStatus() {
	const zones = frontierZones()
	const missing = []
	let total = 0
	for (const z of zones) for (const id of zoneSpecies(z, badges())) {
		total++
		if (!player.d.seen[id]) missing.push(id)
	}
	const allOpen = zones.every(zoneOpen)
	return { zones, allOpen, missing: [...new Set(missing)], total, done: allOpen && missing.length === 0 }
}

// ---- Pokédex and box ----

function dexSee(id) { player.d.seen[id] = (player.d.seen[id] || 0) + 1 }
/** `color` is a look's colour (or true for shiny): Melanistic counts as both shiny and albino. */
function dexCatch(id, color, form) {
	if (!player.d.seen[id]) player.d.seen[id] = 1
	player.d.caught[id] = (player.d.caught[id] || 0) + 1
	if (color === true) color = "shiny"
	if (color === "shiny" || color === "melanistic") player.d.shiny[id] = (player.d.shiny[id] || 0) + 1
	if (color === "albino" || color === "melanistic") player.d.albino = { ...player.d.albino, [id]: (player.d.albino?.[id] || 0) + 1 }
	if (color === "melanistic") player.d.melanistic = { ...player.d.melanistic, [id]: (player.d.melanistic?.[id] || 0) + 1 }
	if (form) player.d.forms[`${id}-${form}`] = (player.d.forms[`${id}-${form}`] || 0) + 1
}

// ---- Variants ----
// A species can come in several looks. Each (species, look) is its own box slot and party key:
// "15" is a Beedrill, "15-shiny" a shiny one, "150-clone" a clone (FORMS in engine.js) and
// "25-clone-shiny" both. Albino and Melanistic (shiny and albino at once) are planned as further
// looks.
/** The look part of a key: "" for a plain Pokémon, else its form and/or "shiny". */
// Colours: Shiny, Albino (its own odds, same base) and Melanistic (both rolls at once).
const COLORS = ["shiny", "albino", "melanistic"]
const COLOR_MARKS = { shiny: "★", albino: "◇", melanistic: "✦" }
const COLOR_NAMES = { shiny: "Shiny", albino: "Albino", melanistic: "Melanistic" }
/** A look from a form and a colour (true means shiny). */
function makeLook(form, color) { return [form, color === true ? "shiny" : color || null].filter(Boolean).join("-") }
function colorMark(color) { return color ? `${COLOR_MARKS[color === true ? "shiny" : color]} ` : "" }
/** Rolls a new Pokémon's colour: shiny and albino separately; both make it Melanistic. */
function rollColor(rng, shinyChance, albinoChance) {
	const shiny = rand(rng) < shinyChance, albino = rand(rng) < albinoChance
	return shiny && albino ? "melanistic" : shiny ? "shiny" : albino ? "albino" : null
}
function boxKey(id, look = "") {
	return typeof look === "string" && look && look !== "normal" ? `${Number(id)}-${look}` : String(Number(id))
}
function speciesOf(key) { return parseInt(key) }
function lookOf(key) { return String(key).split("-").slice(1).join("-") }
function variantOf(key) { return lookOf(key) || "normal" }
function colorOf(key) { return String(key).split("-").slice(1).find(p => COLORS.includes(p)) || null }
function isShiny(key) { const c = colorOf(key); return c === "shiny" || c === "melanistic" }
function isAlbino(key) { const c = colorOf(key); return c === "albino" || c === "melanistic" }
function formOf(key) { return String(key).split("-").slice(1).find(p => !COLORS.includes(p)) || null }
/** The (species, form) entries of a zone's open pools that aren't in the box in any look. */
function zoneMissing(zone) {
	const box = Object.keys(player.t.box)
	const missing = new Set()
	for (const p of zonePools(zone, badges())) for (const [id, , , , form] of zone.pools[p]) {
		if (!box.some(k => speciesOf(k) === id && formOf(k) === (form || null))) missing.add(`${id}-${form || ""}`)
	}
	return missing.size
}
function ownsSpecies(id) { return Object.keys(player.t.box).some(key => speciesOf(key) === Number(id)) }
function keyName(key) { return `${colorMark(colorOf(key))}${formName(speciesOf(key), formOf(key))}` }

/**
 * Saves before v0.3 kept one box entry per species, keyed by the species with a `shiny` flag,
 * and a party of species numbers. Moves them to variant keys.
 */
function migrateBox() {
	const box = player.t.box
	const rename = {}
	const move = (from, to) => {
		if (!box[to] || box[to].level < box[from].level) box[to] = box[from]
		delete box[from]
		rename[from] = to
	}
	for (const key of Object.keys(box)) {
		const entry = box[key]
		// v0.3 keyed new starters "4-false" (a boolean passed as the look): fold them into "4".
		if (key.endsWith("-false") || entry.variant === false) {
			entry.variant = "normal"
			move(key, boxKey(speciesOf(key)))
			continue
		}
		if (entry.variant) continue
		entry.variant = entry.shiny ? "shiny" : "normal"
		delete entry.shiny
		const newKey = boxKey(speciesOf(key), entry.variant)
		if (newKey !== key) move(key, newKey)
	}
	player.t.party = player.t.party.map(k => rename[String(k)] ?? String(k))
		.map(k => box[k] ? k : boxKey(speciesOf(k), "shiny"))
		.filter((k, i, all) => box[k] && all.indexOf(k) === i)
}

/** Adds a Pokémon to the box. The box keeps one of each species and look: the higher level. */
function addToBox(id, level, variant = "normal", origin = null) {
	const key = boxKey(id, variant)
	const old = player.t.box[key]
	dexCatch(id, colorOf(key), formOf(key))
	// Hatching (or a Safari catch of) a species you already own marks the one you own.
	if (old && origin && !old.origin) old.origin = origin
	if (old && old.level >= level) return false
	// origin: "egg" or "safari" where it matters (the Hatchling Run and Poacher's Net exempt them).
	player.t.box[key] = { level, xp: xpForLevel(SPECIES[id].growth, level), variant, ...(origin || old?.origin ? { origin: origin || old.origin } : {}), ...(old?.condition ? { condition: old.condition } : {}) }
	if (!old && player.t.party.length < partySize() && canJoinParty(key)) player.t.party.push(key)
	return true
}

/**
 * Pokémon don't evolve into a species and look you already have: the box keeps one of each, so
 * evolving would merge the two and lose the earlier form. A shiny Kakuna still evolves when you
 * only have a normal Beedrill.
 */
function canEvolveInto(key, into) {
	if (formOf(key)) return false
	const owned = player.t.box[boxKey(into, variantOf(key))]
	// A hatched or Safari Pokémon may evolve into one you own that isn't, passing that on.
	return !owned || (!!player.t.box[key]?.origin && !owned.origin)
}

/** Evolves a box Pokémon: it takes the evolution's place in the box (and the party). */
function evolve(key, into) {
	key = String(key)
	const entry = player.t.box[key]
	if (!entry) return
	const newKey = boxKey(into, variantOf(key))
	delete player.t.box[key]
	const existing = player.t.box[newKey]
	if (existing) {
		existing.origin = existing.origin || entry.origin
		if (existing.level < entry.level) Object.assign(existing, { level: entry.level, xp: entry.xp })
	} else player.t.box[newKey] = entry
	dexCatch(into, colorOf(key))
	const slot = player.t.party.indexOf(key)
	if (slot >= 0) {
		if (player.t.party.includes(newKey)) player.t.party.splice(slot, 1)
		else player.t.party[slot] = newKey
	}
	player.t.evolved = (player.t.evolved || 0) + 1
	pkLog(`${keyName(key)} evolved into ${speciesName(into)}!`, "evolve", { id: into }, colorOf(key))
	// It might already be high enough for its next stage.
	const next = levelEvolution(into, player.t.box[newKey].level)
	if (next && canEvolveInto(newKey, next)) evolve(newKey, next)
}

function giveXp(key, xp) {
	const entry = player.t.box[key]
	if (!entry) return
	gainXp(entry, speciesOf(key), xp, currentCap())
	const into = levelEvolution(speciesOf(key), entry.level)
	if (into && canEvolveInto(key, into) && player.t.autoEvolve !== false) evolve(key, into)
}

function partyBattlers(party = player.t.party) {
	const atk = atkMult(), def = defMult()
	return party.filter(key => player.t.box[key]).map((key, i) => {
		// Challenge rewards: Lone Partner strengthens the lead, Monotype the starter's type.
		const lead = i === 0 ? (inChallenge(13) ? LONE_PARTNER_BOOST : 1) * (beatChallenge(13) ? 1.2 : 1) : 1
		const typed = (inChallenge(12) ? MONOTYPE_BOOST : 1) * (beatChallenge(12) && sharesStarterType(key) ? 1.15 : 1)
		const form = FORMS[formOf(key)] || {}
		const handicap = challengeHandicap(player.t.box[key], key) * (shinyMilestone(25) && isShiny(key) ? 1.25 : 1) * (albinoMilestone(10) && isAlbino(key) ? 1.25 : 1)
		return battler(speciesOf(key), player.t.box[key].level, atk * lead * typed * (form.atk || 1) * handicap, def * lead * (form.def || 1) * handicap)
	})
}

/** Nuzlocke: Pokémon that fainted in a battle are released. */
function releaseFainted(result) {
	if (!inChallenge(11) || !result.fainted) return
	for (const key of player.t.party.slice(0, result.fainted)) {
		delete player.t.box[key]
		pkLog(`${keyName(key)} fainted and was released.`, "lose", { id: speciesOf(key) }, colorOf(key))
	}
	player.t.party.splice(0, result.fainted)
}

// ---- Encounters ----

function currentZone() { return zoneById(player.f.zone) || regionZones()[0] }

function doEncounter(rng) {
	const zone = currentZone()
	const enc = rollEncounter(withSwarm(zone), badges(), rng, huntLure())
	const shiny = rollColor(rng, 1 / encounterShinyOdds(enc), 1 / encounterAlbinoOdds(enc))
	const look = makeLook(enc.form, shiny)
	dexSee(enc.id)
	player.f.encounters++
	eggStep()
	storyCallStep()
	mirageStep(rng)
	const team = partyBattlers()
	const result = battle(team, [battler(enc.id, enc.level)])
	const name = `${colorMark(shiny)}${formName(enc.id, enc.form)} (Lv. ${enc.level})`
	huntStep(enc, result.win)
	// Nuzlocke: only the first new species met on each route may be caught (shinies always can).
	const nuzlocke = inChallenge(11)
	const firstHere = nuzlocke && !player.t.nuzlocke[zone.id] && !ownsSpecies(enc.id)
	if (firstHere) player.t.nuzlocke[zone.id] = enc.id
	if (!result.win) {
		// Nuzlocke runs flee from battles they'd lose rather than lose the party.
		pkLog(nuzlocke ? `You fled from a wild ${name}.` : `A wild ${name} was too strong and got away.`, "lose", enc, shiny)
		return { ...enc, shiny, win: false }
	}
	player.f.wins++
	itemfinderFind(rng)
	missingnoCheck(zone, enc, rng)
	releaseFainted(result)
	const rp = researchYield(enc.id, enc.level) * wildRpMult()
	player.points = player.points.add(rp)
	const xp = xpYield(enc.id, enc.level) * xpMult()
	const fought = new Set(result.fought.map(i => player.t.party[i]))
	for (const id of [...player.t.party]) {
		if (fought.has(id)) giveXp(id, xp)
		else if (hasFieldUpgrade(14)) giveXp(id, xp / 2)
	}
	if (nuzlocke && !firstHere && !shiny) {
		pkLog(`Beat a wild ${name}.`, "win", enc, shiny)
		return { ...enc, shiny, win: true, caught: false, rp }
	}
	let caught = rand(rng) < catchChance(enc.id, catchMult() * speciesCatchMult(enc.id) * ballMult(enc), enc.form)
	// Silph Co.'s Master Ball: the next new Pokémon beaten is caught for sure.
	if (!caught && player.q?.masterBall && !player.d.caught[enc.id]) {
		caught = true
		player.q.masterBall = false
		pkLog(`You threw the Master Ball!`, "story", enc)
	}
	if (caught) {
		const wasCaught = !!player.d.caught[enc.id]
		const isNew = !wasCaught || (enc.form && !player.d.forms[`${enc.id}-${enc.form}`])
		addToBox(enc.id, enc.level, look)
		// New Unown letters after the first Unown go to the log without a popup each.
		const quiet = !!enc.form && !!FORMS[enc.form]?.suffix && !!wasCaught
		pkLog(`Caught ${name}!${isNew ? " New in the Pokédex!" : ""}`, isNew || shiny ? "new" : "catch", enc, shiny, quiet && !shiny)
	} else {
		pkLog(`Beat a wild ${name}, but it broke free.`, "win", enc, shiny)
	}
	return { ...enc, shiny, win: true, caught, rp }
}

const MAX_ENCOUNTERS_PER_TICK = 200
const MAX_BACKLOG = 50000

/** Advances searching by `diff` seconds. Returns the number of encounters. */
function searchTick(diff, rng) {
	if (!player.t.starter || !player.f.searching) return 0
	player.f.progress += diff / searchTime()
	let n = Math.floor(player.f.progress)
	if (n <= 0) return 0
	if (!hasFieldUpgrade(11)) {
		n = 1
		player.f.progress = 0
		player.f.searching = false
	} else {
		// Long ticks (offline progress) leave a backlog that's worked off a few hundred at a time.
		n = Math.min(n, MAX_ENCOUNTERS_PER_TICK)
		player.f.progress = Math.min(player.f.progress - n, MAX_BACKLOG)
	}
	for (let i = 0; i < n; i++) doEncounter(rng)
	return n
}

// ---- Trainers ----

function trainerBattlers(trainer, strength) {
	if (anyChallenge()) strength *= CHALLENGE_TRAINER_STRENGTH
	return trainer.team.map(([id, level]) => battler(id, level, strength, strength))
}
function nextGym() { return regionGyms()[badges()] || null }
function gymPrediction() {
	const gym = nextGym()
	if (!gym) return null
	return battle(partyBattlers(), trainerBattlers(gym, gymStrength()))
}
function canChallengeGym() {
	const p = gymPrediction()
	return !!p && p.win && surveyStatus().done && !gymStoryGate(badges())
}
/** Earning a badge: in a Nuzlocke, the Pokémon that fell in the Gym battle are released. */
function winGymBattle() {
	releaseFainted(gymPrediction())
	// Emerald's first double battle waits on Route 104, just after Roxanne.
	if (currentRegion() === "hoenn" && badges() === 0) unlockMechanic("doubleBattles", "Double battles! From now on your lead's partner (the next Pokémon in the party) fights beside it, in every region.")
	if (currentRegion() === "hoenn" && badges() === 2) unlockMechanic("contests", "Pokémon Contests! Verdanturf's Contest Hall opens the Contests node: raise your Pokémon's condition with Pokéblocks and win ribbons, in every region.")
}

// ---- Mechanics unlocked for good (player.h.mechanics) ----
// Double battles (Hoenn): the party member after the lead fights beside it for PARTNER_DAMAGE of
// its damage, and isn't attacked (the engine's partnerDamage). As in Idle Pokémon.
const PARTNER_DAMAGE = 0.5
function mechanicOn(id) { return !!player.h?.mechanics?.[id] }
function unlockMechanic(id, text) {
	if (!player.h || mechanicOn(id)) return
	player.h.mechanics = { ...player.h.mechanics, [id]: true }
	pkLog(text, "story")
}
partnerDamage = () => mechanicOn("doubleBattles") ? PARTNER_DAMAGE : 0

// ---- Pokémon Contests (the "n" node; Idle Pokémon's contests.ts) ----
// A mechanic unlocked in Hoenn with the Dynamo Badge (Verdanturf's Contest Hall) and kept for good:
// a Contest Hall in every region. A box Pokémon's condition in each category (raised with
// Pokéblocks, kept on its box entry) plus its type appeal and half its level is judged against each
// rank's field. Wins give a ribbon to the species (player.d.ribbons, kept for good: rank index per
// category), RP, and the first Master Rank win in a category gives that category's Cosplay Pikachu.
const CONTEST_CATEGORIES = {
	cool: { name: "Cool", color: "red", pikachu: "rockStar", types: ["fire", "electric", "dragon", "flying", "fighting"] },
	beauty: { name: "Beauty", color: "blue", pikachu: "belle", types: ["water", "ice", "psychic", "fairy"] },
	cute: { name: "Cute", color: "pink", pikachu: "popStar", types: ["normal", "grass", "bug", "fairy"] },
	smart: { name: "Smart", color: "green", pikachu: "phd", types: ["psychic", "ghost", "dark", "poison", "grass"] },
	tough: { name: "Tough", color: "yellow", pikachu: "libre", types: ["rock", "ground", "steel", "fighting", "poison"] },
}
const CONTEST_RANKS = [
	{ name: "Normal Rank", score: 40, seconds: 30, prize: 3 },
	{ name: "Super Rank", score: 75, seconds: 45, prize: 6 },
	{ name: "Hyper Rank", score: 110, seconds: 60, prize: 12 },
	{ name: "Master Rank", score: 145, seconds: 90, prize: 24 },
]
const MAX_CONDITION = 100
const POKEBLOCK_GAIN = 10
/** Ribbons held (every rank won counts), lifetime. */
const RIBBON_MILESTONES = [
	[5, "Pokéblocks raise a condition by +5 more."],
	[15, "Contests take half the time."],
	[30, "Contest Pass: the Contest Hall feeds Pokéblocks and enters contests on its own (a switch on the Contests tab)."],
	[60, "×1.25 Research Points."],
	[120, "+10% chance to win every contest."],
]
function contestsOpen() { return mechanicOn("contests") }
function ribbonMilestone(n) { return ribbonCount() >= n }
function ribbonCount() { return Object.values(player.d?.ribbons || {}).reduce((s, r) => s + Object.values(r).reduce((a, rank) => a + rank + 1, 0), 0) }
/** The rank (index) a species' ribbon in a category reached, or -1. */
function ribbonRank(id, cat) { return player.d.ribbons?.[id]?.[cat] ?? -1 }
function nextContestRank(id, cat) { const r = ribbonRank(id, cat) + 1; return r < CONTEST_RANKS.length ? r : null }
function pokeblockGain() { return POKEBLOCK_GAIN + (ribbonMilestone(5) ? 5 : 0) }
/** A Pokéblock costs a quarter of a Safari trip (it grows with the badges). */
function contestBlockCost() { return safariTripCost().div(4) }
function contestPrize(rank) { return contestBlockCost().times(CONTEST_RANKS[rank].prize).times(rpMult()) }
function contestSeconds(rank) { return CONTEST_RANKS[rank].seconds / (ribbonMilestone(15) ? 2 : 1) }
function conditionOf(key, cat) { return player.t.box[key]?.condition?.[cat] || 0 }
/** Type appeal: 30 when the first type suits the category, 15 for the second. */
function typeAppeal(id, cat) {
	const types = SPECIES[id].types, suits = CONTEST_CATEGORIES[cat].types
	return suits.includes(types[0]) ? 30 : types[1] && suits.includes(types[1]) ? 15 : 0
}
function contestScore(key, cat, condition = conditionOf(key, cat)) {
	return condition + typeAppeal(speciesOf(key), cat) + (player.t.box[key]?.level || 0) / 2
}
/** Even odds at the rank's score, sure 30 points above it. */
function contestWinChance(key, cat, rank, condition) {
	const bonus = ribbonMilestone(120) ? 0.1 : 0
	return Math.min(1, Math.max(0, 0.5 + (contestScore(key, cat, condition) - CONTEST_RANKS[rank].score) / 60 + bonus))
}
function canFeedPokeblock(key, cat) {
	return contestsOpen() && !!player.t.box[key] && conditionOf(key, cat) < MAX_CONDITION && player.points.gte(contestBlockCost())
}
function feedPokeblock(key, cat) {
	if (!canFeedPokeblock(key, cat)) return false
	player.points = player.points.sub(contestBlockCost())
	const entry = player.t.box[key]
	entry.condition = { ...entry.condition, [cat]: Math.min(MAX_CONDITION, conditionOf(key, cat) + pokeblockGain()) }
	return true
}
function contestRunning() { return !!player.n?.contest?.key }
function canEnterContest(key, cat) { return contestsOpen() && !contestRunning() && !!player.t.box[key] && nextContestRank(speciesOf(key), cat) !== null }
function enterContest(key, cat) {
	if (!canEnterContest(key, cat)) return false
	const rank = nextContestRank(speciesOf(key), cat)
	player.n.contest = { key, cat, rank, remaining: contestSeconds(rank) }
	return true
}
function contestHallName() { return currentRegion() === "hoenn" ? "Lilycove's Contest Hall" : `${region().name}'s Contest Hall` }
function judgeContest(rng = Math.random) {
	const { key, cat, rank } = player.n.contest
	player.n.contest = { key: "", cat: "", rank: 0, remaining: 0 }
	if (!player.t.box[key]) return
	const id = speciesOf(key), label = `${CONTEST_CATEGORIES[cat].name} Contest (${CONTEST_RANKS[rank].name})`
	player.n.entered++
	if (rng() >= contestWinChance(key, cat, rank)) { pkLog(`${keyName(key)} didn't win the ${label}.`, "info", { id, form: formOf(key) }, colorOf(key), true); return }
	player.n.won++
	const firstMaster = rank === 3 && !Object.values(player.d.ribbons || {}).some(r => r[cat] === 3)
	player.d.ribbons = { ...player.d.ribbons, [id]: { ...player.d.ribbons?.[id], [cat]: rank } }
	const prize = contestPrize(rank)
	player.points = player.points.add(prize)
	pkLog(`${keyName(key)} won the ${label}! A ribbon and ${format(prize)} RP.`, "contest", { id, form: formOf(key) }, colorOf(key))
	pkPopup("contest", `${keyName(key)} won the ${label}!`, "🎀 Ribbon!", 3, "#F85888")
	if (firstMaster) {
		const form = CONTEST_CATEGORIES[cat].pikachu
		addToBox(25, Math.max(5, Math.min(currentCap(), 30)), form)
		pkLog(`For your first ${CONTEST_CATEGORIES[cat].name} Master Rank win, the Contest Hall gives you ${formName(25, form)}!`, "catch", { id: 25, form })
		pkPopup("contest", `The Contest Hall gives you ${formName(25, form)}!`, "Cosplay Pikachu", 4, "#F85888")
	}
}
function contestTick(diff) {
	// Saves already past Wattson (or with Hoenn beaten) before contests existed.
	if (!contestsOpen() && player.h && ((currentRegion() === "hoenn" && badges() >= 3) || player.h.regionsBeaten?.hoenn)) unlockMechanic("contests", "Pokémon Contests! Verdanturf's Contest Hall opens the Contests node: raise your Pokémon's condition with Pokéblocks and win ribbons, in every region.")
	if (!contestsOpen() || !player.n) return
	if (contestRunning()) {
		player.n.contest.remaining -= diff
		if (player.n.contest.remaining <= 0) judgeContest()
	}
	if (!contestRunning() && ribbonMilestone(30) && player.n.auto) contestAutoEnter()
}
/**
 * The Contest Pass: the entry needing the fewest Pokéblocks to reach a 90% chance at its next rank,
 * if those blocks cost under a tenth of your RP; it's fed, then entered.
 */
function contestAutoEnter() {
	let best = null
	for (const key of Object.keys(player.t.box)) {
		for (const cat of Object.keys(CONTEST_CATEGORIES)) {
			const rank = nextContestRank(speciesOf(key), cat)
			if (rank === null) continue
			let cond = conditionOf(key, cat), blocks = 0
			while (contestWinChance(key, cat, rank, cond) < 0.9 && cond < MAX_CONDITION) { cond = Math.min(MAX_CONDITION, cond + pokeblockGain()); blocks++ }
			if (contestWinChance(key, cat, rank, cond) < 0.9) continue
			if (!best || blocks < best.blocks || (blocks === best.blocks && rank < best.rank)) best = { key, cat, rank, blocks }
		}
	}
	if (!best || contestBlockCost().times(best.blocks).times(10).gt(player.points)) return
	for (let i = 0; i < best.blocks; i++) feedPokeblock(best.key, best.cat)
	enterContest(best.key, best.cat)
}

function leagueTrainers() {
	const r = region()
	return [...r.eliteFour.map(t => ({ ...t, strength: r.eliteFourStrength })), { ...r.champion(), strength: r.championStrength }]
}
function leaguePrediction(k) {
	const t = leagueTrainers()[k]
	return battle(partyBattlers(), trainerBattlers(t, t.strength))
}
function canChallengeLeague(k) {
	return badges() >= allBadges() && !isChampion() && k < leagueTrainers().length && player.l.beaten === k && surveyStatus().done && !leagueStoryGate() && leaguePrediction(k).win
}
function challengeLeague(k) {
	if (!canChallengeLeague(k)) return false
	releaseFainted(leaguePrediction(k))
	player.l.beaten = k + 1
	const t = leagueTrainers()[k]
	if (k === leagueTrainers().length - 1) {
		player.l.champion = true
		player.l.team = player.t.party.map(key => [speciesOf(key), player.t.box[key].level, colorOf(key), formOf(key)])
		player.l.hallOfFame.push({ team: player.l.team, time: player.timePlayed })
		pkLog(`You beat ${t.name} and became the Pokémon League Champion!`, "league")
	} else pkLog(`${t.name} of the Elite Four is beaten!`, "league")
	return true
}

// ---- Gifts, trades and legendaries ----

/** Pokédollar prices become Research Points at this rate. */
const PRICE_TO_RP = 2

function specialCost(s) {
	if (isPrize(s)) return new Decimal(0)
	return new Decimal(s.price ? s.price * PRICE_TO_RP * (hofUpgrade(21) ? 0.25 : 1) * (inChallenge(43) ? 3 : 1) : 0)
}
function specialOpen(s) {
	if (s.region !== currentRegion()) return false
	if (s.anime && animeEntries(s.region) < s.hof) return false
	if (s.postGame && !isChampion()) return false
	return badges() >= s.badgesRequired
}
function legendaryPrediction(s) {
	return battle(partyBattlers(), [battler(s.species, s.level, s.strength, s.strength)])
}
/** Whether a special can be taken now, and why not. */
function specialStatus(s) {
	if (player.t.specials[s.id]) return { ok: false, why: "Done" }
	if (s.anime && animeEntries(s.region) < s.hof) return { ok: false, why: `${s.hof} ${s.region === "kanto" ? "" : `${REGIONS[s.region].name} `}Hall of Fame entr${s.hof > 1 ? "ies" : "y"}` }
	if (!specialOpen(s)) return { ok: false, why: s.postGame ? "After the League" : `${s.badgesRequired} badges` }
	if (s.keyItem && !hasKeyItem(s.keyItem, badges())) return { ok: false, why: `Needs the ${REGION_RULES.keyItems[s.keyItem]?.name || KEY_ITEM_NAMES[s.keyItem] || s.keyItem}` }
	if (specialStoryGate(s)) return { ok: false, why: `Clear ${specialStoryGate(s).name}` }
	if (dojoChoiceTaken(s)) return { ok: false, why: "You chose the other" }
	if (s.kind === "trade" && !ownsSpecies(s.wants)) return { ok: false, why: `Show a ${speciesName(s.wants)}` }
	if (s.kind === "legendary" && !legendaryPrediction(s).win) return { ok: false, why: "Too strong for now" }
	if (player.points.lt(specialCost(s))) return { ok: false, why: `${format(specialCost(s))} RP` }
	if (isPrize(s) && coins() < prizeCoins(s)) return { ok: false, why: `${formatCoins(prizeCoins(s))} coins` }
	return { ok: true }
}
function takeSpecial(s) {
	if (!specialStatus(s).ok) return false
	player.points = player.points.sub(specialCost(s))
	if (isPrize(s)) addCoins(-prizeCoins(s))
	player.t.specials[s.id] = true
	const shiny = s.shiny ? "shiny" : rollColor(Math.random, 1 / shinyOdds(), 1 / albinoOdds())
	addToBox(s.species, s.level, makeLook(s.form, shiny))
	const name = formName(s.species, s.form)
	pkLog(s.kind === "legendary" ? `You caught ${name}!` : `${name} joined you!`, "new", { id: s.species, form: s.form }, shiny)
	return true
}

// ---- Evolution items ----

/** Research Points for an evolution stone (₽2,100 in the games); trades are free. */
function itemEvolutionCost(e) { return new Decimal(e.method === "trade" && !e.item ? 0 : 2100 * PRICE_TO_RP) }
function canItemEvolve(key, e) {
	return !inChallenge(43) && !!player.t.box[key] && e.open && canEvolveInto(key, e.into) && player.points.gte(itemEvolutionCost(e))
}
function itemEvolve(key, into) {
	const e = itemEvolutions(speciesOf(key), badges()).find(e => e.into === Number(into))
	if (!e || !canItemEvolve(key, e)) return false
	player.points = player.points.sub(itemEvolutionCost(e))
	evolve(key, e.into)
	return true
}

/** What a Gym reset keeps of the field layer (badge milestones). */
function fieldKeptUpgrades() {
	const keep = hofEntries() >= 2 ? [11, 14] : []
	if (badges() >= 1 && !keep.includes(11)) keep.push(11)
	if (badges() >= 3) keep.push(12)
	return keep
}

// ---- Hall of Fame and challenges ----
// Becoming Champion lets you enter the Hall of Fame: a reset of the whole region (badges, Pokémon,
// gifts, the Pokédex) for Fame. Records of special looks, achievements and the Hall itself are kept.

const HOF_BUYABLES = {
	11: { title: "Professor's Grant", base: 5, growth: 1.6, text: "+25% Research Points per level." },
	12: { title: "Trainer School", base: 5, growth: 1.6, text: "+25% experience per level." },
	13: { title: "Champion's Might", base: 10, growth: 1.8, text: "+5% Attack and Defense for your Pokémon per level." },
	14: { title: "Quick Feet", base: 8, growth: 1.7, text: "Search 10% faster per level." },
	15: { title: "Ball Factory", base: 8, growth: 1.7, text: "+10% catch chance per level." },
}
const HOF_UPGRADES = {
	11: { title: "Head Start", cost: 15, text: "Start each run with 200 Research Points and your starter at Lv. 10." },
	12: { title: "Pathfinder", cost: 30, text: "Opening routes costs half as much." },
	13: { title: "Veteran Gear", cost: 60, text: "Badges keep half your Battle Gear levels." },
	14: { title: "Bigger Bag", cost: 40, text: "One more party slot (up to six)." },
	15: { title: "Shiny Charm", cost: 50, text: "Shiny Pokémon are twice as common." },
	21: { title: "Gift Box", cost: 25, text: "Gifts and Game Corner prizes cost a quarter as much." },
	22: { title: "Field Lab Grant", cost: 80, text: "Passive Research Points ×3." },
}

// Challenges: replay the region under a rule, become Champion and enter the Hall of Fame to beat it.
const CHALLENGES = {
	11: {
		name: "Nuzlocke",
		rules: "Only the first new species you meet on each route can be caught (shinies always can). Pokémon that faint are released. Your party flees from wild battles it would lose.",
		reward: "Fame ×1.25 for every Hall of Fame entry.",
	},
	12: {
		name: "Monotype",
		rules: "Only Pokémon sharing a type with your starter can join the party (their Attack ×2).",
		reward: "Pokémon sharing a type with your starter get +15% Attack.",
	},
	13: {
		name: "Lone Partner",
		rules: "Your party has one slot (that Pokémon's Attack and Defense are doubled).",
		reward: "Your lead Pokémon's Attack and Defense ×1.2.",
	},
	21: {
		name: "Light Pack",
		rules: "No Field Notebook, Quality Traps or Training Weights.",
		reward: "The Field Notebook, Quality Traps and Training Weights are 25% stronger.",
	},
	31: {
		name: "Shoestring Budget",
		rules: "Research Points ×0.25.",
		reward: "Auto-buy: Field equipment, routes, and the Day Care's and Safari Zone's buyables.",
	},
	32: {
		name: "Hatchling Run",
		rules: "Your Pokémon's Attack and Defense are halved, except Pokémon hatched from Eggs.",
		reward: "The Day Care Lady: keeps the Day Care laying Eggs of new species.",
	},
	33: {
		name: "Poacher's Net",
		rules: "Catch chance in the Field ×0.1, and your Pokémon fight at 60% strength, except those caught in the Safari Zone.",
		reward: "The Warden's Pass: free Safari trips that start on their own, with the best strategy for each Pokémon.",
	},
	41: {
		name: "Wanderer",
		rules: "You can't choose where to search: every 3 minutes the Field moves to a random open route of the area.",
		reward: "The Route Planner: the Field moves itself to routes with unseen species first, then ones your box is missing.",
	},
	42: {
		name: "Locked Party",
		rules: "Pokémon can join empty party slots but never leave the party.",
		reward: "The Team Coach: your party rebuilds itself for the next Gym, League or story battle.",
	},
	43: {
		name: "No Items",
		rules: "No evolution stones or trade evolutions; gifts and Game Corner prizes cost three times as much and the Field's equipment four times as much.",
		reward: "The Item Kit: evolution stones and trades are used, and gifts, trades and prizes taken, as soon as you can.",
	},
	51: {
		name: "Amnesia",
		rules: "Your Pokédex gives no Research Points over time and no milestones.",
		reward: "Professor's Notes: each run starts having seen every species your last run saw.",
	},
	52: {
		name: "Empty Nest",
		rules: "Eggs take three times as long to come and to hatch, and wild Pokémon give half the Research Points.",
		reward: "The Breeder's Journal: Eggs of species you've hatched in any run hatch after one battle.",
	},
	53: {
		name: "Plain Pokémon",
		rules: "Shiny Pokémon are four times rarer, and your Pokémon fight at 75% strength, except shiny ones.",
		reward: "Hunter's Instinct: shiny hunting targets your route's species with no shiny yet.",
	},
	22: {
		name: "Underleveled",
		rules: "Level caps are 5 lower.",
		reward: "Level caps are 2 higher.",
	},
}
const CHALLENGE_FAME = 2
const LONE_PARTNER_BOOST = 2
const MONOTYPE_BOOST = 2
/** Gym Leaders and the League go easier on challengers: without it, late Gyms wall most challenges for hours. */
const CHALLENGE_TRAINER_STRENGTH = 0.85

function hofEntries() { return player.h ? player.h.hall.length : 0 }
function hofUpgrade(id) { return !!player.h && player.h.upgrades.map(Number).includes(Number(id)) }
function hofBuyable(id) { return player.h ? new Decimal(player.h.buyables[id] ?? 0).toNumber() : 0 }
function hofBuyableCost(id, amount = hofBuyable(id)) {
	const b = HOF_BUYABLES[id]
	return new Decimal(b.base).times(Decimal.pow(b.growth, amount))
}
function inChallenge(id) { return !!player.h && Number(player.h.activeChallenge) === Number(id) }
function beatChallenge(id) { return !!player.h && (player.h.challenges[id] || 0) > 0 }
function anyChallenge() { return !!player.h && !!player.h.activeChallenge }

/** This run's Champion team members never enshrined before. */
function newFaces() {
	const team = player.l.team || []
	return [...new Set(team.map(([id]) => id))].filter(id => !player.h.enshrined[id])
}
function fameGain() {
	if (!isChampion()) return 0
	let fame = 20 + 5 * newFaces().length + Math.floor(caughtCount() / 10)
	if (anyChallenge()) fame *= CHALLENGE_FAME
	if (beatChallenge(11)) fame *= 1.25
	if (formMilestone(20)) fame *= 1.2
	if (storyMilestone(1000)) fame *= 1.1
	// A journey through Johto pays more, and beating Red on Mt. Silver more again.
	fame *= regionFame(currentRegion())
	if (chapterCleared("mtSilver")) fame *= 1.5
	fame *= Math.pow(VISIT_FAME, visitsCleared())
	return Math.floor(fame)
}
/** Records the run in the Hall of Fame and starts the Pokédex over (the rest of the reset is TMT's). */
function enterHallOfFame() {
	const team = player.l.team || []
	for (const [id] of team) player.h.enshrined[id] = true
	player.h.hall.push({ team, time: player.h.resetTime || 0, challenge: player.h.activeChallenge || null, region: currentRegion() })
	if (currentRegion() !== "kanto") player.h.regionsBeaten = { ...player.h.regionsBeaten, [currentRegion()]: true }
	resetRunPokedex()
}

function starterChoices() { return hofEntries() >= 3 ? [...STARTERS, 25, 133] : STARTERS }

// ---- The anime ----
// Kanto's anime places open with Hall of Fame entries (zone.hof, by badge tier), then with badges
// like the games' routes; Johto's count Johto's entries only. They aren't part of the Gym surveys.
// Their forms count in the Pokédex's Forms page, with milestones of their own.

/** Hall of Fame entries made as a region's Champion (entries from before regions count as Kanto's). */
function regionEntries(r) { return player.h ? player.h.hall.filter(e => (e.region || "kanto") === r).length : 0 }
function johtoEntries() { return regionEntries("johto") }
function hoennEntries() { return regionEntries("hoenn") }
/** The Hall of Fame entries that open a region's anime tiers (Kanto's count every entry; the rest their own). */
function animeEntries(region = currentRegion()) { return region === "kanto" ? hofEntries() : regionEntries(region) }
function animeOpen(zone) {
	if (animeEntries(zone.region) < zone.hof) return false
	return zone.postGame ? isChampion() : badges() >= zone.badges
}

/** Every form Kanto has: "id-form" keys from the anime places and events. */
const ALL_FORMS = [...new Set([
	...[...ZONES, ...JOHTO_ZONES, ...HOENN_ZONES, ...ORANGE_ZONES].flatMap(z => Object.values(z.pools).flat().filter(e => e[4]).map(e => `${e[0]}-${e[4]}`)),
	...[...SPECIALS, ...JOHTO_SPECIALS, ...HOENN_SPECIALS, ...ORANGE_SPECIALS].filter(s => s.form).map(s => `${s.species}-${s.form}`),
	...Object.values(CONTEST_CATEGORIES).map(c => `25-${c.pikachu}`),
])].sort((a, b) => parseInt(a) - parseInt(b))
function formsCaught() { return ALL_FORMS.filter(k => player.d.forms[k]).length }

const FORM_MILESTONES = [
	[3, "Research Points ×1.25."],
	[10, "+25% catch chance."],
	[20, "Fame ×1.2."],
	[ALL_FORMS.length, "Every form: experience ×1.5."],
]
function formMilestone(n) { return formsCaught() >= n }

// ---- The Day Care ----
// Route 5's Day Care (from 2 badges; from the start of a run once you've entered the Hall of
// Fame): two Pokémon train there over time, and a compatible pair (eggSpecies) lays Eggs that
// hatch after wild battles into their family's first stage. The Day Care's state ("c" layer) is
// per run; the species you've hatched (player.d.hatched) count for good.

const DAY_CARE_SLOTS = 2
const EGG_SECONDS = 180
const EGG_BATTLES = 60
const MAX_EGGS = 3
const DAY_CARE_UPGRADES = {
	11: { title: "Day Care Fees", cost: 300, text: "Pokémon in the Day Care gain experience three times as fast." },
	12: { title: "Oval Charm", cost: 1500, text: "Eggs come twice as often." },
	13: { title: "Flame Body Friend", cost: 5000, text: "Eggs hatch in half the wild battles." },
	14: { title: "Egg Basket", cost: 20000, text: "Carry two more Eggs." },
}

function dayCareOpen() { return badges() >= 2 || hofEntries() >= 1 }
function hasDayCareUpgrade(id) { return !!player.c && player.c.upgrades.map(Number).includes(Number(id)) }
function inDayCare(key) { return !!player.c && player.c.slots.includes(key) }

/** Experience per second for each Pokémon in the Day Care: grows with the level cap. */
function dayCareXpRate() {
	return 0.02 * Math.pow(currentCap(), 2.5) * xpMult() * (hasDayCareUpgrade(11) ? 3 : 1) * (1 + 0.5 * dayCareBuyable(11)) / pace()
}
function eggSeconds() { return EGG_SECONDS * pace() / (hasDayCareUpgrade(12) ? 2 : 1) / (1 + 0.15 * dayCareBuyable(12)) * (inChallenge(52) ? 3 : 1) }
function eggBattles() { return Math.max(1, Math.ceil(EGG_BATTLES / (hasDayCareUpgrade(13) ? 2 : 1) / (1 + 0.1 * dayCareBuyable(13)) * (inChallenge(52) ? 3 : 1))) }
/** The Breeder's Journal: Eggs of species hatched in any earlier run hatch after one battle. */
function eggBattlesFor(species) { return automationOn("journal") && player.d.everHatched?.[species] ? 1 : eggBattles() }
function maxEggs() { return MAX_EGGS + (hasDayCareUpgrade(14) ? 2 : 0) }

/** What the two Pokémon in the Day Care's Eggs hatch into (species ids), or null. */
function dayCareEggs() {
	const [a, b] = player.c.slots
	if (!a || !b || formOf(a) || formOf(b)) return null
	return eggSpecies(speciesOf(a), speciesOf(b))
}

function depositInDayCare(key) {
	if (!dayCareOpen() || !player.t.box[key] || inDayCare(key) || player.c.slots.length >= DAY_CARE_SLOTS) return false
	if (player.t.party.length === 1 && player.t.party[0] === key) return false
	if (player.t.party.includes(key) && !canLeaveParty(key)) return false
	player.t.party = player.t.party.filter(k => k !== key)
	player.c.slots.push(key)
	return true
}
function withdrawFromDayCare(key) {
	player.c.slots = player.c.slots.filter(k => k !== key)
	if (player.t.box[key] && player.t.party.length < partySize() && canJoinParty(key)) player.t.party.push(key)
}

/** Trains the Day Care's Pokémon (they don't evolve there) and lays Eggs. */
function dayCareTick(diff) {
	if (!player.c || !dayCareOpen()) return
	for (const key of player.c.slots) {
		const entry = player.t.box[key]
		if (entry) gainXp(entry, speciesOf(key), dayCareXpRate() * diff, currentCap())
	}
	if (!dayCareEggs() || player.c.eggs.length >= maxEggs()) { player.c.eggProgress = 0; return }
	player.c.eggProgress += diff / eggSeconds()
	while (player.c.eggProgress >= 1 && player.c.eggs.length < maxEggs()) {
		player.c.eggProgress -= 1
		const options = dayCareEggs()
		const shinyParent = player.c.slots.some(isShiny), albinoParent = player.c.slots.some(isAlbino)
		const species = options[Math.floor(rand() * options.length)]
		const battles = eggBattlesFor(species)
		player.c.eggs.push({ species, battles, total: battles, shinyBoost: shinyParent ? (hasHuntUpgrade(12) ? 4 : 2) : 1, albinoBoost: albinoParent ? (hasHuntUpgrade(12) ? 4 : 2) : 1 })
		pkLog("The Day Care couple left an Egg!", "egg")
	}
	if (player.c.eggs.length >= maxEggs()) player.c.eggProgress = 0
}

/** Every wild battle counts down the Eggs; hatched ones join the box at Lv. 5. */
function eggStep() {
	if (!player.c || !player.c.eggs.length) return
	for (const egg of player.c.eggs) egg.battles--
	for (const egg of player.c.eggs.filter(e => e.battles <= 0)) {
		const shiny = rollColor(Math.random, egg.shinyBoost / shinyOdds(), (egg.albinoBoost || 1) / albinoOdds())
		const isNew = !player.d.hatched[egg.species]
		player.d.hatched[egg.species] = (player.d.hatched[egg.species] || 0) + 1
		player.d.everHatched = { ...player.d.everHatched, [egg.species]: true }
		addToBox(egg.species, 5, shiny || "normal", "egg")
		pkLog(`Oh? The Egg hatched into ${colorMark(shiny)}${speciesName(egg.species)}!`, isNew || shiny ? "new" : "catch", { id: egg.species }, shiny)
	}
	player.c.eggs = player.c.eggs.filter(e => e.battles > 0)
}

/** Breeder's notes: each species ever hatched gives +2% Research Points. */
function hatchedSpecies() { return player.d.hatched ? Object.keys(player.d.hatched).length : 0 }

// ---- The Safari Zone ----
// Fuchsia's Safari Zone ("s" layer): buy a trip for Research Points and get Safari Balls. Its
// Pokémon come by on their own; there's no battle: throw Bait or a Rock first (or not), then
// balls until it's caught or it runs. Trips are per run; Safari catches (player.d.safari) count
// for good toward the Warden's milestones.

const SAFARI_BALLS = 30
/** A Safari Ball throw's catch rate before Bait/Rocks (the Field's catch upgrades don't apply). */
const SAFARI_CATCH = 0.55
const SAFARI_STRATEGIES = {
	balls: { name: "Just throw balls", catch: 1, flee: 1 },
	bait: { name: "Bait first", catch: 0.75, flee: 0.35, text: "It eats: much less likely to run, a little harder to catch. Best for fast, rare ones." },
	rock: { name: "Rock first", catch: 2, flee: 2.5, text: "It's angry: twice as easy to catch, far more likely to run. The most catches per trip, but fast, rare ones get away." },
}
const SAFARI_UPGRADES = {
	11: { title: "Extra Balls", cost: 20000, text: "15 more Safari Balls per trip." },
	12: { title: "Binoculars", cost: 60000, text: "Safari Pokémon turn up twice as often." },
	13: { title: "Safari Pass", cost: 150000, text: "A new trip starts on its own when the balls run out (if you can pay)." },
}
const WARDEN_MILESTONES = [
	[10, "5 more Safari Balls per trip."],
	[25, "Research Points ×1.2."],
	[50, "+10% catch chance everywhere."],
	[100, "Safari Pokémon turn up twice as often."],
]

/** Johto's National Park holds the Bug-Catching Contest instead (Park Balls, its own bugs). */
const BUG_CONTEST_ZONE = { id: "bugContest", name: "Bug-Catching Contest", region: "johto", badges: 2, blurb: "National Park's contest: Park Balls only, and the biggest bug wins.", pools: { walk: BUG_CONTEST } }
function inJohtoContest() { return currentRegion() === "johto" }
function safariZone() {
	if (inJohtoContest()) return BUG_CONTEST_ZONE
	if (currentRegion() !== "hoenn") return zoneById("safariZone")
	// Emerald's expansion (Areas 5 and 6) opens after the League.
	const zone = zoneById("hoennSafariZone"), extra = zoneById("safariZoneExpansion")
	if (!isChampion() || !extra) return zone
	const pools = { ...zone.pools }
	for (const p in extra.pools) pools[p] = [...(pools[p] || []), ...extra.pools[p]]
	return { ...zone, name: "Safari Zone (with Areas 5 and 6)", pools }
}
// Hoenn's Safari Zone has Pokéblock feeders: a block of one colour draws Pokémon whose types suit
// it (Idle Pokémon's contest categories), ×POKEBLOCK_DRAW as often. One feeder flavour per run.
const POKEBLOCK_DRAW = 3
const POKEBLOCKS = {
	red: { name: "Red Pokéblock", flavor: "Spicy", types: ["fire", "electric", "dragon", "flying", "fighting"] },
	blue: { name: "Blue Pokéblock", flavor: "Dry", types: ["water", "ice", "psychic"] },
	pink: { name: "Pink Pokéblock", flavor: "Sweet", types: ["normal", "grass", "bug"] },
	green: { name: "Green Pokéblock", flavor: "Bitter", types: ["psychic", "ghost", "dark", "poison", "grass"] },
	yellow: { name: "Yellow Pokéblock", flavor: "Sour", types: ["rock", "ground", "steel", "fighting", "poison"] },
}
function pokeblockOpen() { return currentRegion() === "hoenn" && safariOpen() }
function pokeblockCost() { return safariTripCost().times(3) }
function setPokeblock(color) {
	if (!pokeblockOpen() || !POKEBLOCKS[color] || player.s.pokeblock === color || player.points.lt(pokeblockCost())) return false
	player.points = player.points.sub(pokeblockCost())
	player.s.pokeblock = color
	return true
}
/** The Safari zone with the feeder's Pokéblock drawing its types (Hoenn only). */
function withPokeblock(zone) {
	const block = currentRegion() === "hoenn" && POKEBLOCKS[player.s?.pokeblock]
	if (!block) return zone
	const drawn = e => SPECIES[e[0]].types.some(t => block.types.includes(t))
	const pools = Object.fromEntries(Object.entries(zone.pools).map(([p, entries]) => [p, entries.map(e => drawn(e) ? [e[0], e[1] * POKEBLOCK_DRAW, ...e.slice(2)] : e)]))
	return { ...zone, pools }
}
function safariOpen() { return region().safari !== false && (hofEntries() >= 2 || badges() >= safariZone().badges) }
function hasSafariUpgrade(id) { return !!player.s && player.s.upgrades.map(Number).includes(Number(id)) }
function safariCaught() { return player.d.safari || 0 }
function wardenMilestone(n) { return safariCaught() >= n }

function safariTripCost() { return new Decimal(1000).times(Decimal.pow(2, badges())) }
function safariBallsPerTrip() { return SAFARI_BALLS + (hasSafariUpgrade(11) ? 15 : 0) + (wardenMilestone(10) ? 5 : 0) + 5 * safariBuyable(11) }
function safariTime() {
	return searchTime() * 2 / (hasSafariUpgrade(12) ? 2 : 1) / (wardenMilestone(100) ? 2 : 1) / (1 + 0.2 * safariBuyable(12))
}

function startSafariTrip() {
	const free = automationOn("safari")
	if (!safariOpen() || player.s.balls > 0 || (!free && player.points.lt(safariTripCost()))) return false
	if (!free) player.points = player.points.sub(safariTripCost())
	player.s.balls = safariBallsPerTrip()
	player.s.trips++
	return true
}

/** Chance a wild Pokémon runs after a turn: faster Pokémon run more. */
function safariFleeChance(id) { return Math.min(0.9, SPECIES[id].stats[5] / 300) }
/** Chance a Safari Ball catches it (rarer Pokémon are harder; Rocks help, Bait hurts). */
function safariCatchChance(id, strategy = SAFARI_STRATEGIES.balls) {
	return Math.min(1, Math.pow(SPECIES[id].catchRate / 255, 0.6) * SAFARI_CATCH * strategy.catch * (wardenMilestone(50) ? 1.1 : 1) * (1 + 0.08 * safariBuyable(13)))
}

/** One Safari encounter: a strategy's opening move, then balls until it's caught or runs. */
function safariEncounter(rng) {
	const enc = rollEncounter(withPokeblock(safariZone()), badges(), rng)
	const shiny = rollColor(rng, 1 / shinyOdds(), 1 / albinoOdds())
	const strategy = SAFARI_STRATEGIES[automationOn("safari") ? bestSafariStrategy(enc.id) : player.s.strategy] || SAFARI_STRATEGIES.balls
	const name = `${colorMark(shiny)}${speciesName(enc.id)} (Lv. ${enc.level})`
	dexSee(enc.id)
	const catchP = safariCatchChance(enc.id, strategy)
	const fleeP = Math.min(0.95, safariFleeChance(enc.id) * strategy.flee)
	// The opening Bait or Rock is a turn it might run on.
	if (strategy !== SAFARI_STRATEGIES.balls && rand(rng) < fleeP) {
		safariLog(`A wild ${name} ran away!`, "lose", enc, shiny)
		return
	}
	while (player.s.balls > 0) {
		player.s.balls--
		if (rand(rng) < catchP) {
			const isNew = !player.d.caught[enc.id]
			addToBox(enc.id, enc.level, shiny || "normal", "safari")
			player.d.safari = safariCaught() + 1
			safariLog(`Caught ${name}!${isNew ? " New in the Pokédex!" : ""}`, isNew || shiny ? "new" : "catch", enc, shiny)
			return
		}
		if (rand(rng) < fleeP) {
			safariLog(`A wild ${name} broke free and ran away!`, "lose", enc, shiny)
			return
		}
	}
	safariLog(`Out of Safari Balls: the ${name} got away.`, "lose", enc, shiny)
}

function safariLog(text, kind, enc, shiny) {
	player.s.log.unshift({ text, kind, id: enc.id, shiny: shiny || false })
	if (player.s.log.length > LOG_SIZE) player.s.log.length = LOG_SIZE
	// Only shiny catches pop up; new Pokédex entries go to the Field's log quietly.
	if (kind === "new") pkLog(`${inJohtoContest() ? "Bug Contest" : "Safari Zone"}: ${text}`, kind, enc, shiny, !shiny)
}

function safariTick(diff, rng) {
	if (!player.s || !safariOpen()) return
	if (player.s.balls <= 0) {
		if (hasSafariUpgrade(13) || automationOn("safari")) startSafariTrip()
		if (player.s.balls <= 0) { player.s.progress = 0; return }
	}
	player.s.progress += diff / safariTime()
	let n = Math.min(Math.floor(player.s.progress), MAX_ENCOUNTERS_PER_TICK)
	player.s.progress -= Math.floor(player.s.progress)
	for (let i = 0; i < n && player.s.balls > 0; i++) safariEncounter(rng)
	if (player.s.balls <= 0 && (hasSafariUpgrade(13) || automationOn("safari"))) startSafariTrip()
}

// ---- Day Care and Safari buyables (Research Points, bought again each run) ----

const DAY_CARE_BUYABLES = {
	11: { title: "Day Care Training", base: 500, growth: 1.8, text: "+50% Day Care experience per level." },
	12: { title: "Incubator", base: 1000, growth: 1.9, text: "Eggs come 15% faster per level." },
	13: { title: "Warm Blanket", base: 2000, growth: 1.9, text: "Eggs hatch in 10% fewer battles per level." },
}
const SAFARI_BUYABLES = {
	11: { title: "Ball Pouch", base: 5000, growth: 1.8, text: "+5 Safari Balls per trip per level." },
	12: { title: "Quiet Steps", base: 8000, growth: 1.9, text: "Safari Pokémon turn up 20% faster per level." },
	13: { title: "Safari Ball Polish", base: 12000, growth: 2, text: "+8% Safari catch chance per level." },
}
function dayCareBuyable(id) { return player.c ? new Decimal(player.c.buyables?.[id] ?? 0).toNumber() : 0 }
function safariBuyable(id) { return player.s ? new Decimal(player.s.buyables?.[id] ?? 0).toNumber() : 0 }
function buyableCost(def, amount) { return new Decimal(def.base).times(Decimal.pow(def.growth, amount)) }

// ---- Automations ----
// Rewards of the automation challenges (31-33), each with an on/off switch in player.h.auto.

const AUTOMATIONS = {
	buy: { challenge: 31, name: "Auto-buy", text: "Buys Field equipment and upgrades, opens routes, and buys the Day Care's, Safari Zone's, Game Corner's and shiny hunting's upgrades and buyables when you can afford them (cheapest first)." },
	eggs: { challenge: 32, name: "Day Care Lady", text: "Keeps the Day Care's pair laying Eggs, choosing pairs whose Eggs hatch into species you haven't hatched yet." },
	safari: { challenge: 33, name: "Warden's Pass", text: "Safari trips are free and start on their own, and each Pokémon gets the strategy most likely to catch it." },
	route: { challenge: 41, name: "Route Planner", text: "The Field moves itself to an open route with species you haven't seen, else one with Pokémon your box is missing." },
	coach: { challenge: 42, name: "Team Coach", text: "Your party rebuilds itself with the Pokémon that do best against the next Gym, League or story battle." },
	train: { challenge: 42, name: "Box Training", text: "With Team Coach and the Exp. Share, the party keeps only as many as it needs to win the next battle and fills the other slots with box Pokémon still waiting to evolve by level, so they catch up and evolve." },
	items: { challenge: 43, name: "Item Kit", text: "Evolution stones and trades are used, and gifts, trades, prizes and legendaries taken, as soon as you can." },
	notes: { challenge: 51, name: "Professor's Notes", text: "Each run starts having seen every species your last run saw, so surveys go faster." },
	journal: { challenge: 52, name: "Breeder's Journal", text: "Eggs of species you've hatched in any run hatch after one battle." },
	hunter: { challenge: 53, name: "Hunter's Instinct", text: "Shiny hunting targets a species on your route with no shiny yet." },
}
/** Hatchling Run and Poacher's Net weaken your Pokémon, except those hatched or caught in the Safari. */
function challengeHandicap(entry, key = "") {
	if (inChallenge(32) && entry.origin !== "egg") return 0.5
	if (inChallenge(33) && entry.origin !== "safari") return 0.6
	if (inChallenge(53) && !isShiny(key)) return 0.75
	return 1
}
/** What the active challenge says about this Pokémon: full strength, weakened, or barred. */
function challengeStatus(key) {
	const entry = player.t.box[key]
	if (!entry || !anyChallenge()) return null
	if (inChallenge(32)) return entry.origin === "egg" ? { ok: true, text: "🥚 Hatched: full strength" } : { ok: false, text: "Not hatched: half strength" }
	if (inChallenge(33)) return entry.origin === "safari" ? { ok: true, text: "Safari catch: full strength" } : { ok: false, text: "Not from the Safari: 60% strength" }
	if (inChallenge(53)) return isShiny(key) ? { ok: true, text: "★ Shiny: full strength" } : { ok: false, text: "Not shiny: 75% strength" }
	if (inChallenge(12)) return sharesStarterType(key) ? { ok: true, text: "Shares your starter's type: Attack ×2" } : { ok: false, text: "Can't join the party (Monotype)" }
	return null
}
function automationUnlocked(id) { return beatChallenge(AUTOMATIONS[id].challenge) }
function automationOn(id) { return automationUnlocked(id) && player.h.auto?.[id] !== false }
function toggleAutomation(id) {
	if (!player.h.auto) player.h.auto = {}
	player.h.auto[id] = !automationOn(id)
}

/** Auto-buy: everything affordable (equipment, buyables and one-time upgrades), cheapest first, a few per tick. */
function autoBuyTick() {
	if (!automationOn("buy")) return
	// One-time upgrades bought with Research Points: [layer, definitions, open?].
	const upgradeSets = [["f", FIELD_UPGRADES, true], ["c", DAY_CARE_UPGRADES, dayCareOpen()], ["s", SAFARI_UPGRADES, safariOpen()], ["y", HUNT_UPGRADES, huntOpen()]]
	for (let guard = 0; guard < 10; guard++) {
		const options = []
		const next = nextFrontierZone()
		if (next) options.push([next.cost, () => unlockNextZone()])
		for (const [layer, defs, open] of upgradeSets) {
			if (!open || !player[layer]) continue
			for (const id in defs) {
				const owned = player[layer].upgrades.map(Number).includes(Number(id))
				if (owned || (defs[id].badges !== undefined && badges() < defs[id].badges)) continue
				const cost = new Decimal(defs[id].cost)
				options.push([cost, () => {
					player.points = player.points.sub(cost)
					player[layer].upgrades.push(Number(id))
					// The Auto-Search Drone gets to work at once.
					if (layer === "f" && Number(id) === 11) player.f.searching = true
				}])
			}
		}
		for (const id in FIELD_BUYABLES) {
			if (badges() < FIELD_BUYABLES[id].badges || !fieldBuyableAllowed(id)) continue
			const cost = fieldBuyableCost(id)
			options.push([cost, () => { player.points = player.points.sub(cost); player.f.buyables[id] = new Decimal(fieldBuyable(id) + 1) }])
		}
		if (dayCareOpen()) for (const id in DAY_CARE_BUYABLES) {
			const cost = buyableCost(DAY_CARE_BUYABLES[id], dayCareBuyable(id))
			options.push([cost, () => { player.points = player.points.sub(cost); player.c.buyables[id] = new Decimal(dayCareBuyable(id) + 1) }])
		}
		if (safariOpen()) for (const id in SAFARI_BUYABLES) {
			const cost = buyableCost(SAFARI_BUYABLES[id], safariBuyable(id))
			options.push([cost, () => { player.points = player.points.sub(cost); player.s.buyables[id] = new Decimal(safariBuyable(id) + 1) }])
		}
		if (huntOpen()) for (const id in HUNT_BUYABLES) {
			const cost = buyableCost(HUNT_BUYABLES[id], huntBuyable(id))
			options.push([cost, () => { player.points = player.points.sub(cost); player.y.buyables[id] = new Decimal(huntBuyable(id) + 1) }])
		}
		options.sort((a, b) => a[0].cmp(b[0]))
		if (options.length && player.points.gte(options[0][0])) { options[0][1](); continue }
		// The prize counter's buyables and the Game Corner's upgrades cost coins.
		if (!gameCornerOpen()) return
		const coinOptions = [
			...Object.keys(GAME_CORNER_BUYABLES).map(id => [buyableCost(GAME_CORNER_BUYABLES[id], gameCornerBuyable(id)).toNumber(), () => { player.k.buyables[id] = new Decimal(gameCornerBuyable(id) + 1) }]),
			...Object.keys(GAME_CORNER_UPGRADES).filter(id => !hasGameCornerUpgrade(id)).map(id => [GAME_CORNER_UPGRADES[id].cost, () => player.k.upgrades.push(Number(id))]),
		].sort((a, b) => a[0] - b[0])
		if (!coinOptions.length || coins() < coinOptions[0][0]) return
		const [cost, buy] = coinOptions[0]
		addCoins(-cost)
		buy()
	}
}

/**
 * The Day Care Lady: when the Day Care isn't laying Eggs of a new species, she swaps in the box
 * pair (outside the party) whose Eggs hatch into a species not yet hatched, else any laying pair.
 */
function autoEggsTick() {
	if (!automationOn("eggs") || !dayCareOpen()) return
	const current = dayCareEggs()
	if (current && current.some(id => !player.d.hatched[id])) return
	const keys = Object.keys(player.t.box).filter(k => !player.t.party.includes(k) && !formOf(k))
	let best = null
	for (let i = 0; i < keys.length && !(best && best.fresh); i++) for (let j = i + 1; j < keys.length; j++) {
		const eggs = eggSpecies(speciesOf(keys[i]), speciesOf(keys[j]))
		if (!eggs) continue
		const fresh = eggs.some(id => !player.d.hatched[id])
		if (!best || (fresh && !best.fresh)) best = { pair: [keys[i], keys[j]], fresh }
		if (fresh) break
	}
	if (!best || (current && !best.fresh)) return
	for (const k of [...player.c.slots]) withdrawFromDayCare(k)
	for (const k of best.pair) { player.t.party = player.t.party.filter(p => p !== k); player.c.slots.push(k) }
}

/** The Warden's Pass: the strategy with the best chance of catching this Pokémon. */
function bestSafariStrategy(id) {
	let best = "balls", bestP = -1
	for (const [k, st] of Object.entries(SAFARI_STRATEGIES)) {
		const p = safariCatchChance(id, st), f = Math.min(0.95, safariFleeChance(id) * st.flee)
		const success = (k === "balls" ? 1 : 1 - f) * p / (p + (1 - p) * f)
		if (success > bestP) { bestP = success; best = k }
	}
	return best
}

// ---- The Celadon Game Corner ----
// The "k" layer: coins (player.k.points), bought with Research Points or won at the slots, buy
// the prize Pokémon and the prize counter's buyables. Kept through badges, reset by the Hall of
// Fame like the Day Care. Jackpots (player.d.jackpots) count for good toward its milestones.

/** Research Points per coin (₽20 a coin in the games, at PRICE_TO_RP, a little cheaper). */
const COIN_RP = 20
/** The prize counter's coin prices (Red/Blue's). */
const PRIZE_COINS = { goldenrodGameCorner63: 200, goldenrodGameCorner23: 700, goldenrodGameCorner27: 700, goldenrodGameCorner147: 2100, gameCorner63: 180, gameCorner35: 500, gameCorner30: 1200, gameCorner147: 2800, gameCorner123: 5500, gameCorner127: 5500, gameCorner137: 9999 }
const SPIN_SECONDS = 3
const BASE_BET = 3
/** Slot results as [name, chance, payout in bets]: 0.9 of the bet back on average before upgrades. */
const SLOT_RESULTS = [
	["7 7 7", 0.002, 100],
	["BAR BAR BAR", 0.005, 30],
	["Pikachu ×3", 0.02, 8],
	["Magnemite ×3", 0.015, 5],
	["Shellder ×3", 0.015, 5],
	["Cherries", 0.12, 2],
]
const GAME_CORNER_UPGRADES = {
	11: { title: "Lucky Machine", cost: 300, text: "The slots pay 25% more (more than you bet, on average)." },
	12: { title: "Coin Case", cost: 1000, text: "The slots spin twice as fast." },
	13: { title: "Itemfinder", cost: 600, text: "Wild battles sometimes turn up coins someone dropped." },
}
const GAME_CORNER_BUYABLES = {
	11: { title: "High Roller", base: 200, growth: 3, text: "Bet twice as many coins per spin per level." },
	12: { title: "Amulet Coin", base: 400, growth: 2.2, text: "+10% Research Points per level." },
	13: { title: "Lucky Egg", base: 400, growth: 2.2, text: "+10% experience per level." },
}
const JACKPOT_MILESTONES = [
	[1, "Coins cost 20% fewer Research Points."],
	[5, "Research Points ×1.1."],
	[15, "The slots pay 10% more."],
	[30, "Start every run with 500 coins."],
]

function gameCornerOpen() { return badges() >= (currentRegion() === "johto" ? 2 : 3) || hofEntries() >= 3 }
function hasGameCornerUpgrade(id) { return !!player.k && player.k.upgrades.map(Number).includes(Number(id)) }
function gameCornerBuyable(id) { return player.k ? new Decimal(player.k.buyables?.[id] ?? 0).toNumber() : 0 }
function coins() { return player.k ? new Decimal(player.k.points).toNumber() : 0 }
function addCoins(n) { player.k.points = new Decimal(player.k.points).add(n) }
function jackpots() { return player.d.jackpots || 0 }
function jackpotMilestone(n) { return jackpots() >= n }
function startingCoins() { return jackpotMilestone(30) ? 500 : 0 }

function coinRp() { return COIN_RP * (jackpotMilestone(1) ? 0.8 : 1) * (hofUpgrade(21) ? 0.25 : 1) }
function coinsCost(n) { return new Decimal(n * coinRp()) }
function buyCoins(n) {
	if (!gameCornerOpen() || player.points.lt(coinsCost(n))) return false
	player.points = player.points.sub(coinsCost(n))
	addCoins(n)
	return true
}

function isPrize(s) { return s.id in PRIZE_COINS }
function prizeCoins(s) { return Math.ceil(PRIZE_COINS[s.id] * (hofUpgrade(21) ? 0.25 : 1) * (inChallenge(43) ? 3 : 1)) }

function slotPayoutMult() { return (hasGameCornerUpgrade(11) ? 1.25 : 1) * (jackpotMilestone(15) ? 1.1 : 1) }
function spinTime() { return SPIN_SECONDS / (hasGameCornerUpgrade(12) ? 2 : 1) }
function slotBet() { return BASE_BET * Math.pow(2, gameCornerBuyable(11)) }
/** Coins back per coin bet, on average. */
function slotReturn() { return SLOT_RESULTS.reduce((s, [, p, pay]) => s + p * pay, 0) * slotPayoutMult() }

/** One spin of the slots: the bet (or what's left of it), then a result. */
function spinSlots(rng) {
	const bet = Math.min(slotBet(), Math.floor(coins()))
	if (bet < BASE_BET) return null
	addCoins(-bet)
	let r = rand(rng)
	for (const [name, p, pay] of SLOT_RESULTS) {
		if (r < p) {
			const won = Math.floor(bet * pay * slotPayoutMult())
			addCoins(won)
			if (name === "7 7 7") {
				player.d.jackpots = jackpots() + 1
				pkLog(`Game Corner: JACKPOT! 7 7 7 paid ${formatCoins(won)} coins.`, "jackpot")
			}
			return { name, bet, won }
		}
		r -= p
	}
	return { name: null, bet, won: 0 }
}
function formatCoins(n) { return Math.floor(n).toLocaleString("en-US") }

function gameCornerTick(diff, rng) {
	if (!player.k || !gameCornerOpen() || !player.k.spinning) return
	player.k.spinProgress = (player.k.spinProgress || 0) + diff / spinTime()
	const n = Math.min(Math.floor(player.k.spinProgress), MAX_ENCOUNTERS_PER_TICK)
	player.k.spinProgress -= Math.floor(player.k.spinProgress)
	for (let i = 0; i < n; i++) {
		const result = spinSlots(rng)
		if (!result) { player.k.spinning = false; player.k.spinProgress = 0; return }
		if (result.won > 0) player.k.last = `${result.name}: won ${formatCoins(result.won)} coins`
		else player.k.last = `No luck (bet ${formatCoins(result.bet)})`
	}
}

/** The Itemfinder: a wild battle won turns up coins 5% of the time (more after more badges). */
function itemfinderFind(rng) {
	if (!hasGameCornerUpgrade(13) || !gameCornerOpen() || rand(rng) >= 0.05) return
	addCoins(Math.ceil(rand(rng) * 10 * (badges() + 1)))
}

// ---- Shiny hunting ----
// The "y" layer: choose a target species; every time you beat it in the wild the chain grows, and
// a longer chain makes that species' shinies more common (like the Poké Radar or Let's Go's combos).
// Losing to it breaks the chain. Shiny species caught (player.d.shiny) count for good.

/** Chain length for each extra ×1 on the target's shiny odds. */
const CHAIN_STEP = 10
const HUNT_UPGRADES = {
	11: { title: "Poké Radar", cost: 50000, text: "Chains can reach ×8 shiny odds (up from ×4)." },
	12: { title: "Masuda's Notes", cost: 30000, text: "A shiny parent in the Day Care makes shiny Eggs four times as likely (up from twice)." },
	13: { title: "Steady Nerves", cost: 80000, text: "Losing to your target no longer breaks the chain." },
	14: { title: "Pale Charm", cost: 60000, text: "Albino Pokémon twice as common everywhere." },
}
const HUNT_BUYABLES = {
	11: { title: "Lure", base: 2000, growth: 1.8, text: "Your target turns up 50% more often per level (where it lives)." },
	12: { title: "Radar Battery", base: 3000, growth: 1.9, text: "Each target beaten adds 25% more to the chain per level." },
	13: { title: "Shiny Lens", base: 10000, growth: 2.2, text: "Shiny Pokémon 10% more common everywhere per level." },
	14: { title: "Snow Lens", base: 10000, growth: 2.2, text: "Albino Pokémon 10% more common everywhere per level." },
}
const SHINY_MILESTONES = [
	[1, "Shiny hunting opens from the start of every run."],
	[5, "A new target's chain starts at 10."],
	[10, "Shiny Pokémon twice as common everywhere."],
	[25, "Shiny Pokémon in your party fight 25% stronger."],
]

// Albino Pokémon (the owner's idea): the same base odds as shinies, lowered by their own charm,
// lens, milestones and chains (the Hunt tab's colour switch). Melanistic: shiny and albino at once.
const ALBINO_MILESTONES = [
	[3, "Albino Pokémon twice as common everywhere."],
	[10, "Albino Pokémon in your party fight 25% stronger."],
	[25, "+25% experience."],
]
function albinoSpecies() { return Object.keys(player.d?.albino || {}).length }
function melanisticSpecies() { return Object.keys(player.d?.melanistic || {}).length }
function albinoMilestone(n) { return albinoSpecies() >= n }
function albinoOdds() {
	let odds = BASE_SHINY_ODDS
	if (hasHuntUpgrade(14)) odds /= 2
	if (albinoMilestone(3)) odds /= 2
	odds /= 1 + 0.1 * huntBuyable(14)
	return odds
}
/** What the hunting chain raises: the target's shiny odds or its albino odds. */
function huntMode() { return player.y?.mode === "albino" ? "albino" : "shiny" }
function setHuntMode(mode) { if (player.y) player.y.mode = mode }
function huntRecords() { return huntMode() === "albino" ? player.d.albino || {} : player.d.shiny }
function shinySpecies() { return player.d ? Object.keys(player.d.shiny).length : 0 }
function shinyMilestone(n) { return shinySpecies() >= n }
function huntOpen() { return shinyMilestone(1) || badges() >= 4 || hofEntries() >= 4 }
function hasHuntUpgrade(id) { return !!player.y && player.y.upgrades.map(Number).includes(Number(id)) }
function huntBuyable(id) { return player.y ? new Decimal(player.y.buyables?.[id] ?? 0).toNumber() : 0 }
function huntTarget() { return player.y && huntOpen() ? Number(player.y.target) || 0 : 0 }
function chainCap() { return hasHuntUpgrade(11) ? 8 : 4 }
/** The chain's multiplier on the target's shiny odds: ×1, +1 every CHAIN_STEP, up to the cap. */
function chainBonus() { return Math.min(chainCap(), 1 + (player.y?.chain || 0) / CHAIN_STEP) }

function setHuntTarget(id) {
	if (!player.y || Number(id) === huntTarget()) return
	player.y.target = Number(id)
	player.y.chain = shinyMilestone(5) ? 10 : 0
}
function huntLure() {
	const id = huntTarget()
	return id && huntBuyable(11) ? { id, mult: 1 + 0.5 * huntBuyable(11) } : null
}
function chainedTarget(enc) { return enc.id === huntTarget() && !enc.form }
function encounterShinyOdds(enc) {
	return shinyOdds() / (chainedTarget(enc) && huntMode() === "shiny" ? chainBonus() : 1)
}
function encounterAlbinoOdds(enc) {
	return albinoOdds() / (chainedTarget(enc) && huntMode() === "albino" ? chainBonus() : 1)
}
/** After a wild battle: beating the target grows the chain, losing to it breaks it. */
function huntStep(enc, win) {
	if (!huntTarget() || enc.id !== huntTarget() || enc.form) return
	if (win) {
		player.y.chain += 1 + 0.25 * huntBuyable(12)
		player.d.bestChain = Math.max(player.d.bestChain || 0, Math.floor(player.y.chain))
	} else if (!hasHuntUpgrade(13)) {
		if (player.y.chain >= CHAIN_STEP) pkLog(`The ${speciesName(enc.id)} chain broke at ${Math.floor(player.y.chain)}.`, "lose", enc)
		player.y.chain = 0
	}
}

// ---- Kanto's story: Team Rocket, the rival, the S.S. Anne and the Fighting Dojo ----
// Each chapter is a place with trainers fought in order (player.q.progress[chapter], the Story
// node). A cleared chapter gives its reward and can open a Gym (`gate`, the badge index it gates).
// `arc` sorts it onto the Rivals, Villains or Challengers tab (rival-only chapters are rivals'; set
// below). Kept through badges, reset by the Hall of Fame.
// Giovanni's teams follow FireRed/LeafGreen and the rival's their structure; Grunts', Scientists'
// and gauntlet trainers' teams are close to the games' (Idle Pokémon has no data for them).

/** The rival takes the starter strong against yours, plus the two that cover his weaknesses. */
const RIVAL_LINES = { 1: [4, 5, 6], 4: [7, 8, 9], 7: [1, 2, 3], 25: [133, 133, 135], 133: [25, 25, 26] }
const RIVAL_EXTRAS = { 4: [[129, 130, 130], [102, 102, 103]], 7: [[58, 58, 59], [102, 102, 103]], 1: [[58, 58, 59], [129, 130, 130]] }
function rivalLine() { return RIVAL_LINES[player.t.starter] || RIVAL_LINES[1] }
function rivalExtras() { return RIVAL_EXTRAS[rivalLine()[0]] || RIVAL_EXTRAS[1] }
/** A rival team at story stage `s` (0-2 for the evolution stage). */
function rivalTeam(stage) {
	const [s0, s1, s2] = rivalLine(), [[a0, a1, a2], [b0, b1, b2]] = rivalExtras()
	return [
		[[s0, 5]],
		[[16, 9], [s0, 8]],
		[[16, 17], [63, 16], [19, 15], [s0, 18]],
		[[17, 19], [20, 16], [64, 18], [s1, 20]],
		[[17, 25], [a0 === 129 ? 130 : a1, 23], [64, 20], [b1, 22], [s1, 25]],
		[[18, 37], [a2, 38], [65, 35], [b2, 35], [s2, 40]],
		[[18, 47], [111, 45], [a2, 45], [b2, 47], [65, 47], [s2, 53]],
	][stage]
}
const RIVAL = stage => ({ name: "Rival Blue", rival: true, team: () => rivalTeam(stage), quote: "Smell ya later!" })
const GRUNT = (team, extra = {}) => ({ name: "Team Rocket Grunt", rocket: true, team, ...extra })
const JESSIE_JAMES = team => ({ name: "Jessie & James", rocket: true, team, quote: "Prepare for trouble... and make it double!" })

// Johto: Silver takes the starter strong against yours (Elm's), like Blue; his other Pokémon follow
// HeartGold/SoulSilver. Team Rocket's Executives' teams are HGSS's, the rest close to the games'.
const SILVER_LINES = { 152: [155, 156, 157], 155: [158, 159, 160], 158: [152, 153, 154] }
function silverTeam(stage) {
	const [s0, s1, s2] = SILVER_LINES[player.t.johtoStarter] || SILVER_LINES[152]
	return [
		[[s0, 5]],
		[[92, 12], [41, 14], [s1, 16]],
		[[92, 20], [41, 20], [81, 18], [s1, 22]],
		[[42, 30], [81, 28], [93, 30], [215, 32], [s2, 32]],
		[[215, 36], [42, 38], [82, 37], [94, 39], [65, 37], [s2, 40]],
	][stage]
}
const SILVER = stage => ({ name: "Rival Silver", rival: true, team: () => silverTeam(stage), quote: "...Hmph. Weaklings like you shouldn't have Pokémon." })
const EXECUTIVE = (name, team, quote) => ({ name: `Executive ${name}`, rocket: true, team, quote })

// Hoenn (Emerald): May's starter answers yours (strong against it), with a partner line that covers
// her weak spot; Wally; Team Aqua and Team Magma (both, as in Emerald). Teams are close to Emerald's.
const MAY_LINES = { 252: [255, 256, 257], 255: [258, 259, 260], 258: [252, 253, 254] }
const MAY_PARTNERS = { 255: [270, 271, 272], 258: [285, 285, 286], 252: [322, 322, 323] }
function mayTeam(stage) {
	const [s0, s1, s2] = MAY_LINES[player.t.starter] || MAY_LINES[252]
	const [p0, p1, p2] = MAY_PARTNERS[s0]
	return [
		[[s0, 5]],
		[[p0, 13], [s0, 15]],
		[[278, 18], [p1, 18], [s1, 20]],
		[[279, 29], [p1, 29], [s1, 31]],
		[[357, 31], [279, 32], [p2, 32], [s2, 34]],
	][stage]
}
const MAY = stage => ({ name: "Rival May", rival: true, team: () => mayTeam(stage), quote: "I'm going to be a Trainer like my dad, Professor Birch!" })
const AQUA = (team, extra = {}) => ({ name: "Team Aqua Grunt", rocket: true, team, ...extra })
const MAGMA = (team, extra = {}) => ({ name: "Team Magma Grunt", rocket: true, team, ...extra })
// ---- Post-game visits (Hoenn's Champion; the pattern for later regions) ----
// After a journey's League, earlier regions' routes open on the Field's map (their games' tables,
// not the anime places or their own post-games), and each region's Elite Four and Champion wait as
// a Story chapter. Every visit cleared multiplies this journey's Fame by VISIT_FAME. VISITS says
// where each journey's Champion can go, and how strong that region's League is then (null: its
// routes only, like Kanto in Johto's post-game, whose Leaders are KANTO_GYM_CHAPTERS).
const VISIT_FAME = 1.3
/** Kanto's Champion answers the Hoenn starter's type like the rival answers Oak's (Treecko → Charizard). */
const VISIT_KANTO_CHAMPION = { 252: 1, 255: 4, 258: 7 }
const REVISITS = {
	kanto: { name: "Kanto", place: "Indigo Plateau", chapter: "visitKanto", closed: ["safariZone"], via: "by ferry to Vermilion",
		trainers: [...ELITE_FOUR.map(t => ({ name: t.name, team: t.team })), { name: "Blue", team: () => (CHAMPIONS[VISIT_KANTO_CHAMPION[player.t.starter]] || CHAMPIONS[1]).team, quote: "Smell ya later... Hoenn's Champion, huh?" }] },
	johto: { name: "Johto", place: "Johto's Pokémon League", chapter: "visitJohto", closed: [], via: "by the S.S. Aqua to Olivine",
		trainers: [...JOHTO_ELITE_FOUR, JOHTO_CHAMPION].map(t => ({ name: t.name, team: t.team })) },
}
const VISITS = {
	johto: { kanto: null },
	orange: { kanto: 11 },
	hoenn: { kanto: 22, johto: 26 },
}
/** A visit's Story chapter: Hoenn's keep their first ids ("visitKanto"); later hosts prefix theirs. */
function visitChapterId(host, r) { return host === "hoenn" ? REVISITS[r].chapter : `${host}${REVISITS[r].chapter[0].toUpperCase()}${REVISITS[r].chapter.slice(1)}` }
function visitChapters(host = currentRegion()) { return Object.entries(VISITS[host] || {}).filter(([, strength]) => strength).map(([r]) => visitChapterId(host, r)) }
/** The earlier regions open to this journey's Champion: Kanto in Johto's post-game, Kanto and Johto in Hoenn's. */
function revisitRegions() { return isChampion() ? Object.keys(VISITS[currentRegion()] || {}) : [] }
function visitsCleared() { return visitChapters().filter(chapterCleared).length }
/** The journey's last battles before its Hall of Fame entry: Red in Johto, the visits elsewhere. */
function journeyFinaleLeft() {
	if (!isChampion()) return []
	if (currentRegion() === "johto") return chapterCleared("mtSilver") ? [] : ["mtSilver"]
	return visitChapters().filter(id => !chapterCleared(id))
}

const HOENN_CHAPTERS = [
	// Rivals: May and Wally.
	{ id: "route103May", region: "hoenn", name: "Route 103", badges: 0, strength: 1.9, trainers: [MAY(0)], reward: "May's first battle: Research Points." },
	{ id: "rustboroMay", region: "hoenn", name: "Rustboro City", badges: 1, strength: 3.8, trainers: [MAY(1)], reward: "Research Points." },
	{ id: "route110May", region: "hoenn", name: "Route 110", badges: 2, strength: 5.8, trainers: [MAY(2)], reward: "Research Points." },
	{ id: "mauvilleWally", region: "hoenn", name: "Mauville City", badges: 2, strength: 4.8, trainers: [{ name: "Wally", rival: true, team: [[280, 16]], quote: "I want to be strong enough to travel with my Pokémon!" }], reward: "Wally heads off on a journey of his own." },
	{ id: "route119May", region: "hoenn", name: "Route 119", badges: 5, strength: 8.8, trainers: [MAY(3)], reward: "Research Points." },
	{ id: "lilycoveMay", region: "hoenn", name: "Lilycove City", badges: 6, strength: 9.5, trainers: [MAY(4)], reward: "Research Points." },
	{ id: "victoryRoadWally", region: "hoenn", name: "Victory Road", badges: 8, strength: 14.4, gateLeague: true, reward: "Wally, stronger than ever, steps aside: the Pokémon League opens.",
		trainers: [{ name: "Wally", rival: true, team: [[334, 44], [301, 43], [315, 44], [82, 41], [282, 45]], quote: "I've been waiting for you. I'll show you how strong I've become!" }] },
	// Team Aqua and Team Magma.
	{ id: "petalburgWoods", arc: "villain", region: "hoenn", name: "Petalburg Woods", badges: 0, strength: 2.9, gate: 0, reward: "You save the Devon researcher's papers: Roxanne's Gym opens.",
		trainers: [AQUA([[261, 9]], { quote: "Hand over those papers!" })] },
	{ id: "rusturfTunnel", arc: "villain", region: "hoenn", name: "Rusturf Tunnel", badges: 1, strength: 4.5, gate: 1, reward: "The Devon Goods are back: Mr. Briney sails you to Dewford, and Brawly's Gym opens.",
		trainers: [AQUA([[261, 11]], { quote: "Grah! The Devon Goods are ours now!" })] },
	{ id: "slateportMuseum", arc: "villain", region: "hoenn", name: "Oceanic Museum", badges: 2, strength: 6.1, gate: 2, reward: "Captain Stern gets his parts: the way north to Mauville (and Wattson's Gym) opens.",
		trainers: [AQUA([[318, 15]]), AQUA([[261, 14], [41, 14]])] },
	{ id: "mtChimney", arc: "villain", region: "hoenn", name: "Mt. Chimney", badges: 3, strength: 7.4, gate: 3, reward: "Maxie's plan to awaken the volcano fails: the way down to Lavaridge (and Flannery's Gym) opens.",
		trainers: [MAGMA([[261, 20], [322, 20]]), MAGMA([[41, 22]]), { name: "Magma Admin Tabitha", rocket: true, team: [[322, 18], [261, 20], [322, 22], [41, 22]] },
			{ name: "Maxie", rocket: true, boss: true, team: [[262, 24], [41, 24], [323, 25]], quote: "The land must grow! That's our goal, and you stand in its way." }] },
	{ id: "weatherInstitute", arc: "villain", region: "hoenn", name: "Weather Institute", badges: 5, strength: 9, gate: 5, reward: "The researchers are freed (and give you Castform): Winona's Gym opens.",
		trainers: [AQUA([[318, 28]]), AQUA([[261, 27], [41, 27]]), { name: "Aqua Admin Shelly", rocket: true, team: [[318, 28], [262, 28]], quote: "Ahahahaha! You're going to meddle in Team Aqua's affairs?" }] },
	{ id: "mtPyre", arc: "villain", region: "hoenn", name: "Mt. Pyre", badges: 6, strength: 9, reward: "Team Aqua takes the Blue Orb from the summit, and Team Magma the Red Orb.",
		trainers: [AQUA([[262, 29], [42, 29]], { floor: "Summit" }), AQUA([[319, 30]], { floor: "Summit" })] },
	{ id: "magmaHideout", arc: "villain", region: "hoenn", name: "Magma Hideout", badges: 6, needs: "mtPyre", strength: 9.5, reward: "Maxie wakes Groudon with the Red Orb, and it flees.",
		trainers: [MAGMA([[262, 29], [42, 29]]), MAGMA([[322, 30], [262, 30]]), MAGMA([[41, 31], [322, 31]]),
			{ name: "Magma Admin Tabitha", rocket: true, team: [[323, 35], [262, 33], [42, 33]] },
			{ name: "Maxie", rocket: true, boss: true, team: [[262, 37], [169, 38], [323, 39]], quote: "Groudon! Expand the land!" }] },
	{ id: "aquaHideout", arc: "villain", region: "hoenn", name: "Aqua Hideout", badges: 6, needs: "magmaHideout", strength: 10, gate: 6, reward: "Team Aqua sails off in its submarine: the seas east to Mossdeep (and Tate & Liza's Gym) open.",
		trainers: [AQUA([[319, 32], [42, 32]]), AQUA([[262, 33], [73, 33]]), { name: "Aqua Admin Matt", rocket: true, team: [[262, 34], [42, 34]], quote: "Hehehe! You're too late!" }] },
	{ id: "spaceCenter", arc: "villain", region: "hoenn", name: "Mossdeep Space Center", badges: 7, needs: "aquaHideout", strength: 11.5, reward: "Steven and you drive Team Magma out of the Space Center.",
		trainers: [MAGMA([[262, 37], [42, 37]]), { name: "Magma Admin Tabitha", rocket: true, team: [[323, 41], [262, 41], [42, 41]] },
			{ name: "Maxie", rocket: true, boss: true, team: [[262, 42], [169, 43], [323, 44]], quote: "The Space Center's rocket fuel will awaken the volcano!" }] },
	{ id: "seafloorCavern", arc: "villain", region: "hoenn", name: "Seafloor Cavern", badges: 7, needs: "spaceCenter", strength: 12, gate: 7, reward: "Kyogre wakes, and Rayquaza, called down from the Sky Pillar, calms it and Groudon: Sootopolis is saved and Juan's Gym opens.",
		trainers: [AQUA([[319, 40], [42, 40]]), { name: "Aqua Admin Shelly", rocket: true, team: [[319, 41], [262, 41]] },
			{ name: "Archie", rocket: true, boss: true, team: [[262, 41], [169, 41], [319, 43]], quote: "Kyogre! Expand the sea!" }] },
	// After the League: Steven at Meteor Falls.
	{ id: "stevenMeteorFalls", region: "hoenn", name: "Meteor Falls", badges: 8, champion: true, strength: 12, reward: "Steven, Hoenn's former Champion, leaves you his Beldum.",
		trainers: [{ name: "Steven", team: [[227, 77], [344, 75], [306, 76], [346, 76], [348, 76], [376, 78]], quote: "I'd like to see how far you've come. Let's battle!" }] },
	// Post-game visits: Hoenn's Champion travels to the earlier regions and takes on their Leagues.
	...Object.entries(VISITS).flatMap(([host, regions]) => Object.entries(regions).filter(([, strength]) => strength).map(([r, strength]) => ({
		id: visitChapterId(host, r), region: host, visit: r, name: REVISITS[r].place, badges: 0, champion: true, strength,
		reward: `${REVISITS[r].name}'s League bows to ${host[0].toUpperCase()}${host.slice(1)}'s Champion: Fame ×${VISIT_FAME} for this Hall of Fame entry.`, trainers: REVISITS[r].trainers }))),
]

// Kanto's Gyms in Johto's post-game (HeartGold/SoulSilver's first battles, from Serebii). Lt. Surge
// first (the S.S. Aqua docks in Vermilion), Blue last.
const KANTO_GYM = (id, name, badge, leader, strength, team, quote, needs = "kantoSurge") => ({
	id, region: "johto", kantoGym: true, name, badges: 8, champion: true, needs, strength, badge,
	reward: `The ${badge}: Research Points ×${BADGE_RP_BOOST}, like any badge.`,
	trainers: [{ name: leader, team, quote }],
})
const KANTO_GYM_CHAPTERS = [
	KANTO_GYM("kantoSurge", "Vermilion Gym", "Thunder Badge", "Lt. Surge", 19, [[26, 51], [101, 47], [101, 47], [82, 47], [125, 53]], "Hey, kid! Johto's Champion, huh? Let's see you take a real shock!", null),
	KANTO_GYM("kantoSabrina", "Saffron Gym", "Marsh Badge", "Sabrina", 19.5, [[196, 53], [122, 53], [65, 55]], "I foresaw your arrival. I also foresee this battle."),
	KANTO_GYM("kantoMisty", "Cerulean Gym", "Cascade Badge", "Misty", 19.5, [[55, 49], [195, 49], [131, 52], [121, 54]], "You ruined my date at the Cape! You'd better be worth it."),
	KANTO_GYM("kantoErika", "Celadon Gym", "Rainbow Badge", "Erika", 20, [[189, 51], [114, 52], [71, 56], [182, 56]], "Oh... I must have dozed off. A challenger from Johto? How lovely."),
	KANTO_GYM("kantoJanine", "Fuchsia Gym", "Soul Badge", "Janine", 20, [[169, 47], [110, 44], [168, 47], [168, 47], [49, 50]], "Father handed the Gym to me. I won't let him down!"),
	KANTO_GYM("kantoBrock", "Pewter Gym", "Boulder Badge", "Brock", 19.5, [[75, 51], [111, 51], [139, 53], [95, 54], [141, 52]], "My rock-hard willpower is even harder now. Show me yours!"),
	KANTO_GYM("kantoBlaine", "Seafoam Gym", "Volcano Badge", "Blaine", 20, [[126, 54], [219, 54], [78, 59]], "The volcano took my Gym, not my fire! Have you got Burn Heal?"),
	KANTO_GYM("kantoBlue", "Viridian Gym", "Earth Badge", "Blue", 20.5, [[103, 55], [68, 56], [59, 58], [112, 58], [130, 52], [18, 60]], "So you're the Johto Champion. I was the Champion too, for about a minute.",
		["kantoSabrina", "kantoMisty", "kantoErika", "kantoJanine", "kantoBrock", "kantoBlaine"]),
]
const STORY_CHAPTERS = [
	// Johto: rivals and challengers.
	{ id: "newBark", region: "johto", name: "Cherrygrove City", badges: 0, strength: 1.5, trainers: [SILVER(0)], reward: "Your rival's first battle: Research Points." },
	{ id: "sproutTower", region: "johto", name: "Sprout Tower", badges: 0, strength: 5, gate: 0, reward: "Elder Li gives you Flash: Falkner's Gym opens.",
		trainers: [{ name: "Sage", team: [[69, 6], [69, 6]] }, { name: "Sage", team: [[69, 7]] }, { name: "Sage", team: [[69, 6], [69, 6], [69, 6]] },
			{ name: "Elder Li", team: [[69, 7], [69, 7], [163, 10]], quote: "The flexible Bellsprout teaches us to bend with the wind." }] },
	{ id: "azaleaRival", region: "johto", name: "Azalea Town", badges: 2, strength: 8, trainers: [SILVER(1)], reward: "Research Points." },
	{ id: "burnedTowerRival", region: "johto", name: "Burned Tower", badges: 3, strength: 9, trainers: [SILVER(2)], reward: "Research Points." },
	{ id: "lighthouse", region: "johto", name: "Olivine Lighthouse", badges: 5, strength: 15, gate: 5, reward: "Chuck's wife's medicine heals Amphy: Jasmine returns to her Gym.",
		trainers: [{ name: "Sailor", team: [[66, 22], [61, 22]] }, { name: "Gentleman", team: [[58, 22], [164, 22]] }, { name: "Lass", team: [[183, 21], [209, 21]] },
			{ name: "Bird Keeper", team: [[17, 22], [83, 22]] }, { name: "Sailor", team: [[72, 24], [73, 24]] }] },
	{ id: "bellTower", region: "johto", name: "Bell Tower", badges: 7, needs: "radioTower", strength: 17, reward: "The Kimono Girls dance, and the Rainbow Wing calls Ho-Oh to the Bell Tower.",
		trainers: [{ name: "Kimono Girl Zuki", team: [[197, 38]] }, { name: "Kimono Girl Naoko", team: [[196, 38]] }, { name: "Kimono Girl Miki", team: [[136, 38]] },
			{ name: "Kimono Girl Sayo", team: [[134, 38]] }, { name: "Kimono Girl Kuni", team: [[135, 38]] }] },
	{ id: "victoryRoadSilver", region: "johto", name: "Victory Road", badges: 8, strength: 15, gateLeague: true, trainers: [SILVER(4)], reward: "Silver steps aside: the Indigo Plateau opens." },
	// Johto: Team Rocket.
	{ id: "slowpokeWell", arc: "villain", region: "johto", name: "Slowpoke Well", badges: 1, strength: 8, gate: 1, reward: "The Slowpoke are safe: Kurt thanks you, and Bugsy's Gym opens.",
		trainers: [GRUNT([[19, 9], [19, 9]]), GRUNT([[41, 11], [41, 11]]), GRUNT([[23, 14]]),
			EXECUTIVE("Proton", [[41, 8], [109, 12]], "Cutting off Slowpoke tails is a fine business!")] },
	{ id: "mahoganyHideout", arc: "villain", region: "johto", name: "Mahogany Hideout", badges: 6, strength: 16, gate: 6, reward: "Lance and you shut down the Rage signal: Pryce's Gym opens.",
		trainers: [GRUNT([[19, 21], [41, 22]]), GRUNT([[88, 21], [109, 22]]), EXECUTIVE("Petrel", [[41, 22], [109, 22], [109, 24]], "...You think you can stop us?"),
			GRUNT([[24, 23], [42, 23]]), EXECUTIVE("Ariana", [[24, 23], [44, 23], [198, 25]], "You've meddled enough!"),
			{ name: "Electrode (the generator)", team: [[101, 23], [101, 23], [101, 23]] }] },
	{ id: "radioTower", arc: "villain", region: "johto", name: "Radio Tower", badges: 7, strength: 15, gate: 7, reward: "Team Rocket disbands: Clair's Gym opens, and the Director gives you the Silver Wing (Lugia).",
		trainers: [GRUNT([[20, 26], [42, 26]], { floor: "Underground" }), { ...SILVER(3), floor: "Underground" }, EXECUTIVE("Proton", [[42, 30], [110, 30]], "Do you know how hard we work?"),
			GRUNT([[89, 28], [24, 28]], { floor: "2F" }), EXECUTIVE("Petrel", [[110, 32], [109, 30], [109, 30]], "Fooled you!"),
			GRUNT([[229, 29], [42, 29]], { floor: "4F" }), EXECUTIVE("Ariana", [[24, 32], [45, 32], [198, 32]], "We will not be stopped!"),
			{ ...EXECUTIVE("Archer", [[228, 35], [110, 35], [229, 38]], "We will revive Team Rocket... and await Giovanni's return!"), boss: true, floor: "5F" }] },
	// Kanto: rivals and challengers.
	{ id: "oakLab", name: "Oak's Lab", badges: 0, strength: 1, trainers: [RIVAL(0)], reward: "Your rival's first lesson: Research Points." },
	{ id: "route22", name: "Route 22", badges: 0, strength: 1.2, trainers: [RIVAL(1)], reward: "Research Points." },
	{ id: "ceruleanRival", name: "Cerulean City", badges: 1, strength: 2.2, trainers: [RIVAL(2)], reward: "Research Points." },
	{ id: "ssAnne", name: "S.S. Anne", badges: 2, strength: 3.2, gate: 2, reward: "The Captain teaches you Cut: the way to Lt. Surge's Gym opens.",
		trainers: [{ name: "Sailor", team: [[66, 18], [72, 18]] }, { name: "Gentleman", team: [[58, 18], [52, 18]] }, { name: "Lass", team: [[16, 18], [35, 18]] },
			{ name: "Fisherman", team: [[118, 17], [129, 17], [118, 17]] }, { ...RIVAL(3) }, { name: "The Captain", team: [[66, 21], [90, 21], [72, 21]] }] },
	{ id: "dojo", name: "Fighting Dojo", badges: 4, strength: 4.5, reward: "The Karate Master lets you choose Hitmonlee or Hitmonchan.",
		trainers: [{ name: "Black Belt", team: [[66, 31], [67, 31]] }, { name: "Black Belt", team: [[56, 32], [57, 32]] }, { name: "Black Belt", team: [[67, 34]] },
			{ name: "Karate Master", team: [[57, 37], [106, 37], [107, 37]] }] },
	{ id: "mtSilver", region: "johto", name: "Mt. Silver", badges: 8, champion: true, needs: "kantoBlue", strength: 13, red: true,
		reward: "Red, the silent Champion of Kanto, nods and leaves the summit. Fame ×1.5 for this Hall of Fame entry.",
		trainers: [{ name: "Red", team: JOHTO_RED.team, quote: "…" }] },
	...KANTO_GYM_CHAPTERS,
	...HOENN_CHAPTERS,
	{ id: "route22Final", name: "Route 22 again", badges: 8, strength: 10, gateLeague: true, trainers: [RIVAL(6)], reward: "Your rival steps aside: Victory Road and the League open." },
	// Kanto: Team Rocket.
	{ id: "mtMoon", arc: "villain", name: "Mt. Moon", badges: 1, strength: 2.8, gate: 1, reward: "The way through Mt. Moon to Cerulean City (and Misty's Gym) opens.",
		trainers: [GRUNT([[19, 13], [41, 13]]), GRUNT([[27, 11], [19, 11], [41, 11]]), JESSIE_JAMES([[23, 14], [109, 14]]), GRUNT([[41, 12], [23, 12]])] },
	{ id: "nuggetBridge", arc: "villain", name: "Nugget Bridge", badges: 1, strength: 2.4, nugget: true, reward: "A Nugget: a lump of Research Points.",
		trainers: [GRUNT([[23, 15], [41, 15]], { quote: "Join Team Rocket! ...No? Then I'll take you down!" })] },
	{ id: "hideout", arc: "villain", name: "Rocket Hideout", badges: 3, needGameCorner: true, strength: 3.2, reward: "The Silph Scope: Ghost Pokémon twice as easy to catch this run, and the Pokémon Tower's ghosts unmasked.",
		trainers: [
			GRUNT([[19, 20], [20, 20]], { floor: "B1F", coins: 150 }), GRUNT([[41, 20], [23, 20], [41, 20]], { floor: "B1F", coins: 150 }),
			GRUNT([[96, 21], [66, 21]], { floor: "B2F", coins: 300 }), GRUNT([[109, 21], [20, 21]], { floor: "B2F", coins: 300 }),
			GRUNT([[24, 22], [41, 22]], { floor: "B3F", coins: 450 }), GRUNT([[66, 21], [96, 22], [66, 21]], { floor: "B3F", coins: 450 }),
			GRUNT([[109, 23], [109, 23]], { floor: "B4F", coins: 600 }), GRUNT([[42, 23], [24, 23]], { floor: "B4F", coins: 600 }),
			{ name: "Giovanni", rocket: true, boss: true, floor: "B4F", strength: 5.5, team: [[95, 25], [111, 24], [115, 29]], quote: "So! I must say, I am impressed you got here." },
		] },
	{ id: "pokemonTower", arc: "villain", name: "Pokémon Tower", badges: 4, needs: "hideout", strength: 7, gate: 4, reward: "Mr. Fuji is free and gives you the Poké Flute: Snorlax can be woken, and Koga's Gym opens.",
		trainers: [{ ...RIVAL(4), floor: "2F" }, { name: "Ghost (Marowak)", floor: "6F", team: [[105, 30]], quote: "Begone... Intruders..." },
			GRUNT([[41, 25], [41, 25], [42, 25]], { floor: "7F" }), GRUNT([[109, 26], [96, 26]], { floor: "7F" }), JESSIE_JAMES([[24, 27], [110, 27], [52, 27]]),
			GRUNT([[41, 23], [19, 23], [20, 23], [41, 23]], { floor: "7F" })] },
	{ id: "silphCo", arc: "villain", name: "Silph Co.", badges: 5, needs: "pokemonTower", strength: 5.6, gate: 5, reward: "The Master Ball (the next new Pokémon you beat is caught for sure), Lapras, and Sabrina's Gym opens.",
		trainers: [
			GRUNT([[19, 29], [20, 29], [41, 29]], { floor: "2F" }), { name: "Scientist", rocket: true, floor: "2F", team: [[81, 29], [100, 29]] },
			GRUNT([[23, 31], [24, 31]], { floor: "3F" }), GRUNT([[109, 31], [42, 31]], { floor: "4F" }), { name: "Scientist", rocket: true, floor: "5F", team: [[100, 30], [81, 30], [101, 30]] },
			GRUNT([[52, 32], [96, 32]], { floor: "6F" }), { ...RIVAL(5), floor: "7F" }, GRUNT([[66, 33], [67, 33]], { floor: "8F" }),
			JESSIE_JAMES([[24, 31], [110, 31], [52, 31]]), { name: "Scientist", rocket: true, floor: "10F", team: [[82, 33], [110, 33]] }, GRUNT([[42, 34], [24, 34]], { floor: "11F" }),
			{ name: "Giovanni", rocket: true, boss: true, floor: "11F", strength: 6.6, team: [[33, 37], [115, 35], [111, 37], [31, 41]], quote: "Ah, we meet again. I am not going to let you ruin this deal!" },
		] },
]
for (const ch of STORY_CHAPTERS) ch.arc = ch.arc || (ch.trainers.every(t => t.rival) ? "rival" : "challenger")

// Lifetime milestones: villains beaten (player.d.rockets: Team Rocket now, Aqua and Magma later),
// rival wins, and every story battle won (chapters and rematches, player.d.storyWins). The later
// tiers come from rematches over many runs.
const ROCKET_MILESTONES = [
	[5, "Rocket loot: Grunts drop twice as many coins."],
	[10, "Research Points ×1.1."],
	[20, "+10% catch chance everywhere."],
	[40, "Your party's Attack ×1.1."],
	[75, "Research Points ×1.15."],
	[150, "+15% catch chance everywhere."],
	[300, "Your party's Defense ×1.15."],
	[500, "Research Points ×1.25."],
]
const RIVAL_MILESTONES = [
	[3, "Experience ×1.2."],
	[7, "Your party's Defense ×1.1."],
	[15, "Research Points ×1.1."],
	[30, "Experience ×1.25."],
	[60, "Your party's Attack ×1.1."],
	[100, "Research Points ×1.2."],
	[200, "Your party's Attack and Defense ×1.1."],
]
const STORY_MILESTONES = [
	[10, "Research Points ×1.1."],
	[25, "Rematch calls come 25% sooner."],
	[50, "Experience ×1.15."],
	[100, "Rematches pay twice the Research Points."],
	[200, "Your party's Attack ×1.1."],
	[350, "Up to five rematch calls wait for you."],
	[500, "Research Points ×1.25."],
	[750, "Your party's Defense ×1.1."],
	[1000, "Fame ×1.1."],
]

// ---- Kanto after Johto's League (HeartGold/SoulSilver's post-game) ----
// Johto's Champion takes the S.S. Aqua to Vermilion: Kanto's routes open again (FireRed/LeafGreen's
// tables; Fuchsia's Safari Zone is closed, Cerulean Cave waits for Red) and its Leaders, with
// their HGSS teams, are the Trainers node's Kanto Gyms. Red only sees a trainer with all 16 badges.
// Each Kanto badge counts like a badge for Research Points.
function kantoRevisit() { return currentRegion() === "johto" && isChampion() }
function revisitOpen(zone) {
	if (!revisitRegions().includes(zone.region) || zone.anime || REVISITS[zone.region].closed.includes(zone.id)) return false
	if (currentRegion() === "johto") return !zone.postGame || chapterCleared("mtSilver")
	return !zone.postGame
}
function revisitZones(r) { return REGIONS[r].zones.filter(z => !z.anime && !REVISITS[r].closed.includes(z.id)) }
function kantoBadges() { return KANTO_GYM_CHAPTERS.filter(ch => chapterCleared(ch.id)).length }

// Gift rules from the story: the Dojo's choice and Silph Co.'s Lapras, Snorlax's Poké Flute.
const SPECIAL_STORY = { hitmonlee: "dojo", hitmonchan: "dojo", lapras: "silphCo", snorlax: "pokemonTower", whirlLugia: "radioTower", bellTowerHoOh: "bellTower",
	weatherInstituteCastform: "weatherInstitute", hoennKyogre: "seafloorCavern", hoennGroudon: "seafloorCavern", hoennRayquaza: "seafloorCavern", stevensBeldum: "stevenMeteorFalls" }
const DOJO_CHOICE = ["hitmonlee", "hitmonchan"]
for (const s of SPECIALS) if (s.id === "hitmonchan") s.text = "...or the punching fiend. You may choose only one."

function chapterById(id) { return STORY_CHAPTERS.find(c => c.id === id) }
function storyState(ch) { return player.q }
function chapterProgress(ch) { return storyState(ch)?.progress?.[ch.id] || 0 }
function chapterCleared(id) { const ch = chapterById(id); return !!ch && chapterProgress(ch) >= ch.trainers.length }
function chapterRegion(ch) { return ch.region || "kanto" }
function chapterOpen(ch) {
	if (!storyState(ch)) return false
	if (chapterRegion(ch) !== currentRegion()) return false
	if (ch.champion && !isChampion()) return false
	if (badges() < ch.badges) return false
	if (ch.needs && ![].concat(ch.needs).every(chapterCleared)) return false
	if (ch.needGameCorner && !gameCornerOpen()) return false
	return true
}
function nextStoryTrainer(ch) { return ch.trainers[chapterProgress(ch)] || null }
function trainerTeam(t) { return typeof t.team === "function" ? t.team() : t.team }
function storyPrediction(ch) {
	const t = nextStoryTrainer(ch)
	if (!t) return null
	return battle(partyBattlers(), trainerBattlers({ team: trainerTeam(t) }, t.strength || ch.strength))
}
function canStoryBattle(ch) {
	if (!chapterOpen(ch)) return false
	const p = storyPrediction(ch)
	return !!p && p.win && !(inChallenge(11) && p.fainted > 0)
}
/** Research Points for beating a story trainer: three wild battles' worth of its team. */
function storyRp(t) { return trainerTeam(t).reduce((s, [id, lv]) => s + researchYield(id, lv), 0) * 3 * rpMult() }
function storyBattle(id) {
	const ch = typeof id === "string" ? chapterById(id) : id
	if (!ch || !canStoryBattle(ch)) return false
	const t = nextStoryTrainer(ch)
	releaseFainted(storyPrediction(ch))
	const state = storyState(ch)
	state.progress = { ...state.progress, [ch.id]: chapterProgress(ch) + 1 }
	countStoryWin(t)
	if (t.coins) {
		const coins = t.coins * (rocketMilestone(5) ? 2 : 1)
		addCoins(coins)
		pkLog(`Beat a ${t.name} on ${t.floor}: found ${formatCoins(coins)} coins.`, "win")
	} else {
		const rp = storyRp(t)
		player.points = player.points.add(rp)
		pkLog(`Beat ${t.name} at ${ch.name}: ${format(rp)} Research Points.`, "win")
	}
	if (chapterCleared(ch.id)) clearChapter(ch)
	return true
}
function clearChapter(ch) {
	if (ch.nugget) player.points = player.points.add(10000 * PRICE_TO_RP * rpMult() / 10)
	if (ch.id === "silphCo") player.q.masterBall = true
	pkLog(`${ch.name} cleared! ${ch.reward}`, ch.arc === "villain" ? "rocket" : "story")
}
function countStoryWin(t) {
	if (t.rocket) player.d.rockets = rocketsBeaten() + 1
	if (t.rival) player.d.rivalWins = rivalWins() + 1
	player.d.storyWins = storyWins() + 1
}

// ---- Rematches (the Pokégear's phone; the PokéNav's Match Call in Hoenn) ----
// Every CALL_SECONDS of searching (each wild battle counts its search time, so offline time too) a
// cleared chapter of this region calls for a rematch: its last trainer, levelled up to the party's
// cap and nearly as strong as the last Gym beaten. Calls wait (up to maxCalls()); rematches pay
// Research Points and count as story battles won. The simulator plays them.
const CALL_SECONDS = 1200
function maxCalls() { return storyMilestone(350) ? 5 : 3 }
function callSeconds() { return CALL_SECONDS * (storyMilestone(25) ? 0.75 : 1) }
function callable() { return STORY_CHAPTERS.filter(ch => chapterRegion(ch) === currentRegion() && chapterCleared(ch.id) && !player.q.calls.includes(ch.id)) }
function storyCallStep() {
	if (!player.q || player.q.calls.length >= maxCalls()) return
	const options = callable()
	if (!options.length) return
	player.q.callProgress = (player.q.callProgress || 0) + searchTime()
	if (player.q.callProgress < callSeconds()) return
	player.q.callProgress = 0
	const ch = options.reduce((a, b) => (player.q.rematches[b.id] || 0) < (player.q.rematches[a.id] || 0) ? b : a)
	player.q.calls.push(ch.id)
	pkLog(`📞 ${rematchTrainer(ch).name} calls from ${ch.name}: "Let's battle again!"`, ch.arc === "villain" ? "rocket" : "story")
}
function rematchTrainer(ch) { return ch.trainers[ch.trainers.length - 1] }
/** Three-quarters of the last Gym beaten (the Elite Four once Champion), or the chapter's own. */
function rematchStrength(ch) {
	const r = region(), b = badges()
	const beaten = isChampion() ? r.eliteFourStrength : b > 0 ? r.gymStrength[b - 1] : 0
	return Math.max(ch.strength, 0.75 * beaten)
}
function rematchTeam(ch) {
	const cap = currentCap()
	return trainerTeam(rematchTrainer(ch)).map(([id, lv]) => [id, Math.max(lv, cap - 2)])
}
function rematchPrediction(ch) { return battle(partyBattlers(), trainerBattlers({ team: rematchTeam(ch) }, rematchStrength(ch))) }
function canRematch(id) {
	const ch = chapterById(id)
	if (!ch || !player.q.calls.includes(id)) return false
	const p = rematchPrediction(ch)
	return p.win && !(inChallenge(11) && p.fainted > 0)
}
function rematch(id) {
	if (!canRematch(id)) return false
	const ch = chapterById(id), t = rematchTrainer(ch)
	releaseFainted(rematchPrediction(ch))
	player.q.calls = player.q.calls.filter(c => c !== id)
	player.q.rematches = { ...player.q.rematches, [id]: (player.q.rematches[id] || 0) + 1 }
	// Rematches count as story battles won, not toward the villain and rival tracks.
	player.d.storyWins = storyWins() + 1
	// One wild battle's worth per Pokémon (a story battle pays three).
	const rp = storyRp({ team: rematchTeam(ch) }) / 3 * (storyMilestone(100) ? 2 : 1)
	player.points = player.points.add(rp)
	pkLog(`Won the rematch with ${t.name} (${ch.name}): ${format(rp)} Research Points.`, "win")
	return true
}
function rematchTick() {
	let any = false
	for (const id of [...player.q.calls]) if (rematch(id)) any = true
	return any
}
/** Every battle the story can take now, in order (the simulator and the automatic challenges). */
function storyTick() {
	let any = false
	for (const ch of STORY_CHAPTERS) while (canStoryBattle(ch)) { storyBattle(ch); any = true }
	return any
}

/** The chapter that must be cleared before Gym `index`, if any isn't. */
function gymStoryGate(index) { return STORY_CHAPTERS.find(ch => chapterRegion(ch) === currentRegion() && ch.gate === index && !chapterCleared(ch.id)) || null }
function leagueStoryGate() { return STORY_CHAPTERS.find(ch => chapterRegion(ch) === currentRegion() && ch.gateLeague && !chapterCleared(ch.id)) || null }
function specialStoryGate(s) {
	const need = SPECIAL_STORY[s.id]
	if (need && !chapterCleared(need)) return chapterById(need)
	return null
}
function dojoChoiceTaken(s) { return DOJO_CHOICE.includes(s.id) && DOJO_CHOICE.some(id => id !== s.id && player.t.specials[id]) }

function rocketsBeaten() { return player.d.rockets || 0 }
function rocketMilestone(n) { return rocketsBeaten() >= n }
function rivalWins() { return player.d.rivalWins || 0 }
function rivalMilestone(n) { return rivalWins() >= n }
function storyWins() { return player.d.storyWins || 0 }
function storyMilestone(n) { return storyWins() >= n }
function giovanniBeaten() { return chapterCleared("hideout") }
function hasSilphScope() { return chapterCleared("hideout") }
/** Species-specific catch help: the Silph Scope unmasks Ghost Pokémon. */
function speciesCatchMult(id) { return hasSilphScope() && SPECIES[id].types.includes("ghost") ? 2 : 1 }

/**
 * v0.10 kept the Hideout's progress as a number (player.r.beaten); v0.18 moved Team Rocket ("r")
 * and the Trainers node ("v") into the Story node ("q").
 */
function migrateStory() {
	if (player.r && typeof player.r.beaten === "number") {
		player.r.progress = { ...(player.r.progress || {}), hideout: Math.max(player.r.beaten, player.r.progress?.hideout || 0) }
		delete player.r.beaten
	}
	if (!player.q || !(player.r || player.v)) return
	for (const old of ["r", "v"]) {
		if (!player[old]) continue
		player.q.progress = { ...(player[old].progress || {}), ...player.q.progress }
		if (player[old].masterBall) player.q.masterBall = true
		delete player[old]
	}
	// Story battles won starts from the lifetime Rockets and rival wins.
	player.d.storyWins = Math.max(storyWins(), rocketsBeaten() + rivalWins())
}

// ---- The Game Freak Diploma and Missingno. ----

/** The Diploma: every Kanto species but Mew caught (as in the games). */
function hasDiploma() { return !!player.d && (!!player.d.diploma || Object.keys(player.d.caught).filter(id => id >= 1 && id <= 150).length >= 150) }

const MISSINGNO_ZONES = ["route20", "route21"]
const MISSINGNO_CHANCE = 1 / 1000
/** Surfing off Cinnabar's coast, once a run, Missingno. turns up and duplicates your coins. */
function missingnoCheck(zone, enc, rng) {
	if (!MISSINGNO_ZONES.includes(zone.id) || enc.pool !== "surf" || player.f.missingno || rand(rng) >= MISSINGNO_CHANCE) return
	player.f.missingno = true
	player.d.missingno = (player.d.missingno || 0) + 1
	const bonus = Math.min(coins(), 10000)
	if (player.k) addCoins(bonus)
	pkLog(`W̷i̴l̸d̵ M̶i̷s̴s̵i̶n̷g̸n̴o̵.̸ appeared! ...Your coins were duplicated (+${formatCoins(bonus)}).`, "glitch")
}

// ---- Regions and the run's Pokédex ----
// Each Hall of Fame entry starts the Pokédex over (seen, caught, hatched). Kept for good: records of
// special looks (player.d.shiny, player.d.forms), player.d.everHatched, the best Pokédex, the
// Diploma and the lifetime counters. Regions list their Pokédex (more come with Johto).

// Every zone and special knows its region; lists show the current region's, lookups by id use all.
for (const z of ZONES) z.region = z.region || "kanto"
for (const z of JOHTO_ZONES) z.region = "johto"
for (const s of SPECIALS) s.region = s.region || "kanto"
for (const s of JOHTO_SPECIALS) s.region = "johto"
for (const z of HOENN_ZONES) z.region = "hoenn"
for (const s of HOENN_SPECIALS) s.region = "hoenn"
for (const z of ORANGE_ZONES) z.region = "orange"
for (const s of ORANGE_SPECIALS) s.region = "orange"
for (const z of HOENN_ZONES) if (z.id === "mirageIsland") z.mirage = true
const ALL_ZONES = [...ZONES, ...JOHTO_ZONES, ...HOENN_ZONES, ...ORANGE_ZONES]
const ALL_SPECIALS = [...SPECIALS, ...JOHTO_SPECIALS, ...HOENN_SPECIALS, ...ORANGE_SPECIALS]

const KEY_ITEM_NAMES = {
	oldRod: "Old Rod", goodRod: "Good Rod", superRod: "Super Rod", surf: "Surf", bicycle: "Bicycle", pokeFlute: "Poké Flute",
	headbutt: "Headbutt", rockSmash: "Rock Smash", squirtBottle: "SquirtBottle", radioCard: "Radio Card", dive: "Dive",
}
/** Key items from the Gyms' rewards: each comes with the badge of the Gym that gives it. */
function keyItemsFromGyms(gyms) {
	const items = {}
	gyms.forEach((g, i) => { for (const id of g.keyItems || []) items[id] = { badges: i + 1, name: KEY_ITEM_NAMES[id] || id } })
	return items
}
const JOHTO_STONES = Object.fromEntries(["moonStone", "fireStone", "waterStone", "thunderStone", "leafStone", "sunStone"].map(s => [s, 3]))
const ORANGE_DEX = [...new Set([...ORANGE_ZONES.flatMap(z => Object.values(z.pools).flat().map(e => e[0])), ...ORANGE_SPECIALS.map(s => s.species), 25, 175, 131])].sort((a, b) => a - b)
const JOHTO_DEX = [...new Set([
	...JOHTO_ZONES.filter(z => !z.anime).flatMap(z => Object.values(z.pools).flat().map(e => e[0])),
	...JOHTO_SPECIALS.map(s => s.species),
	...Array.from({ length: 100 }, (_, i) => i + 152),
])].sort((a, b) => a - b)

const HOENN_DEX = [...new Set([
	...HOENN_ZONES.filter(z => !z.anime).flatMap(z => Object.values(z.pools).flat().map(e => e[0])),
	...HOENN_SPECIALS.filter(s => !s.anime).map(s => s.species),
	...Array.from({ length: 135 }, (_, i) => i + 252),
])].sort((a, b) => a - b)

/**
 * The regions of a journey. Kanto's rules are the engine's own; Johto (HeartGold/SoulSilver) has
 * its own Gyms, League, level caps, key items and strengths (tuned with the simulator).
 */
const REGIONS = {
	kanto: {
		name: "Kanto", professor: "Oak", starters: STARTERS, zones: ZONES, gyms: GYMS, eliteFour: ELITE_FOUR,
		champion: () => CHAMPIONS[player.t.starter] || CHAMPIONS[1], gymStrength: GYM_STRENGTH,
		eliteFourStrength: ELITE_FOUR_STRENGTH, championStrength: CHAMPION_STRENGTH, badgeImage: 1, zoneCost: 1, pace: 3.8,
		dex: Array.from({ length: 151 }, (_, i) => i + 1), rules: REGION_RULES, maxSpecies: 151,
	},
	johto: {
		name: "Johto", professor: "Elm", starters: [152, 155, 158], zones: JOHTO_ZONES, gyms: JOHTO_GYMS,
		eliteFour: JOHTO_ELITE_FOUR, champion: () => JOHTO_CHAMPION,
		gymStrength: [3.5, 6, 8, 6.5, 11, 12.5, 13, 11], eliteFourStrength: 10, championStrength: 9.5,
		badgeImage: 9, dex: JOHTO_DEX, zoneCost: 2, pace: 2, maxSpecies: 251, fame: 2.5,
		// Reached by sailing on from Kanto's League (sailToJohto), not from the starter screen.
		opens: { after: "kanto", entries: 3 },
		rules: { keyItems: keyItemsFromGyms(JOHTO_GYMS), levelCaps: [16, 20, 24, 28, 33, 37, 40, 45, 55, 100], stoneBadges: JOHTO_STONES, tradeBadges: 3 },
	},
	// The Orange Islands (the anime): a side journey after Kanto. Four Orange Crew Gyms, then Drake
	// alone at the Winner's Cup; Lapras's ferry sails the islands from the start (Surf).
	orange: {
		name: "Orange Islands", professor: "Ivy", starters: [25, 175, 131], zones: ORANGE_ZONES, gyms: ORANGE_GYMS,
		eliteFour: [], champion: () => ORANGE_CHAMPION,
		gymStrength: [3.2, 4, 3.6, 4.8], eliteFourStrength: 4.8, championStrength: 5.4,
		badgeImage: 25, dex: ORANGE_DEX, zoneCost: 1, pace: 12, maxSpecies: 251, fame: 1.5,
		opens: { after: "kanto", entries: 3 },
		journey: { button: 51, intro: "Professor Ivy, on Valencia Island, studies the Orange Archipelago's unusual Pokémon and has three for a researcher willing to island-hop." },
		league: { name: "Pummelo Stadium", survey: "Pummelo Island", trainers: "Drake, alone, at the Winner's Cup" },
		safari: false,
		storyIntro: "Tracey Sketchit, a Pokémon watcher, sketches your Pokémon as you island-hop toward the Orange League. No story battles here yet.",
		rules: { keyItems: { surf: { badges: 0, name: "Lapras's ferry" } }, levelCaps: [20, 28, 35, 42, 50, 100], stoneBadges: JOHTO_STONES, tradeBadges: 2 },
	},
	// Hoenn (Emerald): a journey of its own, opened by Johto's Hall of Fame entries. `journey` puts
	// a region on the starter screen: its professor's starters (clickables from `button`) and intro.
	hoenn: {
		name: "Hoenn", professor: "Birch", starters: [252, 255, 258], zones: HOENN_ZONES, gyms: HOENN_GYMS,
		eliteFour: HOENN_ELITE_FOUR, champion: () => HOENN_CHAMPION,
		gymStrength: [2, 3.1, 4.2, 5, 5.2, 6.2, 8, 9], eliteFourStrength: 9, championStrength: 8.5,
		badgeImage: 17, dex: HOENN_DEX, zoneCost: 0.25, pace: 18, maxSpecies: 386, fame: 2.5,
		opens: { after: "johto", entries: 3 },
		journey: { button: 41, intro: "Professor Birch, in Littleroot Town, has three Pokémon of his own for a researcher willing to survey Hoenn." },
		league: { name: "Ever Grande City", survey: "Ever Grande City and Victory Road" },
		rules: { keyItems: keyItemsFromGyms(HOENN_GYMS), levelCaps: [16, 20, 25, 30, 32, 34, 43, 47, 58, 100], stoneBadges: JOHTO_STONES, tradeBadges: 3 },
	},
}
function currentRegion() { return player.t?.region || "kanto" }
/**
 * The journey's pace: every timer (automatic searching, so the Safari Zone too, passive Research
 * Points, the Day Care) runs this many times slower. Tuned so a first run of each region takes about 10-12 h
 * in the simulator, which plays perfectly; later runs speed up through Fame.
 */
function pace() { return region().pace }
function region() { return REGIONS[currentRegion()] }
/** Points the engine at the current region's rules (call when the region may have changed). */
function syncRegionRules() { REGION_RULES = region().rules }
function regionZones() { return region().zones }
function regionGyms() { return region().gyms }
/** The badges that open the League: 8, or the Orange League's 4. */
function allBadges() { return regionGyms().length }
function gymStrength() { return region().gymStrength[badges()] }
function regionDex(region = currentRegion()) { return REGIONS[region].dex }
/** Regions whose Pokédex pages show: Kanto, and Johto once it's open. */
function dexRegions() { return Object.keys(REGIONS).filter(r => r === "kanto" || regionOpen(r) || regionBeaten(r)) }
/** The Pokédex page being viewed (the current region unless another is picked). */
function viewedDexRegion() { return dexRegions().includes(player.d?.dexRegion) ? player.d.dexRegion : currentRegion() }
function regionTabs(layer) {
	const regions = dexRegions()
	return regions.length < 2 ? "" : regions.map(r => `<button class="pk-button ${viewedDexRegion() === r ? "pk-on" : ""}" onclick="player.d.dexRegion='${r}'">${REGIONS[r].name}</button>`).join(" ") + "<br>"
}
function regionCaught(region = currentRegion()) { return regionDex(region).filter(id => player.d.caught[id]).length }

function resetRunPokedex() {
	const d = player.d
	if (hasDiploma()) d.diploma = true
	d.bestCaught = Math.max(d.bestCaught || 0, caughtCount())
	d.lastSeen = { ...d.seen }
	d.everHatched = { ...d.everHatched, ...Object.fromEntries(Object.keys(d.hatched).map(id => [id, true])) }
	d.seen = automationOn("notes") ? Object.fromEntries(Object.keys(d.lastSeen).map(id => [id, 1])) : {}
	d.caught = {}
	d.hatched = {}
	// The Pokédex milestones are this run's goals again.
	if (d.milestones) d.milestones = []
}

// ---- The rules of challenges 41-53 and the automations they unlock ----

const WANDER_SECONDS = 180
/** Wanderer: the Field hops to a random open route of the current area every few minutes. */
function challengeTick(diff, rng) {
	if (!inChallenge(41) || !player.t.starter) return
	player.f.wanderTimer = (player.f.wanderTimer || 0) - diff
	if (player.f.wanderTimer > 0) return
	player.f.wanderTimer = WANDER_SECONDS
	const area = frontierZones().filter(zoneOpen)
	const open = area.length ? area : ALL_ZONES.filter(zoneOpen)
	player.f.zone = open[Math.floor(rand(rng) * open.length)].id
}
function canChooseRoute() { return !inChallenge(41) || !player.t.starter }
/** Locked Party: after the first badge nobody leaves the party. */
function canLeaveParty(key) { return !inChallenge(42) }

/** The next battle the party is preparing for: the Gym, the League, or a story battle that gates one. */
function nextOpponent() {
	const gym = nextGym()
	if (gym && gymStoryGate(badges())) return storyFoes(gymStoryGate(badges()))
	if (gym) return trainerBattlers(gym, gymStrength())
	if (badges() >= allBadges() && !isChampion()) {
		if (leagueStoryGate()) return storyFoes(leagueStoryGate())
		const t = leagueTrainers()[player.l.beaten]
		if (t) return trainerBattlers(t, t.strength)
	}
	return null
}
function storyFoes(ch) {
	const t = nextStoryTrainer(ch)
	return t && chapterOpen(ch) ? trainerBattlers({ team: trainerTeam(t) }, t.strength || ch.strength) : null
}
/** The box Pokémon that do best against the next opponent, else the strongest (the Team Coach and the simulator). */
function bestParty() {
	const size = partySize(), atk = atkMult(), def = defMult()
	const foes = nextOpponent()
	const keys = Object.keys(player.t.box).filter(k => canJoinParty(k) && !inDayCare(k))
	const score = k => {
		const entry = player.t.box[k], hc = challengeHandicap(entry, k)
		const base = battlerScore(speciesOf(k), entry.level)
		if (!foes) return base
		const r = battle([battler(speciesOf(k), entry.level, atk * hc, def * hc)], foes)
		return r.defeated + r.hpLeft + base * 1e-12
	}
	return keys.map(k => [k, score(k)]).sort((a, b) => b[1] - a[1]).slice(0, size).map(([k]) => k)
}
/** Box Pokémon with a level evolution still ahead and room under the cap, closest to evolving first. */
function trainees(skip) {
	const cap = currentCap()
	return Object.keys(player.t.box).filter(k => !skip.includes(k) && canJoinParty(k) && !inDayCare(k) && player.t.box[k].level < cap).map(k => {
		const level = player.t.box[k].level, id = speciesOf(k)
		const evo = SPECIES[id].evolutions.find(e => e.method === "level" && e.level > level && evolutionOpen(id, e.into) && canEvolveInto(k, e.into))
		return evo ? [k, evo.level - level] : null
	}).filter(Boolean).sort((a, b) => a[1] - b[1]).map(([k]) => k)
}
/**
 * Box Training: the fewest of the best party that still win the next battle (the stronger half
 * when there's none), then trainees in the back slots. They fight only if the core faints, so the
 * forecast stays a win, and the Exp. Share gives them half of every wild battle's experience.
 */
function trainingParty(best) {
	if (!automationOn("train") || !hasFieldUpgrade(14) || best.length < 2) return best
	const foes = nextOpponent()
	let core = Math.ceil(best.length / 2)
	if (foes) {
		core = best.length
		while (core > 1 && battle(partyBattlers(best.slice(0, core - 1)), foes).win) core--
		if (!battle(partyBattlers(best.slice(0, core)), foes).win) return best
	}
	const train = trainees(best.slice(0, core)).slice(0, best.length - core)
	return [...best.slice(0, core), ...train, ...best.slice(core)].slice(0, best.length)
}
function autoPartyTick() {
	if (!automationOn("coach") || !player.t.starter) return
	if (inChallenge(42)) return
	const best = trainingParty(bestParty())
	if (best.length && best.join() !== player.t.party.join()) player.t.party = best
}

/** The Route Planner: unseen species first, then Pokémon the box is missing; otherwise stay. */
function autoRouteTick() {
	if (!automationOn("route") || !player.t.starter || !canChooseRoute()) return
	const open = ALL_ZONES.filter(zoneOpen)
	const unseen = z => zoneSpecies(z, badges()).filter(id => !player.d.seen[id]).length
	const here = currentZone()
	if (unseen(here) > 0) return
	const withUnseen = open.filter(z => unseen(z) > 0)
	if (withUnseen.length) { player.f.zone = withUnseen[withUnseen.length - 1].id; return }
	if (zoneMissing(here) > 0) return
	const missing = open.filter(z => zoneMissing(z) > 0)
	if (missing.length) player.f.zone = missing[missing.length - 1].id
}

/** The Item Kit: stones and trades, then gifts, trades, prizes and legendaries, whenever possible. */
function autoItemTick() {
	if (!automationOn("items") || !player.t.starter) return
	for (const key of Object.keys(player.t.box)) for (const e of itemEvolutions(speciesOf(key), badges()))
		if (canItemEvolve(key, e)) { itemEvolve(key, e.into); return }
	for (const s of ALL_SPECIALS) {
		if (player.t.specials[s.id] || !specialOpen(s)) continue
		if (isPrize(s) && coins() < prizeCoins(s) && gameCornerOpen()) {
			const need = prizeCoins(s) - coins()
			if (player.points.gte(coinsCost(need))) buyCoins(need)
		}
		if (specialStatus(s).ok) { takeSpecial(s); return }
	}
}

/** Hunter's Instinct: keep the target on a species of this route with no shiny yet. */
function autoHuntTick() {
	if (!automationOn("hunter") || !huntOpen() || !player.y) return
	const target = huntTarget()
	const here = zoneSpecies(currentZone(), badges())
	if (target && here.includes(target) && !huntRecords()[target]) return
	const choices = here.filter(id => player.d.seen[id] && !huntRecords()[id])
	if (choices.length) setHuntTarget(choices[0])
}

function automationTick() {
	autoRouteTick()
	autoPartyTick()
	autoItemTick()
	autoHuntTick()
}

// ---- The journey: Kanto, then Johto ----
// After JOHTO_ENTRIES Hall of Fame entries, Kanto's Champion may sail on to Johto instead of
// entering the Hall: a fresh start under Professor Elm, with every Pokémon you own back at the
// starter's level. Johto's Champion then enters the Hall of Fame for the whole journey.

const JOHTO_ENTRIES = 3
/** Starts the Field over as a badge does (the game's Field layer and the simulator each set this). */
var resetField = () => {}
const JOHTO_FAME = 2.5 // REGIONS.johto.fame
const JOHTO_START_LEVEL = 5

function johtoOpen() { return hofEntries() >= JOHTO_ENTRIES }
function johtoBeaten() { return regionBeaten("johto") }
// Later generations' evolutions and babies of older Pokémon (Crobat, Pichu; Azurill, Wynaut) wait
// until their region is beaten.
crossGenOpen = gen => gen <= 2 ? johtoBeaten() : hoennBeaten()
/** The highest species number this save can meet (Breeder's notes, Pokédex pages). */
function maxSpecies() { return Math.max(...dexRegions().map(r => REGIONS[r].maxSpecies)) }

// ---- Hoenn: a journey of its own ----
// After HOENN_ENTRIES Johto Hall of Fame entries, a new run can start in Hoenn with one of
// Professor Birch's starters instead of Oak's. Hoenn's Champion enters the Hall for Fame ×HOENN_FAME.
const HOENN_ENTRIES = 3 // REGIONS.hoenn.opens.entries
const HOENN_FAME = 2.5 // REGIONS.hoenn.fame
function hoennOpen() { return regionOpen("hoenn") }
function hoennBeaten() { return regionBeaten("hoenn") }

// ---- Journeys: regions opened by Hall of Fame entries ----
// A region with `opens` opens after that many entries as another region's Champion (Johto counts
// every entry, as it always has). Regions with `journey` start from the starter screen.
function regionOpen(r) {
	const opens = REGIONS[r]?.opens
	if (!opens) return r === "kanto"
	return r === "johto" ? johtoOpen() : regionEntries(opens.after) >= opens.entries
}
function regionBeaten(r) { return !!player.h?.regionsBeaten?.[r] }
function regionFame(r) { return REGIONS[r]?.fame || 1 }
/** Regions offered on the starter screen, in REGIONS's order. */
function journeyRegions() { return Object.keys(REGIONS).filter(r => REGIONS[r].journey) }
/** Starts this run in a region (before the starter is chosen). */
function startInRegion(region) {
	if (player.t.starter || !REGIONS[region]?.journey || !regionOpen(region)) return false
	player.t.region = region
	syncRegionRules()
	return true
}

function canSailToJohto() { return currentRegion() === "kanto" && isChampion() && johtoOpen() }
function sailToJohto() {
	if (!canSailToJohto()) return false
	player.t.journey = { kantoTeam: player.l.team || [], kantoTime: player.h.resetTime || 0 }
	player.t.region = "johto"
	player.t.johtoStarter = 0
	syncRegionRules()
	player.q.calls = []
	// A fresh start: badges, the League and the Field start over, and every Pokémon is back at Lv. 5.
	player.g.points = new Decimal(0)
	player.l.beaten = 0
	player.l.champion = false
	player.points = new Decimal(0)
	resetField()
	player.f.zone = regionZones()[0].id
	for (const key in player.t.box) {
		const entry = player.t.box[key]
		entry.level = JOHTO_START_LEVEL
		entry.xp = xpForLevel(SPECIES[speciesOf(key)].growth, JOHTO_START_LEVEL)
	}
	pkLog("You sail to Johto. Professor Elm is waiting in New Bark Town!", "story")
	return true
}
/** Professor Elm's gift: one of Johto's starters, at the starter's level. */
function chooseJohtoStarter(id) {
	if (currentRegion() !== "johto" || player.t.johtoStarter || !REGIONS.johto.starters.includes(Number(id))) return false
	player.t.johtoStarter = Number(id)
	addToBox(Number(id), JOHTO_START_LEVEL)
	if (!player.t.party.includes(String(id)) && player.t.party.length < partySize()) player.t.party.push(String(id))
	pkLog(`Professor Elm gives you ${speciesName(Number(id))}. Your Johto research begins on Route 29!`, "new", { id: Number(id) })
	return true
}
function needsJohtoStarter() { return currentRegion() === "johto" && !player.t.johtoStarter }

// ---- Johto's Pokégear and Kurt's Apricorn Balls ----
// The "p" layer: with the Radio Card, tune in to one of HeartGold/SoulSilver's swarms and its
// Pokémon join that place's pools; Kurt (from Azalea's badge on) crafts Apricorn Balls, each a
// catch bonus in its own situation. Kept through badges, reset by the Hall of Fame.

const SWARM_COST = 6000
const APRICORN_BALLS = {
	levelBall: { name: "Level Ball", cost: 20000, text: "Catch ×2 when your strongest party Pokémon out-levels the wild one, ×4 at double its level." },
	lureBall: { name: "Lure Ball", cost: 50000, text: "Catch ×3 on Pokémon hooked with a rod." },
	moonBall: { name: "Moon Ball", cost: 100000, text: "Catch ×4 on Pokémon that evolve with a Moon Stone." },
	fastBall: { name: "Fast Ball", cost: 200000, text: "Catch ×4 on Pokémon with a base Speed of 100 or more." },
	loveBall: { name: "Love Ball", cost: 400000, text: "Catch ×2 on Pokémon whose family is already in your box." },
}

// Hoenn's PokéNav ("p" too): the TV's mass-outbreak reports (Emerald's), Devon's Balls (from
// Rustboro, after Roxanne) and Mirage Island sightings after the League.
const HOENN_OUTBREAK_LIST = [["route102", 273], ["route114", 274], ["route116", 300], ["route117", 273], ["route120", 273], ["route102", 283], ["route111", 283], ["route114", 283], ["route117", 283], ["route120", 283]]
/** An outbreak adds the species at half the place's walking weight (about a third of encounters). */
const HOENN_OUTBREAKS = HOENN_OUTBREAK_LIST.map(([zoneId, species]) => {
	const walk = HOENN_ZONES.find(z => z.id === zoneId)?.pools.walk || []
	const weight = walk.reduce((s, e) => s + e[1], 0) / 2
	const lo = Math.min(...walk.map(e => e[2])), hi = Math.max(...walk.map(e => e[3]))
	return { zone: zoneId, species, pools: { walk: [[species, weight, lo, hi]] } }
}).filter(w => w.pools.walk[0][1] > 0)
const DEVON_BALLS = {
	netBall: { name: "Net Ball", cost: 20000, text: "Catch ×3 on Bug and Water Pokémon." },
	diveBall: { name: "Dive Ball", cost: 50000, text: "Catch ×3.5 on Pokémon found surfing, diving or fishing." },
	nestBall: { name: "Nest Ball", cost: 100000, text: "Catch up to ×4 on low-level Pokémon (×(40 − level) ÷ 10)." },
	repeatBall: { name: "Repeat Ball", cost: 200000, text: "Catch ×3 on species already caught this run." },
}
function pokenav() { return currentRegion() === "hoenn" }
function pokegearOpen() { return (currentRegion() === "johto" || pokenav()) && !!player.p }
function regionSwarms() { return pokenav() ? HOENN_OUTBREAKS : JOHTO_SWARMS }
function radioOpen() { return pokegearOpen() && (pokenav() ? badges() >= 1 : hasKeyItem("radioCard", badges())) }
function currentSwarm() { return pokegearOpen() && player.p.swarm ? regionSwarms().find(w => w.zone + w.species === player.p.swarm || w.zone === player.p.swarm) || null : null }
function swarmCost() { return new Decimal(SWARM_COST).times(Decimal.pow(2, badges())) }
function tuneSwarm(zoneId) {
	if (!radioOpen() || player.p.swarm === zoneId || player.points.lt(swarmCost())) return false
	if (!regionSwarms().some(w => w.zone === zoneId || w.zone + w.species === zoneId)) return false
	player.points = player.points.sub(swarmCost())
	player.p.swarm = zoneId
	return true
}
/** A zone with the radio's swarm (if it's here) added to its pools. */
function withSwarm(zone) {
	const w = currentSwarm()
	if (!w || w.zone !== zone.id) return zone
	const pools = { ...zone.pools }
	for (const p in w.pools) pools[p] = [...(pools[p] || []), ...w.pools[p]]
	return { ...zone, pools }
}

function kurtOpen() { return pokegearOpen() && badges() >= 1 }
function hasBall(id) { return !!player.p?.balls?.[id] }
/** The region's ball maker: Kurt's Apricorn Balls in Johto, Devon's in Hoenn. */
function regionBalls() { return pokenav() ? DEVON_BALLS : APRICORN_BALLS }
function buyBall(id) {
	const ball = regionBalls()[id]
	if (!ball || !kurtOpen() || hasBall(id) || player.points.lt(ball.cost)) return false
	player.points = player.points.sub(ball.cost)
	player.p.balls = { ...player.p.balls, [id]: true }
	return true
}
/** Every ball you hold (Apricorn or Devon) that helps with this encounter: the best of them counts. */
function ballMult(enc) {
	if (!player.p?.balls) return 1
	let best = 1
	const top = Math.max(0, ...player.t.party.map(k => player.t.box[k]?.level || 0))
	if (hasBall("levelBall") && top > enc.level) best = Math.max(best, top >= 2 * enc.level ? 4 : 2)
	if (hasBall("lureBall") && ROD_POOLS.includes(enc.pool)) best = Math.max(best, 3)
	if (hasBall("moonBall") && SPECIES[enc.id].evolutions.some(e => e.stone === "moonStone")) best = Math.max(best, 4)
	if (hasBall("fastBall") && SPECIES[enc.id].stats[5] >= 100) best = Math.max(best, 4)
	if (hasBall("loveBall") && Object.keys(player.t.box).some(k => breedingFamily(speciesOf(k)) === breedingFamily(enc.id))) best = Math.max(best, 2)
	if (hasBall("netBall") && SPECIES[enc.id].types.some(t => t === "bug" || t === "water")) best = Math.max(best, 3)
	if (hasBall("diveBall") && (enc.pool === "surf" || enc.pool === "dive" || ROD_POOLS.includes(enc.pool))) best = Math.max(best, 3.5)
	if (hasBall("nestBall")) best = Math.max(best, Math.min(4, (40 - enc.level) / 10))
	if (hasBall("repeatBall") && player.d.caught[enc.id]) best = Math.max(best, 3)
	return best
}

// Mirage Island: after Hoenn's League, every MIRAGE_BATTLES wild battles it may be sighted (the
// PokéNav's TV reports it) and stays in view for MIRAGE_SHOWN battles.
const MIRAGE_BATTLES = 300, MIRAGE_CHANCE = 1 / 3, MIRAGE_SHOWN = 150
function mirageVisible() { return currentRegion() === "hoenn" && (player.p?.mirage || 0) > 0 }
function mirageStep(rng) {
	if (!player.p || currentRegion() !== "hoenn" || !isChampion()) return
	if (player.p.mirage > 0) {
		player.p.mirage--
		if (player.p.mirage === 0 && player.f.zone === "mirageIsland") player.f.zone = regionZones()[0].id
		return
	}
	player.p.mirageBattles = (player.p.mirageBattles || 0) + 1
	if (player.p.mirageBattles < MIRAGE_BATTLES) return
	player.p.mirageBattles = 0
	if (rand(rng) < MIRAGE_CHANCE) {
		player.p.mirage = MIRAGE_SHOWN
		pkLog("📺 Mirage Island has been sighted off Route 130! It won't stay in view for long.", "story")
	}
}
