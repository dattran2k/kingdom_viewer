// The compare page: two sides, each of several kingdoms, side by side. A classic script loaded after views.js; what it
// needs from the page comes through window.KS. Each kingdom counts with its newest scan. Link: #p=compare&a=1,2&b=3
(() => {
"use strict";
const KS = window.KS, { state, tr, $, numFmt } = KS;

Object.assign(KS.T.vi, {
  navKingdom: "Kingdom", navCompare: "So sánh", openSource: "Mã nguồn mở trên GitHub",
  xSideA: "Phe 1", xSideB: "Phe 2", xAdd: "+ Kingdom", xRemove: "Bỏ", xEmpty: "Thêm kingdom vào cả hai phe để xem so sánh.",
  xPlayers: "người", xSum: "Tổng", xAvg: "TB", xAggTip: "Tổng / trung bình mỗi người", xTopAll: "Mọi người", xTop: "Top", xReset: "Đặt lại",
  xgScale: "Quy mô", xgBattle: "Giao tranh", xgTop: "Tài khoản mạnh (theo LC đỉnh)", xgMigration: "Di cư & decor", xgUnits: "Công trạng theo binh chủng",
  xMigrationSum: "Điểm di cư", xMigrationBand: "Di cư", xEach: "Từng kingdom", xScan: "Ngày", xKingdom: "Kingdom",
  xCount: "Người chơi", xAlliances: "Liên minh", xLoadErr: "Không tải được:",
});
Object.assign(KS.T.en, {
  navKingdom: "Kingdom", navCompare: "Compare", openSource: "Open source on GitHub",
  xSideA: "Side 1", xSideB: "Side 2", xAdd: "+ Kingdom", xRemove: "Remove", xEmpty: "Add kingdoms to both sides to compare them.",
  xPlayers: "players", xSum: "Total", xAvg: "Avg", xAggTip: "Total / average per player", xTopAll: "Everyone", xTop: "Top", xReset: "Reset",
  xgScale: "Scale", xgBattle: "Battles", xgTop: "Top accounts (by peak power)", xgMigration: "Migration & decor", xgUnits: "Merits by unit",
  xMigrationSum: "Migration score", xMigrationBand: "Migration", xEach: "Each kingdom", xScan: "Day", xKingdom: "Kingdom",
  xCount: "Players", xAlliances: "Alliances", xLoadErr: "Could not load:",
});

const MAX_PER_SIDE = 10;
const TOPS = [0, 100, 200, 300, 500];
const POWER_BANDS = [[100e6, 200e6, "100–200M"], [200e6, 300e6, "200–300M"], [300e6, Infinity, "300M+"]];
const MIGRATION_BANDS = [[24, 28, "24–27"], [28, 31, "28–30"], [31, Infinity, "31+"]];
const DECOR_MAX = 5; // the last tier of the achievement: an account with this many counts as max decor

const cfg = Object.assign({ a: [], b: [], minStep: KS.DEFAULT_POWER, top: 0, avg: false }, KS.store.get("cmp", {}));
const cache = new Map();   // "<scan>/<kingdom>" -> file (a promise while it loads)
let token = 0;             // a newer draw makes an older, still loading one give up
let openSide = null;       // the side whose picker is open

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const num = (v) => (state.compact ? KS.compact(v) : numFmt().format(Math.round(v)));
const itemOf = (id) => state.list.find((k) => k.kingdom === id);

function load(id) {
  const scan = itemOf(id).scan, key = scan + "/" + id;
  if (!cache.has(key)) {
    cache.set(key, KS.getJSON(`data/scans/${scan}/${id}.json`).catch((e) => { cache.delete(key); console.error(e); return null; }));
  }
  return cache.get(key);
}

// the players of a side: every kingdom's over the power step, then the side's strongest N
function sidePlayers(files) {
  let ps = [];
  for (const f of files) if (f) for (const p of f.players) if ((p.power ?? 0) > cfg.minStep) ps.push(p);
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

// a line: the name in the middle, a bar growing outwards from it on each side: the larger value is the full bar, the
// other its share of that. The value sits at the middle end, with how far ahead for the larger one
function line(name, tip, va, vb, text) {
  const r = el("div", "x-row");
  const lead = va != null && vb != null && va !== vb ? (va > vb ? "a" : "b") : "";
  const high = Math.max(va || 0, vb || 0), low = Math.min(va || 0, vb || 0);
  const bar = (side, v) => {
    const t = el("div", "x-track " + side + (lead === side ? " lead" : "")), f = el("i"), val = el("span", "x-v");
    f.style.width = (high > 0 ? (100 * Math.max(v || 0, 0)) / high : 0).toFixed(2) + "%";
    const b = el("b", "", text(v));
    if (typeof v === "number") b.title = numFmt().format(Math.round(v));
    val.appendChild(b);
    if (lead === side && low > 0) val.appendChild(el("small", "", `+${numFmt(1).format((100 * (high - low)) / high)}%`));
    t.append(f, val);
    return t;
  };
  // a triangle beside the name points at the larger side; both keep their room, so the name stays centred
  const lab = el("span", "x-name" + (lead ? " lead-" + lead : "")), arrow = (side) => el("i", "x-arrow " + side + (lead === side ? " on" : ""));
  lab.append(arrow("a"), el("span", "", name), arrow("b"));
  if (tip) lab.title = tip;
  r.append(bar("a", va), lab, bar("b", vb));
  return r;
}

function colLine(key, pa, pb, name) {
  const c = KS.BY_KEY[key];
  return line(name || KS.label(c), KS.label(c.tip || c), measure(c, pa), measure(c, pb), (v) => show(c, v));
}

// a titled block of lines
function group(title, ...kids) {
  const g = el("section", "x-grp"), top = el("div", "x-grp-top");
  top.appendChild(el("h3", "", title));
  g.appendChild(top);
  g.append(...kids);
  return g;
}

// ---- the two sides ----
function save() {
  KS.store.set("cmp", cfg);
  if (state.page === "compare") history.replaceState(null, "", linkHash());
}
const linkHash = () => `#p=compare&a=${cfg.a.join(",")}&b=${cfg.b.join(",")}`;

function pickerList(ul, q) {
  const used = new Set([...cfg.a, ...cfg.b]);
  ul.innerHTML = "";
  const items = (q ? KS.kingdomMatches(q) : state.list).filter((k) => !used.has(k.kingdom));
  if (!items.length) { ul.appendChild(el("li", "none", tr("kNone"))); return; }
  for (const k of items) {
    const li = el("li");
    li.setAttribute("role", "option");
    li.dataset.k = k.kingdom;
    li.append(el("b", "", "#" + k.kingdom), el("span", "", `${numFmt().format(k.players)} ${tr("players")}`));
    ul.appendChild(li);
  }
  ul.querySelector("li[data-k]").classList.add("act");
}

function picker(side) {
  const wrap = el("div", "x-add");
  const add = el("button", "x-add-btn", tr("xAdd"));
  add.type = "button";
  add.disabled = cfg[side].length >= MAX_PER_SIDE;
  add.onclick = () => { openSide = openSide === side ? null : side; draw(); };
  wrap.appendChild(add);
  if (openSide !== side) return wrap;
  const pop = el("div", "pop x-pop"), q = el("input"), ul = el("ul", "klist");
  q.type = "search"; q.autocomplete = "off"; q.inputMode = "numeric"; q.placeholder = tr("kSearchPh");
  ul.setAttribute("role", "listbox");
  pickerList(ul, "");
  const pick = (k) => { cfg[side] = [...cfg[side], k]; if (cfg[side].length >= MAX_PER_SIDE) openSide = null; save(); draw(); };
  q.addEventListener("input", () => pickerList(ul, q.value));
  q.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { openSide = null; draw(); }
    else if (KS.listKeys(e, ul, pick)) e.preventDefault();
  });
  ul.onclick = (e) => { const li = e.target.closest("li[data-k]"); if (li) pick(Number(li.dataset.k)); };
  pop.append(q, ul);
  wrap.appendChild(pop);
  setTimeout(() => q.focus()); // once it is in the page
  return wrap;
}

function sidePanel(side, titleKey, ps) {
  const box = el("div", "x-side " + side), ids = cfg[side];
  const head = el("div", "x-side-head");
  head.appendChild(el("h3", "", tr(titleKey)));
  if (ids.length) head.appendChild(el("span", "x-side-n", `${numFmt().format(ps.length)} ${tr("xPlayers")}`));
  const tags = el("div", "x-tags");
  for (const id of ids) {
    const tag = el("button", "x-tag", "#" + id);
    tag.type = "button";
    tag.title = `${tr("xRemove")} #${id}`;
    tag.onclick = () => { cfg[side] = cfg[side].filter((k) => k !== id); save(); draw(); };
    tags.appendChild(tag);
  }
  tags.appendChild(picker(side));
  box.append(head, tags);
  if (ids.length) {
    const figs = el("div", "x-figs");
    for (const k of ["power", "merits"]) {
      const c = KS.BY_KEY[k], f = el("div");
      f.append(el("span", "", KS.label(c)), el("b", "", show(c, measure(c, ps))));
      figs.appendChild(f);
    }
    box.appendChild(figs);
  }
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
  const fmt = el("button", "btn", "1.2M");
  fmt.type = "button";
  fmt.title = tr("fmtTip");
  fmt.setAttribute("aria-pressed", String(state.compact));
  fmt.onclick = () => {
    state.compact = !state.compact;
    KS.store.set("compact", state.compact);
    $("fmtBtn").setAttribute("aria-pressed", String(state.compact));
    if (state.data) KS.refresh();
    draw();
  };
  const avg = el("button", "btn", tr(cfg.avg ? "xAvg" : "xSum"));
  avg.type = "button";
  avg.title = tr("xAggTip");
  avg.onclick = () => { cfg.avg = !cfg.avg; save(); draw(); };
  const reset = el("button", "btn x-reset", tr("xReset"));
  reset.type = "button";
  reset.onclick = () => { cfg.a = []; cfg.b = []; openSide = null; save(); draw(); };
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
  ["xKingdom", "xCount", "xAlliances", "power", "powerMax", "merits", "kills", "xScan"]
    .forEach((k) => hr.appendChild(el("th", "", KS.BY_KEY[k] ? KS.label(KS.BY_KEY[k]) : tr(k))));
  t.appendChild(el("thead")).appendChild(hr);
  const tb = t.appendChild(el("tbody"));
  for (const [side, files] of [["a", fa], ["b", fb]]) {
    const rows = files.filter(Boolean).map((f) => ({ f, ps: f.players.filter((p) => (p.power ?? 0) > cfg.minStep) }));
    rows.sort((x, y) => (measure(KS.BY_KEY.power, y.ps) ?? 0) - (measure(KS.BY_KEY.power, x.ps) ?? 0));
    for (const { f, ps } of rows) {
      const r = el("tr");
      r.appendChild(el("td", "x-k " + side, "#" + f.kingdom));
      r.appendChild(el("td", "", numFmt().format(ps.length)));
      r.appendChild(el("td", "", numFmt().format(new Set(ps.map((p) => p.alliance).filter(Boolean)).size)));
      for (const k of ["power", "powerMax", "merits", "kills"]) r.appendChild(el("td", "", show(KS.BY_KEY[k], measure(KS.BY_KEY[k], ps))));
      r.appendChild(el("td", "mut", f.scan));
      r.onclick = () => { location.hash = "k=" + f.kingdom; };
      tb.appendChild(r);
    }
  }
  wrap.appendChild(t);
  return wrap;
}

async function draw() {
  const me = ++token, box = $("cmp");
  // kingdoms that left the index (a link from another time)
  cfg.a = cfg.a.filter(itemOf); cfg.b = cfg.b.filter(itemOf);
  const [fa, fb] = await Promise.all([Promise.all(cfg.a.map(load)), Promise.all(cfg.b.map(load))]);
  if (me !== token) return;
  const pa = sidePlayers(fa), pb = sidePlayers(fb), ready = cfg.a.length && cfg.b.length;

  const count = (ps, key, lo, hi) => ps.reduce((n, p) => n + ((p[key] ?? 0) >= lo && (p[key] ?? 0) < hi ? 1 : 0), 0);
  const int = (v) => (v == null ? "–" : numFmt().format(v));
  const cols = (...keys) => keys.map((k) => colLine(k, pa, pb));
  const bands = (key, list, prefix) => list.map(([lo, hi, t]) => line(prefix + t, "", count(pa, key, lo, hi), count(pb, key, lo, hi), int));
  const groups = !ready ? [] : [
    group(tr("xgScale"), ...cols("power", "powerMax", "merits")),
    group(tr("xgBattle"), ...cols("kills", "heals", "deaths")),
    group(tr("xgTop"), ...bands("powerMax", [[cfg.minStep, POWER_BANDS[0][0], `${cfg.minStep / 1e6}–100M`], ...POWER_BANDS], "")),
    group(tr("xgMigration"), colLine("migrationScore", pa, pb, tr("xMigrationSum")),
      ...bands("migrationScore", MIGRATION_BANDS, tr("xMigrationBand") + " "),
      ...bands("maxDecor", [[DECOR_MAX, Infinity, KS.label(KS.BY_KEY.maxDecor)]], "")),
    group(tr("xgUnits"), ...cols("meritInfantry", "meritCavalry", "meritArcher", "meritMagic")),
  ];

  const keepY = box.scrollTop;
  box.innerHTML = "";
  box.appendChild(controls());

  const head = el("div", "x-head");
  head.append(sidePanel("a", "xSideA", pa), el("div", "x-vs", "VS"), sidePanel("b", "xSideB", pb));
  box.appendChild(head);

  const bad = [...cfg.a.filter((_, i) => !fa[i]), ...cfg.b.filter((_, i) => !fb[i])];
  if (bad.length) box.appendChild(el("p", "hint x-err", `${tr("xLoadErr")} ${bad.map((k) => "#" + k).join(", ")}`));
  if (ready) {
    const grid = el("div", "x-grid");
    grid.append(...groups);
    box.append(grid, group(tr("xEach"), eachKingdom(fa, fb)));
  } else box.appendChild(el("p", "hint mut x-hint", tr("xEmpty")));
  box.scrollTop = keepY;
}

// a click outside closes the picker
document.addEventListener("pointerdown", (e) => {
  if (openSide && !e.target.closest(".x-add")) { openSide = null; if (state.page === "compare") draw(); }
});

function fromHash() {
  const hp = new URLSearchParams(location.hash.slice(1));
  if (hp.get("p") !== "compare" || (!hp.has("a") && !hp.has("b"))) return;
  const ids = (s) => [...new Set((s || "").split(",").map(Number).filter(Boolean))].slice(0, MAX_PER_SIDE);
  cfg.a = ids(hp.get("a"));
  cfg.b = ids(hp.get("b")).filter((k) => !cfg.a.includes(k));
  KS.store.set("cmp", cfg);
}

KS.compare = {
  draw,
  show() { fromHash(); history.replaceState(null, "", linkHash()); draw(); },
};
})();
