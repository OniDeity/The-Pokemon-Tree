// The Team ("t"): your starter, party and box. Gym resets never touch them; entering the Hall of
// Fame starts a new run with a new starter.

function chooseStarter(id) {
	if (player.t.starter) return
	player.t.starter = id
	addToBox(id, hofUpgrade(11) ? 10 : 5)
	if (hofUpgrade(11)) player.points = player.points.add(200)
	for (const up of fieldKeptUpgrades()) if (!hasFieldUpgrade(up)) player.f.upgrades.push(up)
	// With the Auto-Search Drone kept from the start, the search starts on its own.
	if (hasFieldUpgrade(11)) player.f.searching = true
	player.f.zone = regionZones()[0].id
	pkLog(`Professor ${region().professor} gives you ${speciesName(id)}. Your research begins on ${regionZones()[0].name}!`, "new", { id })
	showTab("f")
}
/** Professor Birch's starters begin the run in Hoenn. */
function chooseHoennStarter(id) {
	if (!startInRegion("hoenn")) return
	chooseStarter(id)
}

// Box and party entries are keyed by species and look ("15", "15-shiny"); see boxKey in logic.js.
function togglePartyMember(key) {
	const party = player.t.party
	const i = party.indexOf(key)
	if (i >= 0) {
		if (party.length > 1 && canLeaveParty(key)) party.splice(i, 1)
	} else if (party.length < partySize() && player.t.box[key] && canJoinParty(key) && !inDayCare(key)) party.push(key)
}
function moveToLead(key) {
	const party = player.t.party
	const i = party.indexOf(key)
	if (i > 0) { party.splice(i, 1); party.unshift(key) }
}
function itemEvolveByKey(key, into) { itemEvolve(key, Number(into)) }

function xpBar(key, entry) {
	const growth = SPECIES[speciesOf(key)].growth
	const lo = xpForLevel(growth, entry.level), hi = xpForLevel(growth, entry.level + 1)
	const capped = entry.level >= currentCap()
	const pct = capped ? 100 : Math.max(0, Math.min(100, 100 * (entry.xp - lo) / (hi - lo)))
	return `<div class="pk-xp"><div style="width:${pct}%;background:${capped ? "#F08030" : "#6890F0"}"></div></div>`
}

function evolutionButtons(key) {
	if (formOf(key)) return ""
	return itemEvolutions(speciesOf(key), badges()).map(e => {
		const cost = itemEvolutionCost(e)
		const label = `${evolutionLabel(e)} → ${speciesName(e.into)}`
		// Say why a button is locked: tooltips don't show on phones.
		let why = null
		if (!canEvolveInto(key, e.into)) why = `you have ${keyName(boxKey(e.into, variantOf(key)))}`
		else if (!e.open) why = e.method === "trade" ? `trades at ${REGION_RULES.tradeBadges} badges` : `sold at ${REGION_RULES.stoneBadges[e.stone]} badge${REGION_RULES.stoneBadges[e.stone] === 1 ? "" : "s"}`
		else if (player.points.lt(cost)) why = `need ${format(cost)} RP`
		if (why) return `<button class="pk-button" disabled>${label}<br><small>(${why})</small></button>`
		return `<button class="pk-button" onclick="itemEvolveByKey('${key}', ${e.into})">${label}${cost.gt(0) ? `<br><small>(${format(cost)} RP)</small>` : ""}</button>`
	}).join("")
}

