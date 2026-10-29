// The Field ("f"): search the routes of Kanto for wild Pokémon, battle them with your party and
// catch them. Research Points (the game's main currency) buy field equipment and open the next
// routes. Earning a Gym badge resets it all.

const LOG_SIZE = 8

/**
 * TMT's layerDataReset merges the start data into objects and arrays rather than replacing them,
 * so a reset box or route list would keep its old entries. This replaces them with fresh copies.
 */
function freshLayerData(layer, keep = []) {
	layerDataReset(layer, keep)
	const start = layers[layer].startData()
	for (const key in start) {
		if (keep.includes(key) || start[key] instanceof Decimal || !(start[key] instanceof Object)) continue
		player[layer][key] = start[key]
	}
}

// ---- Notifications ----
// Each kind of popup (and the nodes' glow) can be switched off in the settings (options.pkNotify,
// kept across saves like TMT's own options).
const NOTIFY_KINDS = {
	pokedex: "New Pokédex entries",
	shiny: "Shiny, Albino and Melanistic Pokémon",
	evolve: "Evolutions",
	badge: "Badges",
	league: "Pokémon League",
	hof: "Hall of Fame",
	jackpot: "Game Corner jackpots",
	rocket: "Team Rocket",
	story: "Story (rival, S.S. Anne, Dojo)",
	contest: "Contest wins",
	milestone: "Milestones",
	achievement: "Achievements",
	glow: "Glowing nodes (something to buy or do)",
}
function notifyOn(kind) { return !(options.pkNotify && options.pkNotify[kind] === false) }
function toggleNotify(kind) {
	if (!options.pkNotify) options.pkNotify = {}
	Vue.set(options.pkNotify, kind, !notifyOn(kind))
}
Vue.component("pk-notify-settings", {
	data() { return { kinds: NOTIFY_KINDS } },
	template: `<div><h3>Display</h3><br><button class="opt" style="width:auto; min-width:150px; height:auto; padding:6px; margin:3px" @click="toggleSprites()">Pokémon sprites: {{ options.pkHideSprites ? "OFF" : "ON" }}</button><br><h3>Notifications</h3><br><button v-for="(name, kind) in kinds" class="opt" style="width:auto; min-width:150px; height:auto; padding:6px; margin:3px" @click="toggleNotify(kind)">{{ name }}: {{ notifyOn(kind, options.pkNotify && options.pkNotify[kind]) ? "ON" : "OFF" }}</button></div>`,
	methods: { toggleNotify, notifyOn, toggleSprites() { options.pkHideSprites = !options.pkHideSprites } },
})
/** A popup of a kind the player hasn't switched off. */
function pkPopup(kind, text, title, timer, color) {
	if (notifyOn(kind)) doPopup("none", text, title, timer, color)
}

// ---- Filters for long lists of Pokémon ----
// ["pk-search", "field"] in a tabFormat is a live name search bound to player[layer][field];
// filterBar(layer, field, modes) draws the mode buttons for player[layer][field].
Vue.component("pk-search", {
	props: ["layer", "data"],
	template: `<input class="pk-search" type="search" placeholder="Search by name or number" :value="player[layer][data]"
		@input="player[layer][data] = $event.target.value" @focus="focused(true)" @blur="focused(false)">`,
})
function searchMatches(text, id) {
	text = String(text || "").trim().toLowerCase()
	return !text || String(id) === text || speciesName(id).toLowerCase().includes(text)
}
function setFilter(layer, field, mode) { player[layer][field] = mode }
function filterBar(layer, field, modes) {
	return `Show: ${Object.entries(modes).map(([mode, name]) => `<button class="pk-button ${player[layer][field] === mode ? "pk-on" : ""}" onclick="setFilter('${layer}', '${field}', '${mode}')">${name}</button>`).join(" ")}`
}

