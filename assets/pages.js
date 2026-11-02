// The pages over all kingdoms: ranking and migration. A classic script loaded after compare.js; what it needs from the
// page comes through window.KS. They read the tables in data/derived/, worked out ahead when the data is exported.
// Links: #p=rank · #p=migration&a=<scan>&b=<scan>&v=servers&k=<kingdom>&q=<id or name>
(() => {
"use strict";
const KS = window.KS, { state, tr, $, numFmt } = KS;

Object.assign(KS.T.vi, {
  descKingdom: "Người chơi của từng kingdom theo ngày. Bật So sánh để xem mỗi người tăng giảm bao nhiêu giữa 2 ngày.",
  descCompare: "Đối chiếu hai phe, mỗi phe gồm một hoặc nhiều kingdom, ở ngày mới nhất.",
  descRank: "Xếp hạng các kingdom ở ngày mới nhất, tính người có lực chiến trên 15M.",
  descMigration: "Ai đã chuyển từ kingdom nào sang kingdom nào giữa 2 ngày.",
  navRank: "Xếp hạng", navMigration: "Di cư", cmpDays: "So sánh", modeLabel: "Chế độ", modeNormal: "Thường", cmpRemove: "Bỏ", cmpDaysTip: "So sánh 2 ngày của một hoặc nhiều kingdom: mỗi người tăng bao nhiêu",
  noDerived: "Chưa có dữ liệu tổng hợp (data/derived/).", dvLoadErr: "Không tải được dữ liệu.",
  rKingdoms: "kingdom", 
  rSearch: "#kingdom, tag…", rSearchK: "SoS8-10045, #kingdom…", rHint: "Tính theo người có lực chiến hiện tại trên 15M, trong top lực chiến mỗi kingdom. Bấm một dòng để mở.",
  cKingdom: "Kingdom", cTopAlliance: "LM mạnh nhất", cPlayers: "Người chơi", cAlliances: "Số LM",
  cPower: "Lực chiến", cPowerMax: "LC max", cMerits: "Công trạng", cKills: "Tiêu diệt", cDeaths: "Tử trận", cHeals: "Chữa trị", cHelps: "Giúp đỡ", cGathered: "Thu thập",
  cMigration: "Điểm di cư", cDecor: "Decor max", cInf: "CT bộ", cCav: "CT kỵ", cArc: "CT cung", cMag: "CT phép",
  gFrom: "Từ ngày", gTo: "Đến ngày", gName: "Người chơi",
  mStart: "Từ ngày", mEnd: "Đến ngày", mLords: "Người chơi", mServers: "Kingdom", mKingdom: "Kingdom", mLord: "ID / tên", mMin: "Lực chiến ≥ (M)",
  mFrom: "Từ", mTo: "Đến", mAllianceFrom: "LM cũ", mAllianceTo: "LM mới", mDate: "Thời điểm",
  mTotal: "lượt di cư", mPeople: "người", mPage: "Trang", mPrev: "◀ Trước", mNext: "Sau ▶", mNone: "Không có lượt di cư nào khớp.", mWindow: "Còn ở kingdom cũ lúc {a}, đã ở kingdom mới lúc {b}",
  mIn: "vào", mOut: "ra", mNet: "ròng", mHint: "Lực chiến và các số khác là số mới nhất. Ngày di cư thật nằm trong khoảng hiện ở cột Thời điểm. Chỉ thấy người có trong top lực chiến ≥ 5M ở cả hai đầu.",
});
Object.assign(KS.T.en, {
  descKingdom: "Each kingdom's players by day. Turn on Compare to see how much each one changed between two days.",
  descCompare: "Two sides face to face, each of one or more kingdoms, on the newest day.",
  descRank: "Kingdoms ranked on the newest day, counting players above 15M power.",
  descMigration: "Who moved from which kingdom to which between two days.",
  navRank: "Rankings", navMigration: "Migration", cmpDays: "Compare", modeLabel: "Mode", modeNormal: "Normal", cmpRemove: "Remove", cmpDaysTip: "Compare two days of one or more kingdoms: how much each player gained",
  noDerived: "No summary data yet (data/derived/).", dvLoadErr: "Could not load the data.",
  rKingdoms: "kingdoms", 
  rSearch: "#kingdom, tag…", rSearchK: "SoS8-10045, #kingdom…", rHint: "Counts players whose power now is above 15M, within each kingdom's power ranking. Click a line to open it.",
  cKingdom: "Kingdom", cTopAlliance: "Top alliance", cPlayers: "Players", cAlliances: "Alliances",
  cPower: "Power", cPowerMax: "Max power", cMerits: "Merits", cKills: "Kills", cDeaths: "Dead", cHeals: "Healed", cHelps: "Helps", cGathered: "Gathered",
  cMigration: "Migration score", cDecor: "Max decor", cInf: "Infantry", cCav: "Cavalry", cArc: "Archers", cMag: "Magic",
  gFrom: "From", gTo: "To", gName: "Player",
  mStart: "From", mEnd: "To", mLords: "Players", mServers: "Kingdoms", mKingdom: "Kingdom", mLord: "ID / name", mMin: "Power ≥ (M)",
  mFrom: "From", mTo: "To", mAllianceFrom: "Past alliance", mAllianceTo: "New alliance", mDate: "When",
  mTotal: "moves", mPeople: "players", mPage: "Page", mPrev: "◀ Prev", mNext: "Next ▶", mNone: "No move matches.", mWindow: "Still in the old kingdom at {a}, in the new one at {b}",
  mIn: "in", mOut: "out", mNet: "net", mHint: "Power and the other numbers are the newest known. The real moment lies within the range in the When column. Only players on the power ranking at 5M or more at both ends can be seen.",
});

const PAGE_SIZES = [20, 50, 100, 200, 0]; // 0 = all
const pageSize = () => KS.store.get("pageSize", 20);
const onPage = (rows, page) => { const size = pageSize(); return size ? rows.slice((page - 1) * size, page * size) : rows; };
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const num = (v) => (v == null ? "–" : state.compact ? KS.compact(v) : numFmt().format(Math.round(v)));
const fullNum = (v) => (v == null ? "" : numFmt().format(Math.round(v)));
const signed = (v) => (v == null ? "–" : (v > 0 ? "+" : "") + num(v));
const stamp = (iso) => (iso ? iso.slice(5, 16).replace("T", " ") : "");
const allianceChip = (t) => (t ? KS.allianceChip(t) : el("span", "mut", "–"));

// ---- what the pages share ----
const files = new Map();
function load(path) {
  if (!files.has(path)) files.set(path, KS.getJSON("data/" + path).catch((e) => { files.delete(path); console.error(e); return null; }));
  return files.get(path);
}
const objects = (cols, rows) => rows.map((r) => { const o = {}; cols.forEach((c, i) => { o[c] = r[i]; }); return o; });
const index = () => load("derived/index.json");

function select(opts, val, on) {
  const s = el("select");
  for (const [v, t] of opts) { const o = el("option", "", t); o.value = v; s.appendChild(o); }
  s.value = String(val);
  s.onchange = () => on(s.value);
  return s;
}
function field(label, input) {
  const f = el("label", "dv-f");
  f.append(el("span", "", label), input);
  return f;
}
function dayField(label, days, val, on) {
  const f = el("div", "dv-f"), s = select(days.map((d) => [d, d]), val, on);
  f.append(el("span", "", label), s);
  KS.dayDrop(s);
  return f;
}
// text boxes keep their focus: the results redraw below them, the controls stay
function searchBox(ph, val, on) {
  const q = el("input");
  q.type = "search"; q.autocomplete = "off"; q.placeholder = ph; q.value = val;
  q.addEventListener("input", () => on(q.value.trim()));
  return q;
}
function fmtBtn(redraw) {
  const b = el("button", "btn", "1.2M");
  b.type = "button"; b.title = tr("fmtTip");
  b.setAttribute("aria-pressed", String(state.compact));
  b.onclick = () => {
    state.compact = !state.compact;
    KS.store.set("compact", state.compact);
    $("fmtBtn").setAttribute("aria-pressed", String(state.compact));
    b.setAttribute("aria-pressed", String(state.compact));
    redraw();
  };
  return b;
}
// "Show [20] per page", then the page buttons: 1 2 3 ... 373
function pager(total, page, go, { size = pageSize(), sizes = PAGE_SIZES, key = "pageSize" } = {}) {
  const pages = size ? Math.max(1, Math.ceil(total / size)) : 1, box = el("div", "dv-pager"), left = el("label", "dv-psize"), pick = el("select"), nums = el("nav", "dv-pnums");
  for (const n of sizes) { const o = el("option", "", n ? String(n) : tr("all")); o.value = n; pick.appendChild(o); }
  pick.value = size;
  pick.onchange = () => { KS.store.set(key, Number(pick.value)); go(1); };
  left.append(el("span", "", tr("kShow")), pick, el("span", "", tr("kPerPage")));
  box.appendChild(left);
  if (pages < 2) return box;
  const btn = (text, to, on, off) => {
    const b = el("button", on ? "on" : "", text);
    b.type = "button"; b.disabled = !!off;
    b.onclick = () => go(to);
    nums.appendChild(b);
  };
  btn("‹", page - 1, false, page <= 1);
  let last = 0;
  for (let n = 1; n <= pages; n++) {
    if (n !== 1 && n !== pages && Math.abs(n - page) > 1) continue;
    if (n - last > 1) nums.appendChild(el("span", "mut", "…"));
    btn(String(n), n, n === page);
    last = n;
  }
  btn("›", page + 1, false, page >= pages);
  box.appendChild(nums);
  return box;
}
// a sortable table: cols = [{key, label, get(row), text(row), cls(row), tip(row), nosort, ranked}]; sort = {key, dir};
// a ranked column takes its colour from the row's place in the whole list, r._i
const HEAD_ICONS = new Set(["power", "merits", "kills", "deaths", "heals"]);
// the cells shared by the tables: a name with its ID under it, a kingdom chip, a figure with its bar
const whoCell = (name, id) => { const d = el("span", "who"); d.append(el("b", "", name ?? "–"), el("small", "", String(id ?? ""))); return d; };
const kdCell = (k, top) => el("span", top ? "kd top" : "kd", String(k));
const barCol = (key, label, rows) => ({ key, label: tr(label), get: (r) => r[key], max: rows.reduce((m, r) => Math.max(m, r[key] ?? 0), 0) });
// Widths come from every row of the list (cols.all), not the ones on this page: sorting or paging never moves a column
const NODE_W = { name: 190, kingdom: 76, from: 76, to: 76, kvk: 190, st: 156, alliance: 96, allianceFrom: 96, allianceTo: 96, topAlliance: 96, trades: 84 };
const measure = document.createElement("canvas").getContext("2d");
function textW(text, font) {
  measure.font = `${font} ${getComputedStyle(document.body).fontFamily}`;
  return measure.measureText(text).width;
}
function colWidth(c, all) {
  const head = textW(c.label, "600 12px") + (HEAD_ICONS.has(c.key) ? 20 : 0) + (c.nosort ? 0 : 13) + 20;
  if (c.node) return Math.ceil(Math.max(head, c.w ?? NODE_W[c.key] ?? 110));
  let long = "";
  for (const r of all) { const t = String(c.text ? c.text(r) : num(c.get(r))); if (t.length > long.length || (t.length === long.length && t > long)) long = t; } // the same pick in any order
  return Math.ceil(Math.max(head, textW(long, "600 13px") * 1.06 + 24));
}
// The bar above a table, the Kingdom table's: its title, Show, View, sort by. Returns the columns to show.
let barPop = ""; // the menu left open across a redraw
function tableBar(out, { id, title, meta, cols, holder, prop, redraw, hideFirst = [] }) {
  const bar = el("div", "bar tbl-bar dv-tbar"), head = el("div", "tbl-title"), tools = el("div", "tools");
  head.append(el("b", "", title), el("p", "meta", meta));
  const hidden = new Set(KS.store.get("hide_" + id, hideFirst));
  const can = cols.filter((c) => !PIN.has(c.key));
  const shown = cols.filter((c) => PIN.has(c.key) || !hidden.has(c.key));
  const menu = (name, button, pop) => {
    const wrap = el("div", "vpick");
    pop.hidden = barPop !== id + name;
    button.onclick = () => { const on = pop.hidden; barPop = on ? id + name : ""; document.querySelectorAll(".dv-tbar .pop").forEach((x) => { x.hidden = true; }); pop.hidden = !on; };
    wrap.append(button, pop);
    return wrap;
  };
  const colsBtn = el("button", "btn");
  colsBtn.type = "button";
  colsBtn.innerHTML = $("colsBtn").querySelector("svg").outerHTML;
  colsBtn.append(tr("kShowCols") + " ", el("span", "dv-count", `${shown.length - (cols.length - can.length)}/${can.length}`));
  colsBtn.onclick = () => {
    const key = "hide_" + id, get = () => new Set(KS.store.get(key, hideFirst));
    const save = (set) => { KS.store.set(key, [...set]); redraw(); };
    KS.openPicker({
      cols: cols.map((c) => ({ key: c.key, label: c.label, fixed: PIN.has(c.key) })),
      on: (k) => PIN.has(k) || !get().has(k),
      toggle: (k, on) => { const h = get(); on ? h.delete(k) : h.add(k); save(h); },
      act: (what) => save(new Set(what === "none" ? can.map((c) => c.key) : what === "def" ? hideFirst : [])),
      count: () => `${can.filter((c) => !get().has(c.key)).length}/${can.length}`,
    });
  };
  const viewBtn = el("button", "btn primary");
  viewBtn.type = "button";
  viewBtn.innerHTML = $("viewBtn").querySelector("svg").outerHTML;
  viewBtn.append(" View");
  const view = el("div", "pop view-pop flip");
  view.append(el("h3", "", tr("viewTitle")), fmtBtn(redraw));
  tools.append(colsBtn, menu("view", viewBtn, view));
  const sortBox = el("div", "sort-box"), label = el("label"), select = el("select"), dir = el("button");
  for (const c of shown) if (!c.nosort) { const o = el("option", "", c.label); o.value = c.key; select.appendChild(o); }
  select.value = holder[prop].key;
  select.onchange = () => { holder[prop] = { key: select.value, dir: -1 }; redraw(); };
  label.append(el("span", "", tr("sortBy")), select);
  dir.type = "button"; dir.title = tr("sortDirTip"); dir.textContent = holder[prop].dir < 0 ? "↓" : "↑";
  dir.onclick = () => { holder[prop] = { ...holder[prop], dir: -holder[prop].dir }; redraw(); };
  sortBox.append(label, dir);
  bar.append(head, tools, sortBox);
  out.appendChild(bar);
  return shown;
}
document.addEventListener("pointerdown", (e) => {
  if (e.target.closest(".dv-tbar .vpick")) return;
  barPop = "";
  document.querySelectorAll(".dv-tbar .pop").forEach((x) => { x.hidden = true; });
});
const PIN = new Set(["#", "name", "kingdom"]); // the first of these stay on screen when the page scrolls sideways
function table(cols, rows, sort, onSort, onRow) {
  const wrap = el("div", "tbl-wrap dv-wrap"), t = el("table", "tbl"), hr = el("tr");
  const all = cols.all || rows, group = t.appendChild(el("colgroup"));
  let total = 0, pinning = true;
  const pins = new Map();
  for (const c of cols) {
    const w = colWidth(c, all);
    pinning = pinning && PIN.has(c.key) && !c.nopin;
    if (pinning) pins.set(c.key, total);
    total += w;
    group.appendChild(el("col")).style.width = w + "px";
  }
  const pin = (c, node) => {
    if (!pins.has(c.key)) return;
    node.classList.add("pin");
    node.style.left = pins.get(c.key) + "px";
    if ([...pins.keys()].pop() === c.key) node.classList.add("pin-last");
  };
  t.style.minWidth = total + "px";
  queueMicrotask(() => { const page = wrap.closest("#dv .dv-out"); if (page) page.style.minWidth = total + "px"; }); // the sticky bars need a parent as wide as the table
  for (const c of cols) {
    const th = el("th", (sort.key === c.key ? "on" : "") + (c.left ? " nm" : ""), c.label);
    if (HEAD_ICONS.has(c.key)) { const i = el("img", "th-ic"); i.src = `assets/icons/${c.key}.png`; i.alt = ""; th.prepend(i); }
    if (sort.key === c.key) th.dataset.dir = sort.dir < 0 ? "▼" : "▲";
    if (c.nosort) th.classList.add("nosort");
    else th.onclick = () => onSort(c.key);
    pin(c, th);
    hr.appendChild(th);
  }
  t.appendChild(el("thead")).appendChild(hr);
  const tb = t.appendChild(el("tbody"));
  for (const r of rows) {
    const line = el("tr", r._cls || "");
    for (const c of cols) {
      const td = el("td", (c.cls?.(r) || "") + (c.left ? " nm" : ""), c.node ? null : c.text ? c.text(r) : num(c.get(r)));
      pin(c, td);
      if (c.node) td.appendChild(c.node(r));
      if (c.max && c.get(r) != null) { td.classList.add("pg", "b-" + c.key); td.style.setProperty("--p", Math.max(0, c.get(r) / c.max)); }
      if (c.ranked) td.style.color = KS.rankColour(r._i);
      const tip = c.tip ? c.tip(r) : c.text ? null : fullNum(c.get(r));
      if (tip) td.title = tip;
      line.appendChild(td);
    }
    if (onRow) line.onclick = () => onRow(r);
    else line.classList.add("still");
    tb.appendChild(line);
  }
  wrap.appendChild(t);
  return wrap;
}
function sortRows(rows, get, dir) {
  // no value goes last in either direction
  return rows.slice().sort((x, y) => {
    const a = get(x), b = get(y);
    if (a == null || b == null) return a == null ? (b == null ? 0 : 1) : -1;
    return (typeof a === "string" ? a.localeCompare(b) : a - b) * dir;
  });
}
const nextSort = (sort, key) => (sort.key === key ? { key, dir: -sort.dir } : { key, dir: -1 });
function setLink(p, params) {
  const hp = new URLSearchParams({ p });
  for (const [k, v] of Object.entries(params)) if (v !== "" && v != null) hp.set(k, v);
  if (state.page === p) history.replaceState(null, "", "#" + hp);
}
// the page's frame: the fixed controls, then the results that redraw
function frame() {
  const box = $("dv");
  box.innerHTML = "";
  const ctl = el("div", "dv-ctl"), out = el("div", "dv-out");
  box.append(ctl, out);
  return { ctl, out };
}

// ---- ranking: the kingdoms of one scan, optionally against an older one ----
const RANK_METRICS = [
  ["power", "cPower"], ["powerMax", "cPowerMax"], ["merits", "cMerits"], ["kills", "cKills"], ["deaths", "cDeaths"], ["heals", "cHeals"],
  ["helps", "cHelps"], ["gathered", "cGathered"], ["migrationScore", "cMigration"], ["migration24", "24–27"], ["migration28", "28–30"], ["migration31", "31+"],
  ["decorMax", "cDecor"], ["meritInfantry", "cInf"], ["meritCavalry", "cCav"], ["meritArcher", "cArc"], ["meritMagic", "cMag"],
];
const tradesCol = () => ({ key: "trades", label: "Trades", get: (r) => r.trades, tip: () => tr("tradesTip"), node: (r) => el("span", "tr-b", r.trades == null ? "–" : numFmt(0).format(r.trades) + "%") });
const rank = { q: "", page: 1, sort: { key: "powerMax", dir: -1 }, mode: "server", st: "" };

async function showRank() {
  const { ctl, out } = frame();
  const asked = { players: "member", kvk: "kvk" }[new URLSearchParams(location.hash.slice(1)).get("m")] || "server";
  if (rank.mode !== asked) { rank.mode = asked; rank.sort = { key: asked === "member" ? "power" : "powerMax", dir: -1 }; rank.page = 1; }
  const redraw = () => drawRank(out);
  const restart = () => { rank.page = 1; redraw(); };
  const seg = el("nav", "rk-seg");
  const box = searchBox("", rank.q, (v) => { rank.q = v; restart(); });
  const paint = () => {
    box.placeholder = tr(rank.mode === "member" ? "rSearchP" : rank.mode === "kvk" ? "rSearchK" : "rSearch");
    seg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.m === rank.mode)));
  };
  for (const [m, label] of [["server", "rServers"], ["member", "rMembers"], ["kvk", "rKvks"]]) {
    const b = el("button", "", tr(label));
    b.type = "button"; b.dataset.m = m;
    b.onclick = () => { if (rank.mode === m) return; rank.mode = m; rank.sort = { key: m === "member" ? "power" : "powerMax", dir: -1 }; paint(); restart(); };
    seg.appendChild(b);
  }
  paint();
  ctl.append(seg, box);
  redraw();
}

