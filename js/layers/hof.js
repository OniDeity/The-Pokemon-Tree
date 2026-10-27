// The Hall of Fame ("h"): after becoming Champion, enter the Hall to reset the whole region for
// Fame. Fame buys permanent upgrades; challenges replay the region under a rule for a lasting reward.
// The Pokédex and achievements are kept.

function hallHtml() {
	if (!player.h.hall.length) return "<i>No entries yet. Become Champion, then enter the Hall of Fame.</i>"
	return player.h.hall.map((e, i) => `<div class="pk-trainer"><b>Entry ${i + 1}</b> · ${formatTime(e.time)}${e.challenge ? ` · ${CHALLENGES[e.challenge].name}` : ""}<br>
		${e.team.map(([id, level, shiny, form]) => `<span class="pk-mon">${pkSprite(id, shiny, 64, "", form)}<br><small>${formName(id, form)}<br>Lv. ${level}</small></span>`).join("")}</div>`).reverse().join("")
}

function automationHtml() {
	return `Automations are rewards of the automation challenges (Shoestring Budget, Hatchling Run, Poacher's Net). Once earned, they're yours for good; switch them off here any time.<br><br>` +
		Object.entries(AUTOMATIONS).map(([id, a]) => {
			const unlocked = automationUnlocked(id)
			const button = unlocked ? `<button class="pk-button ${automationOn(id) ? "pk-on" : ""}" onclick="toggleAutomation('${id}')">${automationOn(id) ? "On" : "Off"}</button>` : `<i>Beat ${CHALLENGES[a.challenge].name}</i>`
			return `<div class="pk-trainer ${unlocked ? "" : "pk-done"}"><b>${a.name}</b> ${button}<br><small>${a.text}</small></div>`
		}).join("")
}

function hofBuyableDef(id) {
	const def = HOF_BUYABLES[id]
	return {
		title: def.title,
		cost() { return hofBuyableCost(id, getBuyableAmount("h", id).toNumber()) },
		display() {
			return `${def.text}<br><br>Level ${formatWhole(getBuyableAmount("h", id))}<br>Cost: ${formatWhole(this.cost())} Fame`
		},
		canAfford() { return player.h.points.gte(this.cost()) },
		buy() {
			player.h.points = player.h.points.sub(this.cost())
			addBuyables("h", id, 1)
		},
		style: { width: "180px", height: "130px" },
	}
}

function hofUpgradeDef(id) {
	const def = HOF_UPGRADES[id]
	return { title: def.title, description: def.text, cost: new Decimal(def.cost) }
}

function challengeDef(id) {
	const def = CHALLENGES[id]
	return {
		name: def.name,
		challengeDescription: def.rules,
		goalDescription: "Become Champion, then enter the Hall of Fame (Fame ×2). Gym Leaders and the League go a little easier on challengers.",
		rewardDescription: def.reward,
		canComplete() { return isChampion() },
		onEnter() { showTab("t") },
		style: { width: "280px", height: "280px" },
	}
}

addLayer("h", {
	name: "Hall of Fame",
	symbol: "H",
	position: 0,
	row: 3,
	color: "#D4A017",
	type: "custom",
	resource: "Fame",
	baseResource: "Research Points",
	baseAmount() { return player.points },
	requires: new Decimal(0),
	startData() { return {
		unlocked: true,
		points: new Decimal(0),
		total: new Decimal(0),
		hall: [],
		enshrined: {},
		auto: {},
	}},
	branches: ["l"],
	layerShown() { return isChampion() || hofEntries() > 0 },
	getResetGain() { return new Decimal(fameGain()) },
	getNextAt() { return new Decimal(0) },
	canReset() { return isChampion() },
	prestigeNotify() { return isChampion() },
	prestigeButtonText() {
		if (!isChampion()) return "Become Champion to enter the Hall of Fame."
		const faces = newFaces().length
		return `Enter the Hall of Fame for ${formatWhole(fameGain())} Fame${faces ? ` (${faces} new face${faces > 1 ? "s" : ""})` : ""}.<br><small>Starts Kanto over with a new starter. Your Pokédex is kept.</small>`
	},
	onPrestige(gain) {
		enterHallOfFame()
		player.h.total = player.h.total.add(gain)
		doPopup("none", `Welcome to the Hall of Fame! Choose your next starter.`, "Hall of Fame", 5, "#D4A017")
		showTab("t")
	},
	tooltip() { return `${formatWhole(player.h.points)} Fame` },
	milestones: {
		0: { requirementDescription: "1 entry", effectDescription: "Challenges and the Fame shop open.", done() { return hofEntries() >= 1 } },
		1: { requirementDescription: "2 entries", effectDescription: "Start every run with the Auto-Search Drone and the Exp. Share.", done() { return hofEntries() >= 2 } },
		2: { requirementDescription: "3 entries", effectDescription: "Pikachu and Eevee can be your starter.", done() { return hofEntries() >= 3 } },
		3: { requirementDescription: "5 entries", effectDescription: "Gym Leaders are challenged automatically when you can win.", done() { return hofEntries() >= 5 } },
	},
	buyables: Object.fromEntries(Object.keys(HOF_BUYABLES).map(id => [id, hofBuyableDef(Number(id))])),
	upgrades: Object.fromEntries(Object.keys(HOF_UPGRADES).map(id => [id, hofUpgradeDef(Number(id))])),
	challenges: Object.fromEntries(Object.keys(CHALLENGES).map(id => [id, challengeDef(Number(id))])),
	tabFormat: {
		"Hall of Fame": {
			content: [
				"main-display",
				"prestige-button",
				"blank",
				["display-text", () => `Fame per entry: 20, +5 per party member never enshrined before, +1 per 10 species caught. Enshrined species: ${Object.keys(player.h.enshrined).length}.`],
				"blank",
				"milestones",
				"blank",
				["display-text", () => hallHtml()],
			],
		},
		"Fame shop": {
			content: ["main-display", "buyables", "blank", "upgrades"],
			unlocked() { return hofEntries() >= 1 },
		},
		Automation: {
			content: [["display-text", () => automationHtml()]],
			unlocked() { return hofEntries() >= 1 },
		},
		Challenges: {
			content: [
				["display-text", () => anyChallenge()
					? `You're in the <b>${CHALLENGES[player.h.activeChallenge].name}</b> challenge. Clicking it again ends it early and starts a normal run.`
					: "Starting a challenge resets this run (badges, Pokémon and gifts; the Pokédex is kept)."],
				"blank",
				"challenges",
			],
			unlocked() { return hofEntries() >= 1 },
		},
	},
})
