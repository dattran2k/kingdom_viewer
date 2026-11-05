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
- 👤 **Player card**: click any player name for their numbers now, every metric, and their history over the scans (moves included).

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
{"schema": 3, "kingdom": 357, "scan": "2026-10-28", "crawledAt": "...",
 "cols": ["rank", "id", "name", "alliance", ...], "players": [[1, 1645863, "...", "YSS", ...]]}
```
Field names are written once, in `cols`; a player is a list of values in that order. A list stops after its last known
value, `null` or a missing end means "unknown", and `0` means zero. The viewer turns each list back into an object
(`unpackScan` in `app.js`, `kingdom_derive.scan_players` in Python). Schema 2 files (one object per player) still read.

`data/derived/` holds tables worked out from the scans when the data is exported, for the Rankings and Migration pages:
`index.json` (scans), `migrations.json` (one row per move of a player between kingdoms, with the player's newest
numbers), `rollup.json` (the newest scan, one row per kingdom, players above 15M power now), `top_players.json` (the
newest scan, every player above 15M power now, one list per column in `cols`). Tables name their columns in a `cols` list.
A move is only known to lie between two scans.

`data/kvk/index.json` lists the running KvKs: their camps and kingdoms, the numbers since each opened, each kingdom's
top 5 players by merits since then (`top`), how many fights its War history has (`wars`) and how many of them are going on (`liveWars`, none when 0).
`data/kvk/battles/<map>.json` is a KvK map's War history: every fight since it opened (place, start, last clash,
alliances, participants, merits, the top 10 players, whether it is in progress or a merits trade between one kingdom's
players). The game gives no more than the top 10 of a fight. Times are UTC.
`data/kvk/progress/<map>.json` (`tools/kvk_progress_export.py`, only the map an emulator's account is in) is the game's
Season screen: `phases` (Start, Battle, Summary, End) and `steps`, the milestones (`kind` boss / pass / quest, `start`,
`end`, `est` when not open yet, names and tasks in Vietnamese and English from the game's strings). The KvK's
`progress` in `index.json` is when it was read; with it the KvK's progress bar (KvK page, Kingdom top) shows the phases
and a dot per milestone that shows it on hover, focus or tap.
`data/kvk/behemoths.json` (`tools/kvk_behemoth_export.py`) lists the game's behemoths (Creatures screen, the 4 Magma ones as one)
with their names and pictures in `assets/behemoths/`: `<kind>.png` the avatar, `<kind>_pic.webp` a larger picture. `kind` is the
number a lair milestone's `boss` names; the bar shows that avatar with the day the lair opens under it.

| Field | Meaning |
|---|---|
| `rank`, `id`, `name` | power ranking place, player id, name |
| `alliance`, `allianceId` | alliance tag / id |
| `power`, `powerMax`, `troopPower`, `buildingPower`, `techPower`, `heroPower` | power now, highest, by source |
| `merits`, `meritsMax` | merits now, best of one season |
| `kills`, `deaths`, `heals`, `victories`, `defeats` | combat |
| `meritInfantry`, `meritCavalry`, `meritArcher`, `meritMagic`, `meritOther` | merits by unit type ¹ |
| `allianceRank`, `builds`, `dismantles` | alliance rank R1–R5, activity ¹ |
| `helps`, `gold`, `wood`, `ore`, `mana`, `gems` | helps given, resources gathered |
| `migrationScore` | realm migration score |
| `cityTheme`, `legendaryArtifacts`, `pets8Skills3Star`, `maxDecor`, `exchangeCoinsSpent`, `gemsSpent`, `awakenedHeroes`, `artifactSkillsLv5` | achievements ² |
| `redArtifact` | 1 / 0: the last tier of the Universal Key achievement (2,000 artifact draws) is done |
| `missing` | parts that could not be read |

¹ Players in an alliance only. ² Read from achievement tiers, so a value stops at the last tier. Fields listed
in `atLeast` mean "this number or more".