// the KvK of each kingdom, a chip like the sample's: its code and season
const kvkCell = (b) => {
  if (!b) return el("span", "mut", "–");
  const a = el("a", "rk-kvk");
  a.href = "#kvk=" + b.id;
  a.onclick = (e) => e.stopPropagation();
  a.append(el("b", "", b.name), el("small", "mut", KS.season.title(b.season)));
  return a;
};
const statusCell = (st) => { const c = el("span", "k-status", KS.season.status(st) || "–"); c.dataset.st = st ?? ""; return c; };
async function drawMembers(out, me) {
  const cur = await load("derived/top_players.json");
  if (me !== rankToken) return;
  setLink("rank", { m: "players" });
  out.innerHTML = "";
  if (!cur) { out.appendChild(el("p", "hint", tr("noDerived"))); return; }
  let rows = objects(cur.cols, cur.rows);
  const q = rank.q.toLowerCase();
  if (q) rows = rows.filter((r) => String(r.kingdom) === q.replace("#", "") || String(r.id).startsWith(q) || String(r.name).toLowerCase().includes(q) || String(r.alliance).toLowerCase().includes(q));
  const metric = (key, label) => barCol(key, label, rows);
  const cols = [
    { key: "#", label: "#", nosort: true, text: (r) => String(r._i), cls: () => "mut" },
    { key: "name", label: tr("cName"), left: true, w: state.narrow ? 120 : undefined, get: (r) => r.name, node: (r) => whoCell(r.name, r.id) },
    { key: "kingdom", label: tr("cKingdom"), nopin: true, get: (r) => r.kingdom, node: (r) => kdCell(r.kingdom, r._i <= 8) },
    { key: "alliance", label: tr("cAlliance"), get: (r) => r.alliance, node: (r) => allianceChip(r.alliance) },
    metric("powerMax", "cPowerMax"), metric("power", "cPower"), metric("merits", "cMerits"), metric("kills", "cKills"), metric("deaths", "cDeaths"), metric("heals", "cHeals"),
    metric("meritInfantry", "cInf"), metric("meritCavalry", "cCav"), metric("meritArcher", "cArc"), metric("meritMagic", "cMag"), metric("helps", "cHelps"), metric("migrationScore", "cMigration"),
    tradesCol(),
  ];
  const col = cols.find((c) => c.key === rank.sort.key) || cols.find((c) => c.key === "power");
  rows = sortRows(rows, col.get, rank.sort.dir);
  rows.forEach((r, i) => { r._i = i + 1; });
  const shown = onPage(rows, rank.page);
  const view = tableBar(out, { id: "members", title: tr("rMembers"), meta: `${numFmt().format(rows.length)} ${tr("cPlayers").toLowerCase()}`, cols, holder: rank, prop: "sort", redraw: () => KS.keepScroll($("dv"), () => drawRank(out)) });
  view.all = rows;
  out.appendChild(table(view, shown, { key: col.key, dir: rank.sort.dir }, (k) => { rank.sort = nextSort(rank.sort, k); rank.page = 1; KS.keepScroll($("dv"), () => drawRank(out)); },
    (r) => { location.hash = "k=" + r.kingdom; }));
  out.appendChild(pager(rows.length, rank.page, (p) => { rank.page = p; drawRank(out); }));
}