/** Writes to the encounter log (and pops up the special ones, unless `quiet`). */
function pkLog(text, kind, enc, shiny, quiet = false) {
	if (!player.f) return
	player.f.log.unshift({ text, kind, id: enc ? enc.id : null, form: enc?.form || null, shiny: shiny || false })
	if (player.f.log.length > LOG_SIZE) player.f.log.length = LOG_SIZE
	const popups = { new: ["pokedex", "Pokédex", "#F8D030"], evolve: ["evolve", "Evolution!", "#78C850"], league: ["league", "Pokémon League", "#A040A0"],
		jackpot: ["jackpot", "Game Corner", "#E0B040"], rocket: ["rocket", currentRegion() === "hoenn" ? "Team Aqua & Magma" : "Team Rocket", "#C03028"], story: ["story", region().name, "#6890F0"],
		glitch: ["pokedex", "?̷?̵?̸", "#888888"] }
	const color = shiny === true ? "shiny" : shiny
	const popup = color ? ["shiny", `${COLOR_NAMES[color]}!`, { shiny: "#F8D030", albino: "#D8D8E8", melanistic: "#9080B0" }[color]] : popups[kind]
	if (popup && !quiet) pkPopup(popup[0], text, popup[1], 3, popup[2])
}

/** A Pokémon's sprite: forms with their own image use it; others are drawn over the species'. */
function pkSprite(id, shiny, size = 48, extra = "", form = null) {
	if (options.pkHideSprites) return `<span class="pk-sprite-off" style="width:${size}px">${colorMark(shiny)}${formName(id, form)}</span>`
	const f = form ? FORMS[form] : null
	const filter = f?.filters?.[id] || f?.filter
	const style = filter ? `style="filter:${filter}"` : ""
	const img = `<img src="${spriteOf(id, shiny, form)}" width="${size}" height="${size}" class="pk-sprite" ${style} ${extra} alt="${formName(id, form)}">`
	return f?.accessory ? `<span class="pk-accessory-wrap">${img}<span class="pk-accessory">${f.accessory}</span></span>` : img
}
function pkKeySprite(key, size = 48) { return pkSprite(speciesOf(key), colorOf(key), size, "", formOf(key)) }

function setZone(id) {
	const zone = zoneById(id)
	if (zone && zoneOpen(zone) && canChooseRoute()) player.f.zone = id
}

/** "3 not in box": a route still has Pokémon (or forms) your box doesn't have this run. */
function missingBadge(zone) {
	const n = zoneMissing(zone)
	return n ? `<br><small class="pk-missing">● ${n} not in box</small>` : ""
}

function zoneListHtml() {
	const b = badges()
	const areas = {}
	for (const z of regionZones()) {
		if (z.anime) continue
		if (z.mechanic && !mechanicOn(z.mechanic)) continue
		if (z.postGame && !isChampion()) continue
		if (z.badges > b) continue
		const label = z.mechanic ? z.name : z.postGame ? "After the League" : z.badges === 0 ? `Before ${regionGyms()[0].name}` : `${z.badges} badge${z.badges > 1 ? "s" : ""}`
		;(areas[label] = areas[label] || []).push(z)
	}
	let html = ""
	for (const label in areas) {
		html += `<div class="pk-area"><b>${label}</b><br>`
		for (const z of areas[label]) {
			const open = zoneOpen(z)
			const species = zoneSpecies(z, b)
			const seen = species.filter(id => player.d.seen[id]).length
			const caught = species.filter(id => player.d.caught[id]).length
			const cls = player.f.zone === z.id ? "pk-zone pk-zone-on" : open ? "pk-zone" : "pk-zone pk-zone-locked"
			html += `<button class="${cls}" ${open ? `onclick="setZone('${z.id}')"` : "disabled"} title="${z.blurb}">${z.name}<br><small>${open ? `${caught}/${species.length} caught${seen < species.length ? `, ${species.length - seen} unseen` : ""}` : "Locked"}</small>${open ? missingBadge(z) : ""}</button>`
		}
		html += "</div>"
	}
	return `<h3>${region().name}</h3>` + html + revisitRegions().map(revisitHtml).join("") + animeListHtml()
}

