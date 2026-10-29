// The Hall of Fame ("h"): after becoming Champion, enter the Hall to reset the whole region for
// Fame. Fame buys permanent upgrades; challenges replay the region under a rule for a lasting reward.
// The Pokédex starts over; records of special looks, achievements and lifetime counters are kept.

function hallHtml() {
	if (!player.h.hall.length) return "<i>No entries yet. Become Champion, then enter the Hall of Fame.</i>"
	return player.h.hall.map((e, i) => `<div class="pk-trainer"><b>Entry ${i + 1}</b> · ${formatTime(e.time)}${e.challenge ? ` · ${CHALLENGES[e.challenge].name}` : ""}<br>
		${e.team.map(([id, level, shiny, form]) => `<span class="pk-mon">${pkSprite(id, shiny, 64, "", form)}<br><small>${formName(id, form)}<br>Lv. ${level}</small></span>`).join("")}</div>`).reverse().join("")
}

function enshrineHtml() {
	const species = enshrinedSpecies(), looks = enshrinedLooks()
	const tier = (list, n) => list.map(m => `<span class="${n >= m ? "" : "pk-done"}">${m}${n >= m ? " ✓" : ""}</span>`).join(" · ")
	return `<div class="pk-trainer"><b>Enshrined: ${species}/386 species</b>, plus ${looks} Shiny, Albino, Melanistic or form Pokémon<br>
		<small>Each one: +${ENSHRINE_RP * 100}% Research Points and +${ENSHRINE_FAME * 100}% Fame (now ×${format(enshrineRpMult())} RP, ×${format(enshrineFameMult())} Fame).<br>
		Species milestones, Fame ×1.1 each: ${tier(ENSHRINE_MILESTONES, species)}<br>
		Special looks, Research Points ×1.1 each: ${tier(LOOK_MILESTONES, looks)}</small></div>`
}
function toggleCarryAuto() { player.h.carryAuto = player.h.carryAuto === false }
/** Bill's Transfer: pick the box Pokémon that come along into the next run. */
function carryHtml() {
	const slots = carrySlots()
	const chosen = (player.h.carry || []).filter(k => player.t.box[k])
	return `<div class="pk-trainer"><b>Bill's Transfer</b>: ${chosen.length}/${slots} chosen to come along into your next run, at the starter's level.<br>
		<button class="pk-button ${player.h.carryAuto !== false ? "pk-on" : ""}" onclick="toggleCarryAuto()">Fill empty slots: ${player.h.carryAuto !== false ? "On" : "Off"}</button>
		<small>with your strongest species never enshrined (★), so they can enter the next Hall of Fame as new faces.</small>
		${carryPicks().length ? `<br><small>Coming along if you entered the Hall now: ${carryPicks().map(keyName).join(", ")}.</small>` : ""}</div>`
}
function carryPickerHtml() {
	const chosen = (player.h.carry || []).filter(k => player.t.box[k])
	const keys = Object.keys(player.t.box).filter(k => searchMatches(player.h.carrySearch, speciesOf(k)))
		.sort((a, b) => (!!player.h.enshrined[speciesOf(a)] - !!player.h.enshrined[speciesOf(b)]) || player.t.box[b].level - player.t.box[a].level)
	const card = k => `<button class="pk-dex-entry pk-button ${chosen.includes(k) ? "pk-on" : ""}" onclick="toggleCarry('${k}')" title="${keyName(k)}${player.h.enshrined[speciesOf(k)] ? "" : " (never enshrined)"}">${pkSprite(speciesOf(k), colorOf(k), 48, "", formOf(k))}<br><small>${player.h.enshrined[speciesOf(k)] ? "" : "★ "}${keyName(k)}</small></button>`
	return `<div class="pk-dex">${keys.slice(0, 48).map(card).join("")}</div>${keys.length > 48 ? `<small>${keys.length - 48} more: search by name.</small>` : ""}`
}

function automationHtml() {
	return `Automations are rewards of the automation challenges (Shoestring Budget, Hatchling Run, Poacher's Net). Once earned, they're yours for good; switch them off here any time.<br><br>` +
		Object.entries(AUTOMATIONS).map(([id, a]) => {
			const unlocked = automationUnlocked(id)
			const button = unlocked ? `<button class="pk-button ${automationOn(id) ? "pk-on" : ""}" onclick="toggleAutomation('${id}')">${automationOn(id) ? "On" : "Off"}</button>` : `<i>Beat ${CHALLENGES[a.challenge].name}</i>`
			return `<div class="pk-trainer ${unlocked ? "" : "pk-done"}"><b>${a.name}</b> ${button}<br><small>${a.text}</small></div>`
		}).join("")
}

