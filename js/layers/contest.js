// Pokémon Contests ("n"): a mechanic unlocked in Hoenn and kept for good. Feed a box Pokémon
// Pokéblocks to raise a condition, then enter it in that category's next rank. Rules are in
// logic.js (CONTEST_CATEGORIES, contestWinChance, judgeContest); ribbons live in player.d.ribbons.
// Kept through badges; the Hall of Fame starts it over (the ribbons stay).

function selectContestant(key) { player.n.selected = key }
function feedPokeblockFor(key, cat) { feedPokeblock(key, cat) }
function enterContestFor(key, cat) { enterContest(key, cat) }
function toggleContestPass() { player.n.auto = !player.n.auto }

function contestant() { return player.t.box[player.n.selected] ? player.n.selected : player.t.party[0] || "" }

function rankLetters(id) {
	return Object.entries(CONTEST_CATEGORIES).map(([cat, c]) => {
		const r = ribbonRank(id, cat)
		return `<span class="pk-ribbon pk-ribbon-${c.color} ${r < 0 ? "pk-done" : ""}" title="${c.name}: ${r < 0 ? "no ribbon yet" : CONTEST_RANKS[r].name}">${r < 0 ? "·" : "NSHM"[r]}</span>`
	}).join("")
}

function currentContestHtml() {
	if (!contestRunning()) return `<i>No contest on right now: choose a Pokémon and a category below.</i>`
	const { key, cat, rank, remaining } = player.n.contest
	const chance = player.t.box[key] ? contestWinChance(key, cat, rank) : 0
	return `<div class="pk-trainer">${pkSprite(speciesOf(key), isShiny(key), 64, "", formOf(key))}<br><b>${keyName(key)}</b> is on stage in the <b>${CONTEST_CATEGORIES[cat].name} Contest</b> (${CONTEST_RANKS[rank].name})<br>
		Judging in ${formatTime(Math.max(0, remaining))} · ${Math.round(chance * 100)}% to win</div>`
}

function contestantHtml() {
	const key = contestant()
	if (!key) return ""
	const id = speciesOf(key), cost = contestBlockCost()
	let html = `<div class="pk-trainer">${pkSprite(id, isShiny(key), 64, "", formOf(key))}<br><b>${keyName(key)}</b> Lv. ${player.t.box[key].level} · ${SPECIES[id].types.join("/")}<br>${rankLetters(id)}<br><br>
		<table class="pk-contest-table"><tr><th>Category</th><th>Condition</th><th>Score</th><th>Next</th><th>Win</th><th></th></tr>`
	for (const [cat, c] of Object.entries(CONTEST_CATEGORIES)) {
		const rank = nextContestRank(id, cat), cond = conditionOf(key, cat)
		html += `<tr><td><span class="pk-ribbon pk-ribbon-${c.color}">${c.name}</span></td><td>${cond}/${MAX_CONDITION}</td>
			<td title="condition ${cond} + type appeal ${typeAppeal(id, cat)} + half its level">${Math.floor(contestScore(key, cat))}</td>
			<td>${rank === null ? "All won ✓" : CONTEST_RANKS[rank].name}</td><td>${rank === null ? "" : `${Math.round(contestWinChance(key, cat, rank) * 100)}%`}</td>
			<td><button class="pk-button" ${canFeedPokeblock(key, cat) ? `onclick="feedPokeblockFor('${key}', '${cat}')"` : "disabled"} title="+${pokeblockGain()} ${c.name}">${POKEBLOCKS[c.color].name}<br><small>${format(cost)} RP</small></button>
			<button class="pk-button" ${canEnterContest(key, cat) ? `onclick="enterContestFor('${key}', '${cat}')"` : "disabled"}>Enter</button></td></tr>`
	}
	return html + `</table><small>A score at the rank's mark (${CONTEST_RANKS.map(r => r.score).join(" / ")}) wins half the time; 30 above it always wins.</small></div>`
}