/** A post-game visit: an earlier region's routes again (in Johto, Kanto's Cerulean Cave after Red). */
function revisitHtml(r) {
	const via = currentRegion() === "johto" ? "by the S.S. Aqua" : REVISITS[r].via
	let html = `<div class="pk-area"><b>${REVISITS[r].name}</b> <small>(${via})</small><br>`
	for (const z of revisitZones(r)) {
		const open = zoneOpen(z)
		const species = zoneSpecies(z, badges())
		const caught = species.filter(id => player.d.caught[id]).length
		const cls = player.f.zone === z.id ? "pk-zone pk-zone-on" : open ? "pk-zone" : "pk-zone pk-zone-locked"
		html += `<button class="${cls}" ${open ? `onclick="setZone('${z.id}')"` : "disabled"} title="${z.blurb}">${z.name}<br><small>${open ? `${caught}/${species.length} caught` : "After Red"}</small>${open ? missingBadge(z) : ""}</button>`
	}
	return html + "</div>"
}

/** The anime's places: tiers open with Hall of Fame entries (Johto's and Hoenn's with their own), then with badges. */
function animeListHtml() {
	const r = currentRegion(), entries = animeEntries()
	const places = regionZones().filter(z => z.anime)
	if (!places.length) return ""
	const nextTier = places.filter(z => z.hof > entries).reduce((m, z) => Math.min(m, z.hof), Infinity)
	const entryText = n => `${n} ${r === "kanto" ? "" : `${REGIONS[r].name} `}Hall of Fame entr${n > 1 ? "ies" : "y"}`
	if (!places.some(z => z.hof <= entries)) return `<div class="pk-area"><b>Anime places</b><br><small>Enter the Hall of Fame to start finding places from the anime.</small></div>`
	const b = badges()
	let html = `<div class="pk-area"><b>Anime places</b> <small>(${formsCaught()}/${ALL_FORMS.length} forms caught)</small><br>`
	for (const z of places.filter(z => z.hof <= entries)) {
		const open = zoneOpen(z)
		const species = zoneSpecies(z, b)
		const caught = species.filter(id => player.d.caught[id]).length
		const cls = player.f.zone === z.id ? "pk-zone pk-zone-on" : open ? "pk-zone pk-zone-anime" : "pk-zone pk-zone-locked"
		const why = z.postGame ? "After the League" : `${z.badges} badge${z.badges === 1 ? "" : "s"}`
		html += `<button class="${cls}" ${open ? `onclick="setZone('${z.id}')"` : "disabled"} title="${z.blurb}">${z.name}<br><small>${open ? `${caught}/${species.length} caught` : why}</small>${open ? missingBadge(z) : ""}</button>`
	}
	if (nextTier < Infinity) {
		const more = places.filter(z => z.hof === nextTier).length
		html += `<br><small>${more} more place${more > 1 ? "s" : ""} after ${entryText(nextTier)}.</small>`
	}
	return html + "</div>"
}

function zoneDetailHtml() {
	const zone = currentZone()
	const b = badges()
	let html = `<h3>${zone.name}</h3><br><i>${zone.blurb}</i><br>`
	for (const pool of zonePools(zone, b)) {
		const entries = zone.pools[pool]
		const total = entries.reduce((s, e) => s + e[1], 0)
		html += `<div class="pk-pool"><b>${POOL_NAMES[pool]}</b><br>`
		for (const [id, w, min, max, form] of entries) {
			const seen = player.d.seen[id], caught = form ? player.d.forms[`${id}-${form}`] : player.d.caught[id]
			const name = seen ? formName(id, form) : "???"
			const inBox = Object.keys(player.t.box).some(k => speciesOf(k) === id && formOf(k) === (form || null))
			html += `<span class="pk-mon ${caught ? "" : seen ? "pk-seen" : "pk-unseen"}" title="${name}${inBox ? "" : " (not in your box)"}">${pkSprite(id, false, 72, "", form)}<br><small>${inBox ? "" : `<span class="pk-missing">●</span> `}${name}<br>Lv. ${min === max ? min : `${min}-${max}`} · ${Math.round(100 * w / total)}%</small></span>`
		}
		html += "</div>"
	}
	const locked = Object.keys(zone.pools).filter(p => !zonePools(zone, b).includes(p))
	if (locked.length) html += `<br><small>More here later: ${locked.map(p => POOL_NAMES[p]).join(", ")}.</small>`
	if (zone.anime) html += `<br><small>A place from the anime: it doesn't count toward Gym surveys.</small>`
	return html
}

