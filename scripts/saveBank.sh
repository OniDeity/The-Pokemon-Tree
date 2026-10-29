#!/bin/sh
# Builds saves/: each region's state after three of its Hall of Fame entries, played by the simulator
# from the previous save along the way (Kanto → Johto → Hoenn → Orre → XD; Kanto → Orange → Sevii).
# Each .json loads in the simulator (SIM_LOAD=saves/hoenn-3.json SIM_START=orre ...), each .txt in
# the game's Import. Takes a while: run it after changes that move pacing or the save's shape.
set -e
cd "$(dirname "$0")/.."
sim() { name=$1; shift; env "$@" SIM_RUNS=3 SIM_SAVE=saves/$name.json node scripts/simulate.js 1 1 | grep -E "Champion after|Saved"; node scripts/saveToImport.js saves/$name.json > saves/$name.txt; }
sim kanto-3
sim johto-3 SIM_LOAD=saves/kanto-3.json
sim orange-3 SIM_LOAD=saves/kanto-3.json SIM_START=orange
sim sevii-3 SIM_LOAD=saves/orange-3.json SIM_START=sevii
sim hoenn-3 SIM_LOAD=saves/johto-3.json SIM_START=hoenn
sim orre-3 SIM_LOAD=saves/hoenn-3.json SIM_START=orre
sim xd-3 SIM_LOAD=saves/orre-3.json SIM_START=xd
