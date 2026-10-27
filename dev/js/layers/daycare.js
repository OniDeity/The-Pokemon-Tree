// The Day Care ("c"): Route 5's Day Care, two Pokémon training and laying Eggs. Kept through
// badges; the Hall of Fame starts it over. Rules are in logic.js (dayCareTick, eggStep).

function depositKey(key) { depositInDayCare(key) }

/** Breeder's notes mark: has this Pokémon's Egg species been hatched (for the +2% bonus)? */
function hatchMark(key) {
	const eggs = eggSpecies(speciesOf(key), DITTO)
	if (formOf(key) || !eggs) return `<span class="pk-done">no Eggs</span>`
	return eggs.every(id => player.d.hatched[id]) ? `🥚 hatched` : `<span class="pk-missing">🥚 new</span>`
}

function breederNotesHtml() {
	const mode = player.c.notesFilter
	const ids = HATCHABLE.filter(id => mode === "missing" ? !player.d.hatched[id] : mode === "hatched" ? !!player.d.hatched[id] : true)
	return `<h3>Breeder's notes (${hatchedSpecies()}/${HATCHABLE.length})</h3><br><small>Every species hatched gives +2% Research Points for good. Unhatched ones are dark.</small><br>${filterBar("c", "notesFilter", { all: "All", missing: "Not hatched", hatched: "Hatched" })}<br><div class="pk-dex">${ids.map(id => {
		const done = player.d.hatched[id]
		return `<span class="pk-dex-entry ${done ? "" : "pk-unseen"}" title="${speciesName(id)}${done ? ` (hatched ${done})` : " (not hatched yet)"}">${pkSprite(id, false, 48)}<br><small>${done ? speciesName(id) : "???"}</small></span>`
	}).join("")}</div>`
}
function withdrawKey(key) { withdrawFromDayCare(key) }

function dayCareSlotsHtml() {
	const cards = player.c.slots.filter(key => player.t.box[key]).map(key => `<div class="pk-card">
		${pkKeySprite(key, 96)}<br><b>${keyName(key)}</b> Lv. ${player.t.box[key].level}<br>
		${xpBar(key, player.t.box[key])}
		<button class="pk-button" onclick="withdrawKey('${key}')">Take back</button></div>`)
	for (let i = cards.length; i < DAY_CARE_SLOTS; i++) cards.push(`<div class="pk-card pk-card-empty"><br><br><i>Empty</i><br><small>Leave a Pokémon from your box below.</small></div>`)
	return `<div class="pk-cards">${cards.join("")}</div>`
}

function dayCareStatusHtml() {
	const slots = player.c.slots
	let html = `Pokémon here gain ${format(dayCareXpRate())} experience per second each, up to the level cap. They don't evolve until you take them back.<br>`
	if (slots.length < 2) return html
	const eggs = dayCareEggs()
	if (!eggs) {
		const why = slots.some(formOf) ? "One of them is a one-of-a-kind form" : "They don't seem to like each other"
		return html + `<br><i>${why}: no Eggs.</i> <small>(Eggs need the same family with a male and a female, or Ditto. Legendaries don't breed.)</small>`
	}
	const fresh = eggs.filter(id => !player.d.hatched[id])
	html += `<br>The two seem to get along! Their Eggs hatch into ${eggs.map(speciesName).join(" or ")}${fresh.length ? ` <span class="pk-missing">(new to your breeder's notes: +2% Research Points)</span>` : " (already in your breeder's notes)"}.`
	if (slots.some(isShiny)) html += ` <small>(A shiny parent: shiny Eggs twice as likely.)</small>`
	return html
}

function eggsHtml() {
	if (!player.c.eggs.length) return `<i>No Eggs yet.</i>`
	return `<div class="pk-cards">${player.c.eggs.map(egg => `<div class="pk-card"><span class="pk-egg">🥚</span><br><b>Egg</b><br><small>Hatches in ${egg.battles} wild battle${egg.battles === 1 ? "" : "s"}</small>
		<div class="pk-xp"><div style="width:${100 * (1 - egg.battles / eggBattles())}%;background:#F8A0C0"></div></div></div>`).join("")}</div>`
}

