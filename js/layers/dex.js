// The Pokédex ("d") and Achievements ("a"): side layers, never reset.

const DEX_FILTERS = { all: "All", caught: "Caught", missing: "Not caught", seen: "Seen only", shiny: "Shiny", noShiny: "No shiny yet", hatched: "Hatched" }
function dexMatches(id) {
	const d = player.d, mode = d.dexFilter
	// Unseen species can't be searched by name.
	if (d.dexSearch && !(d.seen[id] && searchMatches(d.dexSearch, id)) && String(id) !== d.dexSearch.trim()) return false
	if (mode === "caught") return !!d.caught[id]
	if (mode === "missing") return !d.caught[id]
	if (mode === "seen") return !!d.seen[id] && !d.caught[id]
	if (mode === "shiny") return !!d.shiny[id]
	if (mode === "noShiny") return !d.shiny[id]
	if (mode === "hatched") return !!d.hatched[id]
	return true
}
function dexHtml() {
	let html = `<div class="pk-dex">`
	for (const id of regionDex(viewedDexRegion())) {
		if (!dexMatches(id)) continue
		const seen = player.d.seen[id], caught = player.d.caught[id], shiny = player.d.shiny[id]
		const cls = caught ? "" : seen ? "pk-seen" : "pk-unseen"
		const title = seen ? `#${id} ${speciesName(id)}${caught ? ` (caught ${caught})` : " (seen)"}${shiny ? ` ★${shiny}` : ""}` : `#${id} ???`
		html += `<span class="pk-dex-entry ${cls}" title="${title}">${pkSprite(id, !!shiny, 56)}<br><small>${id}${shiny ? " ★" : ""}${player.d.hatched[id] ? " 🥚" : ""}</small></span>`
	}
	return html + "</div>"
}

/** The anime's forms: caught ones in color, the rest as silhouettes; then the form milestones. */
function formsHtml() {
	let html = `Forms caught: <b>${formsCaught()}</b>/${ALL_FORMS.length}<br><small>Forms come from the anime places and events, which open with Hall of Fame entries.</small><br><br><div class="pk-dex">`
	for (const k of ALL_FORMS) {
		const id = parseInt(k), form = k.slice(k.indexOf("-") + 1)
		const caught = player.d.forms[k]
		html += `<span class="pk-dex-entry ${caught ? "" : "pk-unseen"}" title="${caught ? formName(id, form) : "???"}">${pkSprite(id, false, 56, "", form)}<br><small>${caught ? FORMS[form].name : "???"}</small></span>`
	}
	html += "</div><br><h3>Form milestones</h3><br>"
	html += FORM_MILESTONES.map(([n, text]) => `<div class="pk-trainer ${formMilestone(n) ? "" : "pk-done"}"><b>${n} forms</b>: ${text}${formMilestone(n) ? " ✓" : ""}</div>`).join("")
	return html
}

addLayer("d", {
	name: "Pokédex",
	symbol: "D",
	row: "side",
	position: 0,
	color: "#E3350D",
	type: "none",
	resource: "species caught",
	startData() { return {
		unlocked: true,
		points: new Decimal(0),
		seen: {},
		caught: {},
		shiny: {},
		forms: {},
		hatched: {},
		everHatched: {},
		lastSeen: {},
		bestCaught: 0,
		diploma: false,
		safari: 0,
		jackpots: 0,
		bestChain: 0,
		rockets: 0,
		rivalWins: 0,
		missingno: 0,
		dexSearch: "",
		dexFilter: "all",
		dexRegion: "",
	}},
	layerShown() { return player.t.starter > 0 },
	tooltip() { return `${regionCaught()}/${regionDex().length} caught` },
	update() {
		player.d.points = new Decimal(caughtCount())
		if (!player.d.diploma && hasDiploma()) player.d.diploma = true
	},
	milestonePopups() { return notifyOn("milestone") },
	milestones: Object.fromEntries(DEX_MILESTONES.map(([n, text], i) => [i, {
		requirementDescription: `${n} species caught`,
		effectDescription: text,
		done() { return caughtCount() >= n },
	}])),
	tabFormat: {
		"Pokédex": {
			content: [
				["display-text", () => hasDiploma()
					? `<div class="pk-trainer"><b>🎓 Game Freak's Diploma</b><br><small>"Congratulations! This is to certify that you have completed your Pokédex." Your Pokémon fight with ×1.1 Attack and Defense for good.</small></div>`
					: `<small>Game Freak's Diploma: catch all 150 Kanto species in one run, Mew not needed; the reward stays for good (${Object.keys(player.d.caught).filter(id => id >= 1 && id <= 150).length}/150).</small>`],
				["display-text", () => `${regionTabs()}<h3>${REGIONS[viewedDexRegion()].name}</h3><br>Seen: <b>${seenCount()}</b> · Caught: <b>${regionCaught(viewedDexRegion())}</b>/${regionDex(viewedDexRegion()).length} · Shiny records: <b>${Object.keys(player.d.shiny).length}</b> · Best Pokédex: <b>${Math.max(player.d.bestCaught || 0, caughtCount())}</b><br><small>The Pokédex starts over at every Hall of Fame entry (shiny and form records stay). Every species caught gives Research Points over time. Shiny odds: 1/${format(shinyOdds())}.</small>`],
				"blank",
				["display-text", () => filterBar("d", "dexFilter", DEX_FILTERS)],
				["pk-search", "dexSearch"],
				["display-text", () => dexHtml()],
			],
		},
		Milestones: { content: ["milestones"] },
		Forms: {
			content: [["display-text", () => formsHtml()]],
			unlocked() { return hofEntries() >= 1 || formsCaught() > 0 },
		},
	},
})

