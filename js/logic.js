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
function dexMilestone(n) { return caughtCount() >= n }
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
	return new Decimal(b.base).times(Decimal.pow(b.growth, amount))
}

function rpMult() {
	let m = Math.pow(BADGE_RP_BOOST, badges()) * (1 + 0.25 * hofBuyable(11))
	if (hasFieldUpgrade(13)) m *= 1 + caughtCount() / 50
	if (dexMilestone(10)) m *= 1.5
	if (dexMilestone(80)) m *= 2
	if (dexMilestone(150)) m *= 5
	return m
}
function wildRpMult() { return rpMult() * (hasFieldUpgrade(21) ? 1.5 : 1) }
function passiveRp() {
	if (!player.t.starter) return 0
	return caughtCount() * 0.05 * rpMult() * (hasFieldUpgrade(23) ? 5 : 1) * (hofUpgrade(22) ? 3 : 1)
}
function xpMult() {
	let m = (1 + fieldBuyableStep(14, 0.25) * fieldBuyable(14)) * (1 + 0.25 * hofBuyable(12))
	if (dexMilestone(60)) m *= 2
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
	let m = (1 + fieldBuyableStep(12, 0.15) * fieldBuyable(12)) * (1 + 0.1 * hofBuyable(15))
	if (dexMilestone(25)) m *= 1.25
	return m
}
function gearMult() { return 1 + 0.15 * fieldBuyable(13) }
function atkMult() {
	let m = gearMult() * Math.pow(BADGE_STAT_BOOST, badges()) * (1 + 0.05 * hofBuyable(13))
	if (hasFieldUpgrade(22)) m *= 1.25
	if (dexMilestone(120)) m *= 1.2
	return m
}
function defMult() {
	let m = gearMult() * Math.pow(BADGE_STAT_BOOST, badges()) * (1 + 0.05 * hofBuyable(13))
	if (dexMilestone(120)) m *= 1.2
	return m
}
function shinyOdds() {
	let odds = BASE_SHINY_ODDS
	if (hasFieldUpgrade(15)) odds /= 2
	if (hofUpgrade(15)) odds /= 2
	if (dexMilestone(100)) odds /= 3
	return odds
}
function partySize() {
	if (inChallenge(13)) return 1
	return Math.min(6, 3 + Math.floor(badges() / 2) + (hofUpgrade(14) ? 1 : 0))
}
/** The types of this run's starter (its original species, even after it evolves). */
function starterTypes() { return SPECIES[player.t.starter]?.types ?? [] }
function sharesStarterType(id) { return SPECIES[id].types.some(t => starterTypes().includes(t)) }
/** Monotype runs only let Pokémon sharing a type with the starter into the party. */
function canJoinParty(id) { return !inChallenge(12) || sharesStarterType(id) }

// ---- Map ----

function zoneById(id) { return ZONES.find(z => z.id === id) }