async function drawKvks(out, me) {
  const kvk = await KS.season.list();
  if (me !== rankToken) return;
  setLink("rank", { m: "kvk" });
  out.innerHTML = "";
  if (!kvk) { out.appendChild(el("p", "hint", tr("noDerived"))); return; }
  let rows = kvk.battles.filter((b) => b.rank).map((b) => ({ ...b.totals, id: b.id, kvk: b, have: b.have, powerMax: b.powerMax, rank: b.rank }));
  const q = rank.q.toLowerCase().replace("#", "");
  if (q) rows = rows.filter((r) => r.kvk.name.toLowerCase().includes(q) || r.kvk.kingdoms.some((k) => String(k.k).startsWith(q)));
  const cols = [
    { key: "#", label: "#", nosort: true, text: (r) => String(r.rank), cls: () => "mut" },
    { key: "kvk", label: "KvK", left: true, get: (r) => r.kvk.name, node: (r) => kvkCell(r.kvk) },
    { key: "kingdoms", label: tr("cKingdom"), left: true, w: 240, get: (r) => r.kvk.kingdoms.length, node: (r) => {
      const d = el("span", "rk-kds");
      d.append(...r.kvk.kingdoms.map((k) => kdCell(k.k, false)));
      if (r.have < r.kvk.kingdoms.length) d.append(el("small", "mut", `${r.have}/${r.kvk.kingdoms.length}`));
      return d;
    } },
    { key: "players", label: tr("cPlayers"), get: (r) => r.players, text: (r) => (r.players == null ? "–" : numFmt().format(r.players)) },
    ...[["powerMax", "cPowerMax"], ["power", "cPower"], ["merits", "cMerits"], ["kills", "cKills"], ["deaths", "cDeaths"], ["heals", "cHeals"]].map(([key, label]) => barCol(key, label, rows)),
  ];
  const col = cols.find((c) => c.key === rank.sort.key) || cols.find((c) => c.key === "powerMax");
  rows = sortRows(rows, col.get, rank.sort.dir);
  const shown = onPage(rows, rank.page);
  const view = tableBar(out, { id: "kvks", title: tr("rKvks"), meta: `${numFmt().format(rows.length)} KvK`, cols, holder: rank, prop: "sort", redraw: () => KS.keepScroll($("dv"), () => drawRank(out)) });
  view.all = rows;
  out.appendChild(table(view, shown, { key: col.key, dir: rank.sort.dir }, (k) => { rank.sort = nextSort(rank.sort, k); rank.page = 1; KS.keepScroll($("dv"), () => drawRank(out)); },
    (r) => { location.hash = "kvk=" + r.id; }));
  out.appendChild(pager(rows.length, rank.page, (p) => { rank.page = p; drawRank(out); }));
}

