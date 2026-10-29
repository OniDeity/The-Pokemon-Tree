// Gyms ("g"): submit your survey of the area to its Gym Leader and win the badge. A badge resets the
// Field (Research Points, equipment, routes) but keeps your Pokémon and Pokédex. Brock is the first.

function teamHtml(team, strength) {
	return team.map(([id, level, shiny, form]) => `<span class="pk-mon">${pkSprite(id, shiny, 80, "", form)}<br><small>${formName(id, form)}<br>Lv. ${level}</small></span>`).join("")
		+ (strength > 1 ? `<br><small>Raised well: stats ×${format(strength)}</small>` : "")
}

function predictionHtml(result) {
	if (!result) return ""
	if (result.win) {
		const lost = inChallenge(11) && result.fainted ? `<br><span style="color:#F08030">Nuzlocke: ${player.t.party.slice(0, result.fainted).map(keyName).join(", ")} would faint and be released.</span>` : ""
		return `<span style="color:#78C850">Your party would win with ${format(result.hpLeft * 100)}% HP left on its last Pokémon.</span>${lost}`
	}
	return `<span style="color:#F08030">Your party would lose at ${speciesName(result.stoppedBy.id)} (${result.defeated} beaten). Level up, gear up, or bring better matchups.</span>`
}

function surveyHtml() {
	const s = surveyStatus()
	if (s.done) return `<span style="color:#78C850">Survey complete: every route open and every species seen.</span>`
	let html = `Survey: ${s.zones.filter(zoneOpen).length}/${s.zones.length} routes open, ${s.total - s.missing.length}/${s.total} species seen.`
	const unseen = s.zones.filter(zoneOpen).map(z => [z.name, zoneSpecies(z, badges()).filter(id => !player.d.seen[id]).length]).filter(([, n]) => n > 0)
	if (unseen.length) html += `<br><small>Unseen species: ${unseen.map(([name, n]) => `${name} (${n})`).join(", ")}</small>`
	const closed = s.zones.filter(z => !zoneOpen(z)).length
	if (closed) html += `<br><small>${closed} route${closed > 1 ? "s" : ""} still to open on the Map.</small>`
	return html
}

function storyGateHtml(ch) {
	return ch ? `<span style="color:#F08030">First clear ${ch.name} (the Story node).</span>` : ""
}

const KANTO_BADGE_TEXT = [
	"Keep the Auto-Search Drone. Training Weights are for sale. (Every two badges also add a party slot.)",
	"The Old Rod: fish in the water of every route.",
	"Keep Running Shoes. The Bicycle (search ×1.5), evolution stones and trades.",
	"The Good Rod and the Poké Flute.",
	"Surf and the Super Rod.",
	"The seas to Cinnabar Island.",
	"Route 21 back to Viridian City.",
	"Victory Road and the Pokémon League.",
]
function badgeMilestoneText(i) {
	if (currentRegion() === "kanto") return KANTO_BADGE_TEXT[i]
	const items = (regionGyms()[i]?.keyItems || []).map(id => REGION_RULES.keyItems[id]?.name || KEY_ITEM_NAMES[id] || id)
	const always = i === allBadges() - 1 ? `${region().league?.name || "The Pokémon League"}.` : ["Keep the Auto-Search Drone. Training Weights are for sale. (Every two badges also add a party slot.)", "", "Keep Running Shoes. Evolution stones and trades."][i] || ""
	return [always, items.length ? `${items.join(", ")}.` : ""].filter(Boolean).join(" ") || "The way on to the next Gym."
}

function badgeCaseHtml() {
	return `<div class="pk-badges">${regionGyms().map((g, i) => i < badges()
		? `<img src="resources/badges/${i + region().badgeImage}.png" width="40" height="40" title="${g.badge}">`
		: `<span class="pk-badge-empty" title="${g.badge}"></span>`).join("")}</div>`
}