/** The Fame shop's ceiling, and what the regions not beaten yet would add. */
function fameShopHtml() {
	const locked = FAME_REGIONS.filter(r => !regionBeaten(r))
	let html = `Buyables go up to level <b>${hofBuyableCap()}</b>: ${FAME_CAP_STEP} more for every region whose Champion enters the Hall of Fame (${FAME_REGIONS.map(r => REGIONS[r].name).join(", ")}).`
	if (locked.length) html += `<br><small>Not beaten yet, each with a buyable and two upgrades of its own: ${locked.map(r => REGIONS[r].name).join(", ")}.</small>`
	return html
}

function hofBuyableDef(id) {
	const def = HOF_BUYABLES[id]
	return {
		title: def.title,
		cost() { return hofBuyableCost(id, getBuyableAmount("h", id).toNumber()) },
		display() {
			const full = hofBuyable(id) >= hofBuyableCap()
			return `${def.text}<br><br>Level ${formatWhole(getBuyableAmount("h", id))}/${hofBuyableCap()}<br>${full ? "Beat a new region to raise the cap" : `Cost: ${formatWhole(this.cost())} Fame`}`
		},
		canAfford() { return canBuyHofBuyable(id) && player.h.points.gte(this.cost()) },
		purchaseLimit() { return hofBuyableCap() },
		unlocked() { return fameItemOpen(def) },
		buy() {
			player.h.points = player.h.points.sub(this.cost())
			addBuyables("h", id, 1)
		},
		style: { width: "180px", height: "130px" },
	}
}

function hofUpgradeDef(id) {
	const def = HOF_UPGRADES[id]
	return { title: def.title, description: def.region ? `${REGIONS[def.region].name}: ${def.text}` : def.text, cost: new Decimal(def.cost), unlocked() { return fameItemOpen(def) } }
}

function challengeDef(id) {
	const def = CHALLENGES[id]
	return {
		name: def.name,
		challengeDescription: def.rules,
		goalDescription: "Become Champion, then enter the Hall of Fame (Fame ×2). Gym Leaders and the League go a little easier on challengers.",
		rewardDescription: def.reward,
		unlocked() { return !def.unlocked || def.unlocked() },
		canComplete() { return isChampion() },
		onEnter() { resetRunPokedex(); showTab("t") },
		onExit() { resetRunPokedex() },
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
		enshrinedLooks: {},
		carry: [],
		carried: [],
		carryAuto: true,
		carrySearch: "",
		auto: {},
		mechanics: {},
		regionsBeaten: {},
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
		return `Enter the Hall of Fame for ${formatWhole(fameGain())} Fame${faces ? ` (${faces} new face${faces > 1 ? "s" : ""})` : ""}.<br><small>Starts Kanto over with a new starter and a fresh Pokédex. Shiny and form records, achievements and Fame are kept.</small>`
	},
	onPrestige(gain) {
		enterHallOfFame()
		player.h.total = player.h.total.add(gain)
		pkPopup("hof", `Welcome to the Hall of Fame! Choose your next starter.`, "Hall of Fame", 5, "#D4A017")
		showTab("t")
	},
	tooltip() { return `${formatWhole(player.h.points)} Fame` },
	milestonePopups() { return notifyOn("milestone") },
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
				["display-text", () => `Fame per entry: 20, +5 per party member never enshrined before, +1 per 10 species caught.`],
				"blank",
				["display-text", () => enshrineHtml()],
				"blank",
				"milestones",
				"blank",
				["display-text", () => hallHtml()],
			],
		},
		"Bill's Transfer": {
			content: [["display-text", () => carryHtml()], "blank", ["pk-search", "carrySearch"], ["display-text", () => carryPickerHtml()]],
			unlocked() { return carrySlots() > 0 },
		},
		"Fame shop": {
			content: ["main-display", ["display-text", () => fameShopHtml()], "blank", "buyables", "blank", "upgrades"],
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
					: "Starting a challenge resets this run (badges, Pokémon, gifts and the Pokédex; shiny and form records are kept)."],
				"blank",
				"challenges",
			],
			unlocked() { return hofEntries() >= 1 },
		},
	},
})
