// The Story node ("q"): each region's story drawn as a map of chapters (the Storyline tab), the
// Rivals, Villains and Challengers tabs, and rematch calls. Chapters, gates, rewards and rematches
// are in logic.js (STORY_CHAPTERS, storyBattle, rematch). Kept through badges; the Hall of Fame
// starts it over. Kanto's post-game Leaders are chapters too, drawn on the Gyms node.

function storyBattleById(id) { storyBattle(id) }
function rematchById(id) { rematch(id) }
function selectChapter(id) { player.q.selected = id }

function regionChapters() { return STORY_CHAPTERS.filter(ch => chapterRegion(ch) === currentRegion()) }

function chapterLockText(ch) {
	if (ch.champion && !isChampion()) return "After the League"
	if (badges() < ch.badges) return `${ch.badges} badge${ch.badges > 1 ? "s" : ""}`
	const need = [].concat(ch.needs || []).find(id => !chapterCleared(id))
	if (need) return `Clear ${chapterById(need).name} first`
	if (ch.needGameCorner && !gameCornerOpen()) return "Under the Game Corner"
	return ""
}

/** What clearing a chapter opens: a Gym, the League, a gift or legendary. */
function chapterOpens(ch) {
	const opens = []
	if (ch.gate !== undefined) opens.push(`${REGIONS[chapterRegion(ch)].gyms[ch.gate].name}'s Gym`)
	if (ch.gateLeague) opens.push("the League")
	for (const [sid, need] of Object.entries(SPECIAL_STORY)) {
		const s = ALL_SPECIALS.find(x => x.id === sid)
		if (need === ch.id && s) opens.push(speciesName(s.species))
	}
	if (ch.id === "kantoBlue") opens.push("Mt. Silver")
	return opens
}
function chapterState(ch) { return chapterCleared(ch.id) ? "cleared" : chapterOpen(ch) ? "open" : "locked" }

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
	const opens = chapterOpens(ch)
	const gate = opens.length ? ` · <small>opens ${opens.join(", ")}</small>` : ""
	if (!chapterOpen(ch)) return `<div class="pk-trainer pk-done"><b>${ch.name}</b>${gate}<br><small>${chapterLockText(ch)}</small></div>`
	let html = `<div class="pk-trainer"><b>${ch.name}</b> (${n}/${total})${gate}<br><small>Reward: ${ch.reward}</small><br>`
	const t = nextStoryTrainer(ch)
	if (!t) return html + `<span style="color:#78C850">Cleared!</span><br>${trainerIconsHtml(ch)}</div>`
	html += `<br><b>${t.floor ? `${t.floor}: ` : ""}${t.name}</b>${t.quote ? `<br><i>"${t.quote}"</i>` : ""}<br>${teamHtml(trainerTeam(t), t.strength || ch.strength)}<br>${predictionHtml(storyPrediction(ch))}<br>`
	html += `<button class="pk-button pk-big" ${canStoryBattle(ch) ? `onclick="storyBattleById('${ch.id}')"` : "disabled"}>Battle ${t.name}</button><br><br>${trainerIconsHtml(ch)}</div>`
	return html
}

/** One step of the map: a chapter's button, coloured by its arc and state. */
function storyNodeHtml(ch) {
	const state = chapterState(ch), opens = chapterOpens(ch)
	const sel = selectedChapter() === ch ? "pk-story-selected" : ""
	const progress = state === "cleared" ? "✓" : `${chapterProgress(ch)}/${ch.trainers.length}`
	const sub = state === "locked" ? chapterLockText(ch) : opens.length ? `→ ${opens.join(", ")}` : ""
	return `<button class="pk-story-node pk-story-${state} pk-arc-${ch.arc} ${sel}" onclick="selectChapter('${ch.id}')" title="${ch.reward}">${ch.name} <small>${progress}</small>${sub ? `<br><small>${sub}</small>` : ""}</button>`
}

/** The Storyline: the region's chapters by the badges they need, between its Gyms and League. */
function storyMapHtml() {
	const r = region(), chapters = regionChapters(), b = badges()
	let html = `<div class="pk-story-map">`
	for (let tier = 0; tier <= 9; tier++) {
		const here = chapters.filter(ch => tier === 9 ? ch.champion : !ch.champion && ch.badges === tier).sort((a, b) => !!a.red - !!b.red)
		let marker
		if (tier === 0) marker = `<span class="pk-story-mark pk-story-mark-on">★</span><b>${r.professor}'s lab</b>`
		else if (tier <= 8) {
			const gym = r.gyms[tier - 1], won = b >= tier
			marker = `${won ? `<img src="resources/badges/${tier - 1 + r.badgeImage}.png" width="24" height="24">` : `<span class="pk-story-mark"></span>`}<b>${gym.badge}</b> <small>${gym.name}</small>`
		} else marker = `<span class="pk-story-mark ${isChampion() ? "pk-story-mark-on" : ""}">♛</span><b>The League</b> <small>${isChampion() ? "Champion!" : "after 8 badges"}</small>`
		html += `<div class="pk-story-tier ${tier <= b || (tier === 9 && isChampion()) ? "pk-story-reached" : ""}"><div class="pk-story-marker">${marker}</div>`
		if (here.length) html += `<div class="pk-story-nodes">${here.map(storyNodeHtml).join("")}</div>`
		html += `</div>`
	}
	return html + `</div><small><span class="pk-arc-key pk-arc-rival">Rival</span> <span class="pk-arc-key pk-arc-villain">Villain</span> <span class="pk-arc-key pk-arc-challenger">Challenger</span> · Click a place to see it.</small>`
}

