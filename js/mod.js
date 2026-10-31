let modInfo = {
	name: "The Pokémon Tree",
	id: "the-pokemon-tree",
	author: "Onide",
	pointsName: "Research Points",
	modFiles: [
		"data/kanto.js", "data/johto.js", "data/hoenn.js", "data/orange.js", "data/sevii.js", "data/orre.js", "data/xd.js", "engine.js", "logic.js",
		"layers/field.js", "layers/team.js", "layers/gym.js", "layers/daycare.js", "layers/safari.js", "layers/gamecorner.js", "layers/story.js", "layers/pokegear.js", "layers/hunt.js", "layers/contest.js", "layers/hof.js", "layers/dex.js",
		"tree.js",
	],

	discordName: "",
	discordLink: "",
	initialStartPoints: new Decimal (0), // Used for hard resets and new players
	offlineLimit: 12,  // In hours
}

// Set your version in num and name
let VERSION = {
	num: "0.35",
	name: "Quick searches",
}

let changelog = `<h1>Changelog:</h1><br>
	<h3>v0.35 Quick searches</h3><br>
		- Searches take as long everywhere as they do in Kanto. A journey's slower pace used to stretch every search (up to 20 minutes or more in Orre); now it lowers the Research Points and experience wild battles give instead, so encounters stay quick.<br>
		- The journeys after Kanto are retuned for it: stronger Gym Leaders and admins in the Orange and Sevii Islands, Hoenn, Orre and Orre (XD) (Hoenn's Wattson and Tate & Liza less of a wall than before), and new paces. First journeys still take about 10-12 h (Johto, Hoenn) or 5-8 h (side journeys).<br><br>
	<h3>v0.34 One of a kind</h3><br>
		- Every region's Fame items now do something no other Fame item does. Johto's Elm's Incubator: Eggs come sooner. The Orange Islands' Orange Crew Training: higher level caps; Island Hopper: Surf from the start. The Sevii Islands' Berry Forest: cheaper Field equipment. Hoenn's Double Team: a stronger double-battle partner. Orre's Colosseum Purse: bigger badge boosts. XD's Krane's Research: more Fame per Hall of Fame entry. (They used to repeat the core buyables: catch chance, Attack and Defense, experience, Research Points.) Levels already bought keep counting, with the new effect.<br><br>
	<h3>v0.33 Pacing for completionists</h3><br>
		- Journeys are now tuned for a player who completes each journey's Pokédex (normal forms, whatever is open at the time) before entering the Hall of Fame, training box Pokémon to evolve them. A first run still takes about 10-12 h (Kanto, Johto, Hoenn) or 5-8 h (side journeys) with that included. Hoenn's pace is a little quicker, the Sevii Islands' a little slower.<br><br>
	<h3>v0.32 Pacing for real journeys</h3><br>
		- Every journey after Kanto is retuned against what a player really brings to it: the Fame, upgrades and lifetime records (shinies, story wins, enshrined Pokémon) of three runs of each region before. Tuned with made-up starts, they had grown far too quick with all that: a Johto journey took about 2.5 h, Hoenn 5, Orre under 1. Now a first Johto or Hoenn journey takes about 10-12 h of play again, and a first side journey 5-8 h. Kanto is unchanged.<br><br>
	<h3>v0.31 The Hall's honours</h3><br>
		- Enshrined Pokémon now count for good: every species that has entered the Hall of Fame in a Champion team gives +0.5% Research Points and +0.2% Fame, with milestones at 25, 50, 100, 151, 251 and all 386 species (Fame ×1.1 each). The bonuses are tuned for the normal species; Shiny, Albino and Melanistic Pokémon and forms enshrined count again on top, with milestones of their own (Research Points ×1.1 each at 5, 15, 30 and 60). See the Hall of Fame page.<br>
		- A new challenge once Johto is beaten, Light Traveller (a party of three), rewards Bill's Transfer: box Pokémon come along into your next run at the starter's level, so a Chikorita or a Mewtwo can enter Kanto's Hall of Fame. One slot, one more for each of Hoenn, the Orange and Sevii Islands, Orre and Orre (XD) beaten, up to six. Choose them on the Hall of Fame's Bill's Transfer page; empty slots take your strongest species never enshrined.<br><br>
	<h3>v0.30 Side journey visits</h3><br>
		- Once you've beaten a side journey, other journeys' Champions can visit it after their League: the Orange Islands (Drake at Pummelo Stadium), the Sevii Islands (the Trainer Tower), and Orre (XD) at Citadark Isle. Each visit beaten is Fame ×1.3 for that Hall of Fame entry, like the visits to Kanto, Johto, Hoenn and Orre, and its routes open on the Map.<br>
		- Who goes where: Johto's Champion can visit the Orange and Sevii Islands (alongside Red); Hoenn's, all four side journeys; the Orange and Sevii Islands each other; Colosseum's Orre, XD's. A first journey never waits on a side journey you haven't beaten.<br>
		- Pacing: the Orange Islands and Orre (XD) take a little longer (about 4.5-8 h and 5.5-6.5 h for a first journey, from 2.5-7 and 5-5.5).<br>
		- Poké Spots in other regions keep to that region's species (Kanto's draws Sandshrew and Zubat). The last badge's milestone names the region's finale.<br><br>
	<h3>v0.29.1 New faces</h3><br>
		- Team Coach: before the Champion, the party brings in as many species never enshrined in the Hall of Fame as can still win (+5 Fame each). Against the Gyms, the Elite Four and the story it still fields the strongest team.<br><br>
	<h3>v0.29 Orre (XD) and Poké Spots</h3><br>
		- A side journey from Pokémon XD: after 3 Orre Hall of Fame entries, Professor Krane sends you off with an Eevee (Lv. 10) and the Snag Machine.<br>
		- Cipher is back: snag Shadow Pokémon from trainers across Orre, beat Lovrina, Snattle, Gorigan, Ardos and Eldes, then XD001 (Shadow Lugia) and Greevil at Citadark Isle.<br>
		- Poké Spots: the desert's Rock, Oasis and Cave spots draw wild Pokémon with a Poké Snack each (paid in Research Points). Beating Lovrina unlocks Poké Spots for good: from then on every region has a Poké Spots place.<br>
		- XD's story: the HQ Lab's Battle Sim, Gateon Port's peons, Mt. Battle, Pyrite Colosseum, the Cipher Key Lair (before Gorigan), Citadark Isle's guards (before the finale) and, after it, Wanderer Miror B. XD's Champion can visit Hoenn and Orre (Realgam Tower) and enters the Hall for Fame ×3.5.<br>
		- XD's Fame items: Krane's Research (+20% Research Points a level), the Poké Snack Factory (free snacks) and the Shadow Monitor (snags twice as likely). They also raise the Fame shop's ceiling once XD is beaten.<br><br>
	<h3>v0.28 Orre and Shadow Pokémon</h3><br>
		- A side journey from Pokémon Colosseum: after 3 Hoenn Hall of Fame entries, leave Team Snagem with Espeon or Umbreon (Lv. 25) and the Snag Machine.<br>
		- Orre has no wild Pokémon: its 12 places are trainer battles. Trainers' Pokémon can't be caught, but Cipher's Shadow Pokémon can be snagged, once each per journey. The Cipher admins (Miror B., Dakim, Venus, Ein) are the trials and give up their Shadow Pokémon, Entei, Suicune and Raikou among them; Gonzap, Nascour and Evice wait at Realgam Tower.<br>
		- Shadow Pokémon (in a dark aura) can't gain experience or evolve until their heart opens: 100 wild battles won in the party. Then the Relic Stone (from Agate Village, after Miror B.) purifies them into their species, at their level and colour. Purified species are a record kept for good, with milestones on the Pokédex's Milestones tab.<br>
		- The Snag Machine and the Relic Stone are kept for good: from your first Orre journey, Cipher Peons turn about 1 in 50 encounters in every region Shadow.<br>
		- Orre's story: Willie, Phenac Stadium, the Pyrite and Under colosseums, Mt. Battle (before Dakim), Realgam Tower's Cipher peons, and Mt. Battle's 100 straight wins (Ho-Oh). After Realgam, the Leagues of Kanto, Johto and Hoenn can be visited (Fame ×1.3 each); Orre's Champion enters the Hall for Fame ×3. Orre's own Fame items: Mt. Battle Training, the Purification Chamber and the Cipher Key Lair.<br>
		- Branching evolutions: Pokémon that evolve by level into more than one species (Wurmple, Tyrogue, Eevee by friendship) show a button for each branch they've reached, and automatic evolution (and the Item Kit) takes the first one you don't own yet. Before, they always took the first and never evolved once you had it.<br><br>
	<h3>v0.27 The Sevii Islands</h3><br>
		- A side journey from FireRed and LeafGreen's post-game: after 3 Orange Islands Hall of Fame entries, Celio on One Island offers Chikorita, Cyndaquil or Totodile, already at Lv. 25, with every Kanto HM and rod.<br>
		- 23 places from Kindle Road to the Tanoby Chambers (and their Unown). Five quests take the Gyms' place: the Ruby at Mt. Ember, Lostelle's rescue, Icefall Cave's Lapras, the Rocket Warehouse and Gideon's Sapphire. The Trainer Tower's three floors are the finale. Moltres, a Togepi Egg, and Ho-Oh and Lugia at Navel Rock after the Tower.<br>
		- Story battles: Kindle Road's and Bond Bridge's trainers, Lorelei at home on Four Island, the Rockets at Five Isle Meadow (they guard the Rocket Warehouse) and the Tanoby Ruins. The Orange Islands get a story too: Tracey Sketchit and Jessie & James from Tangelo to Shamouti (Pinkan's Pikachu and Lugia wait on them).<br>
		- After the Trainer Tower, Kanto's League can be visited (Fame ×1.3). Sevii's Champion enters the Hall for Fame ×1.75. A first Sevii journey takes about 5-7 hours.<br>
		- The Fame shop has a ceiling: buyables go up to level 8, and every region whose Champion enters the Hall of Fame (Johto, the Orange Islands, the Sevii Islands, Hoenn) raises it by 4 and opens that region's own buyable and two upgrades: Kurt's Apricorns, Elm's Egg Research and the Radio Tower; Tracey's Sketchbook, Island Hopper and Pinkan Berries; Berry Forest, the Network Machine and the Rainbow Pass; Secret Power, Devon's Exp. Share and Match Call. Levels you already have stay.<br><br>
	<h3>v0.26 The Orange Islands</h3><br>
		- A side journey from the anime: after 3 Kanto Hall of Fame entries, the starter screen also offers Professor Ivy's Pikachu, Togepi and Lapras on Valencia Island.<br>
		- 29 islands, from Valencia and Pinkan to Shamouti; Lapras's ferry lets you surf from the start. Four Orange Crew Gyms (Cissy, Danny, Rudy, Luana) and their badges, then Drake alone at the Winner's Cup on Pummelo Island.<br>
		- Pinkan Pokémon (tinted pink by Pinkan Berries), Valencian Pokémon in unusual colours, and the glass Crystal Onix, as forms. Gifts from Professor Ivy and Tracey, a Pinkan Pikachu, Mahri's Slowking trade, and Shamouti's legendary birds and Lugia after the Winner's Cup.<br>
		- After the Winner's Cup, Kanto's routes and Indigo Plateau's League open for a visit (Fame ×1.3). Orange's Champion enters the Hall for Fame ×1.5. A first Orange journey takes about 5-7 hours.<br><br>
	<h3>v0.25.1 Journeys</h3><br>
		- Behind the scenes: regions, the Hall of Fame entries that open them, their starters and post-game visits are now data, ready for the side games (Orange Islands, Sevii Islands, Orre). Nothing changes in play.<br><br>
	<h3>v0.25 Post-game visits</h3><br>
		- Hoenn's Champion can visit the earlier regions: Kanto's and Johto's routes open on the Field's Map, and their Elite Four and Champion wait on the Story node (Kanto's Champion answers your Hoenn starter). Each League beaten gives Fame ×1.3 for that Hall of Fame entry. Later regions will follow the same pattern.<br>
		- Pacing: a first Hoenn journey is now about 10-12 hours, visits included (Hoenn's timers are slower, like Kanto's and Johto's first runs).<br><br>
	<h3>v0.24 Hoenn's anime</h3><br>
		- 34 places from Advanced Generation and its two Hoenn movies join Hoenn's map, from the Oldale Ruins and Rinshin Town to Forina, LaRousse City and South City. Early ones open with badges; later tiers need 1 and 2 Hoenn Hall of Fame entries.<br>
		- After the League, with 2 Hoenn entries: Meta Groudon, the machine Butler built from Groudon's fossil in Forina, and a Hoenn Cap Pikachu in Littleroot.<br><br>
	<h3>v0.23 Albino and Melanistic</h3><br>
		- Albino Pokémon (◇): pale, with the same base odds as shinies but rolled separately. Lower them with the Pale Charm and Snow Lens on the Shiny hunting node, albino milestones, an albino parent in the Day Care, or by switching your hunting chain to Albino.<br>
		- Melanistic Pokémon (✦): dark, shiny and albino at once (both rolls in the same encounter). They count as both.<br>
		- Their own pages beside the Shiny Pokédex, Pokédex marks, a box filter and achievements. Every albino species gives +1% experience, every melanistic species +2% RP and +2% experience, for good.<br><br>
	<h3>v0.22 Pokémon Contests</h3><br>
		- Contests, a new node: Verdanturf's Contest Hall opens with Hoenn's Dynamo Badge, and from then on there's a Contest Hall in every region.<br>
		- Feed a Pokémon Pokéblocks to raise its Cool, Beauty, Cute, Smart or Tough condition, then enter it from Normal to Master Rank. Its condition, how well its types suit the category, and half its level make its score.<br>
		- Wins give RP and a ribbon for that species, kept for good: every ribbon gives +0.5% Research Points, and ribbon milestones make Pokéblocks stronger, contests faster, give a Contest Pass that enters on its own, and more.<br>
		- The first Master Rank win in each category gives a Cosplay Pikachu: Rock Star, Belle, Pop Star, Ph.D. and Libre.<br><br>
	<h3>v0.21.1 Box Training</h3><br>
		- Team Coach's new Box Training switch (on the Automation page, with Team Coach): once you have the Exp. Share, the party keeps only as many Pokémon as it needs to win the next battle and fills the other slots with box Pokémon still waiting to evolve by level, closest to evolving first. They share every wild battle's experience and evolve on their own.<br><br>
	<h3>v0.21 Hoenn's side systems</h3><br>
		- Double battles! Beat Roxanne and, for good and in every region, your lead's partner (the next Pokémon in your party) fights beside it for half its damage, without being attacked.<br>
		- The PokéNav (Hoenn's Pokégear): the TV's mass-outbreak reports (Seedot, Nuzleaf, Skitty, Surskit) and Devon's Net, Dive, Nest and Repeat Balls.<br>
		- Hoenn's Safari Zone has Pokéblock feeders that draw Pokémon of their colour's types, and Areas 5 and 6 open after the League.<br>
		- Feebas under Route 119's river (about 1 cast in 20), and Mirage Island, sighted now and then after the League.<br>
		- Route 117's Day Care, Match Call, and story popups named for the region.<br>
		- Auto-buy now buys one-time upgrades too: the Field's (the Auto-Search Drone, Running Shoes...), the Day Care's, Safari Zone's and shiny hunting's, and the Game Corner's with coins.<br>
		- Searching no longer stops at a Gym reset when you keep the Auto-Search Drone, and a new run starts searching on its own if you start with it.<br>
	<h3>v0.20 Hoenn's story</h3><br>
		- May, Professor Birch's daughter: her starter answers yours, from Route 103 to Lilycove City.<br>
		- Wally, from his first Ralts in Mauville to Victory Road (his last battle opens the League).<br>
		- Team Aqua and Team Magma: Petalburg Woods (opens Roxanne's Gym), Rusturf Tunnel (Brawly's), the Oceanic Museum (Wattson's), Mt. Chimney with Maxie (Flannery's), the Weather Institute (Winona's, and Castform), Mt. Pyre, the Magma and Aqua Hideouts (Tate & Liza's), the Space Center and the Seafloor Cavern with Archie (Juan's, and Kyogre, Groudon and Rayquaza).<br>
		- Steven waits at Meteor Falls after the League, with his Beldum as the prize.<br>
	<h3>v0.19 Hoenn</h3><br>
		- Hoenn! After three Johto Hall of Fame entries, a new run can begin in Hoenn with Professor Birch's Treecko, Torchic or Mudkip, instead of in Kanto. Hoenn's Champion enters the Hall of Fame for Fame ×2.5.<br>
		- Hoenn from Emerald: 55 places (Dive with Tate & Liza's badge), Roxanne to Juan, Sidney, Phoebe, Glacia, Drake and Wallace, gifts and trades (the fossils, Castform, Beldum, Wynaut's Egg), and Kyogre, Groudon, Rayquaza, the Regis, Latias, Latios, Jirachi and Deoxys.<br>
		- 135 new species (#252-386), with a Hoenn page in the Pokédex. Gen 3 babies of older Pokémon (Azurill, Wynaut) evolve and hatch once you've beaten Hoenn.<br>
		- Badge milestones are named for each region's badges.<br>
		- Areas with more than eight routes no longer get steeply more expensive after the eighth.<br>
	<h3>v0.18 The Story node</h3><br>
		- Team Rocket and Trainers are now one Story node. Its Storyline tab draws the region's story as a map: every place between the Gyms and the League, what it needs and what it opens (a Gym, the League, a legendary). Rivals, Villains and Challengers have their own tabs.<br>
		- Rematch calls: every 20 minutes of searching a trainer from a place you've cleared calls for a rematch, levelled up to your party, for Research Points and story battles won (up to three calls wait).<br>
		- Pacing retuned with rematches: Kanto's pace is now ×3.8, the Radio Tower is a little easier (it could stall a journey for hours), and so are Kanto's post-game Brock, Blaine, Blue and Red.<br>
		- More milestones, all kept for good: villains beaten and rival wins go on into the hundreds over many runs, and every story battle won (chapters and rematches) has its own track, up to 1,000.<br>
	<h3>v0.17 A longer journey</h3><br>
		- Pacing: a first Kanto run and a first Johto journey now take about half a day of play each. Automatic searching, passive Research Points and the Day Care run slower (Kanto ×3.4, Johto ×2); searching by hand keeps its speed. Later runs still speed up through Fame.<br>
		- Johto's routes cost less to open (the last ones before the League could take hours of Research Points).<br>
		- Kanto's post-game Leaders and Red are a little weaker, to match.<br>
	<h3>v0.16 Johto's anime and Kanto's post-game</h3><br>
		- 58 places from the Johto anime and movies, from Palm Hills to Mount Quena: the early ones open from your first Johto journey, the rest after one and two Johto Hall of Fame entries.<br>
		- New one-of-a-kind forms: Pudgy Pidgey, Silver (the young Lugia of Ogi Isle), the Unown's Entei, and the Dark Ball's Tyranitar and Celebi.<br>
		- Kanto's post-game: once you're Johto's Champion, Kanto's routes open again (Fuchsia's Safari Zone is closed; Cerulean Cave waits for Red), and Kanto's eight Leaders battle with their HeartGold/SoulSilver teams on the Gyms node. Each Kanto badge boosts Research Points like a badge.<br>
		- Red only battles a trainer with all 16 badges.<br>
	<h3>v0.15 Johto's side systems</h3><br>
		- Headbutt trees (from Bugsy's badge) and Rock Smash (from Whitney's) on Johto's routes.<br>
		- The Ruins of Alph chambers: all 28 Unown letters, as forms for your collection.<br>
		- The Pokégear (Johto): tune in to the radio's swarm reports (Radio Card) to add a Pokémon to a place, and Kurt's Apricorn Balls (Level, Lure, Moon, Fast and Love Balls).<br>
		- In Johto the Safari Zone node is National Park's Bug-Catching Contest, and the Game Corner is Goldenrod's, with its own prizes.<br>
	<h3>v0.14 Johto's story</h3><br>
		- Team Rocket returns in Johto: Slowpoke Well (opens Bugsy's Gym), the Mahogany Hideout with Lance (opens Pryce's) and the Radio Tower takeover with Executives Proton, Petrel, Ariana and Archer (opens Clair's, and Lugia).<br>
		- Silver, your new rival: his starter answers yours, from Cherrygrove to Victory Road (his last battle opens the League).<br>
		- Sprout Tower (opens Falkner's Gym), the Olivine Lighthouse (opens Jasmine's) and the Kimono Girls at the Bell Tower (Ho-Oh).<br>
	<h3>v0.13 Johto</h3><br>
		- Johto! After three Hall of Fame entries, Kanto's Champion can sail on to Johto instead of entering the Hall: a fresh start under Professor Elm (Chikorita, Cyndaquil or Totodile), with every Pokémon you own back at Lv. 5. Johto's Champion then enters the Hall of Fame for the whole journey, for Fame ×2.5.<br>
		- Johto from HeartGold/SoulSilver: 50 places, Falkner to Clair, Will, Koga, Bruno, Karen and Lance, gifts and trades, Raikou, Entei, Suicune, Lugia, Ho-Oh, Celebi and the red Gyarados, and Red waiting on Mt. Silver after the League (Fame ×1.5 more).<br>
		- 100 new species (#152-251). Gen 2 evolutions and babies of Kanto Pokémon (Crobat, Pichu...) unlock once you've beaten Johto.<br>
		- The Pokédex and Shiny Pokédex have Kanto and Johto pages.<br>
		- Challenges now highlight which Pokémon fight at full strength (hatched ones in Hatchling Run, Safari catches in Poacher's Net, shinies in Plain Pokémon, your starter's type in Monotype).<br>
		- Hatching an Egg (or a Safari catch) of a species you already own now counts for the one you own, and a hatched Pokémon can evolve into one you already have that wasn't hatched.<br>
	<h3>v0.12 Fresh starts</h3><br>
		- Every Hall of Fame entry is a real fresh start: the Pokédex and the Breeder's notes start over too. Kept for good: shiny and form records, the Hall of Fame, achievements, Fame, challenges, automations, the Diploma once earned, and the lifetime counts (Rockets, rival wins, jackpots, Safari catches). Your current Pokédex stays until your next entry.<br>
		- Six new automation challenges: Wanderer (Route Planner), Locked Party (Team Coach), No Items (Item Kit), Amnesia (Professor's Notes), Empty Nest (Breeder's Journal) and Plain Pokémon (Hunter's Instinct).<br>
		- Becoming Champion no longer pauses the game on a victory screen.<br>
		- Behind the scenes: the Pokédex is organised by region, ready for Johto.<br>
	<h3>v0.11 Kanto's story</h3><br>
		- Team Rocket (R) now schemes all over Kanto: Mt. Moon (with Jessie & James), Nugget Bridge, the Rocket Hideout, the Pokémon Tower (the ghost Marowak and Mr. Fuji's Poké Flute) and Silph Co. (Giovanni again, and the Master Ball). About 30 Rockets a run.<br>
		- A new Trainers node (V): your rival (his team answers your starter), the S.S. Anne (Cut) and the Fighting Dojo (choose Hitmonlee or Hitmonchan).<br>
		- Story gates: Mt. Moon opens Misty's Gym, the S.S. Anne Lt. Surge's, the Pokémon Tower Koga's, Silph Co. Sabrina's, and your rival's last stand on Route 22 the League. Snorlax needs the Poké Flute and Lapras Silph Co.<br>
		- Game Freak's Diploma for all 150 Kanto species (Mew not needed): your Pokémon fight ×1.1 for good. And something glitchy off Cinnabar's coast...<br>
		- Box pages, a setting to hide sprites, and a "No shiny yet" filter.<br>
	<h3>v0.10 Rocket Hideout</h3><br>
		- The Rocket Hideout under the Game Corner (opens with it): four floors of Team Rocket Grunts, each dropping coins, then Giovanni and the Silph Scope (Ghost Pokémon twice as easy to catch that run). Rockets beaten count for good toward its milestones.<br>
		- Notification settings (the gear's settings page): switch off each kind of popup (new Pokédex entries, shinies, evolutions, badges, the League, the Hall of Fame, jackpots, Team Rocket, milestones, achievements) and the glowing nodes.<br>
		- Filters and a name search for the box, the Day Care's list (new Eggs, Pokémon that lay Eggs...), the Breeder's notes, the Pokédex and the Shiny Pokédex.<br>
	<h3>v0.9 Shiny hunting</h3><br>
		- Shiny hunting (★, from 4 badges, from the start after four Hall of Fame entries, or for good once you've caught a shiny): choose a target on your route; each time you beat it the chain grows and its shinies get more common, up to ×4 (×8 with the Poké Radar). Losing to it breaks the chain.<br>
		- Buyables (Lure, Radar Battery, Shiny Lens) and upgrades (Poké Radar, Masuda's Notes for shiny Eggs, Steady Nerves). Auto-buy buys the buyables too.<br>
		- The Shiny Pokédex: every shiny species caught gives +1% Research Points for good, with milestones at 1, 5, 10 and 25.<br>
		- Fewer Safari Zone notifications: only shiny catches pop up (new Pokédex entries go to the log quietly), and the Safari Zone only glows until your first trip of a run.<br>
	<h3>v0.8 Game Corner</h3><br>
		- Celadon's Game Corner (from 3 badges, or from the start after three Hall of Fame entries): buy coins with Research Points and trade them in at the prize counter for Abra, Clefairy, Nidorina, Dratini, Scyther, Pinsir and Porygon (they now cost coins, not Research Points).<br>
		- The slots: switch them on and they spin by themselves. They pay back a little less than you bet until the Lucky Machine; every 7 7 7 counts for good toward the jackpot milestones.<br>
		- Coin upgrades (Lucky Machine, Coin Case, Itemfinder: coins from wild battles) and prize counter buyables (High Roller, Amulet Coin, Lucky Egg). Auto-buy buys the coin buyables too.<br>
	<h3>v0.7 Automation</h3><br>
		- Three hard automation challenges after your first Hall of Fame entry: Shoestring Budget (Auto-buy), Hatchling Run (the Day Care Lady, who keeps new Eggs coming) and Poacher's Net (the Warden's Pass: free automatic Safari trips with the best strategy). Switch them on and off in the Hall of Fame's Automation page.<br>
		- Buyables for the Day Care (Training, Incubator, Warm Blanket) and the Safari Zone (Ball Pouch, Quiet Steps, Safari Ball Polish).<br>
		- Breeder's notes: the Day Care marks which Pokémon's Eggs are new (+2% Research Points each) and shows every species that can hatch; the Pokédex marks hatched species with 🥚.<br>
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
	() => player.t.starter ? `${badges()} badge${badges() === 1 ? "" : "s"} · ${regionCaught()}/${regionDex().length} caught` : "",
]

// Determines when the game "ends"
// TMT's victory screen pauses the game until "Keep going": no end yet, while regions keep coming.
function isEndgame() {
	return false
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
	// v0.11: the Rocket Hideout's progress moved into the story's chapters.
	migrateStory()
}