function logHtml() {
	if (!player.f.log.length) return "<i>Nothing found yet.</i>"
	return player.f.log.map(e => `<div class="pk-log pk-log-${e.kind}">${e.id ? pkSprite(e.id, e.shiny, 48, "", e.form) : ""} ${e.text}</div>`).join("")
}

function fieldBuyableDef(id) {
	const def = FIELD_BUYABLES[id]
	return {
		title: def.title,
		cost() { return fieldBuyableCost(id, getBuyableAmount("f", id).toNumber()) },
		display() {
			return `${def.text}<br><br>Level ${formatWhole(getBuyableAmount("f", id))}<br>Cost: ${format(this.cost())} Research Points`
		},
		canAfford() { return player.points.gte(this.cost()) },
		buy() {
			player.points = player.points.sub(this.cost())
			addBuyables("f", id, 1)
		},
		unlocked() { return badges() >= def.badges && fieldBuyableAllowed(id) },
		style: { width: "180px", height: "130px" },
	}
}

/** A repeatable Research Point buyable for a side layer (Day Care, Safari Zone). */
function rpBuyable(layer, id, def) {
	return {
		title: def.title,
		cost() { return buyableCost(def, getBuyableAmount(layer, id).toNumber()) },
		display() { return `${def.text}<br><br>Level ${formatWhole(getBuyableAmount(layer, id))}<br>Cost: ${format(this.cost())} Research Points` },
		canAfford() { return player.points.gte(this.cost()) },
		buy() {
			player.points = player.points.sub(this.cost())
			addBuyables(layer, id, 1)
		},
		style: { width: "170px", height: "120px" },
	}
}

function fieldUpgradeDef(id) {
	const def = FIELD_UPGRADES[id]
	return {
		title: def.title,
		description: def.text,
		cost: new Decimal(def.cost),
		currencyDisplayName: "Research Points",
		currencyInternalName: "points",
		unlocked() { return badges() >= def.badges || hasUpgrade("f", id) },
	}
}

function specialsHtml() {
	const groups = { gift: "Gifts and prizes", trade: "In-game trades", legendary: "Legendary encounters" }
	let html = ""
	for (const kind in groups) {
		const list = ALL_SPECIALS.filter(s => s.kind === kind && (specialOpen(s) || player.t.specials[s.id]))
		if (!list.length) continue
		html += `<h3>${groups[kind]}</h3><div class="pk-specials">`
		for (const s of list) {
			const status = specialStatus(s)
			const done = player.t.specials[s.id]
			const cost = specialCost(s)
			const action = kind === "legendary" ? "Battle" : kind === "trade" ? "Trade" : isPrize(s) ? `Trade in ${formatCoins(prizeCoins(s))} coins` : cost.gt(0) ? `Buy (${format(cost)} RP)` : "Take"
			html += `<div class="pk-special ${done ? "pk-done" : ""}">${pkSprite(s.species, false, 80, "", s.form)}<br><b>${formName(s.species, s.form)}</b>${s.anime ? ` <small>(anime)</small>` : ""} Lv. ${s.level}<br><small>${s.place}</small><br><small><i>${s.text}</i></small><br>
				${done ? "<b>Done</b>" : `<button class="pk-button" ${status.ok ? `onclick="takeSpecialById('${s.id}')"` : "disabled"}>${status.ok ? action : status.why}</button>`}</div>`
		}
		html += "</div>"
	}
	return html || "<i>Nothing here yet. Gifts, trades and legendaries turn up as you earn badges.</i>"
}
function takeSpecialById(id) { takeSpecial(ALL_SPECIALS.find(s => s.id === id)) }