/** The chapter shown under the map: the one picked, else the next one open. */
function selectedChapter() {
	const chapters = regionChapters()
	return chapters.find(ch => ch.id === player.q.selected) || chapters.find(ch => chapterOpen(ch) && !chapterCleared(ch.id)) || null
}

function callsHtml() {
	const calls = player.q.calls.map(chapterById).filter(ch => ch && chapterRegion(ch) === currentRegion())
	const next = callable().length ? `Next call in ${formatTime(Math.max(0, callSeconds() - (player.q.callProgress || 0)))} of searching.` : "Clear a place for its trainers to call you for rematches."
	let html = `<h3>📞 Rematch calls (${calls.length}/${maxCalls()})</h3><br><small>${player.q.calls.length >= maxCalls() ? "Your phone is full: battle a caller to free a line." : next}</small>`
	for (const ch of calls) {
		const t = rematchTrainer(ch)
		html += `<div class="pk-trainer"><b>${t.name}</b> at ${ch.name} <small>(rematch ${(player.q.rematches[ch.id] || 0) + 1})</small><br>${teamHtml(rematchTeam(ch), rematchStrength(ch))}<br>${predictionHtml(rematchPrediction(ch))}<br>
			<button class="pk-button" ${canRematch(ch.id) ? `onclick="rematchById('${ch.id}')"` : "disabled"}>Battle</button></div>`
	}
	return html
}

function chaptersHtml(arc) {
	return regionChapters().filter(ch => ch.arc === arc && !ch.kantoGym).map(chapterHtml).join("") || "<i>Nobody here in this region yet.</i>"
}
function milestonesHtml(title, count, list) {
	return `${title}: <b>${count}</b><br>${list.map(([n, text]) => `<span class="${count >= n ? "" : "pk-done"}">${n}: ${text}${count >= n ? " ✓" : ""}</span>`).join("<br>")}`
}
function storyIntro() {
	if (currentRegion() === "hoenn") return "May, Professor Birch's daughter, wants to see how you measure up, Wally sets out on a journey of his own, and Team Aqua and Team Magma race to wake the ancient Pokémon of the sea and the land."
	return currentRegion() === "johto"
		? "Silver, the boy who stole a Pokémon from Professor Elm, keeps turning up, Team Rocket is back three years after Giovanni disbanded it, and Johto's trainers wait in its towers."
		: "Your rival keeps turning up, Team Rocket is up to no good all over Kanto, and Kanto's toughest trainers wait on the S.S. Anne and in Saffron's Fighting Dojo."
}

addLayer("q", {
	name: "Story",
	symbol: "St",
	position: 2,
	row: 2,
	color: "#6890F0",
	type: "none",
	resource: "story battles won",
	startData() { return { unlocked: true, points: new Decimal(0), progress: {}, masterBall: false, calls: [], callProgress: 0, rematches: {}, selected: "" } },
	branches: ["t"],
	layerShown() { return player.t.starter > 0 },
	doReset(resettingLayer) {
		if (resettingLayer === "h") freshLayerData("q")
	},
	shouldNotify() { return regionChapters().some(canStoryBattle) || player.q.calls.some(canRematch) },
	tooltip() {
		const left = regionChapters().filter(ch => chapterOpen(ch) && !chapterCleared(ch.id)).length
		const calls = player.q.calls.length
		return `${left ? `${left} place${left > 1 ? "s" : ""} to clear` : "All clear for now"}${calls ? ` · ${calls} call${calls > 1 ? "s" : ""}` : ""}`
	},
	// The Hall of Fame's fifth entry battles Gym Leaders automatically; the story and its rematches too.
	update() {
		player.q.points = new Decimal(storyWins())
		if (hofEntries() >= 5) { storyTick(); rematchTick() }
	},
	tabFormat: {
		Storyline: {
			content: [
				["display-text", () => `<h2>${region().name}'s story</h2><br><i>${storyIntro()}</i>`],
				"blank",
				["display-text", () => callsHtml()],
				"blank",
				["display-text", () => storyMapHtml()],
				"blank",
				["display-text", () => selectedChapter() ? chapterHtml(selectedChapter()) : ""],
			],
		},
		Rivals: {
			content: [
				["display-text", () => chaptersHtml("rival")],
				"blank",
				["display-text", () => milestonesHtml("Rival battles won (for good)", rivalWins(), RIVAL_MILESTONES)],
			],
		},
		Villains: {
			content: [
				["display-text", () => `${player.q.masterBall ? "<b>You hold the Master Ball.</b><br><br>" : ""}${chaptersHtml("villain")}`],
				"blank",
				["display-text", () => milestonesHtml("Villains beaten (for good)", rocketsBeaten(), ROCKET_MILESTONES)],
			],
		},
		Challengers: {
			content: [
				["display-text", () => chaptersHtml("challenger")],
				"blank",
				["display-text", () => milestonesHtml("Story battles won (for good: chapters and rematches)", storyWins(), STORY_MILESTONES)],
			],
		},
	},
})