function contestPickerHtml() {
	const keys = Object.keys(player.t.box).filter(k => searchMatches(player.n.search, speciesOf(k)))
		.sort((a, b) => (player.t.party.includes(b) - player.t.party.includes(a)) || player.t.box[b].level - player.t.box[a].level)
	const shown = keys.slice(0, 60)
	let html = `<div class="pk-dex">${shown.map(k => `<button class="pk-dex-entry pk-button ${k === contestant() ? "pk-on" : ""}" onclick="selectContestant('${k}')" title="${keyName(k)}">${pkSprite(speciesOf(k), isShiny(k), 48, "", formOf(k))}<br><small>${keyName(k)}</small></button>`).join("")}</div>`
	if (keys.length > shown.length) html += `<small>${keys.length - shown.length} more: search by name to find them.</small>`
	return html
}

function ribbonsHtml() {
	const ids = Object.keys(player.d.ribbons || {}).map(Number).sort((a, b) => a - b)
	let html = `Ribbons held: <b>${ribbonCount()}</b> (each rank won is a ribbon; every ribbon gives +0.5% Research Points for good)<br><br>`
	html += RIBBON_MILESTONES.map(([n, text]) => `<div class="pk-trainer ${ribbonMilestone(n) ? "" : "pk-done"}"><b>${n} ribbons</b>: ${text}${ribbonMilestone(n) ? " ✓" : ""}</div>`).join("")
	html += `<br><b>Cosplay Pikachu</b> (the first Master Rank win in each category)<br><div class="pk-dex">${Object.values(CONTEST_CATEGORIES).map(c => {
		const got = player.d.forms[`25-${c.pikachu}`]
		return `<span class="pk-dex-entry ${got ? "" : "pk-unseen"}" title="${got ? FORMS[c.pikachu].name : "???"}">${pkSprite(25, false, 56, "", c.pikachu)}<br><small>${c.name}</small></span>`
	}).join("")}</div><br>`
	if (!ids.length) return html + "<i>No ribbons yet.</i>"
	return html + `<div class="pk-dex">${ids.map(id => `<span class="pk-dex-entry" title="${speciesName(id)}">${pkSprite(id, false, 48)}<br><small>${speciesName(id)}</small><br>${rankLetters(id)}</span>`).join("")}</div>`
}

addLayer("n", {
	name: "Contests",
	symbol: "Co",
	position: 3,
	row: 2,
	color: "#F85888",
	type: "none",
	resource: "ribbons",
	startData() { return { unlocked: true, points: new Decimal(0), contest: { key: "", cat: "", rank: 0, remaining: 0 }, selected: "", search: "", auto: true, entered: 0, won: 0 } },
	branches: ["t"],
	layerShown() { return player.t.starter > 0 && contestsOpen() },
	tooltip() { return contestRunning() ? `${keyName(player.n.contest.key)} on stage` : `${ribbonCount()} ribbons` },
	doReset(resettingLayer) {
		if (resettingLayer === "h") freshLayerData("n", ["search", "auto"])
	},
	update(diff) {
		contestTick(diff)
		player.n.points = new Decimal(ribbonCount())
	},
	tabFormat: {
		"Contest Hall": {
			content: [
				["display-text", () => `<h2>${contestHallName()}</h2><br><i>Raise a Pokémon's condition with Pokéblocks, then win each category from Normal to Master Rank. Its type and level count too.</i>`],
				"blank",
				["display-text", () => currentContestHtml()],
				["display-text", () => ribbonMilestone(30) ? `<br><button class="pk-button ${player.n.auto ? "pk-on" : ""}" onclick="toggleContestPass()">Contest Pass: ${player.n.auto ? "On" : "Off"}</button> <small>Feeds and enters the entry closest to a sure win, spending at most a tenth of your RP.</small>` : ""],
				"blank",
				["display-text", () => contestantHtml()],
				"blank",
				["pk-search", "search"],
				["display-text", () => contestPickerHtml()],
			],
		},
		Ribbons: {
			content: [
				["display-text", () => ribbonsHtml()],
			],
		},
	},
})