addLayer("f", {
	name: "Field",
	symbol: "F",
	position: 0,
	row: 0,
	color: "#78C850",
	type: "none",
	resource: "Research Points",
	startData() { return {
		unlocked: true,
		points: new Decimal(0),
		zone: "route1",
		progress: 0,
		searching: false,
		unlocked: {},
		encounters: 0,
		wins: 0,
		log: [],
	}},
	layerShown() { return player.t.starter > 0 },
	tooltip() { return `${format(player.points)} Research Points` },
	doReset(resettingLayer) {
		if (layers[resettingLayer].row <= this.row) return
		const keep = fieldKeptUpgrades()
		const zone = player.f.zone
		const gear = resettingLayer === "g" && hofUpgrade(13) ? Math.floor(fieldBuyable(13) / 2) : 0
		// A kept Auto-Search Drone carries on searching through the reset.
		const searching = player.f.searching && keep.includes(11)
		freshLayerData("f", ["log"])
		player.f.upgrades = keep
		player.f.searching = searching
		player.f.buyables[13] = new Decimal(gear)
		player.f.zone = zoneOpen(zoneById(zone)) ? zone : regionZones()[0].id
	},
	update(diff) {
		syncRegionRules()
		challengeTick(diff)
		searchTick(diff)
		autoBuyTick()
		player.f.autoTimer = (player.f.autoTimer || 0) + diff
		if (player.f.autoTimer >= 2) { player.f.autoTimer = 0; automationTick() }
	},
	clickables: {
		11: {
			title() { return player.f.searching ? (hasUpgrade("f", 11) ? "Searching (auto)" : "Searching...") : "Search the grass" },
			display() { return `${currentZone().name}<br>${format(searchTime())}s per search` },
			canClick() { return player.t.starter > 0 },
			onClick() {
				if (hasUpgrade("f", 11)) player.f.searching = !player.f.searching
				else player.f.searching = true
			},
			style: { width: "180px", height: "90px" },
		},
	},
	bars: {
		search: {
			direction: RIGHT,
			width: 300,
			height: 24,
			progress() { return player.f.searching ? player.f.progress : 0 },
			display() { return player.f.searching ? "Searching..." : "Idle" },
			fillStyle: { "background-color": "#78C850" },
		},
	},
	buyables: {
		11: fieldBuyableDef(11),
		12: fieldBuyableDef(12),
		13: fieldBuyableDef(13),
		14: fieldBuyableDef(14),
	},
	upgrades: {
		11: fieldUpgradeDef(11), 12: fieldUpgradeDef(12), 13: fieldUpgradeDef(13), 14: fieldUpgradeDef(14), 15: fieldUpgradeDef(15),
		21: fieldUpgradeDef(21), 22: fieldUpgradeDef(22), 23: fieldUpgradeDef(23),
	},
	tabFormat: {
		Search: {
			content: [
				["display-text", () => `You have <h2 style="color:#78C850">${format(player.points)}</h2> Research Points (${format(passiveRp())}/s from your Pokédex research)`],
				"blank",
				["row", [["clickable", 11], "blank", ["column", [["bar", "search"], ["display-text", () => `<small>Beat a wild Pokémon to try catching it. Catch power ×${format(catchMult())} · Party Attack ×${format(atkMult())}</small>`]]]]],
				"blank",
				["display-text", () => logHtml()],
				"blank",
				["display-text", () => zoneDetailHtml()],
			],
		},
		Map: {
			content: [
				["display-text", () => {
					const next = nextFrontierZone()
					return next ? `Next stop: <b>${next.zone.name}</b>` : "Every route in this area is open."
				}],
				["clickable", 21],
				"blank",
				["display-text", () => zoneListHtml()],
			],
		},
		Equipment: {
			content: [
				["display-text", () => `You have <h2 style="color:#78C850">${format(player.points)}</h2> Research Points`],
				"blank",
				"buyables",
				"blank",
				"upgrades",
			],
		},
		Events: {
			content: [["display-text", () => specialsHtml()]],
			unlocked() { return ALL_SPECIALS.some(specialOpen) },
		},
	},
})

resetField = () => layers.f.doReset("g")

// The Map's travel button lives in the same layer; defined after so it can use nextFrontierZone.
layers.f.clickables[21] = {
	title() { const n = nextFrontierZone(); return n ? `Travel to ${n.zone.name}` : "All routes open" },
	display() { const n = nextFrontierZone(); return n ? `Cost: ${format(n.cost)} Research Points` : "" },
	canClick() { const n = nextFrontierZone(); return !!n && player.points.gte(n.cost) },
	onClick() { unlockNextZone() },
	style: { width: "200px", height: "80px" },
}