const DEPOSIT_FILTERS = { all: "All", new: "New Eggs", breeds: "Lays Eggs", box: "Not in party" }
function depositMatches(key) {
	const mode = player.c.depositFilter
	if (!searchMatches(player.c.depositSearch, speciesOf(key))) return false
	const eggs = formOf(key) ? null : eggSpecies(speciesOf(key), DITTO)
	if (mode === "new") return !!eggs && eggs.some(id => !player.d.hatched[id])
	if (mode === "breeds") return !!eggs
	if (mode === "box") return !player.t.party.includes(key)
	return true
}
function depositListHtml() {
	if (player.c.slots.length >= DAY_CARE_SLOTS) return "<i>The Day Care is full: take a Pokémon back to leave another.</i>"
	const keys = Object.keys(player.t.box).filter(key => !inDayCare(key) && depositMatches(key)).sort((a, b) => speciesOf(a) - speciesOf(b))
	if (!keys.length) return "<i>No Pokémon match.</i>"
	return `<div class="pk-dex">${keys.map(key => {
		const lonely = player.t.party.length === 1 && player.t.party[0] === key
		return `<button class="pk-dex-entry pk-button" ${lonely ? "disabled title='Your only party Pokémon'" : `onclick="depositKey('${key}')"`}>${pkKeySprite(key, 48)}<br><small>${keyName(key)}<br>Lv. ${player.t.box[key].level}<br>${hatchMark(key)}</small></button>`
	}).join("")}</div>`
}

addLayer("c", {
	name: "Day Care",
	symbol: "C",
	position: 1,
	row: 1,
	color: "#F8A0C0",
	type: "none",
	resource: "Eggs",
	startData() { return {
		unlocked: true,
		points: new Decimal(0),
		slots: [],
		eggs: [],
		eggProgress: 0,
		autoTimer: 0,
		depositSearch: "",
		depositFilter: "all",
		notesFilter: "all",
	}},
	branches: ["t"],
	layerShown() { return player.t.starter > 0 && dayCareOpen() },
	tooltip() { return `${player.c.slots.length}/${DAY_CARE_SLOTS} Pokémon · ${player.c.eggs.length} Egg${player.c.eggs.length === 1 ? "" : "s"}` },
	// Kept through badges; the Hall of Fame (or a challenge) starts it over.
	doReset(resettingLayer) {
		if (resettingLayer === "h") freshLayerData("c", ["depositSearch", "depositFilter", "notesFilter"])
	},
	update(diff) {
		dayCareTick(diff)
		player.c.autoTimer = (player.c.autoTimer || 0) + diff
		if (player.c.autoTimer >= 2) { player.c.autoTimer = 0; autoEggsTick() }
	},
	buyables: Object.fromEntries(Object.entries(DAY_CARE_BUYABLES).map(([id, def]) => [id, rpBuyable("c", id, def)])),
	bars: {
		egg: {
			direction: RIGHT,
			width: 300,
			height: 24,
			progress() { return player.c.eggProgress },
			display() {
				if (!dayCareEggs()) return "No Eggs coming"
				if (player.c.eggs.length >= maxEggs()) return "Egg basket full"
				return `Next Egg in ${formatTime(eggSeconds() * (1 - player.c.eggProgress))}`
			},
			fillStyle: { "background-color": "#F8A0C0" },
		},
	},
	upgrades: Object.fromEntries(Object.entries(DAY_CARE_UPGRADES).map(([id, def]) => [id, {
		title: def.title,
		description: def.text,
		cost: new Decimal(def.cost),
		currencyDisplayName: "Research Points",
		currencyInternalName: "points",
	}])),
	tabFormat: [
		["display-text", () => `<h2>Route 5 Day Care</h2><br><i>"I'm the Day Care Man. Want me to raise one of your Pokémon?"</i>`],
		"blank",
		["display-text", () => dayCareSlotsHtml()],
		["display-text", () => dayCareStatusHtml()],
		"blank",
		["bar", "egg"],
		"blank",
		["display-text", () => `<h3>Eggs (${player.c.eggs.length}/${maxEggs()})</h3><br>Eggs hatch as you battle wild Pokémon.`],
		["display-text", () => eggsHtml()],
		"blank",
		["display-text", () => `Species hatched (for good): <b>${hatchedSpecies()}</b> · Research Points +${2 * hatchedSpecies()}%`],
		"blank",
		"buyables",
		"blank",
		"upgrades",
		"blank",
		["display-text", () => `<h3>Leave a Pokémon</h3><br>${filterBar("c", "depositFilter", DEPOSIT_FILTERS)}`],
		["pk-search", "depositSearch"],
		["display-text", () => depositListHtml()],
		"blank",
		["display-text", () => breederNotesHtml()],
	],
})
