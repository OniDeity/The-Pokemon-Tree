// The Safari Zone ("s"): trips of Safari Balls, no battles. Kept through badges; the Hall of Fame
// starts it over. Rules are in logic.js (safariTick, safariEncounter).

function setSafariStrategy(id) { player.s.strategy = id }
function ballName() { return inJohtoContest() ? "Park Ball" : "Safari Ball" }

function setPokeblockByColor(color) { setPokeblock(color) }
function pokeblockHtml() {
	if (!pokeblockOpen()) return ""
	const current = POKEBLOCKS[player.s.pokeblock]
	return `<b>Pokéblock feeder</b>: ${current ? `${current.name} (${current.flavor}) in the feeder: ${current.types.join(", ")} Pokémon turn up ×${POKEBLOCK_DRAW} as often.` : "<i>Empty.</i> Fill it to draw Pokémon of the block's types."}<br>
		${Object.entries(POKEBLOCKS).map(([c, b]) => `<button class="pk-button ${player.s.pokeblock === c ? "pk-on" : ""}" title="${b.flavor}: ${b.types.join(", ")}" ${player.s.pokeblock !== c && player.points.gte(pokeblockCost()) ? `onclick="setPokeblockByColor('${c}')"` : "disabled"}>${b.name}</button>`).join(" ")}
		<br><small>Changing the block costs ${format(pokeblockCost())} Research Points.</small>`
}

function safariSpeciesHtml() {
	const zone = withPokeblock(safariZone())
	let html = ""
	for (const pool of zonePools(zone, badges())) {
		const entries = zone.pools[pool]
		const total = entries.reduce((s, e) => s + e[1], 0)
		html += `<div class="pk-pool"><b>${POOL_NAMES[pool]}</b><br>`
		for (const [id, w, min, max] of entries) {
			const seen = player.d.seen[id], caught = player.d.caught[id]
			const inBox = ownsSpecies(id)
			const name = seen ? speciesName(id) : "???"
			html += `<span class="pk-mon ${caught ? "" : seen ? "pk-seen" : "pk-unseen"}" title="${name}">${pkSprite(id, false, 64)}<br><small>${inBox ? "" : `<span class="pk-missing">●</span> `}${name}<br>Lv. ${min === max ? min : `${min}-${max}`} · ${Math.round(100 * w / total)}%<br>${seen ? `catch ${Math.round(100 * safariCatchChance(id))}% · runs ${Math.round(100 * safariFleeChance(id))}%` : ""}</small></span>`
		}
		html += "</div>"
	}
	return html
}

function safariLogHtml() {
	if (!player.s.log.length) return "<i>No Pokémon yet.</i>"
	return player.s.log.map(e => `<div class="pk-log pk-log-${e.kind}">${pkSprite(e.id, e.shiny, 48)} ${e.text}</div>`).join("")
}

addLayer("s", {
	name() { return inJohtoContest() ? "Bug-Catching Contest" : "Safari Zone" },
	symbol: "S",
	position: 2,
	row: 1,
	color: "#C8B050",
	type: "none",
	resource: "Safari Balls",
	startData() { return {
		unlocked: true,
		points: new Decimal(0),
		balls: 0,
		pokeblock: "",
		trips: 0,
		progress: 0,
		strategy: "balls",
		log: [],
	}},
	branches: ["f"],
	layerShown() { return player.t.starter > 0 && safariOpen() },
	tooltip() { return player.s.balls > 0 ? `${player.s.balls} ${ballName()}s` : inJohtoContest() ? "Bug-Catching Contest" : "Safari Zone" },
	// Only point the Safari out until the first trip of a run, not after every trip.
	shouldNotify() { return player.s.trips === 0 && player.points.gte(safariTripCost()) && !automationOn("safari") },
	doReset(resettingLayer) {
		if (resettingLayer === "h") freshLayerData("s")
	},
	update(diff) { safariTick(diff) },
	buyables: Object.fromEntries(Object.entries(SAFARI_BUYABLES).map(([id, def]) => [id, rpBuyable("s", id, def)])),
	clickables: {
		11: {
			title() { return player.s.balls > 0 ? `${player.s.balls} ${ballName()}s left` : inJohtoContest() ? "Enter the contest" : "Start a Safari trip" },
			display() { return player.s.balls > 0 ? `Trip ${player.s.trips}` : `${safariBallsPerTrip()} ${ballName()}s for ${format(safariTripCost())} Research Points` },
			canClick() { return player.s.balls <= 0 && player.points.gte(safariTripCost()) },
			onClick() { startSafariTrip() },
			style: { width: "220px", height: "90px" },
		},
		...Object.fromEntries(Object.entries(SAFARI_STRATEGIES).map(([id, st], i) => [21 + i, {
			title: () => st.name,
			display: () => (player.s.strategy === id ? "<b>Chosen</b><br>" : "") + (st.text || "No Bait, no Rocks."),
			canClick: () => player.s.strategy !== id,
			onClick: () => setSafariStrategy(id),
			style: () => ({ width: "180px", height: "90px", ...(player.s.strategy === id ? { "border-color": "#ffffff" } : {}) }),
		}])),
	},
	bars: {
		search: {
			direction: RIGHT,
			width: 300,
			height: 24,
			progress() { return player.s.balls > 0 ? player.s.progress : 0 },
			display() { return player.s.balls > 0 ? `Looking around... (${format(safariTime())}s)` : "No trip" },
			fillStyle: { "background-color": "#C8B050" },
		},
	},
	upgrades: Object.fromEntries(Object.entries(SAFARI_UPGRADES).map(([id, def]) => [id, {
		title: def.title,
		description: def.text,
		cost: new Decimal(def.cost),
		currencyDisplayName: "Research Points",
		currencyInternalName: "points",
	}])),
	tabFormat: [
		["display-text", () => inJohtoContest()
			? `<h2>National Park Bug-Catching Contest</h2><br><i>Only bugs, and only Park Balls: no battles, just throws. Bait and Rocks work as in the Safari Zone. Each Pokémon shows its catch and run chances per ball.</i>`
			: `<h2>${currentRegion() === "hoenn" ? "Hoenn" : "Fuchsia City"} Safari Zone</h2><br><i>No battles here: throw Safari Balls, Bait or Rocks. Each Pokémon shows its catch and run chances per ball.${currentRegion() === "hoenn" ? " Areas 5 and 6 open after the League." : ""}</i>`],
		["display-text", () => pokeblockHtml()],
		"blank",
		["row", [["clickable", 11], "blank", ["bar", "search"]]],
		"blank",
		["row", [["clickable", 21], ["clickable", 22], ["clickable", 23]]],
		"blank",
		["display-text", () => safariLogHtml()],
		"blank",
		["display-text", () => `Safari catches (for good): <b>${safariCaught()}</b><br>${WARDEN_MILESTONES.map(([n, text]) => `<span class="${wardenMilestone(n) ? "" : "pk-done"}">${n}: ${text}${wardenMilestone(n) ? " ✓" : ""}</span>`).join("<br>")}`],
		"blank",
		["display-text", () => automationOn("safari") ? `<b>Warden's Pass:</b> trips are free and each Pokémon gets its best strategy.` : ""],
		"buyables",
		"blank",
		"upgrades",
		"blank",
		["display-text", () => safariSpeciesHtml()],
	],
})