/** Johto's post-game: Kanto's eight Leaders (badge images 1-8, in Kanto's order). */
const KANTO_BADGE_ORDER = ["kantoBrock", "kantoMisty", "kantoSurge", "kantoErika", "kantoJanine", "kantoSabrina", "kantoBlaine", "kantoBlue"]
function kantoGymsHtml() {
	if (!kantoRevisit()) return ""
	const badgesHtml = KANTO_BADGE_ORDER.map((id, i) => chapterCleared(id)
		? `<img src="resources/badges/${i + 1}.png" width="40" height="40" title="${chapterById(id).badge}">`
		: `<span class="pk-badge-empty" title="${chapterById(id).badge}"></span>`).join("")
	return `<h2>Kanto's Gyms</h2><br><i>The S.S. Aqua docks in Vermilion. Kanto's Leaders have grown stronger in three years, and Red won't battle anyone without all 16 badges.</i><br><div class="pk-badges">${badgesHtml}</div>${KANTO_GYM_CHAPTERS.map(chapterHtml).join("")}`
}

addLayer("g", {
	name: "Gyms",
	symbol: "G",
	position: 0,
	row: 1,
	color: "#B8A038",
	type: "custom",
	resource: "badges",
	baseResource: "Research Points",
	baseAmount() { return player.points },
	requires: new Decimal(0),
	startData() { return {
		unlocked: true,
		points: new Decimal(0),
		best: new Decimal(0),
	}},
	layerShown() { return player.t.starter > 0 },
	branches: ["f", "t"],
	getResetGain() { return new Decimal(nextGym() ? 1 : 0) },
	getNextAt() { return new Decimal(0) },
	canReset() { return canChallengeGym() },
	prestigeNotify() { return canChallengeGym() },
	// Automatic challenges never cost a Nuzlocke a Pokémon.
	autoPrestige() { return hofEntries() >= 5 && !(inChallenge(11) && gymPrediction()?.fainted > 0) },
	prestigeButtonText() {
		const gym = nextGym()
		if (!gym) return "You have all eight badges. The Pokémon League awaits!"
		if (gymStoryGate(badges())) return `Clear ${gymStoryGate(badges()).name} to reach ${trialName(gym)}.`
		if (!surveyStatus().done) return `Finish surveying the area to challenge ${gym.name}.`
		if (!gymPrediction().win) return `${gym.name} is too strong for your party right now.`
		return `Challenge ${gym.name} for the ${gym.badge}!<br><small>Resets Research Points, equipment and routes.</small>`
	},
	onPrestige() {
		const gym = nextGym()
		winGymBattle()
		pkPopup("badge", `${gym.rewardText}`, `${gym.badge} earned!`, 5, "#B8A038")
	},
	tooltip() { return `${badges()} badge${badges() === 1 ? "" : "s"}` },
	milestonePopups() { return notifyOn("milestone") },
	// Badge milestones are named for the region's badges; outside Kanto they list the Gym's key items.
	milestones: Object.fromEntries([0, 1, 2, 3, 4, 5, 6, 7].map(i => [i, {
		requirementDescription() { return regionGyms()[i]?.badge || `Badge ${i + 1}` },
		effectDescription() { return badgeMilestoneText(i) },
		done() { return badges() >= i + 1 },
		unlocked() { return i < allBadges() },
	}])),
	tabFormat: [
		["display-text", () => badgeCaseHtml()],
		["display-text", () => kantoGymsHtml()],
		["display-text", () => `Every badge: Research Points ×${BADGE_RP_BOOST}, your Pokémon's stats ×${BADGE_STAT_BOOST}, and a higher level cap.`],
		"blank",
		["display-text", () => {
			const gym = nextGym()
			if (!gym) return ""
			return `<h2>${gym.name}</h2><br>${gym.title} · ${gym.specialty ? `<span class="pk-type pk-type-${gym.specialty}">${gym.specialty}</span>` : ""}<br><i>"${gym.quote}"</i><br><br>${teamHtml(gym.team, gymStrength())}`
		}],
		"blank",
		["display-text", () => nextGym() ? surveyHtml() : ""],
		["display-text", () => storyGateHtml(gymStoryGate(badges()))],
		["display-text", () => nextGym() ? predictionHtml(gymPrediction()) : ""],
		"blank",
		"prestige-button",
		"blank",
		"milestones",
	],
})

