// What the Kingdom page says about a kingdom: its top (picture of the season, its KvK) and where it ranks, over all
// kingdoms and in its KvK. A classic script loaded after kvk.js; what it needs comes through window.KS.
(() => {
"use strict";
const KS = window.KS, { state, tr, $, numFmt } = KS;
const { el, load, objects } = KS.ui;

Object.assign(KS.T.vi, { iSeeRank: "Bảng xếp hạng", iRankTitle: "Hạng server", iOf: "/ {n} kingdom", iTop: "Top {p}%", iKds: "{n} kingdom trong KvK", iTopAl: "Liên minh mạnh nhất (tổng lực chiến)", iSameGen: "Kingdom cùng Gen",
  pStep: ["Xem Trước", "Đăng Ký", "Phân Loại", "Ghép Cặp", "Bờ Vực Chiến Tranh", "Mùa Giải Bắt Đầu"], pTbd: "Chưa định", pLeft: "còn {t}",
  pGroup: "Nhóm {n}", pKds: "{n} kingdom cùng nhóm ghép cặp", pOpen: "Ghép cặp", pTip: "Lịch của mùa giải sắp tới, như màn Mùa Giải trong game (UTC). Map có sau Bờ Vực Chiến Tranh",
  iCmp: "So sánh sức mạnh", iCmpS: "So sánh", iCmpTip: "Mở Ghép cặp: đội của kingdom này với đội kia của KvK" });
Object.assign(KS.T.en, { iSeeRank: "Ranking", iRankTitle: "Kingdom rank", iOf: "/ {n} kingdoms", iTop: "Top {p}%", iKds: "{n} kingdoms in this KvK", iTopAl: "Strongest alliance (total power)", iSameGen: "Kingdoms of the same Gen",
  pStep: ["Preview", "Register", "Seeding", "Pairing", "Brink of War", "Season Starts"], pTbd: "TBD", pLeft: "{t} left",
  pGroup: "Group {n}", pKds: "{n} kingdoms in the pairing group", pOpen: "Matchup", pTip: "The coming season's schedule, as the game's Season screen (UTC). The map comes after Brink of War",
  iCmp: "Compare strength", iCmpS: "Compare", iCmpTip: "Open the Matchup: this kingdom's team against the other team of the KvK" });

const RANKED = [["migrationScore", "cMigration"], ["powerMax", "cPowerMax"], ["power", "cPower"], ["merits", "cMerits"], ["kills", "cKills"], ["deaths", "cDeaths"], ["heals", "cHeals"], ["gathered", "cGathered"], ["decorMax", "cDecor"]];
// underlined text at the end of the line, as the links of the KvK frame
const rankLink = (k) => { const a = el("a", "kv-info-link kv-info-end", tr("iSeeRank")); a.href = "#p=rank&at=" + k; return a; }; // opens on the kingdom's line
const battleOf = (idx, k) => KS.season.of(idx, k);

// ---- the rank: one line for the kingdom, one tile for each metric ----
async function drawRank(k) {
  const box = $("kRank"), [roll, idx] = await Promise.all([load("derived/rollup.json"), load("kvk/index.json")]);
  if (state.mainK !== k) return;
  box.innerHTML = "";
  const rows = roll ? objects(roll.cols, roll.rows) : [], me = rows.find((r) => r.kingdom === k);
  const ks = state.comparing ? [state.mainK, ...state.also] : [k];
  rankOf = null;
  markCards();
  box.hidden = !me;
  if (box.hidden) return;
  if (ks.length > 1) { drawRanks(box, rows, ks); return; }
  // its place in its own ranking, SoS or Non SoS (rollup.json: sos, the places and each ranking's count come worked
  // out by kingdom_derive), by max power: the place that ranking opens with
  const set = me.sos === 0 ? "non" : "sos", n = roll.heads?.[set]?.kingdoms ?? rows.length, main = me.powerMaxRank;
  const head = el("div", "kr-head");
  // a phone: two lines that break at the same place for every kingdom (the place's digits must not move the break)
  head.append(el("h2", "", tr(set === "non" ? "rNonSos" : "rSos")), el("b", "kr-main", "#" + main), el("span", "mut", tr("iOf").replace("{n}", numFmt().format(n))), el("i", "kr-br"),
    el("span", "kr-pill",tr("iTop").replace("{p}", numFmt(1).format((100 * main) / n))));
  // one block with the cards: each card has the place of its metric, the metrics without a card are on this line
  rankOf = { me, n };
  // a phone: these sit on one line that scrolls sideways, so longer places (#26 against #1) never add a third line
  const xs = el("span", "kr-xs");
  for (const [key, label] of RANKED) {
    if (CARD_OF[key] || !me[key + "Rank"]) continue;
    const x = el("span", "kr-x");
    x.title = KS.compact(me[key]);
    x.append(tr(label) + " ", el("b", "", "#" + me[key + "Rank"]));
    xs.appendChild(x);
  }
  head.append(xs, rankLink(k));
  box.appendChild(head);
  markCards();
}

// the card of a ranked metric (its data-k), and each card's place among all kingdoms; none while comparing kingdoms
const CARD_OF = { migrationScore: "migrationScore", power: "power", merits: "merits", kills: "kills", deaths: "deaths", heals: "heals", decorMax: "maxDecor" };
let rankOf = null;
function markCards() {
  for (const card of document.querySelectorAll("#kpis .kpi")) {
    card.querySelector(".k-rank")?.remove();
    const key = Object.keys(CARD_OF).find((x) => CARD_OF[x] === card.dataset.k), place = key && rankOf?.me[key + "Rank"];
    if (!place) continue;
    const b = el("b", "k-rank", "#" + place);
    b.title = `${tr("iRankTitle")} #${place} ${tr("iOf").replace("{n}", numFmt().format(rankOf.n))} · ${KS.compact(rankOf.me[key])}`;
    card.querySelector(".k-l").appendChild(b);
  }
}
KS.onKpisDrawn = markCards;

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
  head.append(el("h2", "", tr("iRankTitle")), rankLink(ks[0]));
  box.append(head, KS.ui.table(cols, list, { key: "" }, () => {}));
}

// ---- under the kingdom number: its generation and its strongest alliance (most power in all) ----
async function drawSub(k) {
  const box = $("kSub"), [roll, idx] = await Promise.all([load("derived/rollup.json"), load("kvk/index.json")]);
  if (!box || state.mainK !== k) return;
  box.innerHTML = "";
  // several kingdoms compared: no one generation or alliance to say, but the line keeps its room (nothing below moves
  // when kingdoms are added or taken out, or the mode changes)
  box.style.visibility = state.comparing && state.also.length ? "hidden" : "";
  const me = roll ? objects(roll.cols, roll.rows).find((r) => r.kingdom === k) : null, gen = idx?.genOf?.[k];
  if (gen) {
    // as the ranking's Gen filter, and a click opens the ranking filtered on it, on this kingdom's line (as the status)
    const g = el("a", "rk-gen k-sub-gen");
    g.dataset.gen = gen;
    g.href = `#p=rank&gen=${gen}&at=${k}`;
    g.title = tr("iSameGen");
    g.append(el("i", "rk-dot"), typeof gen === "string" ? gen : `${tr("cGen")} ${gen}`); // SoS1: a lone SoS1 map, no number
    box.appendChild(g);
  }
  if (me?.topAlliance) {
    const a = KS.allianceChip(me.topAlliance);
    a.title = tr("iTopAl");
    box.appendChild(a);
  }
}

// ---- the top of the page: the season's picture, its name and the KvK ----
// The loading shapes of the KvK block (index.html), kept: a kingdom in no KvK holds the same room with them, unseen, so
// the number and everything under it (Hạng server...) sit at the same place on every kingdom
const VOID_KVK = $("kMeta")?.innerHTML ?? "";
function voidMeta(meta) {
  meta.className = "k-meta k-kvk sk-kvk k-void";
  meta.innerHTML = VOID_KVK;
  meta.setAttribute("aria-hidden", "true");
}
async function drawTop(k) {
  const row = document.querySelector("#kingdomTop .k-row"), idx = await load("kvk/index.json");
  if (state.mainK !== k) return;
  const ks = state.comparing ? [state.mainK, ...state.also] : [k];
  // several kingdoms: the KvK is said only when they all share it
  const b = ks.every((x) => battleOf(idx, x) === battleOf(idx, k)) ? battleOf(idx, k) : null, apart = ks.length > 1 && !b;
  // in no KvK but being paired (one kingdom): the coming season's schedule in the KvK block's room
  const grp = !b && ks.length === 1 ? await KS.seeds.group(k) : null;
  if (state.mainK !== k) return;
  let meta = $("kMeta");
  if (!meta) { meta = el("div", "k-meta"); meta.id = "kMeta"; row.appendChild(meta); }
  meta.innerHTML = "";
  meta.hidden = false;
  const season = b?.season ?? (grp?.times ? grp.season : undefined);
  KS.season.art(row, season);
  // the same picture goes on below the top, more and more blurred, down to the table
  const top = $("kingdomTop");
  KS.season.art(top, season);
  // the picture's room follows the top's height, which the KvK block below sets (and a phone's 2-row bar)
  const fit = () => { top.style.setProperty("--row-top", row.offsetTop + "px"); top.style.setProperty("--row-h", row.offsetHeight + "px"); };
  fit();
  if (!row._fit) { row._fit = new ResizeObserver(fit); row._fit.observe(row); }
  // in no KvK (or kingdoms of different ones): nothing to see, the status beside the number already says it
  // (pairing, registering...), but the block's room stays
  if (!b && grp?.times) { pairing(meta, k, grp, idx?.genOf?.[k]); return; }
  if (!b) { voidMeta(meta); return; }
  meta.className = "k-meta k-kvk"; // the loading shapes are gone
  meta.removeAttribute("aria-hidden");
  // the KvK the kingdom is in, as one block: its name and the way to its page on top, how far it is, then its kingdoms
  // (links to them, the one shown filled), under a label that says what the numbers are
  const line = el("div", "k-meta-l"), name = el("div", "k-meta-n"), chips = el("div", "k-meta-c"), open = el("a", "btn k-dash", tr("kOpen"));
  // under the title, one line: the KvK's code, Battle, the fights going on (they wrap together on a phone)
  const tags = el("span", "k-meta-tags");
  tags.append(el("span", "", b.name));
  const bt = KS.season.battleTag(b);
  if (bt) tags.appendChild(bt);
  name.append(el("b", "", KS.season.title(b.season)), tags);
  const acts = el("span", "k-acts"), cmp = matchupLink(b, k);
  if (cmp) acts.appendChild(cmp);
  acts.appendChild(open);
  line.append(name, acts);
  chips.appendChild(el("span", "k-meta-lbl", tr("iKds").replace("{n}", b.kingdoms.length)));
  for (const y of b.kingdoms) {
    const c = el("a", ks.includes(y.k) ? "kd on" : "kd", "#" + y.k);
    if (state.list.some((x) => x.kingdom === y.k)) {
      c.href = "#k=" + y.k;
      // comparing, a kingdom of the KvK goes in or out of the comparison
      if (state.comparing) c.onclick = (e) => { e.preventDefault(); KS.toggleKingdom(y.k); };
    }
    chips.appendChild(c);
  }
  open.href = "#kvk=" + b.id;
  // the phases only: the milestones are the KvK page's
  const prog = el("div", "k-prog");
  prog.append(...KS.season.progress(b, false, 1, false));
  meta.append(line, prog, chips);
}

// the Matchup of a KvK's two teams (the season's camps of each, kvk_export SEASON_TEAMS), the kingdom's team as side 1;
// a map of two camps and no teams is camp against camp. Only kingdoms with data (another region's have none); null when
// there are no two sides to fill
function matchupLink(b, k) {
  const camps = [...new Set(b.kingdoms.map((x) => x.camp))].sort((x, y) => x - y);
  const teams = b.teams || (camps.length === 2 ? camps.map((c) => [c]) : null);
  if (!teams) return null;
  const has = (x) => !x.other && state.list.some((i) => i.kingdom === x.k);
  let sides = teams.map((t) => b.kingdoms.filter((x) => t.includes(x.camp) && has(x)).map((x) => x.k));
  if (sides[1].includes(k)) sides = [sides[1], sides[0]];
  if (!sides[0].length || !sides[1].length) return null;
  const a = el("a", "btn k-cmp");
  a.append(el("span", "k-cmp-l", tr("iCmp")), el("span", "k-cmp-s", tr("iCmpS")));
  a.title = tr("iCmpTip");
  a.href = `#p=compare&a=${sides[0].join(",")}&b=${sides[1].join(",")}`;
  return a;
}

// ---- a kingdom being paired: the game's Season screen, its steps on one line (Preview, Register, Seeding, Pairing,
// Brink of War = the map is set, Season Starts), the one now marked with what is left of it; then its group's kingdoms by seed
const DAY = 86400;
const ddmm = (t) => { const d = new Date(t * 1000); return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };
function lasted(s) {
  // as the game: whole days gone by (1 day 20 h = "1 ngày"), then the hours of the last day
  const en = state.lang === "en", d = Math.floor(s / DAY), h = Math.floor((s % DAY) / 3600);
  if (d) return `${d} ${en ? "d" : "ngày"}` + (h ? ` ${h} ${en ? "h" : "giờ"}` : "");
  return `${Math.max(1, Math.ceil(s / 3600))} ${en ? "h" : "giờ"}`;
}
function pairing(meta, k, g, gen) {
  meta.className = "k-meta k-kvk k-pair";
  meta.removeAttribute("aria-hidden");
  const t = g.times, now = Date.now() / 1000, sn = g.season > 1000 ? "SoS" + (g.season - 1000) : "S" + g.season;
  // the steps' start days; Preview's is before Register, Season Starts' is not known yet
  const at = [-Infinity, t.register, t.rank, t.pair, t.match, Infinity];
  const cur = at.findIndex((s, i) => now >= s && now < at[i + 1]);
  const line = el("div", "k-meta-l"), name = el("div", "k-meta-n"), tags = el("span", "k-meta-tags"), open = el("a", "btn k-dash", tr("pOpen"));
  tags.append(el("span", "", `${tr("kSos")} · ${sn}`), el("span", "", tr("pGroup").replace("{n}", g.n)));
  name.append(el("b", "", KS.season.title(g.season)), tags);
  open.href = "#p=compare&a=" + k;
  line.append(name, open);
  const steps = el("ol", "k-steps");
  steps.title = tr("pTip");
  tr("pStep").forEach((label, i) => {
    const li = el("li", i < cur ? "done" : i === cur ? "now" : "");
    const day = i === 0 ? "" : i === 5 ? tr("pTbd") : ddmm(at[i]);
    if (i === cur && at[i + 1] !== Infinity) li.appendChild(el("span", "k-step-left", tr("pLeft").replace("{t}", lasted(at[i + 1] - now))));
    li.append(el("i"), el("b", "", label), el("small", "", day));
    steps.appendChild(li);
  });
  // the group: how many, and how many of each seed
  const chips = el("div", "k-meta-c");
  chips.appendChild(el("span", "k-meta-lbl", tr("pKds").replace("{n}", g.rows.length)));
  for (const s of [1, 2, 3, 4]) {
    const c = el("a", "k-pair-s"); // its seed of this group in the ranking
    c.href = `#p=rank${gen != null ? "&gen=" + encodeURIComponent(gen) : ""}&seed=${s}`; // with the kingdom's gen; the ranking filters by seed letter, not group
    c.innerHTML = `<i class="seed s${s}">${"ABCD"[s - 1]}</i>${g.rows.filter((r) => r[1] === s).length}`;
    chips.appendChild(c);
  }
  meta.append(line, steps, chips);
}

const shown = KS.onKingdomShown;
KS.onKingdomShown = (k) => { shown?.(k); drawRank(k); drawSub(k); drawTop(k); };
})();