let rankToken = 0;
async function drawRank(out) {
  const me = ++rankToken;
  if (rank.mode === "member") return drawMembers(out, me);
  if (rank.mode === "kvk") return drawKvks(out, me);
  const [cur, kvk] = await Promise.all([load("derived/rollup.json"), KS.season.list()]);
  if (me !== rankToken) return;
  setLink("rank", {});
  out.innerHTML = "";
  if (!cur) { out.appendChild(el("p", "hint", tr("noDerived"))); return; }
  let rows = objects(cur.kingdomCols, cur.kingdoms);
  rows.forEach((r) => { r.kvk = KS.season.of(kvk, r.kingdom); r.st = kvk?.servers?.[r.kingdom]?.[1]; });
  const counts = new Map();
  rows.forEach((r) => { if (KS.season.status(r.st)) counts.set(r.st, (counts.get(r.st) || 0) + 1); });
  if (rank.st && !counts.has(Number(rank.st))) rank.st = "";
  const pills = el("nav", "kv-pills");
  const pill = (st, name, n) => {
    const b = el("button");
    b.type = "button";
    b.append(name + " ", el("small", "", numFmt().format(n)));
    b.setAttribute("aria-pressed", String(String(rank.st) === String(st)));
    b.onclick = () => { rank.st = st; rank.page = 1; drawRank(out); };
    pills.appendChild(b);
  };
  pill("", tr("kAll"), rows.length);
  [...counts.entries()].sort((a, b) => b[1] - a[1]).forEach(([st, n]) => pill(st, KS.season.status(st), n));
  if (rank.st !== "") rows = rows.filter((r) => String(r.st) === String(rank.st));
  const q = rank.q.toLowerCase(), kq = /^#?(\d+)$/.exec(q)?.[1];
  if (q) rows = rows.filter((r) => (kq && String(r.kingdom).startsWith(kq)) || String(r.topAlliance).toLowerCase().includes(q));
  const cols = [
    { key: "#", label: "#", nosort: true, text: (r) => String(r._i), cls: () => "mut" },
    { key: "kingdom", label: tr("cKingdom"), get: (r) => r.kingdom, node: (r) => kdCell(r.kingdom, r._i <= 8) },
    { key: "kvk", label: "KvK", get: (r) => r.kvk?.name ?? "", node: (r) => kvkCell(r.kvk) },
    { key: "st", label: tr("rStatus"), get: (r) => r.st ?? -1, node: (r) => statusCell(r.st) },
    { key: "topAlliance", label: tr("cTopAlliance"), get: (r) => r.topAlliance, node: (r) => allianceChip(r.topAlliance) },
    { key: "players", label: tr("cPlayers"), get: (r) => r.players, text: (r) => numFmt().format(r.players) },
    { key: "alliances", label: tr("cAlliances"), get: (r) => r.alliances, text: (r) => numFmt().format(r.alliances) },
    ...RANK_METRICS.map(([key, label]) => ({ key, label: tr(label), get: (r) => r[key],
      max: rows.reduce((m, r) => Math.max(m, r[key] ?? 0), 0) })),
    tradesCol(),
  ];
  const col = cols.find((c) => c.key === rank.sort.key) || cols.find((c) => c.key === "powerMax");
  rows = sortRows(rows, col.get, rank.sort.dir);
  rows.forEach((r, i) => { r._i = i + 1; });
  const shown = onPage(rows, rank.page);
  out.appendChild(pills);
  const view = tableBar(out, { id: "servers", title: tr("rServers"), meta: `${numFmt().format(rows.length)} kingdom`, cols, holder: rank, prop: "sort", redraw: () => KS.keepScroll($("dv"), () => drawRank(out)) });
  view.all = rows;
  out.appendChild(table(view, shown, { key: col.key, dir: rank.sort.dir }, (k) => { rank.sort = nextSort(rank.sort, k); rank.page = 1; KS.keepScroll($("dv"), () => drawRank(out)); },
    (r) => { location.hash = "k=" + r.kingdom; }));
  out.appendChild(pager(rows.length, rank.page, (p) => { rank.page = p; drawRank(out); }));
}

