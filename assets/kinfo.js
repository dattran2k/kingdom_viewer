// What the Kingdom page says about a kingdom: its top (picture of the season, its KvK) and where it ranks, over all
// kingdoms and in its KvK. A classic script loaded after kvk.js; what it needs comes through window.KS.
(() => {
"use strict";
const KS = window.KS, { state, tr, $, numFmt } = KS;
const { el, load, objects } = KS.ui;

Object.assign(KS.T.vi, { iSeeRank: "Xem bảng xếp hạng", iRankTitle: "Hạng server", iOf: "/ {n} kingdom", iTop: "Top {p}%", iNoKvk: "Chưa ở trong KvK nào" });
Object.assign(KS.T.en, { iSeeRank: "See the ranking", iRankTitle: "Kingdom rank", iOf: "/ {n} kingdoms", iTop: "Top {p}%", iNoKvk: "In no KvK yet" });

const RANKED = [["powerMax", "cPowerMax"], ["power", "cPower"], ["merits", "cMerits"], ["kills", "cKills"], ["deaths", "cDeaths"], ["heals", "cHeals"], ["gathered", "cGathered"], ["decorMax", "cDecor"], ["migrationScore", "cMigration"]];
const rankLink = () => { const a = el("a", "btn kr-link", tr("iSeeRank")); a.href = "#p=rank"; return a; };
const battleOf = (idx, k) => KS.season.of(idx, k);

// ---- the rank: one line for the kingdom, one tile for each metric ----
async function drawRank(k) {
  const box = $("kRank"), [roll, idx] = await Promise.all([load("derived/rollup.json"), load("kvk/index.json")]);
  if (state.mainK !== k) return;
  box.innerHTML = "";
  const rows = roll ? objects(roll.kingdomCols, roll.kingdoms) : [], me = rows.find((r) => r.kingdom === k);
  const ks = state.comparing ? [state.mainK, ...state.also] : [k];
  box.hidden = !me;
  if (box.hidden) return;
  if (ks.length > 1) { drawRanks(box, rows, ks); return; }
  const n = rows.length, main = me.powerMaxRank;
  const head = el("div", "kr-head");
  head.append(el("h2", "", tr("iRankTitle")), el("b", "kr-main", "#" + main), el("span", "mut", tr("iOf").replace("{n}", numFmt().format(n))),
    el("span", "kr-pill", tr("iTop").replace("{p}", numFmt(1).format((100 * main) / n))), rankLink());
  const grid = el("div", "kr-grid");
  for (const [key, label] of RANKED) {
    const place = me[key + "Rank"];
    if (!place) continue;
    const tile = el("div", "kr-tile"), top = el("div", "kr-top");
    top.append(el("span", "", tr(label)), el("b", "", "#" + place));
    const low = el("div", "kr-low");
    low.append(el("b", "", KS.compact(me[key])));
    const meter = el("div", "kr-meter");
    meter.appendChild(el("i")).style.width = `${Math.max(2, 100 * (1 - (place - 1) / n))}%`;
    tile.append(top, low, meter);
    grid.appendChild(tile);
  }
  box.append(head, grid);
}

// several kingdoms side by side: a line each, the rank and the figure of each metric
function drawRanks(box, rows, ks) {
  const cols = [
    { key: "kingdom", label: tr("cKingdom"), nosort: true, get: (r) => r.kingdom, node: (r) => { const a = el("a", "kd", String(r.kingdom)); a.href = "#k=" + r.kingdom; return a; } },
    ...RANKED.map(([key, label]) => ({ key: "r_" + key, label: tr(label), nosort: true, get: (r) => r[key], node: (r) => {
      const d = el("span", "kr-cell");
      const place = r[key + "Rank"];
      d.append(el("b", "", place ? "#" + place : "–"), el("small", "", r[key] == null ? "" : KS.compact(r[key])));
      return d;
    } })),
  ];
  const list = ks.map((x) => rows.find((r) => r.kingdom === x)).filter(Boolean);
  const head = el("div", "kr-head");
  head.append(el("h2", "", tr("iRankTitle")), rankLink());
  box.append(head, KS.ui.table(cols, list, { key: "" }, () => {}));
}

// ---- the top of the page: the season's picture, its name and the KvK ----
async function drawTop(k) {
  const row = document.querySelector("#kingdomTop .k-row"), idx = await load("kvk/index.json");
  if (state.mainK !== k) return;
  const ks = state.comparing ? [state.mainK, ...state.also] : [k];
  // several kingdoms: the KvK is said only when they all share it
  const b = ks.every((x) => battleOf(idx, x) === battleOf(idx, k)) ? battleOf(idx, k) : null, apart = ks.length > 1 && !b;
  let meta = $("kMeta");
  if (!meta) { meta = el("div", "k-meta"); meta.id = "kMeta"; row.appendChild(meta); }
  meta.innerHTML = "";
  KS.season.art(row, b?.season);
  // the same picture goes on below the top, more and more blurred, down to the table
  const top = $("kingdomTop");
  KS.season.art(top, b?.season);
  top.style.setProperty("--row-top", row.offsetTop + "px");
  top.style.setProperty("--row-h", row.offsetHeight + "px");
  if (apart) return;
  if (!b) { meta.appendChild(el("span", "mut", tr("iNoKvk"))); return; }
  const line = el("div", "k-meta-l"), chips = el("div", "k-meta-c"), open = el("a", "btn k-dash", tr("kOpen"));
  line.append(el("b", "", KS.season.title(b.season)), el("span", "", `${b.name} · ${KS.season.dates(b)}`));
  for (const y of b.kingdoms) {
    const c = el("a", ks.includes(y.k) ? "kd on" : "kd", String(y.k));
    if (state.list.some((x) => x.kingdom === y.k)) {
      c.href = "#k=" + y.k;
      // comparing, a kingdom of the KvK goes in or out of the comparison
      if (state.comparing) c.onclick = (e) => { e.preventDefault(); KS.toggleKingdom(y.k); };
    }
    chips.appendChild(c);
  }
  open.href = "#kvk=" + b.id;
  chips.appendChild(open);
  const prog = el("div", "k-prog");
  prog.append(...KS.season.progress(b));
  meta.append(line, prog, chips);
}

const shown = KS.onKingdomShown;
KS.onKingdomShown = (k) => { shown?.(k); drawRank(k); drawTop(k); };
})();
