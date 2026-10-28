// Plays the game headlessly with a simple greedy strategy and reports when each badge falls.
// Usage: node scripts/simulate.js [starter=1|4|7] [seed]
//   SIM_JOHTO=1 starts with Johto open (three Hall of Fame entries) and plays the whole journey.
//   SIM_HOURS=n stops after n hours. SIM_RUNS=n enters the Hall of Fame and replays n runs in all,
//   buying Fame upgrades; SIM_CHALLENGE=id plays the runs after the first under that challenge.
// Runs js/data/kanto.js, js/engine.js and js/logic.js unchanged against a fake `player`.
const fs = require("fs")
const path = require("path")
const vm = require("vm")

const root = path.join(__dirname, "..")
const ctx = vm.createContext({ console, Math, JSON, Object, Array, Set, Number, String })
for (const file of ["js/technical/break_eternity.js", "js/data/kanto.js", "js/data/johto.js", "js/engine.js", "js/logic.js"])
	vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), ctx, { filename: file })

const starter = Number(process.argv[2] || 1)
let seed = Number(process.argv[3] || 1)
// Mulberry32, so runs repeat.
ctx.Math = Object.create(Math)
ctx.Math.random = () => {
	seed |= 0; seed = (seed + 0x6d2b79f5) | 0
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

vm.runInContext(`
var format = x => new Decimal(x).toNumber().toFixed(0)
var pkLog = () => {}
function freshField(keep) {
	return { upgrades: keep || [], buyables: { 11: new Decimal(0), 12: new Decimal(0), 13: new Decimal(0), 14: new Decimal(0) },
		zone: "route1", progress: 0, searching: true, unlocked: {}, encounters: 0, wins: 0 }
}
var player = {
	points: new Decimal(0), timePlayed: 0,
	f: freshField(),
	t: { starter: 0, box: {}, party: [], specials: {}, autoEvolve: true, nuzlocke: {}, region: "kanto", johtoStarter: 0 },
	g: { points: new Decimal(0) },
	l: { beaten: 0, champion: false, hallOfFame: [] },
	h: { points: new Decimal(0), hall: [], enshrined: {}, upgrades: [], buyables: {}, challenges: {}, activeChallenge: null, resetTime: 0 },
	d: { seen: {}, caught: {}, shiny: {}, forms: {}, hatched: {} },
	c: { slots: [], eggs: [], eggProgress: 0, upgrades: [] },
	k: { points: new Decimal(0), upgrades: [], buyables: {}, spinning: false },
	q: { progress: {}, calls: [], callProgress: 0, rematches: {} },
}
// The game's chooseStarter, without the UI.
function startRun(id) {
	player.t.starter = id
	addToBox(id, hofUpgrade(11) ? 10 : 5)
	if (hofUpgrade(11)) player.points = player.points.add(200)
	player.f = freshField(fieldKeptUpgrades())
}
resetField = () => { player.f = freshField(fieldKeptUpgrades()) }
// Entering the Hall of Fame: Fame, then a new run (the Pokédex stays).
function hallOfFameReset(challenge) {
	const fame = fameGain()
	enterHallOfFame()
	if (player.h.activeChallenge) player.h.challenges[player.h.activeChallenge] = 1
	player.h.points = player.h.points.add(fame)
	player.h.activeChallenge = challenge || null
	player.h.resetTime = 0
	player.points = new Decimal(0)
	player.t = { starter: 0, box: {}, party: [], specials: {}, autoEvolve: true, nuzlocke: {}, region: "kanto", johtoStarter: 0 }
	player.g = { points: new Decimal(0) }
	player.l = { beaten: 0, champion: false, hallOfFame: [] }
	player.k = { points: new Decimal(startingCoins()), upgrades: [], buyables: {}, spinning: false }
	player.q = { progress: {}, calls: [], callProgress: 0, rematches: {} }
	return fame
}
// Spends Fame greedily, cheapest first.
function fameShop() {
	for (let guard = 0; guard < 200; guard++) {
		const options = []
		for (const id in HOF_UPGRADES) if (!hofUpgrade(id)) options.push([HOF_UPGRADES[id].cost, () => player.h.upgrades.push(Number(id))])
		for (const id in HOF_BUYABLES) options.push([hofBuyableCost(id).toNumber(), () => { player.h.buyables[id] = new Decimal(hofBuyable(id) + 1) }])
		options.sort((a, b) => a[0] - b[0])
		if (!options.length || player.h.points.lt(options[0][0])) return
		player.h.points = player.h.points.sub(options[0][0])
		options[0][1]()
	}
}
`, ctx)

const run = code => vm.runInContext(code, ctx)
const RUNS = Number(process.env.SIM_RUNS || 1)
const CHALLENGE = process.env.SIM_CHALLENGE || ""
if (process.env.SIM_JOHTO) run(`player.h.hall = [1, 2, 3].map(() => ({ team: [], time: 0 }))`)
run(`startRun(${starter})`)

// Average Research Points per second in a zone with the current team (sampled battles).
function zoneValue(zone) {
	return run(`(() => {
		const zone = zoneById("${zone.id}"), team = partyBattlers()
		let rp = 0, n = 0
		for (const p of zonePools(zone, badges())) for (const [id, w, min, max] of zone.pools[p]) {
			const lv = Math.round((min + max) / 2)
			const r = battle(team, [battler(id, lv)])
			n += w
			if (r.win) rp += w * researchYield(id, lv) * (1 + xpYield(id, lv) / 400)
		}
		return rp / n
	})()`)
}

function chooseZone() {
	if (run(`!canChooseRoute()`)) return
	const open = run(`ALL_ZONES.filter(zoneOpen).map(z => z.id)`)
	// Survey first: the frontier zone with unseen species, if the team can win there.
	const unseen = run(`frontierZones().filter(z => zoneOpen(z) && zoneSpecies(z, badges()).some(id => !player.d.seen[id])).map(z => z.id)`)
	let best = null, bestValue = -1
	for (const id of open) {
		// Challenge runs also go after species that can join the party and aren't in the box yet.
		const wanted = run(`anyChallenge() && zoneSpecies(zoneById("${id}"), badges()).some(s => canJoinParty(s) && !ownsSpecies(s) && !(inChallenge(11) && player.t.nuzlocke["${id}"]))`)
		const v = zoneValue(run(`zoneById("${id}")`)) * (wanted ? 3 : 1) + (unseen.includes(id) ? 1e9 : 0)
		if (v > bestValue) { bestValue = v; best = id }
	}
	run(`player.f.zone = "${best}"`)
}

// The party: the box Pokémon that do best against the next opponent, else the strongest (the Team
// Coach's bestParty). Locked Party only fills empty slots after the first badge.
function chooseParty() {
	if (run(`inChallenge(42)`)) {
		run(`(() => { for (const k of bestParty()) if (player.t.party.length < partySize() && !player.t.party.includes(k)) player.t.party.push(k) })()`)
		return
	}
	run(`player.t.party = bestParty()`)
}
function shop() {
	for (let guard = 0; guard < 50; guard++) {
		const bought = run(`(() => {
			const options = []
			const next = nextFrontierZone()
			if (next) options.push([next.cost, () => unlockNextZone()])
			for (const id in FIELD_UPGRADES) {
				const u = FIELD_UPGRADES[id]
				if (!hasFieldUpgrade(id) && badges() >= u.badges)
					options.push([new Decimal(u.cost), () => { player.points = player.points.sub(u.cost); player.f.upgrades.push(Number(id)) }])
			}
			for (const id in FIELD_BUYABLES) {
				if (badges() < FIELD_BUYABLES[id].badges || !fieldBuyableAllowed(id)) continue
				const cost = fieldBuyableCost(id)
				options.push([cost, () => { player.points = player.points.sub(cost); player.f.buyables[id] = new Decimal(fieldBuyable(id) + 1) }])
			}
			for (const s of ALL_SPECIALS) if (specialStatus(s).ok) options.push([specialCost(s), () => takeSpecial(s)])
			// Game Corner prizes: buy the coins they still need, then trade them in.
			for (const s of ALL_SPECIALS) if (isPrize(s) && !player.t.specials[s.id] && gameCornerOpen() && specialOpen(s)) {
				const need = Math.max(0, prizeCoins(s) - coins())
				if (need > 0) options.push([coinsCost(need), () => { buyCoins(need); takeSpecial(s) }])
			}
			for (const key of Object.keys(player.t.box)) for (const e of itemEvolutions(speciesOf(key), badges()))
				if (canItemEvolve(key, e)) options.push([itemEvolutionCost(e), () => itemEvolve(key, e.into)])
			options.sort((a, b) => a[0].cmp(b[0]))
			if (options.length && player.points.gte(options[0][0])) { options[0][1](); return true }
			return false
		})()`)
		if (!bought) break
	}
}

const STEP = 1
const LIMIT = 60 * 60 * Number(process.env.SIM_HOURS || 40)
let t = 0, last = 0, surveyAt = null, winAt = null, runStart = 0, runNumber = 1
chooseZone(); chooseParty()
while (t < LIMIT) {
	run(`syncRegionRules(); player.points = player.points.add(passiveRp() * ${STEP}); player.f.searching = true; challengeTick(${STEP}); searchTick(${STEP})`)
	t += STEP
	if (t % 10 === 0) shop()
	if (t % 60 === 0) { chooseParty(); chooseZone() }
	if (t % 10 === 0) {
		chooseParty()
		if (surveyAt == null && run(`surveyStatus().done`)) surveyAt = t
		if (winAt == null && run(`!!(gymPrediction() || {}).win`)) winAt = t
		// Nuzlocke: wait until at most one Pokémon would faint (and be released).
		if (run(`canChallengeGym() && !(inChallenge(11) && gymPrediction().fainted > 1)`)) {
			const b = run(`badges()`) + 1
			console.log(`${runNumber > 1 ? `Run ${runNumber} ` : ""}${run("currentRegion() === 'johto' ? 'Johto ' : ''")}Badge ${b} at ${(t / 3600).toFixed(2)} h (+${((t - last) / 60).toFixed(0)} min; survey +${((surveyAt - last) / 60).toFixed(0)}, team +${((winAt - last) / 60).toFixed(0)}) gear ${run("[11,12,13,14].map(fieldBuyable).join('/')")} ups ${run("player.f.upgrades.join(',')")} RP ${run("format(player.points)")} caught ${run("caughtCount()")} cap ${run("currentCap()")} party ${run("player.t.party.map(k => keyName(k) + ' ' + player.t.box[k].level).join(', ')")}`)
			last = t; surveyAt = winAt = null
			run(`(() => {
				winGymBattle()
				const gear = hofUpgrade(13) ? Math.floor(fieldBuyable(13) / 2) : 0
				player.g.points = player.g.points.add(1); player.points = new Decimal(0); player.f = freshField(fieldKeptUpgrades())
				player.f.buyables[13] = new Decimal(gear)
			})()`)
			chooseParty(); chooseZone()
		}
		// Kanto's story: battle on whenever the forecast wins.
		const cleared = run(`STORY_CHAPTERS.filter(ch => chapterCleared(ch.id)).map(ch => ch.id).join()`)
		run(`rematchTick()`)
		if (run(`storyTick()`)) {
			const now = run(`STORY_CHAPTERS.filter(ch => chapterCleared(ch.id)).map(ch => ch.id)`)
			for (const id of now) if (!cleared.split(",").includes(id)) console.log(`  ${id} cleared at ${(t / 3600).toFixed(2)} h (badges ${run("badges()")})`)
		}
		for (let k = 0; k < 5; k++) if (run(`canChallengeLeague(player.l.beaten) && !(inChallenge(11) && leaguePrediction(player.l.beaten).fainted > (player.l.beaten === 4 ? 6 : 1)) && challengeLeague(player.l.beaten)`)) {
			console.log(`League: ${run("player.l.beaten")} beaten at ${(t / 3600).toFixed(2)} h`)
		}
		// Kanto's Champion sails on to Johto when it's open, and takes Elm's starter of the same type.
		if (run(`canSailToJohto()`)) {
			console.log(`Kanto Champion at ${((t - runStart) / 3600).toFixed(2)} h: sailing to Johto`)
			run(`sailToJohto(); chooseJohtoStarter(${({ 1: 152, 4: 155, 7: 158 })[starter] || 152})`)
			last = t
			chooseParty(); chooseZone()
		}
		if (run(`isChampion() && currentRegion() === "johto" && !chapterCleared("mtSilver")`)) {
			if (run(`canStoryBattle(chapterById("mtSilver"))`)) { run(`storyBattle("mtSilver")`); console.log(`  Red beaten at ${((t - runStart) / 3600).toFixed(2)} h`) }
			// Waits up to SIM_RED hours (default 2) for a team that beats Red, then enters the Hall anyway.
			else if (t - last < 3600 * Number(process.env.SIM_RED || 2)) continue
		}
		if (run(`isChampion()`)) {
			console.log(`Run ${runNumber}${run("anyChallenge() ? ' (' + CHALLENGES[player.h.activeChallenge].name + ')' : ''")}: Champion after ${((t - runStart) / 3600).toFixed(2)} h`)
			if (runNumber >= RUNS) break
			console.log(`  Hall of Fame: +${run(`hallOfFameReset(${JSON.stringify(CHALLENGE)})`)} Fame`)
			run(`fameShop(); startRun(${starter})`)
			console.log(`  Fame now spent: ${run("JSON.stringify({ups: player.h.upgrades, buy: Object.fromEntries(Object.keys(HOF_BUYABLES).map(id => [id, hofBuyable(id)]))})")}`)
			runNumber++; runStart = t; last = t
			chooseParty(); chooseZone()
		}
	}
	if (t % 3600 === 0) console.log(`  ${t / 3600} h: badges ${run("badges()")} RP ${run("format(player.points)")} zone ${run("player.f.zone")} survey missing ${run("surveyStatus().missing.map(speciesName).join(',')")} party ${run("player.t.party.map(k => keyName(k) + ' ' + player.t.box[k].level).join(', ')")} league ${run("badges() >= 8 && !isChampion() ? JSON.stringify((({win,defeated})=>({win,defeated}))(leaguePrediction(player.l.beaten))) : '-'")} gym ${run("JSON.stringify((({win,defeated})=>({win,defeated}))(gymPrediction()||{}))")}`)
}

console.log(`Starter ${starter}: ${run("isChampion()") ? "Champion" : "not Champion"} after ${(t / 3600).toFixed(2)} h in all (run ${runNumber}), caught ${run("caughtCount()")}`)
// A run that can't even beat Brock means something broke.
if (run("badges() === 0 && hofEntries() === 0")) { console.error("No badge earned"); process.exit(1) }
