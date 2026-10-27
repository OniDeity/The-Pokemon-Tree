// Gyms ("g"): submit your survey of the area to its Gym Leader and win the badge. A badge resets the
// Field (Research Points, equipment, routes) but keeps your Pokémon and Pokédex. Brock is the first.

function teamHtml(team, strength) {
	return team.map(([id, level, shiny, form]) => `<span class="pk-mon">${pkSprite(id, !!shiny, 80, "", form)}<br><small>${formName(id, form)}<br>Lv. ${level}</small></span>`).join("")
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

function badgeCaseHtml() {
	return `<div class="pk-badges">${GYMS.map((g, i) => i < badges()
		? `<img src="resources/badges/${i + 1}.png" width="40" height="40" title="${g.badge}">`
		: `<span class="pk-badge-empty" title="${g.badge}"></span>`).join("")}</div>`
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
	milestones: {
		0: {
			requirementDescription: "Boulder Badge",
			effectDescription: "Keep the Auto-Search Drone. Training Weights are for sale. (Every two badges also add a party slot.)",
			done() { return badges() >= 1 },
		},
		1: {
			requirementDescription: "Cascade Badge",
			effectDescription: "The Old Rod: fish in the water of every route.",
			done() { return badges() >= 2 },
		},
		2: {
			requirementDescription: "Thunder Badge",
			effectDescription: "Keep Running Shoes. The Bicycle (search ×1.5), evolution stones and trades.",
			done() { return badges() >= 3 },
		},
		3: {
			requirementDescription: "Rainbow Badge",
			effectDescription: "The Good Rod and the Poké Flute.",
			done() { return badges() >= 4 },
		},
		4: {
			requirementDescription: "Soul Badge",
			effectDescription: "Surf and the Super Rod.",
			done() { return badges() >= 5 },
		},
		5: { requirementDescription: "Marsh Badge", effectDescription: "The seas to Cinnabar Island.", done() { return badges() >= 6 } },
		6: { requirementDescription: "Volcano Badge", effectDescription: "Route 21 back to Viridian City.", done() { return badges() >= 7 } },
		7: { requirementDescription: "Earth Badge", effectDescription: "Victory Road and the Pokémon League.", done() { return badges() >= 8 } },
	},
	tabFormat: [
		["display-text", () => badgeCaseHtml()],
		["display-text", () => `Every badge: Research Points ×${BADGE_RP_BOOST}, your Pokémon's stats ×${BADGE_STAT_BOOST}, and a higher level cap.`],
		"blank",
		["display-text", () => {
			const gym = nextGym()
			if (!gym) return ""
			return `<h2>${gym.name}</h2><br>${gym.title} · ${gym.specialty ? `<span class="pk-type pk-type-${gym.specialty}">${gym.specialty}</span>` : ""}<br><i>"${gym.quote}"</i><br><br>${teamHtml(gym.team, GYM_STRENGTH[badges()])}`
		}],
		"blank",
		["display-text", () => nextGym() ? surveyHtml() : ""],
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
	layerShown() { return badges() >= 8 || isChampion() },
	doReset(resettingLayer) {
		if (resettingLayer === "h") freshLayerData("l")
	},
	tooltip() { return isChampion() ? "Champion!" : `${player.l.beaten}/5 beaten` },
	shouldNotify() { return !isChampion() && badges() >= 8 && canChallengeLeague(player.l.beaten) },
	tabFormat: [
		["display-text", () => isChampion()
			? `<h2>Hall of Fame</h2><br>${player.l.hallOfFame.map((e, i) => `Entry ${i + 1} (${formatTime(e.time)}):<br>${teamHtml(e.team, 1)}`).join("<br>")}`
			: `<h2>Indigo Plateau</h2><br>Survey Route 23 and Victory Road, then beat the Elite Four and the Champion in a row.`],
		"blank",
		["display-text", () => isChampion() ? "" : surveyHtml()],
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