// ---- migration: who went from where to where in a span of scans, by player or by kingdom ----
const mig = { a: "", b: "", view: "lords", k: 0, q: "", min: KS.DEFAULT_POWER / 1e6, page: 1, sort: { key: "power", dir: -1 }, flowSort: { key: "netCount", dir: -1 } };

async function showMigration() {
  const hp = new URLSearchParams(location.hash.slice(1)), idx = await index();
  if (!idx) { $("dv").textContent = tr("noDerived"); return; }
  const scans = idx.scans.map((s) => s.scan);
  if (hp.get("p") === "migration") {
    mig.a = hp.get("a") || mig.a; mig.b = hp.get("b") || mig.b;
    mig.view = hp.get("v") === "servers" ? "servers" : "lords";
    mig.k = Number(hp.get("k")) || 0; mig.q = hp.get("q") || "";
  }
  if (!scans.includes(mig.b)) mig.b = scans[scans.length - 1];
  if (!scans.includes(mig.a)) mig.a = scans[Math.max(0, scans.length - 2)];
  const { ctl, out } = frame();
  const data = await load("derived/migrations.json");
  if (!data) { out.textContent = tr("dvLoadErr"); return; }
  const moves = objects(data.cols, data.rows);
  const redraw = () => drawMigration(out, moves);
  const restart = () => { mig.page = 1; redraw(); };
  const kBox = searchBox(tr("mKingdom"), mig.k || "", (v) => { mig.k = /^#?\d+$/.test(v) ? Number(v.replace("#", "")) : 0; restart(); });
  kBox.inputMode = "numeric"; kBox.classList.add("dv-k2");
  const min = el("input", "dv-n");
  min.type = "number"; min.min = 0; min.step = 5; min.value = mig.min;
  min.addEventListener("input", () => { mig.min = Number(min.value) || 0; restart(); });
  const tabs = el("nav", "modes dv-tabs");
  const setView = (v) => {
    mig.view = v;
    tabs.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.v === v)));
  };
  for (const [v, t] of [["lords", "mLords"], ["servers", "mServers"]]) {
    const b = el("button", "", tr(t));
    b.type = "button"; b.dataset.v = v;
    b.onclick = () => { setView(v); restart(); };
    tabs.appendChild(b);
  }
  ctl.append(tabs,
    dayField(tr("mStart"), scans.slice().reverse(), mig.a, (v) => { mig.a = v; restart(); }),
    dayField(tr("mEnd"), scans.slice().reverse(), mig.b, (v) => { mig.b = v; restart(); }),
    kBox, searchBox(tr("mLord"), mig.q, (v) => { mig.q = v; restart(); }), field(tr("mMin"), min));
  setView(mig.view);
  redraw();
}

