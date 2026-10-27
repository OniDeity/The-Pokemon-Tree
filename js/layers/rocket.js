// The Rocket Hideout ("r"): under the Game Corner, Team Rocket's floors and Giovanni. Kept through
// badges; the Hall of Fame starts it over. Rules are in logic.js (challengeRocket).

function rocketFloorsHtml() {
	let i = 0
	return ROCKET_FLOORS.map(floor => `<div class="pk-trainer"><b>${floor.name}</b><br>${floor.trainers.map(() => {
		const t = ROCKET_TRAINERS[i], k = i++
		const done = player.r.beaten > k, next = player.r.beaten === k
		if (!done && !next) return `<span class="pk-rocket pk-done"><br><small>${t.boss ? "???" : "Rocket Grunt"}</small></span>`
		return `<span class="pk-rocket ${done ? "pk-done" : ""}"><small><b>${t.boss ? "Giovanni" : "Rocket Grunt"}</b>${done ? " ✓" : ""}</small><br>${t.team.map(([id, lv]) => `${pkSprite(id, false, 40)}<small>${lv}</small>`).join("")}</span>`
	}).join("")}</div>`).join("")
}

function nextRocketHtml() {
	const t = nextRocket()
	if (!t) return `<span style="color:#78C850">Team Rocket has fled the Hideout. You have the Silph Scope: Ghost Pokémon are twice as easy to catch this run.</span>`
	const strength = t.boss ? GIOVANNI_STRENGTH : ROCKET_STRENGTH
	return `<h3>${t.floor}: ${t.boss ? "Giovanni" : "Team Rocket Grunt"}</h3><br>${t.quote ? `<i>"${t.quote}"</i><br>` : ""}${teamHtml(t.team, strength)}<br>${predictionHtml(rocketPrediction())}<br>
		<small>${t.boss ? "Reward: the Silph Scope (Ghost Pokémon twice as easy to catch this run)." : `Reward: ${formatCoins(t.coins * (rocketMilestone(5) ? 2 : 1))} coins.`}</small>`
}

addLayer("r", {
	name: "Rocket Hideout",
	symbol: "R",
	position: 2,
	row: 2,
	color: "#C03028",
	type: "none",
	resource: "Rockets beaten",
	startData() { return {
		unlocked: true,
		points: new Decimal(0),
		beaten: 0,
	}},
	branches: ["k"],
	layerShown() { return player.t.starter > 0 && rocketOpen() },
	tooltip() { return giovanniBeaten() ? "Cleared" : `${player.r.beaten}/${ROCKET_TRAINERS.length} beaten` },
	shouldNotify() { return canChallengeRocket() },
	doReset(resettingLayer) {
		if (resettingLayer === "h") freshLayerData("r")
	},
	update() {
		player.r.points = new Decimal(rocketsBeaten())
		// The Hall of Fame's fifth entry challenges Gym Leaders automatically; the Hideout too.
		if (hofEntries() >= 5) challengeRocket()
	},
	clickables: {
		11: {
			title() { return nextRocket() ? `Battle the ${nextRocket().boss ? "boss" : "Grunt"}` : "Hideout cleared" },
			canClick() { return canChallengeRocket() },
			onClick() { challengeRocket() },
			style: { width: "200px", height: "60px" },
		},
	},
	tabFormat: [
		["display-text", () => `<h2>Rocket Hideout</h2><br><i>A poster in the Game Corner hides a switch... Team Rocket's base is right under the slots.</i>`],
		"blank",
		["display-text", () => nextRocketHtml()],
		["clickable", 11],
		"blank",
		["display-text", () => rocketFloorsHtml()],
		"blank",
		["display-text", () => `Rockets beaten (for good): <b>${rocketsBeaten()}</b><br>${ROCKET_MILESTONES.map(([n, text]) => `<span class="${rocketMilestone(n) ? "" : "pk-done"}">${n}: ${text}${rocketMilestone(n) ? " ✓" : ""}</span>`).join("<br>")}`],
	],
})
