// The Team ("t"): your starter, party and box. Gym resets never touch them; entering the Hall of
// Fame starts a new run with a new starter.

function chooseStarter(id) {
	if (player.t.starter) return
	player.t.starter = id
	addToBox(id, hofUpgrade(11) ? 10 : 5)
	if (hofUpgrade(11)) player.points = player.points.add(200)
	for (const up of fieldKeptUpgrades()) if (!hasFieldUpgrade(up)) player.f.upgrades.push(up)
	player.f.zone = ZONES[0].id
	pkLog(`Professor Oak gives you ${speciesName(id)}. Your research begins on Route 1!`, "new", { id })
	showTab("f")
}

// Box and party entries are keyed by species and look ("15", "15-shiny"); see boxKey in logic.js.
function togglePartyMember(key) {
	const party = player.t.party
	const i = party.indexOf(key)
	if (i >= 0) {
		if (party.length > 1) party.splice(i, 1)
	} else if (party.length < partySize() && player.t.box[key] && canJoinParty(key)) party.push(key)
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
	return itemEvolutions(speciesOf(key), badges()).map(e => {
		const cost = itemEvolutionCost(e)
		const label = `${evolutionLabel(e)} → ${speciesName(e.into)}${cost.gt(0) ? ` (${format(cost)} RP)` : ""}`
		if (!canEvolveInto(key, e.into)) return `<button class="pk-button" disabled title="You already have ${keyName(boxKey(e.into, variantOf(key)))}">${label}</button>`
		return e.open
			? `<button class="pk-button" ${canItemEvolve(key, e) ? `onclick="itemEvolveByKey('${key}', ${e.into})"` : "disabled"}>${label}</button>`
			: `<button class="pk-button" disabled title="Needs more badges">${label}</button>`
	}).join("")
}

function monCard(key, inParty) {
	const entry = player.t.box[key]
	const s = SPECIES[speciesOf(key)]
	const lvEvo = s.evolutions.find(e => e.method === "level" && e.level)
	return `<div class="pk-card ${inParty ? "pk-card-party" : ""}">
		${pkSprite(speciesOf(key), isShiny(key), 96)}<br>
		<b>${keyName(key)}</b> Lv. ${entry.level}<br>
		<small>${s.types.map(t => `<span class="pk-type pk-type-${t}">${t}</span>`).join(" ")}</small>
		${xpBar(key, entry)}
		${lvEvo ? `<small>${canEvolveInto(key, lvEvo.into) ? `Evolves at Lv. ${lvEvo.level}` : `Won't evolve: you have ${keyName(boxKey(lvEvo.into, variantOf(key)))}`}</small><br>` : ""}
		${inParty
			? `${player.t.party[0] === key ? "<small><b>Lead</b></small>" : `<button class="pk-button" onclick="moveToLead('${key}')">Lead</button>`}
			   <button class="pk-button" ${player.t.party.length > 1 ? `onclick="togglePartyMember('${key}')"` : "disabled"}>To box</button>`
			: canJoinParty(key)
				? `<button class="pk-button" ${player.t.party.length < partySize() ? `onclick="togglePartyMember('${key}')"` : "disabled"}>To party</button>`
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
	const keys = Object.keys(box).filter(key => !player.t.party.includes(key))
	if (sort === "level") keys.sort((a, b) => box[b].level - box[a].level || byNumber(a, b))
	else if (sort === "strength") keys.sort((a, b) => battlerScore(speciesOf(b), box[b].level) - battlerScore(speciesOf(a), box[a].level))
	else keys.sort(byNumber)
	if (!keys.length) return "<i>The box is empty. Catch more Pokémon!</i>"
	return `<div class="pk-cards">${keys.map(key => monCard(key, false)).join("")}</div>`
}
function setBoxSort(sort) { player.t.sort = sort }

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
	}},
	// Your Pokémon are kept through badges; the Hall of Fame (or a challenge) starts over.
	doReset(resettingLayer) {
		if (resettingLayer === "h") freshLayerData("t", ["autoEvolve", "sort"])
	},
	tooltip() { return player.t.starter ? `${Object.keys(player.t.box).length} Pokémon` : "Choose your starter!" },
	shouldNotify() { return !player.t.starter },
	clickables: {
		...Object.fromEntries([...STARTERS, 25, 133].map((id, i) => [11 + i, {
			title: () => speciesName(id),
			display: () => `${pkSprite(id, false, 96)}<br>${SPECIES[id].types.join(" / ")}`,
			canClick: () => !player.t.starter,
			onClick: () => chooseStarter(id),
			unlocked: () => !player.t.starter && starterChoices().includes(id),
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
		["display-text", () => player.t.starter ? `<h3>Party (${player.t.party.length}/${partySize()})</h3><br><small>The lead fights first; the next one steps in if it faints. Level cap: ${currentCap()} (earn badges to raise it).</small>` : ""],
		["display-text", () => player.t.starter ? partyHtml() : ""],
		"blank",
		["clickable", 21],
		["display-text", () => player.t.starter ? `<h3>Box</h3><br>Sort: ${["number", "level", "strength"].map(s => `<button class="pk-button ${player.t.sort === s ? "pk-on" : ""}" onclick="setBoxSort('${s}')">${s}</button>`).join(" ")}` : ""],
		["display-text", () => player.t.starter ? boxHtml() : ""],
	],
})
