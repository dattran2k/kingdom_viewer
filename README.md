# Kingdom Stats

Static page with player statistics per kingdom: power, merits, kills, achievements, gathering, alliance activity.
Fan-made, not affiliated with the game's publisher. Players under 5M power are not included.

**Views:** Players (table), Alliances (click a line to list its members), Chart. Filters: power (default > 20M),
search, alliance.

## Run
- **Locally:** run `python -m http.server 8000 --bind 127.0.0.1` in this folder, then open http://localhost:8000/.
  Opening `index.html` straight from disk does not work, because the browser blocks `fetch` on `file://`.
- **GitHub Pages:** Settings → Pages → Deploy from branch → `main` / root. `.nojekyll` turns Jekyll off.

Links keep their place: `#k=357&s=2026-10-28&v=chart` (kingdom, scan, view).

## Layout
```
index.html
assets/app.js        loading, filters, table
assets/views.js      totals, alliances, chart
assets/columns.js    column list (one line per column)
assets/style.css
data/kingdoms.json   kingdom index
data/scans/<date>/<kingdom>.json
```
After changing `assets/`, bump `?v=N` in `index.html` (Pages caches files for 10 minutes).

## Data
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
| `missing` | parts that could not be read |

¹ Players in an alliance only. ² Read from achievement tiers, so a value stops at the last tier. Fields listed
in `atLeast` mean "this number or more".
