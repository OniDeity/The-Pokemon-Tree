// Turns a simulator save (SIM_SAVE: the Hall of Fame and the Pokédex's records) into a string for the
// game's Import (Settings): it loads on the starter screen with those entries, Fame and records.
// Usage: node scripts/saveToImport.js saves/kanto-3.json > saves/kanto-3.txt
const fs = require("fs")
const path = require("path")
const mod = fs.readFileSync(path.join(__dirname, "..", "js", "mod.js"), "utf8")
const id = mod.match(/id: "([^"]+)"/)[1]
const version = mod.match(/num: "([^"]+)"/)[1]
const saved = JSON.parse(fs.readFileSync(process.argv[2], "utf8"))
const player = { ...saved, versionType: id, version, tab: "t", navTab: "tree-tab" }
process.stdout.write(Buffer.from(unescape(encodeURIComponent(JSON.stringify(player))), "binary").toString("base64"))