// The Pokémon League ("l"): the Elite Four and the Champion, one after another, after eight badges.
function challengeLeagueAt(k) { challengeLeague(k) }

addLayer("l", {
	name: "Pokémon League",
	symbol: "L",
	position: 0,
	row: 2,
	color: "#A040A0",
	type: "none",
	resource: "Elite Four members beaten",
	startData() { return {
		unlocked: true,
		points: new Decimal(0),
		beaten: 0,
		champion: false,
		hallOfFame: [],
	}},
	branches: ["g"],
	layerShown() { return badges() >= allBadges() || isChampion() },
	doReset(resettingLayer) {
		if (resettingLayer === "h") freshLayerData("l")
	},
	tooltip() { return isChampion() ? "Champion!" : `${player.l.beaten}/5 beaten` },
	shouldNotify() { return !isChampion() && badges() >= allBadges() && canChallengeLeague(player.l.beaten) },
	tabFormat: [
		["display-text", () => isChampion()
			? `<h2>Hall of Fame</h2><br>${player.l.hallOfFame.map((e, i) => `Entry ${i + 1} (${formatTime(e.time)}):<br>${teamHtml(e.team, 1)}`).join("<br>")}`
			: `<h2>${region().league?.name || "Indigo Plateau"}</h2><br>Survey ${region().league?.survey || { johto: "Route 26 and Victory Road" }[currentRegion()] || "Route 23 and Victory Road"}, then beat ${region().league?.trainers || "the Elite Four and the Champion in a row"}.`],
		["display-text", () => canSailToJohto()
			? `<div class="pk-trainer"><b>⛵ Johto awaits</b><br><small>Enter the Hall of Fame now, or sail on to Johto: a fresh start under Professor Elm (every Pokémon back at Lv. ${JOHTO_START_LEVEL}), and Fame ×${JOHTO_FAME} when Johto's Champion enters the Hall.</small><br><button class="pk-button pk-big" onclick="sailToJohto(); showTab('t')">Sail to Johto</button></div>`
			: currentRegion() === "kanto" && isChampion() && !johtoOpen() ? `<small>Johto opens after ${JOHTO_ENTRIES} Hall of Fame entries (${hofEntries()}/${JOHTO_ENTRIES}).</small>`
			: visitChapters().length && isChampion() ? `<div class="pk-trainer"><b>✈ ${revisitRegions().map(r => REVISITS[r].name).join(" and ")} await</b><br><small>Their routes are open on the Field's Map, and their Leagues wait on the Story node: each one beaten gives Fame ×${VISIT_FAME} for this Hall of Fame entry (${visitsCleared()}/${visitChapters().length} beaten).</small></div>` : ""],
		"blank",
		["display-text", () => isChampion() ? "" : surveyHtml()],
		["display-text", () => isChampion() ? "" : storyGateHtml(leagueStoryGate())],
		"blank",
		["display-text", () => leagueTrainers().map((t, k) => {
			const beaten = player.l.beaten > k
			const current = player.l.beaten === k
			return `<div class="pk-trainer ${beaten ? "pk-done" : ""}"><h3>${t.name}</h3> <small>${t.title}</small><br>${current || beaten ? `<i>"${t.quote}"</i><br>${teamHtml(t.team, t.strength)}` : "???"}
				${current && !isChampion() ? `<br>${predictionHtml(leaguePrediction(k))}<br><button class="pk-button pk-big" ${canChallengeLeague(k) ? `onclick="challengeLeagueAt(${k})"` : "disabled"}>Challenge ${t.name}</button>` : ""}
				${beaten ? "<br><b>Beaten!</b>" : ""}</div>`
		}).join("")],
	],
})
