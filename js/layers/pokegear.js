// The Pokégear ("p"): Johto's radio swarms and Kurt's Apricorn Balls. Kept through badges; the Hall
// of Fame starts it over. Rules are in logic.js (tuneSwarm, buyBall, apricornMult).

function tuneSwarmById(id) { tuneSwarm(id) }
function buyBallById(id) { buyBall(id) }

function radioHtml() {
	if (!radioOpen()) return `<i>Win the Radio Card at Goldenrod's Radio Tower quiz (after ${REGION_RULES.keyItems.radioCard?.badges ?? 3} badges) to tune in to the swarm reports.</i>`
	const w = currentSwarm()
	let html = w ? `On air: a swarm of <b>${speciesName(w.species)}</b> on ${zoneById(w.zone)?.name || w.zone}!` : "<i>No swarm tuned in yet.</i>"
	html += `<br><small>Tune in to a report and that Pokémon joins the place's pools for the rest of the run (switching costs ${format(swarmCost())} Research Points).</small><br><div class="pk-specials">`
	for (const s of JOHTO_SWARMS) {
		const zone = zoneById(s.zone), on = player.p.swarm === s.zone
		html += `<div class="pk-special ${on ? "pk-card-exempt" : ""}">${pkSprite(s.species, false, 64)}<br><b>${speciesName(s.species)}</b><br><small>${zone?.name || s.zone} · ${Object.keys(s.pools).map(p => POOL_NAMES[p]).join(", ")}</small><br>
			${on ? "<b>On air</b>" : `<button class="pk-button" ${player.points.gte(swarmCost()) ? `onclick="tuneSwarmById('${s.zone}')"` : "disabled"}>Tune in</button>`}</div>`
	}
	return html + "</div>"
}

function kurtHtml() {
	if (!kurtOpen()) return `<i>Kurt makes balls from Apricorns in Azalea Town, past Falkner's Gym.</i>`
	return `<i>"Bring me Research Points and I'll turn Apricorns into something special."</i> Each ball helps catches in its own situation, for the rest of the run (the best one counts).<br><div class="pk-specials">${Object.entries(APRICORN_BALLS).map(([id, b]) => `<div class="pk-special ${hasBall(id) ? "pk-card-exempt" : ""}"><b>${b.name}</b><br><small>${b.text}</small><br>${hasBall(id) ? "<b>Yours</b>" : `<button class="pk-button" ${player.points.gte(b.cost) ? `onclick="buyBallById('${id}')"` : "disabled"}>${format(b.cost)} RP</button>`}</div>`).join("")}</div>`
}

addLayer("p", {
	name: "Pokégear",
	symbol: "P",
	position: 4,
	row: 1,
	color: "#5878C0",
	type: "none",
	startData() { return { unlocked: true, points: new Decimal(0), swarm: "", balls: {} } },
	branches: ["f"],
	layerShown() { return player.t.starter > 0 && currentRegion() === "johto" },
	tooltip() { const w = currentSwarm(); return w ? `Swarm: ${speciesName(w.species)}` : "Pokégear" },
	doReset(resettingLayer) {
		if (resettingLayer === "h") freshLayerData("p")
	},
	tabFormat: {
		Radio: { content: [["display-text", () => `<h2>Pokégear radio</h2><br>`], ["display-text", () => radioHtml()]] },
		"Kurt's Balls": { content: [["display-text", () => `<h2>Kurt's Apricorn Balls</h2><br>`], ["display-text", () => kurtHtml()]] },
	},
})