function monCard(key, inParty) {
	const entry = player.t.box[key]
	const s = SPECIES[speciesOf(key)]
	const lvEvo = s.evolutions.find(e => e.method === "level" && e.level)
	const ch = challengeStatus(key)
	return `<div class="pk-card ${inParty ? "pk-card-party" : ""} ${ch ? (ch.ok ? "pk-card-exempt" : "pk-card-handicap") : ""}">
		${ch ? `<small class="${ch.ok ? "pk-exempt" : "pk-handicap"}">${ch.text}</small><br>` : ""}
		${pkKeySprite(key, 96)}<br>
		<b>${keyName(key)}</b> Lv. ${entry.level}<br>
		<small>${s.types.map(t => `<span class="pk-type pk-type-${t}">${t}</span>`).join(" ")}</small>
		${xpBar(key, entry)}
		${formOf(key) ? `<small>${FORMS[formOf(key)].text}</small><br>` : lvEvo ? `<small>${canEvolveInto(key, lvEvo.into) ? `Evolves at Lv. ${lvEvo.level}` : `Won't evolve: you have ${keyName(boxKey(lvEvo.into, variantOf(key)))}`}</small><br>` : ""}
		${inParty
			? `${player.t.party[0] === key ? "<small><b>Lead</b></small>" : `<button class="pk-button" onclick="moveToLead('${key}')">Lead</button>`}
			   <button class="pk-button" ${player.t.party.length > 1 && canLeaveParty(key) ? `onclick="togglePartyMember('${key}')"` : "disabled"}>To box</button>`
			: canJoinParty(key)
				? `<button class="pk-button" ${player.t.party.length < partySize() ? `onclick="togglePartyMember('${key}')"` : "disabled"}>To party</button>${dayCareOpen() && player.c.slots.length < DAY_CARE_SLOTS ? ` <button class="pk-button" onclick="depositKey('${key}')">Day Care</button>` : ""}`
				: `<button class="pk-button" disabled title="Monotype: shares no type with your starter">To party</button>`}
		<br>${evolutionButtons(key)}
	</div>`
}

function partyHtml() {
	return `<div class="pk-cards">${player.t.party.filter(key => player.t.box[key]).map(key => monCard(key, true)).join("")}</div>`
}

function boxHtml() {
	const sort = player.t.sort
	const box = player.t.box
	const byNumber = (a, b) => speciesOf(a) - speciesOf(b) || a.localeCompare(b)
	const mode = player.t.boxFilter
	const keys = Object.keys(box).filter(key => !player.t.party.includes(key) && !inDayCare(key) && searchMatches(player.t.boxSearch, speciesOf(key))
		&& (mode === "shiny" ? isShiny(key) : mode === "noShiny" ? !player.d.shiny[speciesOf(key)] : mode === "forms" ? !!formOf(key) : mode === "egg" || mode === "safari" ? box[key].origin === mode : true))
	if (sort === "level") keys.sort((a, b) => box[b].level - box[a].level || byNumber(a, b))
	else if (sort === "strength") keys.sort((a, b) => battlerScore(speciesOf(b), box[b].level) - battlerScore(speciesOf(a), box[a].level))
	else keys.sort(byNumber)
	const pages = Math.max(1, Math.ceil(keys.length / BOX_PAGE))
	const page = Math.min(player.t.boxPage || 0, pages - 1)
	const pager = pages > 1 ? `<div>${Array.from({ length: pages }, (_, i) => `<button class="pk-button ${i === page ? "pk-on" : ""}" onclick="setBoxPage(${i})">${i + 1}</button>`).join(" ")}</div>` : ""
	if (keys.length) return `${pager}<div class="pk-cards">${keys.slice(page * BOX_PAGE, (page + 1) * BOX_PAGE).map(key => monCard(key, false)).join("")}</div>${pager}`
	return player.t.boxSearch || mode !== "all" ? "<i>No Pokémon in the box match.</i>" : "<i>The box is empty. Catch more Pokémon!</i>"
}
function setBoxSort(sort) { player.t.sort = sort }
function setBoxPage(page) { player.t.boxPage = page }
const BOX_PAGE = 30
const BOX_FILTERS = { all: "All", shiny: "Shiny", noShiny: "No shiny yet", forms: "Forms", egg: "Hatched", safari: "Safari" }

