// The compare page: two sides, each of several kingdoms, side by side. A classic script loaded after views.js; what it
// needs from the page comes through window.KS. Each kingdom counts with its newest scan. Link: #p=compare&a=1,2&b=3
(() => {
"use strict";
const KS = window.KS, { state, tr, $, numFmt } = KS;

Object.assign(KS.T.vi, {
  navKingdom: "Kingdom", navCompare: "So sánh", openSource: "Mã nguồn mở trên GitHub",
  xSideA: "Phe 1", xSideB: "Phe 2", xAdd: "+ Kingdom", xRemove: "Bỏ", xEmpty: "Thêm kingdom vào cả hai phe để xem so sánh.",
  xPlayers: "người", xSum: "Tổng", xAvg: "TB", xAggTip: "Tổng / trung bình mỗi người", xTopAll: "Mọi người", xTop: "Top", xReset: "Đặt lại",
  xdDuels: "Các mức LC max, mức điểm di cư, Decor max, Pet max, Bảo vật đỏ và Nhà Thiên Đỉnh đếm số người chơi. CT / LC là trung bình mỗi người. Các số còn lại là {agg}.",
  xAggSum: "tổng của cả phe", xAggAvg: "trung bình mỗi người", xBand: "LC max",
  xInfantry: "CT bộ binh", xCavalry: "CT kỵ binh", xArcher: "CT cung thủ", xMagic: "CT pháp sư",
  xdEach: "Số tổng của từng kingdom ở ngày mới nhất, chỉ tính người qua mức lực chiến đã chọn.",
  xMigrationSum: "Điểm di cư", xMigrationBand: "Điểm di cư", xEach: "Từng kingdom", xScan: "Ngày", xKingdom: "Kingdom",
  xCount: "Người chơi", xAlliances: "Liên minh", xLoadErr: "Không tải được:",
});
Object.assign(KS.T.en, {
  navKingdom: "Kingdom", navCompare: "Compare", openSource: "Open source on GitHub",
  xSideA: "Side 1", xSideB: "Side 2", xAdd: "+ Kingdom", xRemove: "Remove", xEmpty: "Add kingdoms to both sides to compare them.",
  xPlayers: "players", xSum: "Total", xAvg: "Avg", xAggTip: "Total / average per player", xTopAll: "Everyone", xTop: "Top", xReset: "Reset",
  xdDuels: "Peak power bands, migration bands, Max decor, Max pets, Red artifact and Legendary themes count players. Merit % is the average per player. The other figures are the {agg}.",
  xAggSum: "total of the side", xAggAvg: "average per player", xBand: "Peak power",
  xInfantry: "Infantry merits", xCavalry: "Cavalry merits", xArcher: "Archer merits", xMagic: "Magic merits",
  xdEach: "Totals of each kingdom on its newest day, only players over the chosen power step.",
  xMigrationSum: "Migration score", xMigrationBand: "Migration score", xEach: "Each kingdom", xScan: "Day", xKingdom: "Kingdom",
  xCount: "Players", xAlliances: "Alliances", xLoadErr: "Could not load:",
});

const MAX_PER_SIDE = 10;
const TOPS = [0, 100, 200, 300, 500];
const POWER_BANDS = [[100e6, 200e6, "100–200M"], [200e6, 300e6, "200–300M"], [300e6, Infinity, "300M+"]];
const { MIGRATION_BANDS, DECOR_MAX } = KS;

const cfg = Object.assign({ a: [], b: [], minStep: KS.DEFAULT_POWER, top: 0, avg: false }, KS.store.get("cmp", {}));
const cache = new Map();   // "<scan>/<kingdom>" -> file (a promise while it loads)
let token = 0;             // a newer draw makes an older, still loading one give up
let openSide = null;       // the side whose picker is open

function iconOf(key, cls) { const i = el("img", cls); i.src = `assets/icons/${key}.png`; i.alt = ""; return i; }
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

// a titled block
function group(icon, title, desc, ...kids) {
  const g = el("section", "x-grp"), top = el("div", "x-grp-top"), text = el("div", "x-gt");
  text.append(el("h3", "", title), el("p", "x-gd", desc.replace("{agg}", tr(cfg.avg ? "xAggAvg" : "xAggSum"))));
  top.append(iconOf(icon, "x-gi"), text);
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

// the two sides as six cards: each figure's value and its share of the two, with what belongs to it underneath.
// Three columns of two cards, each card as tall as what it holds
function duels(pa, pb) {
  const box = el("div", "x-duels"), int = (v) => numFmt().format(v);
  const short = (c) => (v) => (c.type === "num" ? KS.compact(v) : show(c, v)); // always short: full numbers break across lines on a phone
  const col = (k, name, icon) => { const c = KS.BY_KEY[k]; return [name || KS.label(c), (ps) => measure(c, ps), short(c), icon]; };
  const main = (k, name) => col(k, name).slice(0, 3); // a card's own figure: name, value, text
  const spelled = (k) => col(k, KS.label(KS.BY_KEY[k].tip)); // the short column name says too little here
  const counted = (key, lo, hi, name) => [name, (ps) => ps.filter((p) => (p[key] ?? 0) >= lo && (p[key] ?? 0) < hi).length, int];
  const owners = (k) => counted(k, 1, Infinity, KS.label(KS.BY_KEY[k]));
  const peak = [[cfg.minStep, POWER_BANDS[0][0], `${cfg.minStep / 1e6}–100M`], ...POWER_BANDS];
  const items = [
    ["players", tr("xCount"), (ps) => ps.length, int, [[tr("xAlliances"), (ps) => new Set(ps.map((p) => p.alliance).filter(Boolean)).size, int]]],
    ["power", ...main("power"), [col("powerMax"), ...peak.map(([lo, hi, t]) => counted("powerMax", lo, hi, `${tr("xBand")} ${t}`))]],
    ["merits", ...main("merits"), [col("meritsMax"), col("meritRatio"), col("meritInfantry", tr("xInfantry")), col("meritCavalry", tr("xCavalry")), col("meritArcher", tr("xArcher")), col("meritMagic", tr("xMagic"))]],
    ["maxDecor", KS.label(KS.BY_KEY.maxDecor), (ps) => ps.filter((p) => (p.maxDecor ?? 0) >= DECOR_MAX).length, int,
      [owners("pets8Skills3Star"), owners("redArtifact"), owners("cityTheme"), ...["awakenedHeroes", "artifactSkillsLv5", "gemsSpent", "exchangeCoinsSpent"].map(spelled)]],
    ["kills", ...main("kills"), [col("deaths", null, "deaths"), col("heals", null, "heals")]],
    ["migrationScore", ...main("migrationScore", tr("xMigrationSum")), MIGRATION_BANDS.map(([lo, hi, t]) => counted("migrationScore", lo, hi, `${tr("xMigrationBand")} ${t}`))],
  ];
  // the larger side also says how far ahead; the bar is the share of the two, with a mark at half
  const ahead = (va, vb) => {
    const high = Math.max(va || 0, vb || 0), low = Math.min(va || 0, vb || 0);
    return low > 0 && high > low ? el("small", "", `+${numFmt(1).format((100 * (high - low)) / high)}%`) : null;
  };
  const value = (side, v, other, text) => {
    const lead = v != null && other != null && v > other, b = el("b", side + (lead ? " lead" : ""), v == null ? "–" : text(v));
    const more = lead && ahead(v, other);
    if (more) b.appendChild(more);
    return b;
  };
  const share = (va, vb, cls) => {
    const bar = el("div", cls), fill = el("i"), all = (va || 0) + (vb || 0);
    fill.style.width = (all > 0 ? (100 * (va || 0)) / all : 50).toFixed(2) + "%";
    bar.appendChild(fill);
    return bar;
  };
  const cols = [0, 1, 2].map(() => box.appendChild(el("div", "x-col")));
  items.forEach(([key, label, get, text, subs], i) => {
    const va = get(pa), vb = get(pb);
    const d = el("div", "x-duel"), top = el("div", "x-d-top"), vals = el("div", "x-d-vals");
    d.dataset.k = key;
    d.style.order = i; // one column on a phone: the cards read row by row
    top.append(el("span", "x-d-l", label), iconOf(key, "x-d-i"));
    vals.append(value("a", va, vb, text), value("b", vb, va, text));
    d.append(top, vals, share(va, vb, "x-d-bar"));
    for (const [name, of, fmt, icon] of subs || []) {
      const x = of(pa), y = of(pb), r = el("div", "x-d-sub"), lab = el("span", "x-d-n");
      if (icon) lab.appendChild(iconOf(icon, "x-d-si"));
      lab.appendChild(document.createTextNode(name));
      r.append(lab, value("a", x, y, fmt), value("b", y, x, fmt), share(x, y, "x-d-bar mini"));
      d.appendChild(r);
    }
    cols[i % 3].appendChild(d);
  });
  return box;
}

async function draw() {
  const me = ++token, box = $("cmp");
  // kingdoms that left the index (a link from another time)
  cfg.a = cfg.a.filter(itemOf); cfg.b = cfg.b.filter(itemOf);
  const [fa, fb] = await Promise.all([Promise.all(cfg.a.map(load)), Promise.all(cfg.b.map(load))]);
  if (me !== token) return;
  const pa = sidePlayers(fa), pb = sidePlayers(fb), ready = cfg.a.length && cfg.b.length;

  const keepY = box.scrollTop;
  box.innerHTML = "";
  box.appendChild(controls());

  const head = el("div", "x-head");
  head.append(sidePanel("a", "xSideA", pa), el("div", "x-vs", "VS"), sidePanel("b", "xSideB", pb));
  box.appendChild(head);

  const bad = [...cfg.a.filter((_, i) => !fa[i]), ...cfg.b.filter((_, i) => !fb[i])];
  if (bad.length) box.appendChild(el("p", "hint x-err", `${tr("xLoadErr")} ${bad.map((k) => "#" + k).join(", ")}`));
  if (ready) {
    box.append(el("p", "x-gd x-note", tr("xdDuels").replace("{agg}", tr(cfg.avg ? "xAggAvg" : "xAggSum"))), duels(pa, pb), group("players", tr("xEach"), tr("xdEach"), eachKingdom(fa, fb)));
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
