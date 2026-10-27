let modInfo = {
	name: "The Pokémon Tree",
	id: "the-pokemon-tree",
	author: "Onide",
	pointsName: "Research Points",
	modFiles: [
		"data/kanto.js", "engine.js", "logic.js",
		"layers/field.js", "layers/team.js", "layers/gym.js", "layers/hof.js", "layers/dex.js",
		"tree.js",
	],

	discordName: "",
	discordLink: "",
	initialStartPoints: new Decimal (0), // Used for hard resets and new players
	offlineLimit: 12,  // In hours
}

// Set your version in num and name
let VERSION = {
	num: "0.2",
	name: "Hall of Fame",
}

let changelog = `<h1>Changelog:</h1><br>
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
}