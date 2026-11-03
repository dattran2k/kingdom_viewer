# 👑 Kingdom Stats

> Call of Dragons kingdom data: power, merits, kills, achievements and realm migration for every player on the rankings.

![Open source](https://img.shields.io/badge/open%20source-free%20data-brightgreen?logo=opensourceinitiative&logoColor=white)
[![visitors](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fmachudat.goatcounter.com%2Fcounter%2F%252Fkingdom_viewer%252F.json&query=%24.count&label=visitors&color=blue&logo=googleanalytics&logoColor=white)](https://dattran2k.github.io/kingdom_viewer/)
![Discord](https://img.shields.io/badge/Discord-trandat2030-5865F2?logo=discord&logoColor=white)

🌐 **Live:** https://dattran2k.github.io/kingdom_viewer/

🕒 New data is crawled when there is free time.

## 💬 Contact
Questions, bugs, ideas, or want a kingdom crawled: message me on Discord, **`trandat2030`**.

## ✨ What it shows
- 🏰 **Kingdom**: every player over a power step, with totals, charts and a sortable table (compare two days, ± average).
- ⚔️ **Compare**: two sides of up to 10 kingdoms each, head to head.
- 🏆 **Rankings**: kingdoms ranked by power, merits and kills.
- 🔁 **Migration**: who moved between kingdoms, and when.

## 🚀 Run
- **Locally:** run `python -m http.server 8000 --bind 127.0.0.1` in this folder, then open http://localhost:8000/.
  Opening `index.html` straight from disk does not work, because the browser blocks `fetch` on `file://`.
- **GitHub Pages:** Settings → Pages → Deploy from branch → `main` / root. `.nojekyll` turns Jekyll off.

Links keep their place: `#k=357&s=2026-10-28` (kingdom, scan), `#k=357&a=2026-10-28` (compare with an older scan).

## 📦 Data
One folder per scan date; older scans are kept. Each kingdom opens on its newest scan, and older ones can be
picked from the Scan menu. `schema` is the file format version.

`data/kingdoms.json`
```json
{"schema": 2, "scans": [{"scan": "2026-10-28", "kingdoms": 1060}],
 "kingdoms": [{"kingdom": 357, "scan": "2026-10-28", "scans": ["2026-10-28"], "players": 202,
               "crawledAt": "2026-10-28T16:30+07:00", "power": 31234567890, "alliances": 21}]}
```
`data/scans/<date>/<kingdom>.json`
```json
{"schema": 2, "kingdom": 357, "scan": "2026-10-28", "crawledAt": "...", "players": [{"rank": 1, "id": 1645863, "name": "...", "power": 406226165}]}
```
A player is a flat object. A missing field means "unknown", and `0` means zero.

`data/derived/` holds tables worked out from the scans when the data is exported, for the Rankings and Migration pages:
`index.json` (scans), `migrations.json` (one row per move of a player between kingdoms, with the player's newest
numbers), `rollup.json` (the newest scan, one row per kingdom, players above 15M max power). Tables name their columns in a `cols` list.
A move is only known to lie between two scans.

`data/kvk/index.json` lists the running KvKs: their camps and kingdoms, the numbers since each opened, each kingdom's
top 5 players by merits since then (`top`), and how many fights its War history has (`wars`).
`data/kvk/battles/<map>.json` is a KvK map's War history: every fight since it opened (place, start, last clash,
alliances, participants, merits, the top 10 players, whether it is in progress or a merits trade between one kingdom's
players). The game gives no more than the top 10 of a fight. Times are UTC.

| Field | Meaning |
|---|---|
| `rank`, `id`, `name` | power ranking place, player id, name |
| `alliance`, `allianceId`, `faction`, `cityLevel` | alliance tag / id, faction, city level |
| `power`, `powerMax`, `troopPower`, `buildingPower`, `techPower`, `heroPower` | power now, highest, by source |
| `merits`, `meritsMax` | merits now, best of one season |
| `kills`, `deaths`, `heals`, `victories`, `defeats`, `cityAttacks`, `scouts` | combat |
| `meritInfantry`, `meritCavalry`, `meritArcher`, `meritMagic`, `meritOther` | merits by unit type ¹ |
| `allianceRank`, `builds`, `donations`, `dismantles`, `lastLogin` | alliance rank R1–R5, activity, last login (ms) ¹ |
| `helps`, `gold`, `wood`, `ore`, `mana`, `gems` | helps given, resources gathered |
| `kvkJoined`, `kvkWon`, `rootsJoined`, `rootsWon` | KvK / Roots of War joined, won |
| `migrationScore` | realm migration score |
| `achievementsDone`, `cityTheme`, `legendaryArtifacts`, `pets8Skills3Star`, `maxDecor`, `exchangeCoinsSpent`, `gemsSpent`, `awakenedHeroes`, `artifactSkillsLv5` | achievements ² |
| `redArtifact` | 1 / 0: the last tier of the Universal Key achievement (2,000 artifact draws) is done |
| `missing` | parts that could not be read |

¹ Players in an alliance only. ² Read from achievement tiers, so a value stops at the last tier. Fields listed
in `atLeast` mean "this number or more".
