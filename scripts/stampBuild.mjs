/**
 * Stamps a deployed site with its build id, so a release never runs from the browser's cache:
 * every script and stylesheet address gets "?v=<build>", the page learns its BUILD, and
 * version.txt tells open pages a newer build is live (see the check in index.html).
 * Usage: node scripts/stampBuild.mjs <site folder> <build id>. Used by the deploy workflow.
 */
import { readFileSync, writeFileSync } from "fs"
import { join } from "path"

const [site, build] = process.argv.slice(2)
if (!site || !build) throw new Error("Usage: node scripts/stampBuild.mjs <site folder> <build id>")

const page = join(site, "index.html")
let html = readFileSync(page, "utf8")
html = html
	.replace('const BUILD = "local"', `const BUILD = "${build}"`)
	.replace(/(src="js\/[^"?]+\.js)"/g, `$1?v=${build}"`)
	.replace(/(href="css\/[^"?]+\.css)"/g, `$1?v=${build}"`)
writeFileSync(page, html)

// The mod's own files are loaded by TMT's loader.
const loader = join(site, "js/technical/loader.js")
const before = readFileSync(loader, "utf8")
const after = before.replace('"js/" + modInfo.modFiles[file]', `"js/" + modInfo.modFiles[file] + "?v=${build}"`)
if (after === before) throw new Error("loader.js no longer matches; update stampBuild.mjs")
writeFileSync(loader, after)

writeFileSync(join(site, "version.txt"), build + "\n")
console.log(`Stamped build ${build}`)
