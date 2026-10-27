/**
 * Turns the checkout into the dev build: its own save id (so testing never touches the public
 * version's saves, which share the same origin) and a "(Dev)" title. Used by the deploy workflow
 * for the dev branch; don't commit the result.
 */
import { readFileSync, writeFileSync } from "fs"

const mod = new URL("../js/mod.js", import.meta.url)
let text = readFileSync(mod, "utf8")
text = text.replace(/id: "([^"]+)"/, 'id: "$1-dev"').replace(/name: "([^"]+)"/, 'name: "$1 (Dev)"')
writeFileSync(mod, text)

const page = new URL("../index.html", import.meta.url)
writeFileSync(page, readFileSync(page, "utf8").replace(/<title>([^<]+)<\/title>/, "<title>$1 (Dev)</title>"))
console.log("Dev build:", text.match(/id: "([^"]+)"/)[1])