addLayer("a", {
	name: "Achievements",
	symbol: "A",
	row: "side",
	position: 1,
	color: "#F8D030",
	type: "none",
	startData() { return { unlocked: true, points: new Decimal(0) } },
	layerShown() { return true },
	tooltip() { return `${player.a.achievements.length} achievements` },
	achievementPopups() { return notifyOn("achievement") },
	achievements: {
		11: { name: "A new journey", tooltip: "Choose your starter.", done() { return player.t.starter > 0 } },
		12: { name: "Gotta catch 'em", tooltip: "Catch a wild Pokémon.", done() { return caughtCount() >= 2 } },
		13: { name: "It's evolving!", tooltip: "Evolve a Pokémon.", done() { return player.t.evolved > 0 } },
		14: { name: "Rock-hard determination", tooltip: "Earn the Boulder Badge.", done() { return badges() >= 1 } },
		15: { name: "Full party", tooltip: "Have six Pokémon in your party.", done() { return player.t.party.length >= 6 } },
		21: { name: "Field researcher", tooltip: "Catch 50 species.", done() { return caughtCount() >= 50 } },
		22: { name: "Halfway there", tooltip: "Earn four badges.", done() { return badges() >= 4 } },
		23: { name: "Legendary", tooltip: "Catch a legendary Pokémon.", done() { return [144, 145, 146, 150, 151].some(id => player.d.caught[id]) } },
		24: { name: "Something shiny", tooltip: "Catch a shiny Pokémon.", done() { return Object.keys(player.d.shiny).length > 0 } },
		25: { name: "Eight badges", tooltip: "Earn the Earth Badge.", done() { return badges() >= 8 } },
		31: { name: "Pokémon Master", tooltip: "Become the Champion.", done() { return isChampion() } },
		32: { name: "Nearly complete", tooltip: "Catch 150 species.", done() { return caughtCount() >= 150 } },
		33: { name: "The original", tooltip: "Catch Mewtwo.", done() { return !!player.d.caught[150] } },
		34: { name: "Mythical", tooltip: "Catch Mew.", done() { return !!player.d.caught[151] } },
		35: { name: "Level 100", tooltip: "Raise a Pokémon to level 100.", done() { return Object.values(player.t.box).some(e => e.level >= 100) } },
		41: { name: "Hall of Famer", tooltip: "Enter the Hall of Fame.", done() { return hofEntries() >= 1 } },
		42: { name: "Rules are rules", tooltip: "Beat a challenge.", done() { return Object.keys(CHALLENGES).some(id => beatChallenge(id)) } },
		43: { name: "Nuzlocke survivor", tooltip: "Beat the Nuzlocke challenge.", done() { return beatChallenge(11) } },
		44: { name: "Every rule in the book", tooltip: "Beat every challenge.", done() { return Object.keys(CHALLENGES).every(id => beatChallenge(id)) } },
		51: { name: "Jackpot!", tooltip: "Hit 7 7 7 at the Game Corner's slots.", done() { return jackpots() >= 1 } },
		52: { name: "Prize collector", tooltip: "Trade coins for every prize Pokémon in one run.", done() { return SPECIALS.filter(isPrize).every(s => player.t.specials[s.id]) } },
		53: { name: "Shiny hunter", tooltip: "Catch 10 shiny species.", done() { return shinySpecies() >= 10 } },
		54: { name: "Chain reaction", tooltip: "Build a chain of 100.", done() { return (player.d.bestChain || 0) >= 100 } },
		55: { name: "Blasting off again", tooltip: "Beat Giovanni in the Rocket Hideout.", done() { return giovanniBeaten() } },
		61: { name: "Smell ya later", tooltip: "Beat your rival on Route 22 before Victory Road.", done() { return chapterCleared("route22Final") } },
		62: { name: "Bye bye, Team Rocket", tooltip: "Clear Silph Co.", done() { return chapterCleared("silphCo") } },
		63: { name: "Game Freak's Diploma", tooltip: "Catch all 150 Kanto species (Mew not needed).", done() { return hasDiploma() } },
		64: { name: "Glitch City", tooltip: "Meet Missingno. off Cinnabar's coast.", done() { return (player.d.missingno || 0) > 0 } },
		45: { name: "Familiar faces", tooltip: "Enshrine 30 species in the Hall of Fame.", done() { return Object.keys(player.h.enshrined).length >= 30 } },
	},
	tabFormat: ["achievements"],
})
