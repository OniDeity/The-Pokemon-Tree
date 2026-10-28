// Shiny hunting ("y"): choose a target and chain it. Kept through badges; the Hall of Fame starts
// it over (shiny species caught are kept in the Pokédex). Rules are in logic.js (huntStep).

function huntModeHtml() {
	return `Chain for: ${["shiny", "albino"].map(m => `<button class="pk-button ${huntMode() === m ? "pk-on" : ""}" onclick="setHuntMode('${m}')">${COLOR_MARKS[m]} ${COLOR_NAMES[m]}</button>`).join(" ")}`
}

function huntTargetHtml() {
	const zone = currentZone()
	const ids = zoneSpecies(zone, badges()).filter(id => player.d.seen[id]).sort((a, b) => a - b)
	const target = huntTarget(), mode = huntMode(), records = huntRecords()
	const odds = mode === "albino" ? encounterAlbinoOdds({ id: target }) : encounterShinyOdds({ id: target })
	let html = huntModeHtml() + "<br><br>"
	html += target
		? `Target: <b>${speciesName(target)}</b> · chain <b>${Math.floor(player.y.chain)}</b> · its ${mode === "albino" ? "albinos" : "shinies"} ×${format(chainBonus())} as common (up to ×${chainCap()} at a chain of ${(chainCap() - 1) * CHAIN_STEP}) · 1/${format(odds)}`
		: "<i>No target yet: choose one of this route's Pokémon below.</i>"
	if (target && !zoneSpecies(zone, badges()).includes(target)) html += `<br><small class="pk-missing">Your target doesn't live on ${zone.name}: travel where it does to build the chain.</small>`
	html += `<br><br><b>${zone.name}</b> <small>(choose where to search on the Field's Map)</small><br><div class="pk-dex">`
	html += ids.map(id => `<button class="pk-dex-entry pk-button ${id === target ? "pk-on" : ""}" onclick="setHuntTarget(${id})" title="${speciesName(id)}">${pkSprite(id, records[id] ? mode : false, 48)}<br><small>${speciesName(id)}${records[id] ? ` ${COLOR_MARKS[mode]}` : ""}</small></button>`).join("")
	return html + "</div>"
}

const COLOR_DEX_TEXT = {
	shiny: "Every shiny species caught gives +1% Research Points for good.",
	albino: "Albino Pokémon have the same base odds as shinies, lowered by their own charm, lens, milestones and chains. Every albino species caught gives +1% experience for good.",
	melanistic: "Melanistic Pokémon are shiny and albino at once (they count as both). Every melanistic species caught gives +2% Research Points and +2% experience for good.",
}
function dexColor() { return COLORS.includes(player.y.dexColor) ? player.y.dexColor : "shiny" }
function setDexColor(c) { player.y.dexColor = c }
function colorRecords(c) { return (c === "shiny" ? player.d.shiny : player.d[c]) || {} }
function colorTabsHtml() {
	return COLORS.map(c => `<button class="pk-button ${dexColor() === c ? "pk-on" : ""}" onclick="setDexColor('${c}')">${COLOR_MARKS[c]} ${COLOR_NAMES[c]} (${Object.keys(colorRecords(c)).length})</button>`).join(" ")
}
function colorMilestonesHtml() {
	const c = dexColor()
	if (c === "shiny") return `Shiny species caught (for good): <b>${shinySpecies()}</b> · best chain: <b>${player.d.bestChain || 0}</b><br>${SHINY_MILESTONES.map(([n, text]) => `<span class="${shinyMilestone(n) ? "" : "pk-done"}">${n}: ${text}${shinyMilestone(n) ? " ✓" : ""}</span>`).join("<br>")}`
	if (c === "albino") return `Albino species caught (for good): <b>${albinoSpecies()}</b> · odds everywhere 1/${format(albinoOdds())}<br>${ALBINO_MILESTONES.map(([n, text]) => `<span class="${albinoMilestone(n) ? "" : "pk-done"}">${n}: ${text}${albinoMilestone(n) ? " ✓" : ""}</span>`).join("<br>")}`
	return `Melanistic species caught (for good): <b>${melanisticSpecies()}</b> · odds everywhere 1/${format(shinyOdds() * albinoOdds())}`
}

function shinyDexHtml() {
	const c = dexColor(), records = colorRecords(c)
	let html = `${regionTabs()}<h3>${COLOR_NAMES[c]} Pokédex: ${REGIONS[viewedDexRegion()].name} (${regionDex(viewedDexRegion()).filter(id => records[id]).length}/${regionDex(viewedDexRegion()).length})</h3><br><small>${COLOR_DEX_TEXT[c]}</small><br><div class="pk-dex">`
	for (const id of regionDex(viewedDexRegion())) {
		const n = records[id]
		if (player.y.shinyFilter === "shiny" ? !n : player.y.shinyFilter === "missing" ? !!n : false) continue
		if (player.y.shinySearch && !(player.d.seen[id] && searchMatches(player.y.shinySearch, id))) continue
		html += `<span class="pk-dex-entry ${n ? "" : "pk-unseen"}" title="${player.d.seen[id] ? speciesName(id) : "???"}${n ? ` (★${n})` : ""}">${pkSprite(id, n ? c : false, 48)}<br><small>${id}</small></span>`
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
		mode: "shiny",
		dexColor: "shiny",
		shinySearch: "",
		shinyFilter: "all",
	}},
	branches: ["f"],
	layerShown() { return player.t.starter > 0 && huntOpen() },
	tooltip() { return huntTarget() ? `${speciesName(huntTarget())} chain ${Math.floor(player.y.chain)}` : `${shinySpecies()} shiny species` },
	doReset(resettingLayer) {
		if (resettingLayer === "h") freshLayerData("y", ["shinySearch", "shinyFilter", "mode", "dexColor"])
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
				["display-text", () => `<h2>Shiny hunting</h2><br><i>Beat the same Pokémon again and again and its shinies (or albinos) turn up more often. Losing to it breaks the chain.</i><br><br>Odds everywhere: ★ Shiny 1/${format(shinyOdds())} · ◇ Albino 1/${format(albinoOdds())} · ✦ Melanistic (both at once) 1/${format(shinyOdds() * albinoOdds())}`],
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
				["display-text", () => colorTabsHtml()],
				"blank",
				["display-text", () => colorMilestonesHtml()],
				"blank",
				["display-text", () => filterBar("y", "shinyFilter", { all: "All", shiny: "Caught", missing: "Not yet" })],
				["pk-search", "shinySearch"],
				["display-text", () => shinyDexHtml()],
			],
		},
	},
})
