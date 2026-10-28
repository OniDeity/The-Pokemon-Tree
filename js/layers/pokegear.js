// The Pokégear ("p"): Johto's radio swarms and Kurt's Apricorn Balls; in Hoenn it's the PokéNav, with
// the TV's outbreak reports, Devon's Balls and Mirage Island. Kept through badges; the Hall of Fame
// starts it over. Rules are in logic.js (tuneSwarm, buyBall, ballMult, mirageStep).

function tuneSwarmById(id) { tuneSwarm(id) }
function buyBallById(id) { buyBall(id) }

function swarmKey(w) { return pokenav() ? w.zone + w.species : w.zone }
function radioHtml() {
	if (!radioOpen()) return pokenav() ? `<i>The TV in every Pokémon Center reports outbreaks once you've beaten Roxanne.</i>` : `<i>Win the Radio Card at Goldenrod's Radio Tower quiz (after ${REGION_RULES.keyItems.radioCard?.badges ?? 3} badges) to tune in to the swarm reports.</i>`
	const w = currentSwarm()
	const what = pokenav() ? "an outbreak" : "a swarm"
	let html = w ? `${pokenav() ? "On TV" : "On air"}: ${what} of <b>${speciesName(w.species)}</b> on ${zoneById(w.zone)?.name || w.zone}!` : `<i>No ${pokenav() ? "outbreak" : "swarm"} tuned in yet.</i>`
	html += `<br><small>Tune in to a report and that Pokémon joins the place's pools for the rest of the run (switching costs ${format(swarmCost())} Research Points).</small><br><div class="pk-specials">`
	for (const s of regionSwarms()) {
		const zone = zoneById(s.zone), key = swarmKey(s), on = player.p.swarm === key
		html += `<div class="pk-special ${on ? "pk-card-exempt" : ""}">${pkSprite(s.species, false, 64)}<br><b>${speciesName(s.species)}</b><br><small>${zone?.name || s.zone} · ${Object.keys(s.pools).map(p => POOL_NAMES[p]).join(", ")}</small><br>
			${on ? `<b>${pokenav() ? "On TV" : "On air"}</b>` : `<button class="pk-button" ${player.points.gte(swarmCost()) ? `onclick="tuneSwarmById('${key}')"` : "disabled"}>Tune in</button>`}</div>`
	}
	return html + "</div>"
}

function kurtHtml() {
	if (!kurtOpen()) return pokenav() ? `<i>The Devon Corporation in Rustboro sells its new balls once you've beaten Roxanne.</i>` : `<i>Kurt makes balls from Apricorns in Azalea Town, past Falkner's Gym.</i>`
	const intro = pokenav() ? `<i>"Devon's newest Poké Balls, each made for one kind of catch."</i>` : `<i>"Bring me Research Points and I'll turn Apricorns into something special."</i>`
	return `${intro} Each ball helps catches in its own situation, for the rest of the run (the best one counts).<br><div class="pk-specials">${Object.entries(regionBalls()).map(([id, b]) => `<div class="pk-special ${hasBall(id) ? "pk-card-exempt" : ""}"><b>${b.name}</b><br><small>${b.text}</small><br>${hasBall(id) ? "<b>Yours</b>" : `<button class="pk-button" ${player.points.gte(b.cost) ? `onclick="buyBallById('${id}')"` : "disabled"}>${format(b.cost)} RP</button>`}</div>`).join("")}</div>`
}

addLayer("p", {
	name() { return pokenav() ? "PokéNav" : "Pokégear" },
	symbol: "P",
	position: 4,
	row: 1,
	color: "#5878C0",
	type: "none",
	startData() { return { unlocked: true, points: new Decimal(0), swarm: "", balls: {}, mirage: 0, mirageBattles: 0 } },
	branches: ["f"],
	layerShown() { return player.t.starter > 0 && (currentRegion() === "johto" || pokenav()) },
	tooltip() { const w = currentSwarm(); return mirageVisible() ? "Mirage Island in sight!" : w ? `${pokenav() ? "Outbreak" : "Swarm"}: ${speciesName(w.species)}` : pokenav() ? "PokéNav" : "Pokégear" },
	doReset(resettingLayer) {
		if (resettingLayer === "h") freshLayerData("p")
	},
	tabFormat: {
		Radio: { content: [["display-text", () => `<h2>${pokenav() ? "PokéNav: TV outbreak reports" : "Pokégear radio"}</h2><br>`], ["display-text", () => radioHtml()],
			["display-text", () => pokenav() && isChampion() ? `<br><b>Mirage Island</b>: ${mirageVisible() ? `in sight for ${player.p.mirage} more wild battles: search it on the Map!` : `not in sight. Sightings are checked every ${MIRAGE_BATTLES} wild battles (${MIRAGE_BATTLES - (player.p.mirageBattles || 0)} to go).`}` : ""]] },
		Balls: { content: [["display-text", () => `<h2>${pokenav() ? "Devon's Poké Balls" : "Kurt's Apricorn Balls"}</h2><br>`], ["display-text", () => kurtHtml()]] },
	},
})
