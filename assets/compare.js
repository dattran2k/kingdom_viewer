// The compare page: pairs of sides, each side of several kingdoms, side by side; once a pair has both sides an empty one
// opens under it. A classic script loaded after views.js; what it needs from the page comes through window.KS. Each
// kingdom counts with its newest scan. Link: #p=compare&a=1,2&b=3&a2=4&b2=5 (a2/b2 the second pair, and on)
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
  xCount: "Người chơi", xLoadErr: "Không tải được:",
});
Object.assign(KS.T.en, {
  navKingdom: "Kingdom", navCompare: "Compare", openSource: "Open source on GitHub",
  xSideA: "Side 1", xSideB: "Side 2", xAdd: "+ Kingdom", xRemove: "Remove", xEmpty: "Add kingdoms to both sides to compare them.",
  xPlayers: "players", xSum: "Total", xAvg: "Avg", xAggTip: "Total / average per player", xTopAll: "Everyone", xTop: "Top", xReset: "Reset",
  xdDuels: "Max power bands, migration bands, Max decor, Max pets, Red artifact and Legendary themes count players. Merit % is the average per player. The other figures are the {agg}.",
  xAggSum: "total of the side", xAggAvg: "average per player", xBand: "Max power",
  xInfantry: "Infantry merits", xCavalry: "Cavalry merits", xArcher: "Archer merits", xMagic: "Magic merits",
  xdEach: "Totals of each kingdom on its newest day, only players over the chosen power step.",
  xMigrationSum: "Migration score", xMigrationBand: "Migration score", xEach: "Each kingdom", xScan: "Day", xKingdom: "Kingdom",
  xCount: "Players", xLoadErr: "Could not load:",
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
let token = 0;             // a newer draw makes an older, still loading one give up
let openSide = null;       // the side whose picker is open: "<pair><a|b>"

function iconOf(key, cls) { const i = el("img", cls); i.src = `assets/icons/${key}.png`; i.alt = ""; return i; }
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const num = (v) => (state.compact ? KS.compact(v) : numFmt().format(Math.round(v)));
const itemOf = (id) => state.list.find((k) => k.kingdom === id);

function load(id) {
  const scan = itemOf(id).scan, key = scan + "/" + id;
  const file = cache.get(key) ?? KS.getJSON(`data/scans/${scan}/${id}.json`).catch((e) => { cache.delete(key); console.error(e); return null; });
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

function pickerList(ul, q, pair) {
  const used = new Set([...pair.a, ...pair.b]); // one pair's sides never share a kingdom; another pair may have it again
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

function picker(n, side) {
  const wrap = el("div", "x-add"), pair = cfg.pairs[n] ?? { a: [], b: [] }, me = n + side;
  const add = el("button", "x-add-btn", tr("xAdd"));
  add.type = "button";
  add.disabled = pair[side].length >= MAX_PER_SIDE;
  add.onclick = () => { openSide = openSide === me ? null : me; draw(); };
  wrap.appendChild(add);
  if (openSide !== me) return wrap;
  const pop = el("div", "pop x-pop"), q = el("input"), ul = el("ul", "klist");
  q.type = "search"; q.autocomplete = "off"; q.inputMode = "numeric"; q.placeholder = tr("kSearchPh");
  ul.setAttribute("role", "listbox");
  pickerList(ul, "", pair);
  const pick = (k) => {
    cfg.pairs[n] = pair; // the empty pair under the others is kept from its first kingdom on
    pair[side] = [...pair[side], k];
    if (pair[side].length >= MAX_PER_SIDE) openSide = null;
    save(); draw();
  };
  q.addEventListener("input", () => pickerList(ul, q.value, pair));
  q.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { openSide = null; draw(); }
    else if (KS.listKeys(e, ul, pick)) e.preventDefault();
  });
  ul.onclick = (e) => { const li = e.target.closest("li[data-k]"); if (li) pick(Number(li.dataset.k)); };
  pop.append(q, ul);
  wrap.appendChild(pop);
  // run by draw once the page is built, before it is painted: it opens upwards when the page has no room under it,
  // so the page never grows or jumps and the menu is never seen on the wrong side first
  pop.place = () => {
    const page = $("cmp").getBoundingClientRect(), at = wrap.getBoundingClientRect();
    if (pop.offsetHeight + 8 > page.bottom - at.bottom && at.top - page.top > page.bottom - at.bottom) pop.classList.add("up");
    q.focus({ preventScroll: true });
  };
  return wrap;
}

function sidePanel(n, side, titleKey, ps) {
  const box = el("div", "x-side " + side), pair = cfg.pairs[n] ?? { a: [], b: [] }, ids = pair[side];
  const head = el("div", "x-side-head");
  head.appendChild(el("h3", "", tr(titleKey)));
  if (ids.length) head.appendChild(el("span", "x-side-n", `${numFmt().format(ps.length)} ${tr("xPlayers")}`));
  const tags = el("div", "x-tags");
  for (const id of ids) {
    const tag = el("button", "x-tag", "#" + id);
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
  reset.onclick = () => { cfg.pairs = []; openSide = null; save(); draw(); };
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
function duels(pa, pb) {
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
        for (const [, va, vb, text] of part) g.appendChild(side === "a" ? cell("a", va, vb, text) : cell("b", vb, va, text));
      }
    }
  };
  const colW = COL_W[state.compact ? "compact" : "full"];
  const cols = [0, 1].map(() => box.appendChild(el("div", "x-col")));
  items.forEach(([key, label, get, text, subs], i) => {
    const d = el("div", "x-duel"), top = el("div", "x-d-top"), body = el("div", "x-d-body");
    d.dataset.k = key;
    d.style.order = i; // one column on a phone: the cards read in order
    top.append(iconOf(key, "x-d-i"), el("span", "x-d-l", label));
    const figs = [[label, get(pa), get(pb), text], ...(subs || []).map(([name, of, fmt, icon]) => [name, of(pa), of(pb), fmt, icon])];
    let n = 0;
    // as many columns as fit, then shared out evenly between the blocks: 7 in 4 is 4 + 3, not 4 + 4 empty slots.
    // Run at once when the card is put in the page (a page drawn again keeps its height, so its scroll stays), and on resize
    body.fit = () => {
      const most = Math.max(1, Math.floor((body.clientWidth - SIDE_W) / colW)), fit = Math.ceil(figs.length / Math.ceil(figs.length / most));
      if (body.clientWidth && fit !== n) blocks(body, figs, (n = fit));
    };
    new ResizeObserver(body.fit).observe(body);
    d.append(top, body);
    cols[i % 2].appendChild(d);
  });
  return box;
}

async function draw() {
  const me = ++token, box = $("cmp");
  // kingdoms that left the index (a link from another time)
  for (const p of cfg.pairs) { p.a = p.a.filter(itemOf); p.b = p.b.filter(itemOf); }
  tidy();
  const files = await Promise.all(cfg.pairs.map((p) => Promise.all([Promise.all(p.a.map(load)), Promise.all(p.b.map(load))])));
  if (me !== token) return;

  const keepY = box.scrollTop;
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
    const bad = [...p.a.filter((_, i) => !fa[i]), ...p.b.filter((_, i) => !fb[i])];
    if (bad.length) sec.appendChild(el("p", "hint x-err", `${tr("xLoadErr")} ${bad.map((k) => "#" + k).join(", ")}`));
    if (!ready(p)) { sec.appendChild(el("p", "hint mut x-hint", tr("xEmpty"))); return; }
    if (!noted) sec.appendChild(el("p", "x-gd x-note", tr("xdDuels").replace("{agg}", tr(cfg.avg ? "xAggAvg" : "xAggSum"))));
    noted = true;
    sec.append(duels(pa, pb), group("players", tr("xEach"), tr("xdEach"), eachKingdom(fa, fb)));
    sec.querySelectorAll(".x-d-body").forEach((b) => b.fit());
  });
  // the last pair has both sides: an empty one under it for the next, kept once a kingdom is picked in it
  const n = cfg.pairs.length;
  if (n < MAX_PAIRS && ready(cfg.pairs[n - 1])) box.appendChild(el("section", "x-pair")).appendChild(pairHead(n, [], []));
  box.scrollTop = keepY;
  box.querySelector(".x-pop")?.place();
}

// a click outside closes the picker
document.addEventListener("pointerdown", (e) => {
  if (openSide && !e.target.closest(".x-add")) { openSide = null; if (state.page === "compare") draw(); }
});

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
