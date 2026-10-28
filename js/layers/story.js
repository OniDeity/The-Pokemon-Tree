// Kanto's story: Team Rocket ("r") and the Trainers node ("v": the rival, the S.S. Anne and the
// Fighting Dojo). Chapters, gates and rewards are in logic.js (STORY_CHAPTERS, storyBattle). Kept
// through badges; the Hall of Fame starts them over.

function storyBattleById(id) { storyBattle(id) }

function chapterLockText(ch) {
	if (badges() < ch.badges) return `${ch.badges} badge${ch.badges > 1 ? "s" : ""}`
	const need = [].concat(ch.needs || []).find(id => !chapterCleared(id))
	if (ch.champion && !isChampion()) return "After the League"
	if (need) return `Clear ${chapterById(need).name} first`
	if (ch.needGameCorner && !gameCornerOpen()) return "Under the Game Corner"
	return ""
}

function trainerIconsHtml(ch) {
	const n = chapterProgress(ch)
	return ch.trainers.map((t, k) => {
		const done = n > k, next = n === k
		const label = `${t.floor ? `${t.floor} · ` : ""}${t.name}`
		if (!done && !next) return `<span class="pk-rocket pk-done"><small>${t.floor ? `${t.floor} · ` : ""}${t.boss ? "???" : t.name}</small></span>`
		return `<span class="pk-rocket ${done ? "pk-done" : ""}"><small><b>${label}</b>${done ? " ✓" : ""}</small><br>${trainerTeam(t).map(([id, lv]) => `${pkSprite(id, false, 36)}<small>${lv}</small>`).join("")}</span>`
	}).join("")
}

function chapterHtml(ch) {
	const n = chapterProgress(ch), total = ch.trainers.length
	const gate = ch.gate !== undefined ? ` · <small>opens ${regionGyms()[ch.gate].name}'s Gym</small>` : ch.gateLeague ? " · <small>opens the League</small>" : ""
	if (!chapterOpen(ch)) return `<div class="pk-trainer pk-done"><b>${ch.name}</b>${gate}<br><small>${chapterLockText(ch)}</small></div>`
	let html = `<div class="pk-trainer"><b>${ch.name}</b> (${n}/${total})${gate}<br><small>Reward: ${ch.reward}</small><br>`
	const t = nextStoryTrainer(ch)
	if (!t) return html + `<span style="color:#78C850">Cleared!</span><br>${trainerIconsHtml(ch)}</div>`
	html += `<br><b>${t.floor ? `${t.floor}: ` : ""}${t.name}</b>${t.quote ? `<br><i>"${t.quote}"</i>` : ""}<br>${teamHtml(trainerTeam(t), t.strength || ch.strength)}<br>${predictionHtml(storyPrediction(ch))}<br>`
	html += `<button class="pk-button pk-big" ${canStoryBattle(ch) ? `onclick="storyBattleById('${ch.id}')"` : "disabled"}>Battle ${t.name}</button><br><br>${trainerIconsHtml(ch)}</div>`
	return html
}

function chaptersHtml(layer) {
	return STORY_CHAPTERS.filter(ch => ch.layer === layer && !ch.kantoGym && chapterRegion(ch) === currentRegion()).map(chapterHtml).join("")
}
function milestonesHtml(title, count, list) {
	return `${title}: <b>${count}</b><br>${list.map(([n, text]) => `<span class="${count >= n ? "" : "pk-done"}">${n}: ${text}${count >= n ? " ✓" : ""}</span>`).join("<br>")}`
}
function storyLayerBase(layer) {
	const chapters = () => STORY_CHAPTERS.filter(ch => ch.layer === layer && chapterRegion(ch) === currentRegion())
	return {
		type: "none",
		startData() { return { unlocked: true, points: new Decimal(0), progress: {}, masterBall: false } },
		doReset(resettingLayer) {
			if (resettingLayer === "h") freshLayerData(layer)
		},
		shouldNotify() { return chapters().some(canStoryBattle) },
		tooltip() {
			const open = chapters().filter(chapterOpen)
			const left = open.filter(ch => !chapterCleared(ch.id)).length
			return left ? `${left} place${left > 1 ? "s" : ""} to clear` : "All clear for now"
		},
		// The Hall of Fame's fifth entry battles Gym Leaders automatically; the story too.
		update() { if (hofEntries() >= 5) storyTick() },
	}
}

addLayer("r", {
	...storyLayerBase("r"),
	name: "Team Rocket",
	symbol: "R",
	position: 2,
	row: 2,
	color: "#C03028",
	resource: "Rockets beaten",
	branches: ["k"],
	layerShown() { return player.t.starter > 0 && badges() >= 1 && STORY_CHAPTERS.some(ch => ch.layer === "r" && chapterRegion(ch) === currentRegion()) },
	tabFormat: [
		["display-text", () => `<h2>Team Rocket</h2><br><i>${currentRegion() === "johto" ? "Team Rocket is back in Johto, three years after Giovanni disbanded it, and plans to call him home." : "Team Rocket is up to no good all over Kanto."} Some of its schemes stand in your way.</i>${player.r.masterBall ? "<br><b>You hold the Master Ball.</b>" : ""}`],
		"blank",
		["display-text", () => chaptersHtml("r")],
		"blank",
		["display-text", () => milestonesHtml("Rockets beaten (for good)", rocketsBeaten(), ROCKET_MILESTONES)],
	],
})

addLayer("v", {
	...storyLayerBase("v"),
	name: "Trainers",
	symbol: "V",
	position: 3,
	row: 2,
	color: "#6890F0",
	resource: "rival wins",
	branches: ["t"],
	layerShown() { return player.t.starter > 0 },
	tabFormat: [
		["display-text", () => `<h2>Trainers</h2><br><i>${currentRegion() === "johto" ? "Silver, the boy who stole a Pokémon from Professor Elm, keeps turning up, and Johto's trainers wait in its towers." : "Your rival keeps turning up, and Kanto's toughest trainers wait on the S.S. Anne and in Saffron's Fighting Dojo."}</i>`],
		"blank",
		["display-text", () => chaptersHtml("v")],
		"blank",
		["display-text", () => milestonesHtml("Rival battles won (for good)", rivalWins(), RIVAL_MILESTONES)],
	],
})