addLayer("t", {
	name: "Team",
	symbol: "T",
	position: 1,
	row: 0,
	color: "#F08030",
	type: "none",
	resource: "Pokémon",
	startData() { return {
		unlocked: true,
		points: new Decimal(0),
		starter: 0,
		box: {},
		party: [],
		specials: {},
		autoEvolve: true,
		evolved: 0,
		nuzlocke: {},
		sort: "number",
		boxSearch: "",
		boxFilter: "all",
		boxPage: 0,
		region: "kanto",
		johtoStarter: 0,
		journey: null,
	}},
	// Your Pokémon are kept through badges; the Hall of Fame (or a challenge) starts over.
	doReset(resettingLayer) {
		if (resettingLayer === "h") freshLayerData("t", ["autoEvolve", "sort", "boxSearch", "boxFilter", "boxPage"])
	},
	tooltip() { return !player.t.starter || needsJohtoStarter() ? "Choose your starter!" : `${Object.keys(player.t.box).length} Pokémon` },
	shouldNotify() { return !player.t.starter || needsJohtoStarter() },
	clickables: {
		...Object.fromEntries([...STARTERS, 25, 133].map((id, i) => [11 + i, {
			title: () => speciesName(id),
			display: () => `${pkSprite(id, false, 96)}<br>${SPECIES[id].types.join(" / ")}`,
			canClick: () => !player.t.starter,
			onClick: () => chooseStarter(id),
			unlocked: () => !player.t.starter && starterChoices().includes(id),
			style: { width: "160px", height: "180px" },
		}])),
		...Object.fromEntries(REGIONS.hoenn.starters.map((id, i) => [41 + i, {
			title: () => speciesName(id),
			display: () => `${pkSprite(id, false, 96)}<br>${SPECIES[id].types.join(" / ")}`,
			canClick: () => !player.t.starter && hoennOpen(),
			onClick: () => chooseHoennStarter(id),
			unlocked: () => !player.t.starter && hoennOpen(),
			style: { width: "160px", height: "180px" },
		}])),
		...Object.fromEntries(REGIONS.johto.starters.map((id, i) => [31 + i, {
			title: () => speciesName(id),
			display: () => `${pkSprite(id, false, 96)}<br>${SPECIES[id].types.join(" / ")}`,
			canClick: () => needsJohtoStarter(),
			onClick: () => chooseJohtoStarter(id),
			unlocked: () => needsJohtoStarter(),
			style: { width: "160px", height: "180px" },
		}])),
		21: {
			title: () => `Automatic evolution: ${player.t.autoEvolve ? "on" : "off"}`,
			display: () => "Pokémon evolve as soon as they reach the level.",
			canClick: () => true,
			onClick: () => { player.t.autoEvolve = !player.t.autoEvolve },
			unlocked: () => player.t.starter > 0,
			style: { width: "200px", height: "70px" },
		},
	},
	tabFormat: [
		["display-text", () => player.t.starter ? "" : `<h2>Welcome to the world of Pokémon!</h2><br><br>Professor Oak needs a field researcher to survey Kanto's Pokémon.<br>Pick your first partner:`],
		["display-text", () => !player.t.starter && anyChallenge() ? `<br><b>Challenge: ${CHALLENGES[player.h.activeChallenge].name}.</b> ${CHALLENGES[player.h.activeChallenge].rules}` : ""],
		"blank",
		["row", [["clickable", 11], ["clickable", 12], ["clickable", 13], ["clickable", 14], ["clickable", 15]]],
		["display-text", () => !player.t.starter && hoennOpen() ? `<br><h3>...or begin in Hoenn</h3><br>Professor Birch, in Littleroot Town, has three Pokémon of his own for a researcher willing to survey Hoenn (Fame ×${HOENN_FAME} when Hoenn's Champion enters the Hall).` : !player.t.starter && johtoEntries() > 0 ? `<br><small>Hoenn opens after ${HOENN_ENTRIES} Johto Hall of Fame entries (${johtoEntries()}/${HOENN_ENTRIES}).</small>` : ""],
		["row", [["clickable", 41], ["clickable", 42], ["clickable", 43]]],
		["display-text", () => needsJohtoStarter() ? `<h2>Welcome to Johto!</h2><br><br>Professor Elm has three Pokémon for a researcher starting over. Your other Pokémon are back at Lv. ${JOHTO_START_LEVEL}.<br>Pick one:` : ""],
		["row", [["clickable", 31], ["clickable", 32], ["clickable", 33]]],
		["display-text", () => player.t.starter ? `<h3>Party (${player.t.party.length}/${partySize()})</h3><br><small>The lead fights first; the next one steps in if it faints. Level cap: ${currentCap()} (earn badges to raise it).</small>` : ""],
		["display-text", () => player.t.starter ? partyHtml() : ""],
		"blank",
		["clickable", 21],
		["display-text", () => player.t.starter ? `<h3>Box</h3><br>Sort: ${["number", "level", "strength"].map(s => `<button class="pk-button ${player.t.sort === s ? "pk-on" : ""}" onclick="setBoxSort('${s}')">${s}</button>`).join(" ")}<br>${filterBar("t", "boxFilter", BOX_FILTERS)}` : ""],
		["pk-search", "boxSearch"],
		["display-text", () => player.t.starter ? boxHtml() : ""],
	],
})