// the moves in a span: found after the first scan and by the last; one seen in both kingdoms within the first scan
// happened during it, and belongs too
function movesInSpan(moves) {
  const [a, b] = mig.a <= mig.b ? [mig.a, mig.b] : [mig.b, mig.a];
  return moves.filter((m) => m.toScan <= b && (m.toScan > a || (m.toScan === a && m.fromScan === a)));
}

function drawMigration(out, moves) {
  setLink("migration", { a: mig.a, b: mig.b, v: mig.view === "lords" ? "" : "servers", k: mig.k || "", q: mig.q });
  const minP = mig.min * 1e6, q = mig.q.toLowerCase();
  let list = movesInSpan(moves).filter((m) => (m.power ?? 0) >= minP);
  if (q) list = list.filter((m) => String(m.id) === q || String(m.name).toLowerCase().includes(q));
  out.innerHTML = "";
  if (mig.view === "servers") return drawFlows(out, list, moves);
  if (mig.k) list = list.filter((m) => m.from === mig.k || m.to === mig.k);
  const stat = (key, label) => barCol(key, label, list);
  const kCell = (key, label) => ({ key, label: tr(label), get: (m) => m[key], node: (m) => kdCell(m[key]) });
  const cols = [
    { key: "name", label: tr("gName"), get: (m) => m.name, node: (m) => whoCell(m.name, m.id), left: true },
    kCell("from", "mFrom"), kCell("to", "mTo"),
    { key: "allianceFrom", label: tr("mAllianceFrom"), get: (m) => m.allianceFrom, node: (m) => allianceChip(m.allianceFrom) },
    { key: "allianceTo", label: tr("mAllianceTo"), get: (m) => m.allianceTo, node: (m) => allianceChip(m.allianceTo) },
    stat("powerMax", "cPowerMax"), stat("power", "cPower"), stat("merits", "cMerits"), stat("kills", "cKills"), stat("deaths", "cDeaths"), stat("heals", "cHeals"),
    { key: "date", label: tr("mDate"), get: (m) => m.arrivedAt, text: (m) => `${stamp(m.seenAt)} → ${stamp(m.arrivedAt)}`,
      tip: (m) => tr("mWindow").replace("{a}", stamp(m.seenAt)).replace("{b}", stamp(m.arrivedAt)), cls: () => "mut" },
  ];
  const col = cols.find((c) => c.key === mig.sort.key) || cols.find((c) => c.key === "power");
  list = sortRows(list, col.get, mig.sort.dir);
  list.forEach((m, i) => { m._i = i + 1; });
  const people = new Set(list.map((m) => m.id)).size;
  if (!list.length) { out.appendChild(el("p", "hint mut", tr("mNone"))); return; }
  const go = () => drawMigration(out, moves);
  const view = tableBar(out, { id: "moves", title: tr("cPlayers"), meta: `${numFmt().format(list.length)} ${tr("cPlayers").toLowerCase()}`, cols, holder: mig, prop: "sort", redraw: () => KS.keepScroll($("dv"), go) });
  view.all = list;
  out.appendChild(table(view, onPage(list, mig.page), { key: col.key, dir: mig.sort.dir },
    (k) => { mig.sort = nextSort(mig.sort, k); mig.page = 1; KS.keepScroll($("dv"), go); }));
  out.appendChild(pager(list.length, mig.page, (p) => { mig.page = p; go(); }));
}

