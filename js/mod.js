let modInfo = {
	name: "The Pokémon Tree",
	id: "the-pokemon-tree",
	author: "Onide",
	pointsName: "Research Points",
	modFiles: [
		"data/kanto.js", "engine.js", "logic.js",
		"layers/field.js", "layers/team.js", "layers/gym.js", "layers/daycare.js", "layers/safari.js", "layers/hof.js", "layers/dex.js",
		"tree.js",
	],

	discordName: "",
	discordLink: "",
	initialStartPoints: new Decimal (0), // Used for hard resets and new players
	offlineLimit: 12,  // In hours
}

// Set your version in num and name
let VERSION = {
	num: "0.6",
	name: "Safari Zone",
}

let changelog = `<h1>Changelog:</h1><br>
	<h3>v0.6 Safari Zone</h3><br>
		- Fuchsia's Safari Zone (from 5 badges, or from the start after two Hall of Fame entries): trips of Safari Balls, no battles. Throw Bait or a Rock first, or just balls.<br>
		- Safari catches count for good toward the Warden's milestones.<br>
	<h3>v0.5 Day Care</h3><br>
		- Route 5's Day Care (from 2 badges, or from the start once you've entered the Hall of Fame): two Pokémon train there, and a compatible pair lays Eggs that hatch after wild battles.<br>
		- Every species hatched gives +2% Research Points for good.<br>
		- The Map shows how many of each route's Pokémon aren't in your box yet.<br>
		- Evolution buttons say why they're locked (badges, Research Points, or an evolution you already have).<br>
	<h3>v0.4 The anime</h3><br>
		- 51 places from the anime, opening in tiers as you enter the Hall of Fame again and again (the Map's Anime places).<br>
		- The anime's forms as variants: Mewtwo's 27 clones (New Island), the giants of Pokémopolis and Bill's Lighthouse, Pink Butterfree, Flying and Original Cap Pikachu.<br>
		- The Pokédex's Forms page, with form milestones.<br>
	<h3>v0.3.1</h3><br>
		- Fixed new starters being stored under a broken box key ("4-false"); saves are repaired on load.<br>
		- Each release now loads fresh instead of from the browser's cache.<br>
	<h3>v0.3 Variants</h3><br>
		- Shiny Pokémon get their own box slot: a shiny Kakuna evolves even if you have a normal Beedrill, and a shiny catch no longer replaces your normal one.<br>
	<h3>v0.2 Hall of Fame</h3><br>
		- The Hall of Fame: after becoming Champion, start Kanto over for Fame. Your Pokédex is kept.<br>
		- Fame buys permanent upgrades; Hall of Fame milestones keep upgrades, add starters and automate Gyms.<br>
		- Challenges: Nuzlocke, Monotype, Lone Partner, Light Pack and Underleveled, each with a lasting reward.<br>
		- Pokémon no longer evolve into a species you already have.<br>
	<h3>v0.1 Kanto</h3><br>
		- Choose Bulbasaur, Charmander or Squirtle and survey Kanto for Professor Oak.<br>
		- Search Kanto's routes (FireRed/LeafGreen encounter tables), battle and catch.<br>
		- Research Points buy field equipment and open the next routes.<br>
		- Survey each area, then beat its Gym Leader for a badge: a reset that keeps your Pokémon and Pokédex. Brock is the first.<br>
		- Party, box, level caps, evolutions (level, stones and trades).<br>
		- Gifts, in-game trades, Game Corner prizes and legendaries.<br>
		- The Elite Four and the Champion; Cerulean Cave and Faraway Island after the League.<br>
		- Pokédex milestones and achievements.`

let winText = `You beat the Pokémon League and entered the Hall of Fame! Keep going for Cerulean Cave, Mew and the rest of the Pokédex.`

// If you add new functions anywhere inside of a layer, and those functions have an effect when called, add them here.
// (The ones here are examples, all official functions are already taken care of)
var doNotCallTheseFunctionsEveryTick = ["blowUpEverything"]

function getStartPoints(){
    return new Decimal(modInfo.initialStartPoints)
}

// Determines if it should show points/sec
function canGenPoints(){
	return player.t.starter > 0
}

// Calculate points/sec!
function getPointGen() {
	if(!canGenPoints())
		return new Decimal(0)

	return new Decimal(passiveRp())
}

// You can add non-layer related variables that should to into "player" and be saved here, along with default values
function addedPlayerData() { return {
}}

// Display extra things at the top of the page
var displayThings = [
	() => player.t.starter ? `${badges()} badge${badges() === 1 ? "" : "s"} · ${caughtCount()}/151 caught` : "",
]

// Determines when the game "ends"
function isEndgame() {
	return isChampion()
}



// Less important things beyond this point!

// Style for the background, can be a function
var backgroundStyle = {

}

// You can change this if you have things that can be messed up by long tick lengths
function maxTickLength() {
	return(3600) // Default is 1 hour which is just arbitrarily large
}

// Use this if you need to undo inflation from an older version. If the version is older than the version that fixed the issue,
// you can cap their current resources with this.
function fixOldSave(oldVersion){
	// v0.3: box entries are keyed by species and look; v0.3.1 repairs "4-false" keys (see migrateBox).
	migrateBox()
}