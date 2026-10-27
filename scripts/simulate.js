// Plays the game headlessly with a simple greedy strategy and reports when each badge falls.
// Usage: node scripts/simulate.js [starter=1|4|7] [seed]   (SIM_HOURS=n stops after n hours)
// Runs js/data/kanto.js, js/engine.js and js/logic.js unchanged against a fake `player`.
const fs = require("fs")
const path = require("path")
const vm = require("vm")

const root = path.join(__dirname, "..")
const ctx = vm.createContext({ console, Math, JSON, Object, Array, Set, Number, String })
for (const file of ["js/technical/break_eternity.js", "js/data/kanto.js", "js/engine.js", "js/logic.js"])
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
	t: { starter: 0, box: {}, party: [], specials: {}, autoEvolve: true },
	g: { points: new Decimal(0) },
	l: { beaten: 0, champion: false, hallOfFame: [] },
	d: { seen: {}, caught: {}, shiny: {} },
}
`, ctx)

const run = code => vm.runInContext(code, ctx)
run(`player.t.starter = ${starter}; addToBox(${starter}, 5, false)`)

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
	const open = run(`ZONES.filter(zoneOpen).map(z => z.id)`)
	// Survey first: the frontier zone with unseen species, if the team can win there.
	const unseen = run(`frontierZones().filter(z => zoneOpen(z) && zoneSpecies(z, badges()).some(id => !player.d.seen[id])).map(z => z.id)`)
	let best = null, bestValue = -1
	for (const id of open) {
		const v = zoneValue(run(`zoneById("${id}")`)) + (unseen.includes(id) ? 1e9 : 0)
		if (v > bestValue) { bestValue = v; best = id }
	}
	run(`player.f.zone = "${best}"`)
}

// The party: the box Pokémon that do best against the next opponent, else the strongest.
function chooseParty() {
	run(`(() => {
		const size = partySize(), atk = atkMult(), def = defMult()
		const gym = nextGym()
		const foes = gym ? trainerBattlers(gym, GYM_STRENGTH[badges()]) : badges() >= 8 && player.l.beaten < 5
			? trainerBattlers(leagueTrainers()[player.l.beaten], leagueTrainers()[player.l.beaten].strength) : null
		const ids = Object.keys(player.t.box).map(Number)
		const score = id => {
			const b = battler(id, player.t.box[id].level, atk, def)
			if (!foes) return battlerScore(id, player.t.box[id].level)
			const r = battle([b], foes)
			return r.defeated + r.hpLeft + battlerScore(id, player.t.box[id].level) * 1e-12
		}
		ids.sort((a, b) => score(b) - score(a))
		player.t.party = ids.slice(0, size)
	})()`)
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
				if (badges() < FIELD_BUYABLES[id].badges) continue
				const cost = fieldBuyableCost(id)
				options.push([cost, () => { player.points = player.points.sub(cost); player.f.buyables[id] = new Decimal(fieldBuyable(id) + 1) }])
			}
			for (const s of SPECIALS) if (specialStatus(s).ok) options.push([specialCost(s), () => takeSpecial(s)])
			for (const id of Object.keys(player.t.box)) for (const e of itemEvolutions(Number(id), badges()))
				if (canItemEvolve(Number(id), e)) options.push([itemEvolutionCost(e), () => itemEvolve(Number(id), e.into)])
			options.sort((a, b) => a[0].cmp(b[0]))
			if (options.length && player.points.gte(options[0][0])) { options[0][1](); return true }
			return false
		})()`)
		if (!bought) break
	}
}

const STEP = 1
const LIMIT = 60 * 60 * Number(process.env.SIM_HOURS || 40)
let t = 0, last = 0, surveyAt = null, winAt = null
chooseZone(); chooseParty()
while (t < LIMIT) {
	run(`player.points = player.points.add(passiveRp() * ${STEP}); player.f.searching = true; searchTick(${STEP})`)
	t += STEP
	if (t % 10 === 0) shop()
	if (t % 60 === 0) { chooseParty(); chooseZone() }
	if (t % 10 === 0) {
		chooseParty()
		if (surveyAt == null && run(`surveyStatus().done`)) surveyAt = t
		if (winAt == null && run(`!!(gymPrediction() || {}).win`)) winAt = t
		if (run(`canChallengeGym()`)) {
			const b = run(`badges()`) + 1
			console.log(`Badge ${b} at ${(t / 3600).toFixed(2)} h (+${((t - last) / 60).toFixed(0)} min; survey +${((surveyAt - last) / 60).toFixed(0)}, team +${((winAt - last) / 60).toFixed(0)}) gear ${run("[11,12,13,14].map(fieldBuyable).join('/')")} ups ${run("player.f.upgrades.join(',')")} RP ${run("format(player.points)")} caught ${run("caughtCount()")} cap ${run("currentCap()")} party ${run("player.t.party.map(id => speciesName(id) + ' ' + player.t.box[id].level).join(', ')")}`)
			last = t; surveyAt = winAt = null
			run(`player.g.points = player.g.points.add(1); player.points = new Decimal(0); player.f = freshField(fieldKeptUpgrades())`)
			chooseParty(); chooseZone()
		}
		for (let k = 0; k < 5; k++) if (run(`challengeLeague(player.l.beaten)`)) {
			console.log(`League: ${run("player.l.beaten")} beaten at ${(t / 3600).toFixed(2)} h`)
		}
		if (run(`isChampion()`)) break
	}
	if (t % 3600 === 0) console.log(`  ${t / 3600} h: badges ${run("badges()")} RP ${run("format(player.points)")} zone ${run("player.f.zone")} survey missing ${run("surveyStatus().missing.map(speciesName).join(',')")} gym ${run("JSON.stringify((({win,defeated})=>({win,defeated}))(gymPrediction()||{}))")}`)
}

console.log(`Starter ${starter}: ${run("isChampion()") ? "Champion" : "not Champion"} after ${(t / 3600).toFixed(2)} h, caught ${run("caughtCount()")}`)
// A run that can't even beat Brock means something broke.
if (run("badges()") === 0) { console.error("No badge earned"); process.exit(1) }