// a kingdom's line: how many came in and went out, and how much power that is (at each player's newest numbers)
function drawFlows(out, list, moves) {
  const by = new Map(), row = (k) => by.get(k) || by.set(k, { kingdom: k, countIn: 0, countOut: 0, powerIn: 0, powerOut: 0 }).get(k);
  for (const m of list) {
    const i = row(m.to), o = row(m.from);
    i.countIn++; i.powerIn += m.power ?? 0;
    o.countOut++; o.powerOut += m.power ?? 0;
  }
  let rows = [...by.values()];
  if (mig.k) rows = rows.filter((r) => r.kingdom === mig.k);
  const int = (v) => numFmt().format(v);
  const netCls = (n) => (n > 0 ? "dv-up" : n < 0 ? "dv-down" : "");
  const cols = [
    { key: "kingdom", label: tr("cKingdom"), get: (r) => r.kingdom, node: (r) => kdCell(r.kingdom) },
    { key: "countIn", label: `${tr("cPlayers")} ${tr("mIn")}`, get: (r) => r.countIn, text: (r) => int(r.countIn) },
    { key: "countOut", label: `${tr("cPlayers")} ${tr("mOut")}`, get: (r) => r.countOut, text: (r) => int(r.countOut) },
    { key: "netCount", label: `${tr("cPlayers")} ${tr("mNet")}`, get: (r) => r.countIn - r.countOut, text: (r) => (r.countIn > r.countOut ? "+" : "") + int(r.countIn - r.countOut), cls: (r) => netCls(r.countIn - r.countOut) },
    { key: "powerIn", label: `${tr("cPower")} ${tr("mIn")}`, get: (r) => r.powerIn },
    { key: "powerOut", label: `${tr("cPower")} ${tr("mOut")}`, get: (r) => r.powerOut },
    { key: "netPower", label: `${tr("cPower")} ${tr("mNet")}`, get: (r) => r.powerIn - r.powerOut, text: (r) => signed(r.powerIn - r.powerOut), tip: (r) => fullNum(r.powerIn - r.powerOut), cls: (r) => netCls(r.powerIn - r.powerOut) },
  ];
  const col = cols.find((c) => c.key === mig.flowSort.key) || cols[3];
  rows = sortRows(rows, col.get, mig.flowSort.dir);
  rows.forEach((r, i) => { r._i = i + 1; });
  const go = () => drawMigration(out, moves);
  const view = tableBar(out, { id: "flows", title: tr("cKingdom"), meta: `${numFmt().format(rows.length)} kingdom`, cols, holder: mig, prop: "flowSort", redraw: () => KS.keepScroll($("dv"), go) });
  view.all = rows;
  out.appendChild(table(view, onPage(rows, mig.page), { key: col.key, dir: mig.flowSort.dir },
    (k) => { mig.flowSort = nextSort(mig.flowSort, k); mig.page = 1; KS.keepScroll($("dv"), go); },
    (r) => {
      mig.k = r.kingdom; mig.page = 1; mig.view = "lords"; mig.q = "";
      setLink("migration", { a: mig.a, b: mig.b, k: mig.k });
      showMigration();
    }));
  out.appendChild(pager(rows.length, mig.page, (p) => { mig.page = p; go(); }));
}

KS.ui = { el, num, load, objects, table, sortRows, nextSort, searchBox, fmtBtn, pager, frame, setLink };
KS.pages = {
  rank: { title: "navRank", desc: "descRank", show: showRank },
  migration: { title: "navMigration", desc: "descMigration", show: showMigration },
};
})();