/** Zones of the area you're surveying now: they open one by one, for Research Points. */
function frontierZones() {
	const b = badges()
	return ZONES.filter(z => z.badges === b && !z.postGame)
}
function zoneUnlockCost(index) {
	return new Decimal(25).times(Decimal.pow(1.8, index)).times(Decimal.pow(5, badges())).times(hofUpgrade(12) ? 0.5 : 1)
}
function zoneOpen(zone) {
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
function dexCatch(id, shiny) {
	if (!player.d.seen[id]) player.d.seen[id] = 1
	player.d.caught[id] = (player.d.caught[id] || 0) + 1
	if (shiny) player.d.shiny[id] = (player.d.shiny[id] || 0) + 1
}

/** Adds a Pokémon to the box. The box keeps one of each species: the higher level (or the shiny). */
function addToBox(id, level, shiny) {
	const old = player.t.box[id]
	dexCatch(id, shiny)
	if (old && old.level >= level && (old.shiny || !shiny)) return false
	player.t.box[id] = { level: Math.max(level, old ? old.level : 0), xp: 0, shiny: !!shiny || !!(old && old.shiny) }
	player.t.box[id].xp = xpForLevel(SPECIES[id].growth, player.t.box[id].level)
	if (!old && player.t.party.length < partySize() && canJoinParty(id)) player.t.party.push(Number(id))
	return true
}

/**
 * Pokémon don't evolve into a species you already have: the box keeps one of each, so evolving
 * would merge the two and lose the earlier form.
 */
function canEvolveInto(into) { return !player.t.box[into] }

/** Evolves a box Pokémon: it takes the evolution's place in the box (and the party). */
function evolve(id, into) {
	id = Number(id)
	const entry = player.t.box[id]
	if (!entry) return
	delete player.t.box[id]
	const existing = player.t.box[into]
	if (!existing || existing.level < entry.level) player.t.box[into] = entry
	if (existing && existing.shiny) player.t.box[into].shiny = true
	dexCatch(into, entry.shiny)
	const slot = player.t.party.indexOf(id)
	if (slot >= 0) {
		if (player.t.party.includes(into)) player.t.party.splice(slot, 1)
		else player.t.party[slot] = into
	}
	player.t.evolved = (player.t.evolved || 0) + 1
	pkLog(`${speciesName(id)} evolved into ${speciesName(into)}!`, "evolve")
	// It might already be high enough for its next stage.
	const next = levelEvolution(into, player.t.box[into].level)
	if (next && canEvolveInto(next)) evolve(into, next)
}

function giveXp(id, xp) {
	const entry = player.t.box[id]
	if (!entry) return
	gainXp(entry, id, xp, currentCap())
	const into = levelEvolution(id, entry.level)
	if (into && canEvolveInto(into) && player.t.autoEvolve !== false) evolve(id, into)
}

function partyBattlers() {
	const atk = atkMult(), def = defMult()
	return player.t.party.filter(id => player.t.box[id]).map((id, i) => {
		// Challenge rewards: Lone Partner strengthens the lead, Monotype the starter's type.
		const lead = i === 0 ? (inChallenge(13) ? LONE_PARTNER_BOOST : 1) * (beatChallenge(13) ? 1.2 : 1) : 1
		const typed = (inChallenge(12) ? MONOTYPE_BOOST : 1) * (beatChallenge(12) && sharesStarterType(id) ? 1.15 : 1)
		return battler(id, player.t.box[id].level, atk * lead * typed, def * lead)
	})
}

/** Nuzlocke: Pokémon that fainted in a battle are released. */
function releaseFainted(result) {
	if (!inChallenge(11) || !result.fainted) return
	for (const id of player.t.party.slice(0, result.fainted)) {
		delete player.t.box[id]
		pkLog(`${speciesName(id)} fainted and was released.`, "lose", { id })
	}
	player.t.party.splice(0, result.fainted)
}

// ---- Encounters ----

function currentZone() { return zoneById(player.f.zone) || ZONES[0] }

function doEncounter(rng) {
	const zone = currentZone()
	const enc = rollEncounter(zone, badges(), rng)
	const shiny = rand(rng) < 1 / shinyOdds()
	dexSee(enc.id)
	player.f.encounters++
	const team = partyBattlers()
	const result = battle(team, [battler(enc.id, enc.level)])
	const name = `${shiny ? "★ " : ""}${speciesName(enc.id)} (Lv. ${enc.level})`
	// Nuzlocke: only the first new species met on each route may be caught (shinies always can).
	const nuzlocke = inChallenge(11)
	const firstHere = nuzlocke && !player.t.nuzlocke[zone.id] && !player.t.box[enc.id]
	if (firstHere) player.t.nuzlocke[zone.id] = enc.id
	if (!result.win) {
		// Nuzlocke runs flee from battles they'd lose rather than lose the party.
		pkLog(nuzlocke ? `You fled from a wild ${name}.` : `A wild ${name} was too strong and got away.`, "lose", enc, shiny)
		return { ...enc, shiny, win: false }
	}
	player.f.wins++
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
	const caught = rand(rng) < catchChance(enc.id, catchMult())
	if (caught) {
		const isNew = !player.d.caught[enc.id]
		addToBox(enc.id, enc.level, shiny)
		pkLog(`Caught ${name}!${isNew ? " New in the Pokédex!" : ""}`, isNew || shiny ? "new" : "catch", enc, shiny)
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
function nextGym() { return GYMS[badges()] || null }
function gymPrediction() {
	const gym = nextGym()
	if (!gym) return null
	return battle(partyBattlers(), trainerBattlers(gym, GYM_STRENGTH[badges()]))
}
function canChallengeGym() {
	const p = gymPrediction()
	return !!p && p.win && surveyStatus().done
}
/** Earning a badge: in a Nuzlocke, the Pokémon that fell in the Gym battle are released. */
function winGymBattle() {
	releaseFainted(gymPrediction())
}

function leagueTrainers() {
	const champion = CHAMPIONS[player.t.starter] || CHAMPIONS[1]
	return [...ELITE_FOUR.map(t => ({ ...t, strength: ELITE_FOUR_STRENGTH })), { ...champion, strength: CHAMPION_STRENGTH }]
}
function leaguePrediction(k) {
	const t = leagueTrainers()[k]
	return battle(partyBattlers(), trainerBattlers(t, t.strength))
}
function canChallengeLeague(k) {
	return badges() >= 8 && !isChampion() && k < leagueTrainers().length && player.l.beaten === k && surveyStatus().done && leaguePrediction(k).win
}
function challengeLeague(k) {
	if (!canChallengeLeague(k)) return false
	releaseFainted(leaguePrediction(k))
	player.l.beaten = k + 1
	const t = leagueTrainers()[k]
	if (k === leagueTrainers().length - 1) {
		player.l.champion = true
		player.l.hallOfFame.push({ team: player.t.party.map(id => [id, player.t.box[id].level]), time: player.timePlayed })
		player.l.team = player.t.party.map(id => [id, player.t.box[id].level, !!player.t.box[id].shiny])
		pkLog(`You beat ${t.name} and became the Pokémon League Champion!`, "league")
	} else pkLog(`${t.name} of the Elite Four is beaten!`, "league")
	return true
}

// ---- Gifts, trades and legendaries ----

/** Pokédollar prices become Research Points at this rate. */
const PRICE_TO_RP = 2

function specialCost(s) {
	return new Decimal(s.price ? s.price * PRICE_TO_RP * (hofUpgrade(21) ? 0.25 : 1) : 0)
}
function specialOpen(s) {
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
	if (s.keyItem && !hasKeyItem(s.keyItem, badges())) return { ok: false, why: `Needs the ${KEY_ITEMS[s.keyItem].name}` }
	if (s.kind === "trade" && !player.t.box[s.wants]) return { ok: false, why: `Show a ${speciesName(s.wants)}` }
	if (s.kind === "legendary" && !legendaryPrediction(s).win) return { ok: false, why: "Too strong for now" }
	if (player.points.lt(specialCost(s))) return { ok: false, why: `${format(specialCost(s))} RP` }
	return { ok: true }
}
function takeSpecial(s) {
	if (!specialStatus(s).ok) return false
	player.points = player.points.sub(specialCost(s))
	player.t.specials[s.id] = true
	const shiny = rand() < 1 / shinyOdds()
	addToBox(s.species, s.level, shiny)
	pkLog(s.kind === "legendary" ? `You caught ${speciesName(s.species)}!` : `${speciesName(s.species)} joined you!`, "new", { id: s.species }, shiny)
	return true
}

// ---- Evolution items ----

/** Research Points for an evolution stone (₽2,100 in the games); trades are free. */
function itemEvolutionCost(e) { return new Decimal(e.method === "trade" ? 0 : 2100 * PRICE_TO_RP) }
function canItemEvolve(id, e) {
	return !!player.t.box[id] && e.open && canEvolveInto(e.into) && player.points.gte(itemEvolutionCost(e))
}
function itemEvolve(id, into) {
	const e = itemEvolutions(id, badges()).find(e => e.into === Number(into))
	if (!e || !canItemEvolve(id, e)) return false
	player.points = player.points.sub(itemEvolutionCost(e))
	evolve(id, e.into)
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
// gifts) for Fame. The Pokédex, achievements and the Hall itself are kept.

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
	return Math.floor(fame)
}
/** Records the run in the Hall of Fame (the reset itself is TMT's). */
function enterHallOfFame() {
	const team = player.l.team || []
	for (const [id] of team) player.h.enshrined[id] = true
	player.h.hall.push({ team, time: player.h.resetTime || 0, challenge: player.h.activeChallenge || null })
}

function starterChoices() { return hofEntries() >= 3 ? [...STARTERS, 25, 133] : STARTERS }
