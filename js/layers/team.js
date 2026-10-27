// The Team ("t"): your starter, party and box. Gym resets never touch them; entering the Hall of
// Fame starts a new run with a new starter.

function chooseStarter(id) {
	if (player.t.starter) return
	player.t.starter = id
	addToBox(id, hofUpgrade(11) ? 10 : 5, false)
	if (hofUpgrade(11)) player.points = player.points.add(200)
	for (const up of fieldKeptUpgrades()) if (!hasFieldUpgrade(up)) player.f.upgrades.push(up)
	player.f.zone = ZONES[0].id
	pkLog(`Professor Oak gives you ${speciesName(id)}. Your research begins on Route 1!`, "new", { id })
	showTab("f")
}

function togglePartyMember(id) {
	id = Number(id)
	const party = player.t.party
	const i = party.indexOf(id)
	if (i >= 0) {
		if (party.length > 1) party.splice(i, 1)
	} else if (party.length < partySize() && player.t.box[id] && canJoinParty(id)) party.push(id)
}
function moveToLead(id) {
	id = Number(id)
	const party = player.t.party
	const i = party.indexOf(id)
	if (i > 0) { party.splice(i, 1); party.unshift(id) }
}
function itemEvolveById(id, into) { itemEvolve(Number(id), Number(into)) }

function xpBar(id, entry) {
	const growth = SPECIES[id].growth
	const lo = xpForLevel(growth, entry.level), hi = xpForLevel(growth, entry.level + 1)
	const capped = entry.level >= currentCap()
	const pct = capped ? 100 : Math.max(0, Math.min(100, 100 * (entry.xp - lo) / (hi - lo)))
	return `<div class="pk-xp"><div style="width:${pct}%;background:${capped ? "#F08030" : "#6890F0"}"></div></div>`
}

function evolutionButtons(id) {
	return itemEvolutions(id, badges()).map(e => {
		const cost = itemEvolutionCost(e)
		const label = `${evolutionLabel(e)} → ${speciesName(e.into)}${cost.gt(0) ? ` (${format(cost)} RP)` : ""}`
		if (!canEvolveInto(e.into)) return `<button class="pk-button" disabled title="You already have ${speciesName(e.into)}">${label}</button>`
		return e.open
			? `<button class="pk-button" ${canItemEvolve(id, e) ? `onclick="itemEvolveById(${id}, ${e.into})"` : "disabled"}>${label}</button>`
			: `<button class="pk-button" disabled title="Needs more badges">${label}</button>`
	}).join("")
}

function monCard(id, inParty) {
	const entry = player.t.box[id]
	const s = SPECIES[id]
	const lvEvo = s.evolutions.find(e => e.method === "level" && e.level)
	return `<div class="pk-card ${inParty ? "pk-card-party" : ""}">
		${pkSprite(id, entry.shiny, 96)}<br>
		<b>${entry.shiny ? "★ " : ""}${s.name}</b> Lv. ${entry.level}<br>
		<small>${s.types.map(t => `<span class="pk-type pk-type-${t}">${t}</span>`).join(" ")}</small>
		${xpBar(id, entry)}
		${lvEvo ? `<small>${canEvolveInto(lvEvo.into) ? `Evolves at Lv. ${lvEvo.level}` : `Won't evolve: you have ${speciesName(lvEvo.into)}`}</small><br>` : ""}
		${inParty
			? `${player.t.party[0] === id ? "<small><b>Lead</b></small>" : `<button class="pk-button" onclick="moveToLead(${id})">Lead</button>`}
			   <button class="pk-button" ${player.t.party.length > 1 ? `onclick="togglePartyMember(${id})"` : "disabled"}>To box</button>`
			: canJoinParty(id)
				? `<button class="pk-button" ${player.t.party.length < partySize() ? `onclick="togglePartyMember(${id})"` : "disabled"}>To party</button>`
				: `<button class="pk-button" disabled title="Monotype: shares no type with your starter">To party</button>`}
		<br>${evolutionButtons(id)}
	</div>`
}

function partyHtml() {
	return `<div class="pk-cards">${player.t.party.filter(id => player.t.box[id]).map(id => monCard(id, true)).join("")}</div>`
}

function boxHtml() {
	const sort = player.t.sort
	const ids = Object.keys(player.t.box).map(Number).filter(id => !player.t.party.includes(id))
	if (sort === "level") ids.sort((a, b) => player.t.box[b].level - player.t.box[a].level || a - b)
	else if (sort === "strength") ids.sort((a, b) => battlerScore(b, player.t.box[b].level) - battlerScore(a, player.t.box[a].level))
	else ids.sort((a, b) => a - b)
	if (!ids.length) return "<i>The box is empty. Catch more Pokémon!</i>"
	return `<div class="pk-cards">${ids.map(id => monCard(id, false)).join("")}</div>`
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
