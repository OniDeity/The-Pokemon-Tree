// The Game Corner ("k"): Celadon's slots and prize counter. Coins are this layer's points. Kept
// through badges; the Hall of Fame starts it over. Rules are in logic.js (spinSlots, buyCoins).

function toggleSlots() { player.k.spinning = !player.k.spinning }

function prizeCounterHtml() {
	const prizes = ALL_SPECIALS.filter(s => isPrize(s) && s.region === currentRegion())
	return `<h3>Prize Pokémon</h3><br><div class="pk-specials">${prizes.map(s => {
		const status = specialStatus(s)
		const done = player.t.specials[s.id]
		return `<div class="pk-special ${done ? "pk-done" : ""}">${pkSprite(s.species, false, 80)}<br><b>${speciesName(s.species)}</b> Lv. ${s.level}<br><small>${formatCoins(prizeCoins(s))} coins</small><br>
			${done ? "<b>Done</b>" : `<button class="pk-button" ${status.ok ? `onclick="takeSpecialById('${s.id}')"` : "disabled"}>${status.ok ? "Trade in" : status.why}</button>`}</div>`
	}).join("")}</div>`
}

function slotsHtml() {
	const ret = slotReturn()
	return `<b>Slots</b>: ${formatCoins(slotBet())} coins a spin, one spin every ${spinTime()}s.
		<button class="pk-button ${player.k.spinning ? "pk-on" : ""}" onclick="toggleSlots()" ${coins() < BASE_BET && !player.k.spinning ? "disabled" : ""}>${player.k.spinning ? "Stop" : "Play"}</button><br>
		<small>On average the slots pay back <span class="${ret >= 1 ? "pk-missing" : ""}">${Math.round(ret * 100)}%</span> of what you bet. ${ret < 1 ? "You'll lose coins over time, but every 7 7 7 counts toward the jackpot milestones." : "Winning on average!"}</small><br>
		<small>${SLOT_RESULTS.map(([name, p, pay]) => `${name}: ×${+(pay * slotPayoutMult()).toFixed(2)} (${+(p * 100).toFixed(1)}%)`).join(" · ")}</small><br>
		${player.k.last ? `<i>${player.k.last}</i>` : ""}`
}

function coinBuyable(id) {
	const def = GAME_CORNER_BUYABLES[id]
	return {
		title: def.title,
		cost() { return buyableCost(def, getBuyableAmount("k", id).toNumber()) },
		display() { return `${def.text}<br><br>Level ${formatWhole(getBuyableAmount("k", id))}<br>Cost: ${formatCoins(this.cost().toNumber())} coins` },
		canAfford() { return player.k.points.gte(this.cost()) },
		buy() {
			player.k.points = player.k.points.sub(this.cost())
			addBuyables("k", id, 1)
		},
		style: { width: "170px", height: "120px" },
	}
}

function coinClickable(n) {
	return {
		title: `Buy ${formatCoins(n)} coins`,
		display() { return `${format(coinsCost(n))} Research Points` },
		canClick() { return player.points.gte(coinsCost(n)) },
		onClick() { buyCoins(n) },
		style: { width: "150px", height: "70px" },
	}
}

addLayer("k", {
	name: "Game Corner",
	symbol: "K",
	position: 3,
	row: 1,
	color: "#E0B040",
	type: "none",
	resource: "coins",
	startData() { return {
		unlocked: true,
		points: new Decimal(typeof player !== "undefined" && player.d ? startingCoins() : 0),
		spinning: false,
		spinProgress: 0,
		last: "",
	}},
	branches: ["f"],
	layerShown() { return player.t.starter > 0 && gameCornerOpen() },
	tooltip() { return `${formatCoins(coins())} coins` },
	doReset(resettingLayer) {
		if (resettingLayer === "h") freshLayerData("k")
	},
	update(diff) { gameCornerTick(diff) },
	clickables: { 11: coinClickable(50), 12: coinClickable(500), 13: coinClickable(5000) },
	buyables: Object.fromEntries(Object.keys(GAME_CORNER_BUYABLES).map(id => [id, coinBuyable(id)])),
	upgrades: Object.fromEntries(Object.entries(GAME_CORNER_UPGRADES).map(([id, def]) => [id, {
		title: def.title,
		description: def.text,
		cost: new Decimal(def.cost),
		currencyDisplayName: "coins",
	}])),
	tabFormat: [
		["display-text", () => `<h2>${currentRegion() === "johto" ? "Goldenrod" : "Celadon"} Game Corner</h2><br><i>"Welcome! Need some coins for the slots?"</i><br><br>You have <h2 style="color:#E0B040">${formatCoins(coins())}</h2> coins`],
		"blank",
		["row", [["clickable", 11], ["clickable", 12], ["clickable", 13]]],
		"blank",
		["display-text", () => slotsHtml()],
		"blank",
		["display-text", () => `Jackpots (for good): <b>${jackpots()}</b><br>${JACKPOT_MILESTONES.map(([n, text]) => `<span class="${jackpotMilestone(n) ? "" : "pk-done"}">${n}: ${text}${jackpotMilestone(n) ? " ✓" : ""}</span>`).join("<br>")}`],
		"blank",
		"upgrades",
		"blank",
		["display-text", () => `<h3>Prize counter</h3>`],
		"buyables",
		"blank",
		["display-text", () => prizeCounterHtml()],
	],
})
