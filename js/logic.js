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
	let m = Math.pow(BADGE_RP_BOOST, badges()) * (1 + 0.25 * hofBuyable(11)) * (inChallenge(31) ? 0.25 : 1)
	if (hasFieldUpgrade(13)) m *= 1 + caughtCount() / 50
	if (dexMilestone(10)) m *= 1.5
	if (dexMilestone(80)) m *= 2
	if (dexMilestone(150)) m *= 5
	if (formMilestone(3)) m *= 1.25
	m *= 1 + 0.02 * hatchedSpecies()
	if (wardenMilestone(25)) m *= 1.2
	m *= 1 + 0.1 * gameCornerBuyable(12)
	if (jackpotMilestone(5)) m *= 1.1
	m *= 1 + 0.01 * shinySpecies()
	if (rocketMilestone(10)) m *= 1.1
	if (rivalMilestone(15)) m *= 1.1
	return m
}
function wildRpMult() { return rpMult() * (hasFieldUpgrade(21) ? 1.5 : 1) * (inChallenge(52) ? 0.5 : 1) }
function passiveRp() {
	if (!player.t.starter || inChallenge(51)) return 0
	return caughtCount() * 0.05 * rpMult() * (hasFieldUpgrade(23) ? 5 : 1) * (hofUpgrade(22) ? 3 : 1)
}
function xpMult() {
	let m = (1 + fieldBuyableStep(14, 0.25) * fieldBuyable(14)) * (1 + 0.25 * hofBuyable(12))
	if (dexMilestone(60)) m *= 2
	if (formMilestone(ALL_FORMS.length)) m *= 1.5
	m *= 1 + 0.1 * gameCornerBuyable(13)
	if (rivalMilestone(3)) m *= 1.2
	return m
}
function searchTime() {
	let t = BASE_SEARCH_TIME / (1 + fieldBuyableStep(11, 0.25) * fieldBuyable(11)) / (1 + 0.1 * hofBuyable(14))
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
	return m
}
function gearMult() { return 1 + 0.15 * fieldBuyable(13) }
function atkMult() {
	let m = gearMult() * Math.pow(BADGE_STAT_BOOST, badges()) * (1 + 0.05 * hofBuyable(13))
	if (hasFieldUpgrade(22)) m *= 1.25
	if (dexMilestone(120)) m *= 1.2
	if (rocketMilestone(40)) m *= 1.1
	if (hasDiploma()) m *= 1.1
	return m
}
function defMult() {
	let m = gearMult() * Math.pow(BADGE_STAT_BOOST, badges()) * (1 + 0.05 * hofBuyable(13))
	if (dexMilestone(120)) m *= 1.2
	if (rivalMilestone(7)) m *= 1.1
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
function zoneUnlockCost(index) {
	return new Decimal(25).times(Decimal.pow(1.8, index)).times(Decimal.pow(5, badges())).times(hofUpgrade(12) ? 0.5 : 1).times(region().zoneCost)
}
function zoneOpen(zone) {
	if (zone.region !== currentRegion()) return false
	if (zone.anime) return animeOpen(zone)
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
function dexCatch(id, shiny, form) {
	if (!player.d.seen[id]) player.d.seen[id] = 1
	player.d.caught[id] = (player.d.caught[id] || 0) + 1
	if (shiny) player.d.shiny[id] = (player.d.shiny[id] || 0) + 1
	if (form) player.d.forms[`${id}-${form}`] = (player.d.forms[`${id}-${form}`] || 0) + 1
}

// ---- Variants ----
// A species can come in several looks. Each (species, look) is its own box slot and party key:
// "15" is a Beedrill, "15-shiny" a shiny one, "150-clone" a clone (FORMS in engine.js) and
// "25-clone-shiny" both. Albino and Melanistic (shiny and albino at once) are planned as further
// looks.
/** The look part of a key: "" for a plain Pokémon, else its form and/or "shiny". */
function makeLook(form, shiny) { return [form, shiny ? "shiny" : null].filter(Boolean).join("-") }
function boxKey(id, look = "") {
	return typeof look === "string" && look && look !== "normal" ? `${Number(id)}-${look}` : String(Number(id))
}
function speciesOf(key) { return parseInt(key) }
function lookOf(key) { return String(key).split("-").slice(1).join("-") }
function variantOf(key) { return lookOf(key) || "normal" }
function isShiny(key) { return String(key).split("-").includes("shiny") }
function formOf(key) { return String(key).split("-").slice(1).find(p => p !== "shiny") || null }
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
function keyName(key) { return `${isShiny(key) ? "★ " : ""}${formName(speciesOf(key), formOf(key))}` }

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
	dexCatch(id, isShiny(key), formOf(key))
	// Hatching (or a Safari catch of) a species you already own marks the one you own.
	if (old && origin && !old.origin) old.origin = origin
	if (old && old.level >= level) return false
	// origin: "egg" or "safari" where it matters (the Hatchling Run and Poacher's Net exempt them).
	player.t.box[key] = { level, xp: xpForLevel(SPECIES[id].growth, level), variant, ...(origin || old?.origin ? { origin: origin || old.origin } : {}) }
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
	dexCatch(into, isShiny(key))
	const slot = player.t.party.indexOf(key)
	if (slot >= 0) {
		if (player.t.party.includes(newKey)) player.t.party.splice(slot, 1)
		else player.t.party[slot] = newKey
	}
	player.t.evolved = (player.t.evolved || 0) + 1
	pkLog(`${keyName(key)} evolved into ${speciesName(into)}!`, "evolve", { id: into }, isShiny(key))
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

function partyBattlers() {
	const atk = atkMult(), def = defMult()
	return player.t.party.filter(key => player.t.box[key]).map((key, i) => {
		// Challenge rewards: Lone Partner strengthens the lead, Monotype the starter's type.
		const lead = i === 0 ? (inChallenge(13) ? LONE_PARTNER_BOOST : 1) * (beatChallenge(13) ? 1.2 : 1) : 1
		const typed = (inChallenge(12) ? MONOTYPE_BOOST : 1) * (beatChallenge(12) && sharesStarterType(key) ? 1.15 : 1)
		const form = FORMS[formOf(key)] || {}
		const handicap = challengeHandicap(player.t.box[key], key) * (shinyMilestone(25) && isShiny(key) ? 1.25 : 1)
		return battler(speciesOf(key), player.t.box[key].level, atk * lead * typed * (form.atk || 1) * handicap, def * lead * (form.def || 1) * handicap)
	})
}

/** Nuzlocke: Pokémon that fainted in a battle are released. */
function releaseFainted(result) {
	if (!inChallenge(11) || !result.fainted) return
	for (const key of player.t.party.slice(0, result.fainted)) {
		delete player.t.box[key]
		pkLog(`${keyName(key)} fainted and was released.`, "lose", { id: speciesOf(key) }, isShiny(key))
	}
	player.t.party.splice(0, result.fainted)
}

// ---- Encounters ----

function currentZone() { return zoneById(player.f.zone) || regionZones()[0] }

function doEncounter(rng) {
	const zone = currentZone()
	const enc = rollEncounter(withSwarm(zone), badges(), rng, huntLure())
	const shiny = rand(rng) < 1 / encounterShinyOdds(enc)
	const look = makeLook(enc.form, shiny)
	dexSee(enc.id)
	player.f.encounters++
	eggStep()
	const team = partyBattlers()
	const result = battle(team, [battler(enc.id, enc.level)])
	const name = `${shiny ? "★ " : ""}${formName(enc.id, enc.form)} (Lv. ${enc.level})`
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
	let caught = rand(rng) < catchChance(enc.id, catchMult() * speciesCatchMult(enc.id) * apricornMult(enc), enc.form)
	// Silph Co.'s Master Ball: the next new Pokémon beaten is caught for sure.
	if (!caught && player.r?.masterBall && !player.d.caught[enc.id]) {
		caught = true
		player.r.masterBall = false
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
	return badges() >= 8 && !isChampion() && k < leagueTrainers().length && player.l.beaten === k && surveyStatus().done && !leagueStoryGate() && leaguePrediction(k).win
}
function challengeLeague(k) {
	if (!canChallengeLeague(k)) return false
	releaseFainted(leaguePrediction(k))
	player.l.beaten = k + 1
	const t = leagueTrainers()[k]
	if (k === leagueTrainers().length - 1) {
		player.l.champion = true
		player.l.team = player.t.party.map(key => [speciesOf(key), player.t.box[key].level, isShiny(key), formOf(key)])
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
	if (s.anime && hofEntries() < s.hof) return false
	if (s.postGame && !isChampion()) return false
	return badges() >= s.badgesRequired
}
function legendaryPrediction(s) {
	return battle(partyBattlers(), [battler(s.species, s.level, s.strength, s.strength)])
}
/** Whether a special can be taken now, and why not. */
function specialStatus(s) {
	if (player.t.specials[s.id]) return { ok: false, why: "Done" }
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
	const shiny = !!s.shiny || rand() < 1 / shinyOdds()
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
	// A journey through Johto pays more, and beating Red on Mt. Silver more again.
	if (currentRegion() === "johto") fame *= JOHTO_FAME
	if (chapterCleared("mtSilver")) fame *= 1.5
	return Math.floor(fame)
}
/** Records the run in the Hall of Fame and starts the Pokédex over (the rest of the reset is TMT's). */
function enterHallOfFame() {
	const team = player.l.team || []
	for (const [id] of team) player.h.enshrined[id] = true
	player.h.hall.push({ team, time: player.h.resetTime || 0, challenge: player.h.activeChallenge || null, region: currentRegion() })
	if (currentRegion() === "johto") player.h.regionsBeaten = { ...player.h.regionsBeaten, johto: true }
	resetRunPokedex()
}

function starterChoices() { return hofEntries() >= 3 ? [...STARTERS, 25, 133] : STARTERS }

// ---- The anime ----
// Kanto's anime places open with Hall of Fame entries (zone.hof, by badge tier), then with badges
// like the games' routes. They aren't part of the Gym surveys. Their forms count in the Pokédex's
// Forms page, with milestones of their own.

function animeOpen(zone) {
	if (hofEntries() < zone.hof) return false
	return zone.postGame ? isChampion() : badges() >= zone.badges
}

/** Every form Kanto has: "id-form" keys from the anime places and events. */
const ALL_FORMS = [...new Set([
	...[...ZONES, ...JOHTO_ZONES].flatMap(z => Object.values(z.pools).flat().filter(e => e[4]).map(e => `${e[0]}-${e[4]}`)),
	...SPECIALS.filter(s => s.form).map(s => `${s.species}-${s.form}`),
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
	return 0.02 * Math.pow(currentCap(), 2.5) * xpMult() * (hasDayCareUpgrade(11) ? 3 : 1) * (1 + 0.5 * dayCareBuyable(11))
}
function eggSeconds() { return EGG_SECONDS / (hasDayCareUpgrade(12) ? 2 : 1) / (1 + 0.15 * dayCareBuyable(12)) * (inChallenge(52) ? 3 : 1) }
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
		const shinyParent = player.c.slots.some(isShiny)
		const species = options[Math.floor(rand() * options.length)]
		const battles = eggBattlesFor(species)
		player.c.eggs.push({ species, battles, total: battles, shinyBoost: shinyParent ? (hasHuntUpgrade(12) ? 4 : 2) : 1 })
		pkLog("The Day Care couple left an Egg!", "egg")
	}
	if (player.c.eggs.length >= maxEggs()) player.c.eggProgress = 0
}

/** Every wild battle counts down the Eggs; hatched ones join the box at Lv. 5. */
function eggStep() {
	if (!player.c || !player.c.eggs.length) return
	for (const egg of player.c.eggs) egg.battles--
	for (const egg of player.c.eggs.filter(e => e.battles <= 0)) {
		const shiny = rand() < egg.shinyBoost / shinyOdds()
		const isNew = !player.d.hatched[egg.species]
		player.d.hatched[egg.species] = (player.d.hatched[egg.species] || 0) + 1
		player.d.everHatched = { ...player.d.everHatched, [egg.species]: true }
		addToBox(egg.species, 5, shiny ? "shiny" : "normal", "egg")
		pkLog(`Oh? The Egg hatched into ${shiny ? "★ " : ""}${speciesName(egg.species)}!`, isNew || shiny ? "new" : "catch", { id: egg.species }, shiny)
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
function safariZone() { return inJohtoContest() ? BUG_CONTEST_ZONE : zoneById("safariZone") }
function safariOpen() { return hofEntries() >= 2 || badges() >= safariZone().badges }
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
	const enc = rollEncounter(safariZone(), badges(), rng)
	const shiny = rand(rng) < 1 / shinyOdds()
	const strategy = SAFARI_STRATEGIES[automationOn("safari") ? bestSafariStrategy(enc.id) : player.s.strategy] || SAFARI_STRATEGIES.balls
	const name = `${shiny ? "★ " : ""}${speciesName(enc.id)} (Lv. ${enc.level})`
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
			addToBox(enc.id, enc.level, shiny ? "shiny" : "normal", "safari")
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
	player.s.log.unshift({ text, kind, id: enc.id, shiny: !!shiny })
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
	buy: { challenge: 31, name: "Auto-buy", text: "Buys Field equipment, opens routes, and buys the Day Care's, Safari Zone's, Game Corner's and shiny hunting's buyables when you can afford them (cheapest first)." },
	eggs: { challenge: 32, name: "Day Care Lady", text: "Keeps the Day Care's pair laying Eggs, choosing pairs whose Eggs hatch into species you haven't hatched yet." },
	safari: { challenge: 33, name: "Warden's Pass", text: "Safari trips are free and start on their own, and each Pokémon gets the strategy most likely to catch it." },
	route: { challenge: 41, name: "Route Planner", text: "The Field moves itself to an open route with species you haven't seen, else one with Pokémon your box is missing." },
	coach: { challenge: 42, name: "Team Coach", text: "Your party rebuilds itself with the Pokémon that do best against the next Gym, League or story battle." },
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

/** Auto-buy: everything affordable, cheapest first, a few purchases per tick. */
function autoBuyTick() {
	if (!automationOn("buy")) return
	for (let guard = 0; guard < 10; guard++) {
		const options = []
		const next = nextFrontierZone()
		if (next) options.push([next.cost, () => unlockNextZone()])
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
		// The prize counter's buyables cost coins.
		if (!gameCornerOpen()) return
		const coinOptions = Object.keys(GAME_CORNER_BUYABLES).map(id => [buyableCost(GAME_CORNER_BUYABLES[id], gameCornerBuyable(id)).toNumber(), id]).sort((a, b) => a[0] - b[0])
		if (!coinOptions.length || coins() < coinOptions[0][0]) return
		const [cost, id] = coinOptions[0]
		addCoins(-cost)
		player.k.buyables[id] = new Decimal(gameCornerBuyable(id) + 1)
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
}
const HUNT_BUYABLES = {
	11: { title: "Lure", base: 2000, growth: 1.8, text: "Your target turns up 50% more often per level (where it lives)." },
	12: { title: "Radar Battery", base: 3000, growth: 1.9, text: "Each target beaten adds 25% more to the chain per level." },
	13: { title: "Shiny Lens", base: 10000, growth: 2.2, text: "Shiny Pokémon 10% more common everywhere per level." },
}
const SHINY_MILESTONES = [
	[1, "Shiny hunting opens from the start of every run."],
	[5, "A new target's chain starts at 10."],
	[10, "Shiny Pokémon twice as common everywhere."],
	[25, "Shiny Pokémon in your party fight 25% stronger."],
]

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
function encounterShinyOdds(enc) {
	return shinyOdds() / (enc.id === huntTarget() && !enc.form ? chainBonus() : 1)
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
// Each chapter is a place with trainers fought in order (player.r.progress[chapter] for Team
// Rocket's, player.v.progress for the Trainers node's). A cleared chapter gives its reward and can
// open a Gym (`gate`, the badge index it gates). Kept through badges, reset by the Hall of Fame.
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

const STORY_CHAPTERS = [
	// Johto: the Trainers node.
	{ id: "newBark", layer: "v", region: "johto", name: "Cherrygrove City", badges: 0, strength: 1.5, trainers: [SILVER(0)], reward: "Your rival's first battle: Research Points." },
	{ id: "sproutTower", layer: "v", region: "johto", name: "Sprout Tower", badges: 0, strength: 5, gate: 0, reward: "Elder Li gives you Flash: Falkner's Gym opens.",
		trainers: [{ name: "Sage", team: [[69, 6], [69, 6]] }, { name: "Sage", team: [[69, 7]] }, { name: "Sage", team: [[69, 6], [69, 6], [69, 6]] },
			{ name: "Elder Li", team: [[69, 7], [69, 7], [163, 10]], quote: "The flexible Bellsprout teaches us to bend with the wind." }] },
	{ id: "azaleaRival", layer: "v", region: "johto", name: "Azalea Town", badges: 2, strength: 8, trainers: [SILVER(1)], reward: "Research Points." },
	{ id: "burnedTowerRival", layer: "v", region: "johto", name: "Burned Tower", badges: 3, strength: 9, trainers: [SILVER(2)], reward: "Research Points." },
	{ id: "lighthouse", layer: "v", region: "johto", name: "Olivine Lighthouse", badges: 5, strength: 15, gate: 5, reward: "Chuck's wife's medicine heals Amphy: Jasmine returns to her Gym.",
		trainers: [{ name: "Sailor", team: [[66, 22], [61, 22]] }, { name: "Gentleman", team: [[58, 22], [164, 22]] }, { name: "Lass", team: [[183, 21], [209, 21]] },
			{ name: "Bird Keeper", team: [[17, 22], [83, 22]] }, { name: "Sailor", team: [[72, 24], [73, 24]] }] },
	{ id: "bellTower", layer: "v", region: "johto", name: "Bell Tower", badges: 7, needs: "radioTower", strength: 17, reward: "The Kimono Girls dance, and the Rainbow Wing calls Ho-Oh to the Bell Tower.",
		trainers: [{ name: "Kimono Girl Zuki", team: [[197, 38]] }, { name: "Kimono Girl Naoko", team: [[196, 38]] }, { name: "Kimono Girl Miki", team: [[136, 38]] },
			{ name: "Kimono Girl Sayo", team: [[134, 38]] }, { name: "Kimono Girl Kuni", team: [[135, 38]] }] },
	{ id: "victoryRoadSilver", layer: "v", region: "johto", name: "Victory Road", badges: 8, strength: 15, gateLeague: true, trainers: [SILVER(4)], reward: "Silver steps aside: the Indigo Plateau opens." },
	// Johto: Team Rocket.
	{ id: "slowpokeWell", layer: "r", region: "johto", name: "Slowpoke Well", badges: 1, strength: 8, gate: 1, reward: "The Slowpoke are safe: Kurt thanks you, and Bugsy's Gym opens.",
		trainers: [GRUNT([[19, 9], [19, 9]]), GRUNT([[41, 11], [41, 11]]), GRUNT([[23, 14]]),
			EXECUTIVE("Proton", [[41, 8], [109, 12]], "Cutting off Slowpoke tails is a fine business!")] },
	{ id: "mahoganyHideout", layer: "r", region: "johto", name: "Mahogany Hideout", badges: 6, strength: 16, gate: 6, reward: "Lance and you shut down the Rage signal: Pryce's Gym opens.",
		trainers: [GRUNT([[19, 21], [41, 22]]), GRUNT([[88, 21], [109, 22]]), EXECUTIVE("Petrel", [[41, 22], [109, 22], [109, 24]], "...You think you can stop us?"),
			GRUNT([[24, 23], [42, 23]]), EXECUTIVE("Ariana", [[24, 23], [44, 23], [198, 25]], "You've meddled enough!"),
			{ name: "Electrode (the generator)", team: [[101, 23], [101, 23], [101, 23]] }] },
	{ id: "radioTower", layer: "r", region: "johto", name: "Radio Tower", badges: 7, strength: 17, gate: 7, reward: "Team Rocket disbands: Clair's Gym opens, and the Director gives you the Silver Wing (Lugia).",
		trainers: [GRUNT([[20, 26], [42, 26]], { floor: "Underground" }), { ...SILVER(3), floor: "Underground" }, EXECUTIVE("Proton", [[42, 30], [110, 30]], "Do you know how hard we work?"),
			GRUNT([[89, 28], [24, 28]], { floor: "2F" }), EXECUTIVE("Petrel", [[110, 32], [109, 30], [109, 30]], "Fooled you!"),
			GRUNT([[229, 29], [42, 29]], { floor: "4F" }), EXECUTIVE("Ariana", [[24, 32], [45, 32], [198, 32]], "We will not be stopped!"),
			{ ...EXECUTIVE("Archer", [[228, 35], [110, 35], [229, 38]], "We will revive Team Rocket... and await Giovanni's return!"), boss: true, floor: "5F" }] },
	// The Trainers node ("v").
	{ id: "oakLab", layer: "v", name: "Oak's Lab", badges: 0, strength: 1, trainers: [RIVAL(0)], reward: "Your rival's first lesson: Research Points." },
	{ id: "route22", layer: "v", name: "Route 22", badges: 0, strength: 1.2, trainers: [RIVAL(1)], reward: "Research Points." },
	{ id: "ceruleanRival", layer: "v", name: "Cerulean City", badges: 1, strength: 2.2, trainers: [RIVAL(2)], reward: "Research Points." },
	{ id: "ssAnne", layer: "v", name: "S.S. Anne", badges: 2, strength: 3.2, gate: 2, reward: "The Captain teaches you Cut: the way to Lt. Surge's Gym opens.",
		trainers: [{ name: "Sailor", team: [[66, 18], [72, 18]] }, { name: "Gentleman", team: [[58, 18], [52, 18]] }, { name: "Lass", team: [[16, 18], [35, 18]] },
			{ name: "Fisherman", team: [[118, 17], [129, 17], [118, 17]] }, { ...RIVAL(3) }, { name: "The Captain", team: [[66, 21], [90, 21], [72, 21]] }] },
	{ id: "dojo", layer: "v", name: "Fighting Dojo", badges: 4, strength: 4.5, reward: "The Karate Master lets you choose Hitmonlee or Hitmonchan.",
		trainers: [{ name: "Black Belt", team: [[66, 31], [67, 31]] }, { name: "Black Belt", team: [[56, 32], [57, 32]] }, { name: "Black Belt", team: [[67, 34]] },
			{ name: "Karate Master", team: [[57, 37], [106, 37], [107, 37]] }] },
	{ id: "mtSilver", layer: "v", region: "johto", name: "Mt. Silver", badges: 8, champion: true, strength: 14, red: true,
		reward: "Red, the silent Champion of Kanto, nods and leaves the summit. Fame ×1.5 for this Hall of Fame entry.",
		trainers: [{ name: "Red", team: JOHTO_RED.team, quote: "…" }] },
	{ id: "route22Final", layer: "v", name: "Route 22 again", badges: 8, strength: 10, gateLeague: true, trainers: [RIVAL(6)], reward: "Your rival steps aside: Victory Road and the League open." },
	// Team Rocket ("r").
	{ id: "mtMoon", layer: "r", name: "Mt. Moon", badges: 1, strength: 2.8, gate: 1, reward: "The way through Mt. Moon to Cerulean City (and Misty's Gym) opens.",
		trainers: [GRUNT([[19, 13], [41, 13]]), GRUNT([[27, 11], [19, 11], [41, 11]]), JESSIE_JAMES([[23, 14], [109, 14]]), GRUNT([[41, 12], [23, 12]])] },
	{ id: "nuggetBridge", layer: "r", name: "Nugget Bridge", badges: 1, strength: 2.4, nugget: true, reward: "A Nugget: a lump of Research Points.",
		trainers: [GRUNT([[23, 15], [41, 15]], { quote: "Join Team Rocket! ...No? Then I'll take you down!" })] },
	{ id: "hideout", layer: "r", name: "Rocket Hideout", badges: 3, needGameCorner: true, strength: 3.2, reward: "The Silph Scope: Ghost Pokémon twice as easy to catch this run, and the Pokémon Tower's ghosts unmasked.",
		trainers: [
			GRUNT([[19, 20], [20, 20]], { floor: "B1F", coins: 150 }), GRUNT([[41, 20], [23, 20], [41, 20]], { floor: "B1F", coins: 150 }),
			GRUNT([[96, 21], [66, 21]], { floor: "B2F", coins: 300 }), GRUNT([[109, 21], [20, 21]], { floor: "B2F", coins: 300 }),
			GRUNT([[24, 22], [41, 22]], { floor: "B3F", coins: 450 }), GRUNT([[66, 21], [96, 22], [66, 21]], { floor: "B3F", coins: 450 }),
			GRUNT([[109, 23], [109, 23]], { floor: "B4F", coins: 600 }), GRUNT([[42, 23], [24, 23]], { floor: "B4F", coins: 600 }),
			{ name: "Giovanni", rocket: true, boss: true, floor: "B4F", strength: 5.5, team: [[95, 25], [111, 24], [115, 29]], quote: "So! I must say, I am impressed you got here." },
		] },
	{ id: "pokemonTower", layer: "r", name: "Pokémon Tower", badges: 4, needs: "hideout", strength: 7, gate: 4, reward: "Mr. Fuji is free and gives you the Poké Flute: Snorlax can be woken, and Koga's Gym opens.",
		trainers: [{ ...RIVAL(4), floor: "2F" }, { name: "Ghost (Marowak)", floor: "6F", team: [[105, 30]], quote: "Begone... Intruders..." },
			GRUNT([[41, 25], [41, 25], [42, 25]], { floor: "7F" }), GRUNT([[109, 26], [96, 26]], { floor: "7F" }), JESSIE_JAMES([[24, 27], [110, 27], [52, 27]]),
			GRUNT([[41, 23], [19, 23], [20, 23], [41, 23]], { floor: "7F" })] },
	{ id: "silphCo", layer: "r", name: "Silph Co.", badges: 5, needs: "pokemonTower", strength: 5.6, gate: 5, reward: "The Master Ball (the next new Pokémon you beat is caught for sure), Lapras, and Sabrina's Gym opens.",
		trainers: [
			GRUNT([[19, 29], [20, 29], [41, 29]], { floor: "2F" }), { name: "Scientist", rocket: true, floor: "2F", team: [[81, 29], [100, 29]] },
			GRUNT([[23, 31], [24, 31]], { floor: "3F" }), GRUNT([[109, 31], [42, 31]], { floor: "4F" }), { name: "Scientist", rocket: true, floor: "5F", team: [[100, 30], [81, 30], [101, 30]] },
			GRUNT([[52, 32], [96, 32]], { floor: "6F" }), { ...RIVAL(5), floor: "7F" }, GRUNT([[66, 33], [67, 33]], { floor: "8F" }),
			JESSIE_JAMES([[24, 31], [110, 31], [52, 31]]), { name: "Scientist", rocket: true, floor: "10F", team: [[82, 33], [110, 33]] }, GRUNT([[42, 34], [24, 34]], { floor: "11F" }),
			{ name: "Giovanni", rocket: true, boss: true, floor: "11F", strength: 6.6, team: [[33, 37], [115, 35], [111, 37], [31, 41]], quote: "Ah, we meet again. I am not going to let you ruin this deal!" },
		] },
]
const ROCKET_MILESTONES = [
	[5, "Rocket loot: Grunts drop twice as many coins."],
	[10, "Research Points ×1.1."],
	[20, "+10% catch chance everywhere."],
	[40, "Your party's Attack ×1.1."],
]
const RIVAL_MILESTONES = [
	[3, "Experience ×1.2."],
	[7, "Your party's Defense ×1.1."],
	[15, "Research Points ×1.1."],
]

// Gift rules from the story: the Dojo's choice and Silph Co.'s Lapras, Snorlax's Poké Flute.
const SPECIAL_STORY = { hitmonlee: "dojo", hitmonchan: "dojo", lapras: "silphCo", snorlax: "pokemonTower", whirlLugia: "radioTower", bellTowerHoOh: "bellTower" }
const DOJO_CHOICE = ["hitmonlee", "hitmonchan"]
for (const s of SPECIALS) if (s.id === "hitmonchan") s.text = "...or the punching fiend. You may choose only one."

function chapterById(id) { return STORY_CHAPTERS.find(c => c.id === id) }
function storyState(ch) { return player[ch.layer] }
function chapterProgress(ch) { return storyState(ch)?.progress?.[ch.id] || 0 }
function chapterCleared(id) { const ch = chapterById(id); return !!ch && chapterProgress(ch) >= ch.trainers.length }
function chapterRegion(ch) { return ch.region || "kanto" }
function chapterOpen(ch) {
	if (!storyState(ch)) return false
	if (chapterRegion(ch) !== currentRegion()) return false
	if (ch.champion && !isChampion()) return false
	if (badges() < ch.badges) return false
	if (ch.needs && !chapterCleared(ch.needs)) return false
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
	if (t.rocket) player.d.rockets = rocketsBeaten() + 1
	if (t.rival) player.d.rivalWins = rivalWins() + 1
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
	if (ch.id === "silphCo") player.r.masterBall = true
	pkLog(`${ch.name} cleared! ${ch.reward}`, ch.layer === "r" ? "rocket" : "story")
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
function giovanniBeaten() { return chapterCleared("hideout") }
function hasSilphScope() { return chapterCleared("hideout") }
/** Species-specific catch help: the Silph Scope unmasks Ghost Pokémon. */
function speciesCatchMult(id) { return hasSilphScope() && SPECIES[id].types.includes("ghost") ? 2 : 1 }

/** v0.10 kept the Hideout's progress as a number (player.r.beaten). */
function migrateStory() {
	if (player.r && typeof player.r.beaten === "number") {
		player.r.progress = { ...(player.r.progress || {}), hideout: Math.max(player.r.beaten, player.r.progress?.hideout || 0) }
		delete player.r.beaten
	}
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
const ALL_ZONES = [...ZONES, ...JOHTO_ZONES]
const ALL_SPECIALS = [...SPECIALS, ...JOHTO_SPECIALS]

const KEY_ITEM_NAMES = {
	oldRod: "Old Rod", goodRod: "Good Rod", superRod: "Super Rod", surf: "Surf", bicycle: "Bicycle", pokeFlute: "Poké Flute",
	headbutt: "Headbutt", rockSmash: "Rock Smash", squirtBottle: "SquirtBottle", radioCard: "Radio Card",
}
/** Key items from the Gyms' rewards: each comes with the badge of the Gym that gives it. */
function keyItemsFromGyms(gyms) {
	const items = {}
	gyms.forEach((g, i) => { for (const id of g.keyItems || []) items[id] = { badges: i + 1, name: KEY_ITEM_NAMES[id] || id } })
	return items
}
const JOHTO_STONES = Object.fromEntries(["moonStone", "fireStone", "waterStone", "thunderStone", "leafStone", "sunStone"].map(s => [s, 3]))
const JOHTO_DEX = [...new Set([
	...JOHTO_ZONES.flatMap(z => Object.values(z.pools).flat().map(e => e[0])),
	...JOHTO_SPECIALS.map(s => s.species),
	...Array.from({ length: 100 }, (_, i) => i + 152),
])].sort((a, b) => a - b)

/**
 * The regions of a journey. Kanto's rules are the engine's own; Johto (HeartGold/SoulSilver) has
 * its own Gyms, League, level caps, key items and strengths (tuned with the simulator).
 */
const REGIONS = {
	kanto: {
		name: "Kanto", professor: "Oak", starters: STARTERS, zones: ZONES, gyms: GYMS, eliteFour: ELITE_FOUR,
		champion: () => CHAMPIONS[player.t.starter] || CHAMPIONS[1], gymStrength: GYM_STRENGTH,
		eliteFourStrength: ELITE_FOUR_STRENGTH, championStrength: CHAMPION_STRENGTH, badgeImage: 1, zoneCost: 1,
		dex: Array.from({ length: 151 }, (_, i) => i + 1), rules: REGION_RULES,
	},
	johto: {
		name: "Johto", professor: "Elm", starters: [152, 155, 158], zones: JOHTO_ZONES, gyms: JOHTO_GYMS,
		eliteFour: JOHTO_ELITE_FOUR, champion: () => JOHTO_CHAMPION,
		gymStrength: [3.5, 6, 8, 6.5, 11, 12.5, 13, 11], eliteFourStrength: 10, championStrength: 9.5,
		badgeImage: 9, dex: JOHTO_DEX, zoneCost: 5,
		rules: { keyItems: keyItemsFromGyms(JOHTO_GYMS), levelCaps: [16, 20, 24, 28, 33, 37, 40, 45, 55, 100], stoneBadges: JOHTO_STONES, tradeBadges: 3 },
	},
}
function currentRegion() { return player.t?.region || "kanto" }
function region() { return REGIONS[currentRegion()] }
/** Points the engine at the current region's rules (call when the region may have changed). */
function syncRegionRules() { REGION_RULES = region().rules }
function regionZones() { return region().zones }
function regionGyms() { return region().gyms }
function gymStrength() { return region().gymStrength[badges()] }
function regionDex(region = currentRegion()) { return REGIONS[region].dex }
/** Regions whose Pokédex pages show: Kanto, and Johto once it's open. */
function dexRegions() { return Object.keys(REGIONS).filter(r => r === "kanto" || johtoOpen() || johtoBeaten()) }
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
	if (badges() >= 8 && !isChampion()) {
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
function autoPartyTick() {
	if (!automationOn("coach") || !player.t.starter) return
	if (inChallenge(42)) return
	const best = bestParty()
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
	if (target && here.includes(target) && !player.d.shiny[target]) return
	const choices = here.filter(id => player.d.seen[id] && !player.d.shiny[id])
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
const JOHTO_FAME = 2.5
const JOHTO_START_LEVEL = 5

function johtoOpen() { return hofEntries() >= JOHTO_ENTRIES }
function johtoBeaten() { return !!player.h?.regionsBeaten?.johto }
// Gen 2's evolutions and babies of Kanto Pokémon (Crobat, Pichu...) wait until Johto is beaten.
crossGenOpen = johtoBeaten
/** The highest species number this save can meet (Breeder's notes, Pokédex pages). */
function maxSpecies() { return johtoOpen() || johtoBeaten() ? 251 : 151 }

function canSailToJohto() { return currentRegion() === "kanto" && isChampion() && johtoOpen() }
function sailToJohto() {
	if (!canSailToJohto()) return false
	player.t.journey = { kantoTeam: player.l.team || [], kantoTime: player.h.resetTime || 0 }
	player.t.region = "johto"
	player.t.johtoStarter = 0
	syncRegionRules()
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

function pokegearOpen() { return currentRegion() === "johto" && !!player.p }
function radioOpen() { return pokegearOpen() && hasKeyItem("radioCard", badges()) }
function currentSwarm() { return pokegearOpen() && player.p.swarm ? JOHTO_SWARMS.find(w => w.zone === player.p.swarm) || null : null }
function swarmCost() { return new Decimal(SWARM_COST).times(Decimal.pow(2, badges())) }
function tuneSwarm(zoneId) {
	if (!radioOpen() || player.p.swarm === zoneId || player.points.lt(swarmCost())) return false
	if (!JOHTO_SWARMS.some(w => w.zone === zoneId)) return false
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
function buyBall(id) {
	const ball = APRICORN_BALLS[id]
	if (!ball || !kurtOpen() || hasBall(id) || player.points.lt(ball.cost)) return false
	player.points = player.points.sub(ball.cost)
	player.p.balls = { ...player.p.balls, [id]: true }
	return true
}
/** Every Apricorn Ball you hold that helps with this encounter (the best of them counts). */
function apricornMult(enc) {
	if (!player.p?.balls) return 1
	let best = 1
	const top = Math.max(0, ...player.t.party.map(k => player.t.box[k]?.level || 0))
	if (hasBall("levelBall") && top > enc.level) best = Math.max(best, top >= 2 * enc.level ? 4 : 2)
	if (hasBall("lureBall") && ROD_POOLS.includes(enc.pool)) best = Math.max(best, 3)
	if (hasBall("moonBall") && SPECIES[enc.id].evolutions.some(e => e.stone === "moonStone")) best = Math.max(best, 4)
	if (hasBall("fastBall") && SPECIES[enc.id].stats[5] >= 100) best = Math.max(best, 4)
	if (hasBall("loveBall") && Object.keys(player.t.box).some(k => breedingFamily(speciesOf(k)) === breedingFamily(enc.id))) best = Math.max(best, 2)
	return best
}
