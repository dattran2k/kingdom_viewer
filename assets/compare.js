// The compare page: pairs of sides, each side of several kingdoms, side by side; once a pair has both sides an empty one
// opens under it. A classic script loaded after views.js; what it needs from the page comes through window.KS. Each
// kingdom counts with its newest scan. Link: #p=compare&a=1,2&b=3&a2=4&b2=5 (a2/b2 the second pair, and on)
(() => {
"use strict";
const KS = window.KS, { state, tr, $, numFmt } = KS;

Object.assign(KS.T.vi, {
  navKingdom: "Kingdom", navCompare: "Ghép cặp", openSource: "Mã nguồn mở trên GitHub",
  xSideA: "Phe 1", xSideB: "Phe 2", xAdd: "+ Kingdom", xRemove: "Bỏ", xEmpty: "Thêm kingdom vào cả hai phe để xem so sánh.",
  xPlayers: "người", xSum: "Tổng", xAvg: "TB", xAggTip: "Tổng / trung bình mỗi người", xTopAll: "Mọi người", xTop: "Top", xReset: "Đặt lại",
  xdDuels: "Các mức LC max, mức điểm di cư, Decor max, Pet max, Bảo vật đỏ và Nhà Thiên Đỉnh đếm số người chơi. CT / LC là trung bình mỗi người. Các số còn lại là {agg}.",
  xAggSum: "tổng của cả phe", xAggAvg: "trung bình mỗi người", xBand: "LC max",
  xInfantry: "CT bộ binh", xCavalry: "CT kỵ binh", xArcher: "CT cung thủ", xMagic: "CT pháp sư",
  xdEach: "Số tổng của từng kingdom ở ngày mới nhất, chỉ tính người qua mức lực chiến đã chọn.",
  xMigrationSum: "Điểm di cư", xMigrationBand: "Điểm di cư", xEach: "Từng kingdom", xScan: "Ngày", xKingdom: "Kingdom",
  xCount: "Người chơi", xLoadErr: "Không tải được:",
  pkTitle: "Thêm kingdom vào", pkPairing: "Đang ghép cặp", pkAll: "Tất cả", pkGroup: "Nhóm", pkSeed: "Seed", pkDone: "Xong",
  pkNote: "Bảng Phân Loại của game, cập nhật {d} UTC, ghép cho {s}. SP-: kingdom khu vực khác, không có dữ liệu người chơi.",
  pkNoData: "Không có dữ liệu", pkOther: "Ở phe kia", pkPower: "Lực chiến tổng (game)",
});
Object.assign(KS.T.en, {
  navKingdom: "Kingdom", navCompare: "Matchup", openSource: "Open source on GitHub",
  xSideA: "Side 1", xSideB: "Side 2", xAdd: "+ Kingdom", xRemove: "Remove", xEmpty: "Add kingdoms to both sides to compare them.",
  xPlayers: "players", xSum: "Total", xAvg: "Avg", xAggTip: "Total / average per player", xTopAll: "Everyone", xTop: "Top", xReset: "Reset",
  xdDuels: "Max power bands, migration bands, Max decor, Max pets, Red artifact and Legendary themes count players. Merit % is the average per player. The other figures are the {agg}.",
  xAggSum: "total of the side", xAggAvg: "average per player", xBand: "Max power",
  xInfantry: "Infantry merits", xCavalry: "Cavalry merits", xArcher: "Archer merits", xMagic: "Magic merits",
  xdEach: "Totals of each kingdom on its newest day, only players over the chosen power step.",
  xMigrationSum: "Migration score", xMigrationBand: "Migration score", xEach: "Each kingdom", xScan: "Day", xKingdom: "Kingdom",
  xCount: "Players", xLoadErr: "Could not load:",
  pkTitle: "Add a kingdom to", pkPairing: "Being paired", pkAll: "All", pkGroup: "Group", pkSeed: "Seed", pkDone: "Done",
  pkNote: "The game's seed table, updated {d} UTC, pairing for {s}. SP-: kingdoms of another region, no player data.",
  pkNoData: "No data", pkOther: "On the other side", pkPower: "Total power (the game's)",
});

const MAX_PER_SIDE = 10, MAX_PAIRS = 5;
const TOPS = [0, 100, 200, 300, 500];
const POWER_BANDS = [[100e6, 200e6, "100–200M"], [200e6, 300e6, "200–300M"], [300e6, Infinity, "300M+"]];
const { MIGRATION_BANDS, DECOR_MAX } = KS;

const cfg = Object.assign({ pairs: [], minStep: KS.DEFAULT_POWER, top: 0, avg: false }, KS.store.get("cmp", {}));
const MAX_FILES = 4 * MAX_PER_SIDE + 20; // a couple of full pairs, and some to go back to: a long visit must not keep every kingdom opened
const cache = new Map();   // "<scan>/<kingdom>" -> file (a promise while it loads)
if (cfg.a || cfg.b) { cfg.pairs = [{ a: cfg.a || [], b: cfg.b || [] }]; delete cfg.a; delete cfg.b; } // saved before the pairs
tidy();
let kdRows = null; // rollup.json by kingdom: the kingdoms' own merits by unit type, for the unit focus
let token = 0;             // a newer draw makes an older, still loading one give up

function iconOf(key, cls) { const i = el("img", cls); i.src = `assets/icons/${key}.png?v=3`; i.alt = ""; return i; }
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const num = (v) => (state.compact ? KS.compact(v) : numFmt().format(Math.round(v)));
const itemOf = (id) => state.list.find((k) => k.kingdom === id);

function load(id) {
  const scan = itemOf(id).scan, key = scan + "/" + id;
  // file.value: undefined while it loads (the page is drawn at once without it), null when it failed
  let file = cache.get(key);
  if (!file) {
    file = KS.getJSON(`data/scans/${scan}/${id}.json`).catch((e) => { cache.delete(key); console.error(e); return null; });
    file.then((f) => { file.value = f; });
  }
  cache.delete(key); // to the end of the Map: the first one is the longest unused
  cache.set(key, file);
  while (cache.size > MAX_FILES) cache.delete(cache.keys().next().value);
  return file;
}

// the players of a side: every kingdom's over the power step, then the side's strongest N
function sidePlayers(files) {
  let ps = [];
  for (const f of files) if (f) for (const p of f.players) if (KS.filterPower(p) > cfg.minStep) ps.push(p);
  if (cfg.top) ps = ps.sort((x, y) => (y.power ?? 0) - (x.power ?? 0)).slice(0, cfg.top);
  return ps;
}

// one column over a side. A % never adds up: it is the average, whatever the total / average switch says
function measure(c, ps) {
  let s = 0, n = 0;
  for (const p of ps) { const v = KS.value(c, p); if (typeof v === "number" && !Number.isNaN(v)) { s += v; n++; } }
  if (!n) return undefined;
  return cfg.avg || c.type === "pct" ? s / n : s;
}
const show = (c, v) => (v == null ? "–" : c.type === "pct" ? numFmt(2).format(v) + "%" : cfg.avg && c.type === "int" ? numFmt(1).format(v) : c.type === "int" ? numFmt().format(v) : num(v));

// a titled block
function group(icon, title, desc, ...kids) {
  const g = el("section", "x-grp"), top = el("div", "x-grp-top"), text = el("div", "x-gt");
  text.append(el("h3", "", title), el("p", "x-gd", desc.replace("{agg}", tr(cfg.avg ? "xAggAvg" : "xAggSum"))));
  top.append(iconOf(icon, "x-gi"), text);
  g.appendChild(top);
  g.append(...kids);
  return g;
}

// ---- the pairs of sides ----
// a pair left with no kingdom on either side goes, but the first stays
function tidy() {
  cfg.pairs = cfg.pairs.filter((p, i) => i === 0 || p.a.length || p.b.length);
  if (!cfg.pairs.length) cfg.pairs = [{ a: [], b: [] }];
}
const ready = (p) => p.a.length && p.b.length;
function save() {
  tidy();
  KS.store.set("cmp", cfg);
  if (state.page === "compare") history.replaceState(null, "", linkHash());
}
const linkHash = () => "#p=compare" + cfg.pairs.map((p, i) => `&a${i ? i + 1 : ""}=${p.a.join(",")}&b${i ? i + 1 : ""}=${p.b.join(",")}`).join("");

// ---- the kingdom picker: a dialog, the kingdoms being paired (by group and seed, data/kvk/seeds.json) or all of them;
// a click puts a kingdom in the side or takes it out, and the dialog stays open to pick more ----
let seeds = null;          // seeds.json once loaded: {cols, groups: [{season, updated, rows}]}
const seedOf = new Map();  // kingdom -> [seed 1-4, its group]
const pk = { n: 0, side: "a", tab: "pair", group: 0, on: new Set([1, 2, 3, 4]) }; // tab, group and seeds stay between opens
const LETTER = ["", "A", "B", "C", "D"];
const OTHER = 100000000;   // another region's kingdom: 1000000xx, shown as the game does, SP-xx
const kName = (k) => (k >= OTHER ? "SP-" + (k - OTHER) : "#" + k);
const seasonName = (s) => (s > 1000 ? "SoS" + (s - 1000) : "S" + s);
const two = (v) => String(v).padStart(2, "0");
function loadSeeds() {
  return KS.ui.load("kvk/seeds.json").then((d) => {
    if (d && !seeds) {
      seeds = d;
      const c = d.cols.indexOf("seed");
      d.groups.forEach((g, i) => g.rows.forEach((r) => seedOf.set(r[0], [r[c], i])));
    }
    return seeds;
  });
}
const seedBadge = (k) => { const s = seedOf.get(k)?.[0]; return s ? `<i class="seed s${s}">${LETTER[s]}</i>` : ""; };

let dlg = null;
function pickDialog() {
  if (dlg) return dlg;
  dlg = el("dialog", "dlg xp");
  dlg.innerHTML = `<form method="dialog" class="dlg-in">
    <div class="dlg-top"><h2><span class="xp-t"></span> <b class="pill xp-n"></b></h2><button class="btn icon" value="close" aria-label="Close">✕</button></div>
    <div class="xp-tabs rk-seg" role="group"></div>
    <div class="xp-f"></div>
    <input class="xp-q" type="search" autocomplete="off" inputmode="numeric">
    <p class="xp-note"></p>
    <ul class="klist xp-list" role="listbox" aria-multiselectable="true"></ul>
    <div class="xp-foot"><button class="btn primary xp-done" value="close"></button></div>
  </form>`;
  document.body.appendChild(dlg);
  const q = dlg.querySelector(".xp-q"), ul = dlg.querySelector(".xp-list");
  q.addEventListener("input", () => fillPick());
  q.addEventListener("keydown", (e) => { if (KS.listKeys(e, ul, togglePick)) e.preventDefault(); });
  ul.onclick = (e) => { const li = e.target.closest("li[data-k]"); if (li) togglePick(Number(li.dataset.k)); };
  return dlg;
}
const pairOf = () => cfg.pairs[pk.n] ?? { a: [], b: [] };
function togglePick(k) {
  const pair = pairOf(), mine = pair[pk.side], other = pair[pk.side === "a" ? "b" : "a"];
  if (!itemOf(k) || other.includes(k)) return;
  if (mine.includes(k)) pair[pk.side] = mine.filter((x) => x !== k);
  else if (mine.length < MAX_PER_SIDE) pair[pk.side] = [...mine, k];
  else return;
  cfg.pairs[pk.n] = pair; // the empty pair under the others is kept from its first kingdom on
  save(); draw();
  fillPick(true);
}
function openPick(n, side) {
  Object.assign(pk, { n, side });
  const d = pickDialog();
  d.querySelector(".xp-q").value = "";
  loadSeeds().then(() => {
    if (!seeds) pk.tab = "all";
    else {
      // the group of a kingdom already in this pair, else the one looked at last
      const pair = pairOf(), had = [...pair.a, ...pair.b].map((k) => seedOf.get(k)?.[1]).find((g) => g != null);
      pk.group = had ?? Math.min(pk.group, seeds.groups.length - 1);
    }
    fillPick();
    if (!d.open) d.showModal();
    d.querySelector(".xp-list").scrollTop = 0;
    if (!matchMedia("(pointer: coarse)").matches) d.querySelector(".xp-q").focus(); // no keyboard over the list on a phone
  });
}
// the dialog's head, filters and list, drawn again on each change (keepY: a pick keeps the list where it was)
function fillPick(keepY) {
  const d = dlg, pair = pairOf(), mine = pair[pk.side], other = pair[pk.side === "a" ? "b" : "a"], nf = numFmt();
  const title = d.querySelector(".xp-t");
  title.textContent = `${tr("pkTitle")} ${tr(pk.side === "a" ? "xSideA" : "xSideB")}`;
  title.className = "xp-t " + pk.side;
  d.querySelector(".xp-n").textContent = `${mine.length}/${MAX_PER_SIDE}`;
  d.querySelector(".xp-done").textContent = tr("pkDone");
  d.querySelector(".xp-q").placeholder = tr("kSearchPh");
  const seg = (box, opts, cur, on) => {
    box.innerHTML = "";
    for (const [v, label] of opts) {
      const b = el("button", "", label);
      b.type = "button"; b.setAttribute("aria-pressed", String(v === cur));
      b.onclick = () => { on(v); fillPick(); };
      box.appendChild(b);
    }
  };
  const tabs = d.querySelector(".xp-tabs"), f = d.querySelector(".xp-f"), note = d.querySelector(".xp-note");
  tabs.hidden = !seeds;
  if (seeds) seg(tabs, [["pair", tr("pkPairing")], ["all", tr("pkAll")]], pk.tab, (v) => (pk.tab = v));
  const pairing = !!seeds && pk.tab === "pair", g = pairing ? seeds.groups[pk.group] : null;
  f.hidden = note.hidden = !pairing;
  if (pairing) {
    f.innerHTML = "";
    if (seeds.groups.length > 1) {
      const gs = el("div", "rk-seg xp-g");
      gs.setAttribute("role", "group");
      seg(gs, seeds.groups.map((x, i) => [i, `${tr("pkGroup")} ${i + 1} · ${x.rows.length}`]), pk.group, (v) => (pk.group = v));
      f.appendChild(gs);
    }
    // the seeds as toggles: all on at first; the last one on, clicked, turns them all back on
    const chips = el("div", "xp-seeds");
    chips.setAttribute("role", "group");
    chips.appendChild(el("span", "xp-sl", tr("pkSeed")));
    for (const s of [1, 2, 3, 4]) {
      const n = g.rows.filter((r) => r[1] === s).length, b = el("button", "xp-s");
      b.type = "button"; b.setAttribute("aria-pressed", String(pk.on.has(s)));
      b.innerHTML = `<i class="seed s${s}">${LETTER[s]}</i><span>${n}</span>`;
      b.onclick = () => {
        if (pk.on.size === 4) pk.on = new Set([s]); // from all: just this one
        else if (!pk.on.has(s)) pk.on.add(s);
        else if (pk.on.size === 1) pk.on = new Set([1, 2, 3, 4]);
        else pk.on.delete(s);
        fillPick();
      };
      chips.appendChild(b);
    }
    f.appendChild(chips);
    const at = new Date(g.updated || seeds.updated);
    note.textContent = tr("pkNote").replace("{d}", `${two(at.getUTCDate())}/${two(at.getUTCMonth() + 1)} ${two(at.getUTCHours())}:${two(at.getUTCMinutes())}`).replace("{s}", seasonName(g.season));
  }
  const q = d.querySelector(".xp-q").value.replace(/[#\s]/g, "").replace(/^sp-?/i, "");
  const ul = d.querySelector(".xp-list"), y = ul.scrollTop;
  // [kingdom, total power or null]: the group's in the game's order (seed, then power), or every kingdom of the index
  let items;
  if (pairing) {
    const pc = seeds.cols.indexOf("power"), num = (k) => String(k % OTHER);
    items = g.rows.filter((r) => pk.on.has(r[1])).map((r) => [r[0], r[pc]]);
    if (q) items = items.filter(([k]) => num(k).includes(q)).sort(([x], [z]) => num(z).startsWith(q) - num(x).startsWith(q));
  } else items = (q ? KS.kingdomMatches(q) : state.list).map((k) => [k.kingdom, null]);
  if (!items.length) { ul.innerHTML = `<li class="none">${tr("kNone")}</li>`; return; }
  const full = mine.length >= MAX_PER_SIDE, players = tr("players");
  // a few hundred lines, built again on every pick: one string
  ul.innerHTML = items.map(([k, power]) => {
    const it = itemOf(k), on = mine.includes(k), there = other.includes(k);
    const cls = on ? "cur" : !it || there || full ? "off" : "";
    const sub = !it ? tr("pkNoData") : there ? tr("pkOther") : `${nf.format(it.players)} ${players}`;
    const pw = power != null ? `<em title="${tr("pkPower")}">${KS.compact(power)}</em>` : "";
    return `<li role="option" aria-selected="${on}" data-k="${k}"${cls ? ` class="${cls}"` : ""}><b>${kName(k)}${seedBadge(k)}</b>${pw}<span>${sub}</span><s aria-hidden="true"></s></li>`;
  }).join("");
  (ul.querySelector("li[data-k]:not(.off)") || ul.querySelector("li[data-k]")).classList.add("act");
  if (keepY) ul.scrollTop = y;
}

function picker(n, side) {
  const wrap = el("div", "x-add"), pair = cfg.pairs[n] ?? { a: [], b: [] };
  const add = el("button", "x-add-btn", tr("xAdd"));
  add.type = "button";
  add.disabled = pair[side].length >= MAX_PER_SIDE;
  add.onclick = () => openPick(n, side);
  wrap.appendChild(add);
  return wrap;
}

function sidePanel(n, side, titleKey, ps) {
  const box = el("div", "x-side " + side), pair = cfg.pairs[n] ?? { a: [], b: [] }, ids = pair[side];
  const head = el("div", "x-side-head");
  head.appendChild(el("h3", "", tr(titleKey)));
  if (ids.length) head.appendChild(el("span", "x-side-n", `${numFmt().format(ps.length)} ${tr("xPlayers")}`));
  const tags = el("div", "x-tags");
  for (const id of ids) {
    const tag = el("button", "x-tag");
    tag.innerHTML = "#" + id + seedBadge(id);
    tag.type = "button";
    tag.title = `${tr("xRemove")} #${id}`;
    tag.onclick = () => { pair[side] = pair[side].filter((k) => k !== id); save(); draw(); };
    tags.appendChild(tag);
  }
  tags.appendChild(picker(n, side));
  box.append(head, tags);
  return box;
}

// ---- controls: the same one-button switches as the kingdom page ----
function controls() {
  const bar = el("div", "x-ctl");
  const sel = (opts, val, on) => {
    const s = el("select");
    for (const [v, t] of opts) { const o = el("option", "", t); o.value = v; s.appendChild(o); }
    s.value = String(val);
    s.onchange = () => { on(Number(s.value)); save(); draw(); };
    return s;
  };
  const fmt = KS.ui.fmtBtn(() => { if (state.data) KS.refresh(); draw(); });
  // total or average per player: a two-way choice, the chosen one pressed
  const avg = el("div", "rk-seg");
  avg.setAttribute("role", "group"); avg.title = tr("xAggTip");
  for (const [a, label] of [[false, tr("xSum")], [true, tr("xAvg")]]) {
    const x = el("button", "", label);
    x.type = "button"; x.setAttribute("aria-pressed", String(!!cfg.avg === a));
    x.onclick = () => { if (!!cfg.avg === a) return; cfg.avg = a; save(); draw(); };
    avg.appendChild(x);
  }
  const reset = el("button", "btn x-reset", tr("xReset"));
  reset.type = "button";
  reset.onclick = () => { cfg.pairs = []; save(); draw(); };
  bar.append(
    sel(KS.POWER_STEPS.map((v) => [v, `${tr("minPower")} > ${v / 1e6}M`]), cfg.minStep, (v) => (cfg.minStep = v)),
    sel(TOPS.map((v) => [v, v ? `${tr("xTop")} ${v}` : tr("xTopAll")]), cfg.top, (v) => (cfg.top = v)),
    fmt, avg, reset,
  );
  return bar;
}

// ---- results ----
function eachKingdom(fa, fb) {
  const wrap = el("div", "tbl-wrap"), t = el("table", "tbl x-tbl"), hr = el("tr");
  ["xKingdom", "xCount", "power", "powerMax", "merits", "kills", "xScan"]
    .forEach((k) => hr.appendChild(el("th", "", KS.BY_KEY[k] ? KS.label(KS.BY_KEY[k]) : tr(k))));
  t.appendChild(el("thead")).appendChild(hr);
  const tb = t.appendChild(el("tbody"));
  for (const [side, files] of [["a", fa], ["b", fb]]) {
    const rows = files.filter(Boolean).map((f) => ({ f, ps: f.players.filter((p) => KS.filterPower(p) > cfg.minStep) }));
    rows.sort((x, y) => (measure(KS.BY_KEY.power, y.ps) ?? 0) - (measure(KS.BY_KEY.power, x.ps) ?? 0));
    for (const { f, ps } of rows) {
      const r = el("tr");
      r.appendChild(el("td", "x-k " + side, "#" + f.kingdom));
      r.appendChild(el("td", "", numFmt().format(ps.length)));
      for (const k of ["power", "powerMax", "merits", "kills"]) r.appendChild(el("td", "", show(KS.BY_KEY[k], measure(KS.BY_KEY[k], ps))));
      r.appendChild(el("td", "mut", f.scan));
      r.onclick = () => { location.hash = "k=" + f.kingdom; };
      tb.appendChild(r);
    }
  }
  wrap.appendChild(t);
  return wrap;
}

// the two sides as six cards, two abreast: each a small table, a line per side and a column per figure (its value and
// a bar under it, on the larger side's scale); the columns that do not fit the card's width go on in another block
const SIDE_W = 56, COL_W = { compact: 128, full: 176 };
// a side's unit focus, from its kingdoms' own figures (rollup.json), not from their players added up here: a side of
// several kingdoms is those kingdoms' figures together. Drawn as the Kingdom table's column, in the Players card
function focusOf(ks) {
  const r = {};
  let any = false;
  for (const k of ks) {
    const x = kdRows?.get(k);
    if (!x) continue;
    any = true;
    for (const u of ["meritInfantry", "meritCavalry", "meritArcher", "meritMagic"]) r[u] = (r[u] || 0) + (x[u] || 0);
  }
  const c = el("div", "x-c x-focus");
  c.appendChild(any ? KS.ui.focusCell(r) : el("span", "mut", "–"));
  return c;
}

function duels(pa, pb, pair) {
  const box = el("div", "x-duels"), int = (v) => numFmt().format(v);
  const short = (c) => (v) => (c.type === "num" && state.compact ? KS.compact(v) : show(c, v)); // follows the 1.2M switch
  const col = (k, name, icon) => { const c = KS.BY_KEY[k]; return [name || KS.label(c), (ps) => measure(c, ps), short(c), icon]; };
  const main = (k, name) => col(k, name).slice(0, 3); // a card's own figure: name, value, text
  const spelled = (k) => col(k, KS.label(KS.BY_KEY[k].tip)); // the short column name says too little here
  const counted = (key, lo, hi, name) => [name, (ps) => ps.filter((p) => (p[key] ?? 0) >= lo && (p[key] ?? 0) < hi).length, int];
  const owners = (k) => counted(k, 1, Infinity, KS.label(KS.BY_KEY[k]));
  const peak = [[cfg.minStep, POWER_BANDS[0][0], `${cfg.minStep / 1e6}–100M`], ...POWER_BANDS];
  const items = [
    ["players", tr("xCount"), (ps) => ps.length, int, []],
    ["migrationScore", ...main("migrationScore", tr("xMigrationSum")), MIGRATION_BANDS.map(([lo, hi, t]) => counted("migrationScore", lo, hi, `${tr("xMigrationBand")} ${t}`))],
    ["power", ...main("power"), [col("powerMax"), ...peak.map(([lo, hi, t]) => counted("powerMax", lo, hi, `${tr("xBand")} ${t}`))]],
    ["maxDecor", KS.label(KS.BY_KEY.maxDecor), (ps) => ps.filter((p) => (p.maxDecor ?? 0) >= DECOR_MAX).length, int,
      [owners("pets8Skills3Star"), owners("redArtifact"), owners("cityTheme"), ...["awakenedHeroes", "artifactSkillsLv5", "gemsSpent", "exchangeCoinsSpent"].map(spelled)]],
    ["merits", ...main("merits"), [col("meritsMax"), col("meritRatio"), col("meritInfantry", tr("xInfantry")), col("meritCavalry", tr("xCavalry")), col("meritArcher", tr("xArcher")), col("meritMagic", tr("xMagic"))]],
    ["kills", ...main("kills"), [col("deaths", null, "deaths"), col("heals", null, "heals")]],
  ];
  const value = (side, v, other, text) => {
    const lead = v != null && other != null && v > other, b = el("b", side + (lead ? " lead" : ""), v == null ? "–" : text(v));
    if (lead) b.appendChild(el("small", "", "+" + text(v - other))); // how far ahead, small, after the value
    return b;
  };
  const cell = (side, v, other, text) => {
    const c = el("div", "x-c"), high = Math.max(v || 0, other || 0);
    c.appendChild(value(side, v, other, text));
    c.appendChild(el("span", "x-d-bar " + side)).appendChild(el("i")).style.width = (high > 0 ? (100 * Math.max(0, v || 0)) / high : 0).toFixed(2) + "%";
    return c;
  };
  // the figures in blocks of n columns: a head of names, then side 1's line and side 2's
  const blocks = (body, figs, n) => {
    body.innerHTML = "";
    for (let at = 0; at < figs.length; at += n) {
      const part = figs.slice(at, at + n), g = body.appendChild(el("div", "x-blk"));
      g.style.gridTemplateColumns = `${SIDE_W}px repeat(${part.length}, minmax(0, 1fr))`; // each block fills the width
      g.appendChild(el("span"));
      for (const [name, , , , icon] of part) {
        const h = g.appendChild(el("span", "x-h"));
        if (icon) h.appendChild(iconOf(icon, "x-d-si"));
        h.appendChild(el("span", "", name)).title = name;
      }
      for (const [side, label] of [["a", "xSideA"], ["b", "xSideB"]]) {
        g.appendChild(el("span", "x-sd " + side, tr(label)));
        for (const [, va, vb, text, , own] of part) g.appendChild(own ? own(side) : side === "a" ? cell("a", va, vb, text) : cell("b", vb, va, text));
      }
    }
  };
  const colW = COL_W[state.compact ? "compact" : "full"];
  const cols = [0, 1].map(() => box.appendChild(el("div", "x-col")));
  items.forEach(([key, label, get, text, subs], i) => {
    const d = el("div", "x-duel"), top = el("div", "x-d-top"), body = el("div", "x-d-body");
    d.dataset.k = key;
    top.append(iconOf(key, "x-d-i"), el("span", "x-d-l", label));
    const figs = [[label, get(pa), get(pb), text], ...(subs || []).map(([name, of, fmt, icon]) => [name, of(pa), of(pb), fmt, icon])];
    if (key === "players") figs.push([KS.label(KS.BY_KEY.unitFocus), null, null, null, null, (side) => focusOf(pair[side])]); // beside the count, half each
    let n = 0;
    // as many columns as fit, then shared out evenly between the blocks: 7 in 4 is 4 + 3, not 4 + 4 empty slots.
    // Run at once when the card is put in the page (a page drawn again keeps its height, so its scroll stays), and on resize
    body.fit = () => {
      const most = Math.max(1, Math.floor((body.clientWidth - SIDE_W) / colW)), fit = Math.ceil(figs.length / Math.ceil(figs.length / most));
      if (body.clientWidth && fit !== n) blocks(body, figs, (n = fit));
    };
    new ResizeObserver(body.fit).observe(body);
    d.append(top, body);
    d.style.order = i; // one column on a phone: the cards read in order
    cols[i % 2].appendChild(d);
  });
  return box;
}

async function draw() {
  const me = ++token;
  // kingdoms that left the index (a link from another time)
  for (const p of cfg.pairs) { p.a = p.a.filter(itemOf); p.b = p.b.filter(itemOf); }
  tidy();
  // a kingdom just picked shows at once; its figures follow when its file comes (Pages can take most of a second)
  const loads = cfg.pairs.map((p) => [p.a.map(load), p.b.map(load)]);
  const waiting = loads.flat(2).some((f) => f.value === undefined);
  if (waiting) paint(loads.map((sides) => sides.map((fs) => fs.map((f) => f.value))));
  const [files, roll] = await Promise.all([Promise.all(loads.map((sides) => Promise.all(sides.map((fs) => Promise.all(fs))))), KS.ui.load("derived/rollup.json"), loadSeeds()]);
  kdRows ||= new Map(roll ? KS.ui.objects(roll.kingdomCols, roll.kingdoms).map((x) => [x.kingdom, x]) : []);
  if (me !== token) return;
  paint(files);
}

// files: [pair][side][kingdom], undefined = still loading, null = failed
function paint(files) {
  const box = $("cmp"), keepY = box.scrollTop;
  const before = [...box.querySelectorAll(":scope > .x-pair")]; // a pair still waiting keeps these figures: no blink, no jump
  box.innerHTML = "";
  box.appendChild(controls());
  const pairHead = (n, pa, pb) => {
    const head = el("div", "x-head");
    head.append(sidePanel(n, "a", "xSideA", pa), el("div", "x-vs", "VS"), sidePanel(n, "b", "xSideB", pb));
    return head;
  };
  let noted = false;
  cfg.pairs.forEach((p, n) => {
    const [fa, fb] = files[n], pa = sidePlayers(fa), pb = sidePlayers(fb), sec = box.appendChild(el("section", "x-pair"));
    sec.appendChild(pairHead(n, pa, pb));
    const bad = [...p.a.filter((_, i) => fa[i] === null), ...p.b.filter((_, i) => fb[i] === null)];
    if (bad.length) sec.appendChild(el("p", "hint x-err", `${tr("xLoadErr")} ${bad.map((k) => "#" + k).join(", ")}`));
    // one box for the two hints, as high as the longer one, so going from one to the other moves nothing
    const hint = (key) => {
      const h = sec.appendChild(el("p", "hint mut x-hint"));
      for (const k of ["xEmpty", "loading"]) h.appendChild(el("span", k === key ? "" : "off", tr(k)));
    };
    if (!ready(p)) { hint("xEmpty"); return; }
    if ([...fa, ...fb].includes(undefined)) {
      const kept = before[n] ? [...before[n].querySelectorAll(":scope > .x-note, :scope > .x-duels, :scope > .x-grp")] : [];
      if (kept.length) { sec.append(...kept); noted ||= kept[0].classList.contains("x-note"); }
      else hint("loading");
      return;
    }
    if (!noted) sec.appendChild(el("p", "x-gd x-note", tr("xdDuels").replace("{agg}", tr(cfg.avg ? "xAggAvg" : "xAggSum"))));
    noted = true;
    sec.append(duels(pa, pb, p), group("players", tr("xEach"), tr("xdEach"), eachKingdom(fa, fb)));
    sec.querySelectorAll(".x-d-body").forEach((b) => b.fit());
  });
  // the last pair has both sides: an empty one under it for the next, kept once a kingdom is picked in it
  const n = cfg.pairs.length;
  if (n < MAX_PAIRS && ready(cfg.pairs[n - 1])) box.appendChild(el("section", "x-pair")).appendChild(pairHead(n, [], []));
  box.scrollTop = keepY;
}

function fromHash() {
  const hp = new URLSearchParams(location.hash.slice(1));
  if (hp.get("p") !== "compare" || (!hp.has("a") && !hp.has("b"))) return;
  const ids = (s) => [...new Set((s || "").split(",").map(Number).filter(Boolean))].slice(0, MAX_PER_SIDE);
  cfg.pairs = [];
  for (let n = 1; n <= MAX_PAIRS; n++) {
    const tail = n === 1 ? "" : String(n), a = ids(hp.get("a" + tail));
    if (n > 1 && !hp.has("a" + tail) && !hp.has("b" + tail)) break;
    cfg.pairs.push({ a, b: ids(hp.get("b" + tail)).filter((k) => !a.includes(k)) });
  }
  tidy();
  KS.store.set("cmp", cfg);
}

KS.compare = {
  draw,
  show() { fromHash(); history.replaceState(null, "", linkHash()); draw(); },
};
})();
