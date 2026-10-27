// Shiny hunting ("y"): choose a target and chain it. Kept through badges; the Hall of Fame starts
// it over (shiny species caught are kept in the Pokédex). Rules are in logic.js (huntStep).

function huntTargetHtml() {
	const zone = currentZone()
	const ids = zoneSpecies(zone, badges()).filter(id => player.d.seen[id]).sort((a, b) => a - b)
	const target = huntTarget()
	let html = target
		? `Target: <b>${speciesName(target)}</b> · chain <b>${Math.floor(player.y.chain)}</b> · its shinies ×${format(chainBonus())} as common (up to ×${chainCap()} at a chain of ${(chainCap() - 1) * CHAIN_STEP}) · 1/${format(encounterShinyOdds({ id: target }))}`
		: "<i>No target yet: choose one of this route's Pokémon below.</i>"
	if (target && !zoneSpecies(zone, badges()).includes(target)) html += `<br><small class="pk-missing">Your target doesn't live on ${zone.name}: travel where it does to build the chain.</small>`
	html += `<br><br><b>${zone.name}</b> <small>(choose where to search on the Field's Map)</small><br><div class="pk-dex">`
	html += ids.map(id => `<button class="pk-dex-entry pk-button ${id === target ? "pk-on" : ""}" onclick="setHuntTarget(${id})" title="${speciesName(id)}">${pkSprite(id, !!player.d.shiny[id], 48)}<br><small>${speciesName(id)}${player.d.shiny[id] ? " ★" : ""}</small></button>`).join("")
	return html + "</div>"
}

function shinyDexHtml() {
	let html = `<h3>Shiny Pokédex (${shinySpecies()}/151)</h3><br><small>Every shiny species caught gives +1% Research Points for good.</small><br><div class="pk-dex">`
	for (let id = 1; id <= 151; id++) {
		const n = player.d.shiny[id]
		if (player.y.shinyFilter === "shiny" ? !n : player.y.shinyFilter === "missing" ? !!n : false) continue
		if (player.y.shinySearch && !(player.d.seen[id] && searchMatches(player.y.shinySearch, id))) continue
		html += `<span class="pk-dex-entry ${n ? "" : "pk-unseen"}" title="${player.d.seen[id] ? speciesName(id) : "???"}${n ? ` (★${n})` : ""}">${pkSprite(id, !!n, 48)}<br><small>${id}</small></span>`
	}
	return html + "</div>"
}

addLayer("y", {
	name: "Shiny hunting",
	symbol: "★",
	position: 1,
	row: 2,
	color: "#F8D030",
	type: "none",
	resource: "shiny species",
	startData() { return {
		unlocked: true,
		points: new Decimal(0),
		target: 0,
		chain: 0,
		shinySearch: "",
		shinyFilter: "all",
	}},
	branches: ["f"],
	layerShown() { return player.t.starter > 0 && huntOpen() },
	tooltip() { return huntTarget() ? `${speciesName(huntTarget())} chain ${Math.floor(player.y.chain)}` : `${shinySpecies()} shiny species` },
	doReset(resettingLayer) {
		if (resettingLayer === "h") freshLayerData("y", ["shinySearch", "shinyFilter"])
	},
	update() { player.y.points = new Decimal(shinySpecies()) },
	buyables: Object.fromEntries(Object.entries(HUNT_BUYABLES).map(([id, def]) => [id, rpBuyable("y", id, def)])),
	upgrades: Object.fromEntries(Object.entries(HUNT_UPGRADES).map(([id, def]) => [id, {
		title: def.title,
		description: def.text,
		cost: new Decimal(def.cost),
		currencyDisplayName: "Research Points",
		currencyInternalName: "points",
	}])),
	tabFormat: {
		Hunt: {
			content: [
				["display-text", () => `<h2>Shiny hunting</h2><br><i>Beat the same Pokémon again and again and its shinies turn up more often. Losing to it breaks the chain.</i><br><br>Shiny odds everywhere: 1/${format(shinyOdds())}`],
				"blank",
				["display-text", () => huntTargetHtml()],
				"blank",
				"buyables",
				"blank",
				"upgrades",
			],
		},
		"Shiny Pokédex": {
			content: [
				["display-text", () => `Shiny species caught (for good): <b>${shinySpecies()}</b> · best chain: <b>${player.d.bestChain || 0}</b><br>${SHINY_MILESTONES.map(([n, text]) => `<span class="${shinyMilestone(n) ? "" : "pk-done"}">${n}: ${text}${shinyMilestone(n) ? " ✓" : ""}</span>`).join("<br>")}`],
				"blank",
				["display-text", () => filterBar("y", "shinyFilter", { all: "All", shiny: "Shiny", missing: "No shiny yet" })],
				["pk-search", "shinySearch"],
				["display-text", () => shinyDexHtml()],
			],
		},
	},
})
