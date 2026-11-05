// The pages over all kingdoms: ranking and migration. A classic script loaded after compare.js; what it needs from the
// page comes through window.KS. They read the tables in data/derived/, worked out ahead when the data is exported.
// Links: #p=rank (&st=<status>&gen=<generation>: the filters picked, kept in the link as they change; &at=<kingdom>: opens on its line) · #p=migration&a=<scan>&b=<scan>&v=servers&k=<kingdom>&q=<id or name>
(() => {
"use strict";
const KS = window.KS, { state, tr, $, numFmt, fitPop } = KS;

Object.assign(KS.T.vi, {
  descKingdom: "Người chơi của từng kingdom theo ngày. Bật So sánh để xem mỗi người tăng giảm bao nhiêu giữa 2 ngày.",
  descCompare: "Đối chiếu hai phe, mỗi phe gồm một hoặc nhiều kingdom, ở ngày mới nhất.",
  descRank: "Xếp hạng các kingdom ở ngày mới nhất, tính người có lực chiến hiện tại trên 15M.",
  descMigration: "Ai đã chuyển từ kingdom nào sang kingdom nào giữa 2 ngày.",
  navRank: "Xếp hạng", navMigration: "Di cư", cmpDays: "So sánh", modeLabel: "Chế độ", modeNormal: "Thường", cmpRemove: "Bỏ", cmpDaysTip: "So sánh 2 ngày của một hoặc nhiều kingdom: mỗi người tăng bao nhiêu",
  noDerived: "Chưa có dữ liệu tổng hợp (data/derived/).", dvLoadErr: "Không tải được dữ liệu.",
  rKingdoms: "kingdom", 
  rSearch: "#kingdom, tag…", rSearchK: "SoS8-10045, #kingdom…", rHint: "Tính theo người có lực chiến hiện tại trên 15M, trong top lực chiến mỗi kingdom. Bấm một dòng để mở.",
  cKingdom: "Kingdom", cGen: "Gen", cTopAlliance: "Liên Minh", cPlayers: "Người chơi",
  cPower: "Lực chiến", cPowerMax: "LC max", cMerits: "Công trạng", cKills: "Tiêu diệt", cDeaths: "Tử trận", cHeals: "Chữa trị", cHelps: "Giúp đỡ", cGathered: "Thu thập",
  cMigration: "Điểm di cư", cDecor: "Decor max", cInf: "CT bộ", cCav: "CT kỵ", cArc: "CT cung", cMag: "CT phép",
  gFrom: "Từ", gTo: "Đến", gName: "Người chơi",
  mStart: "Từ ngày", mEnd: "Đến ngày", mLords: "Người chơi", mServers: "Kingdom", mKingdom: "Kingdom", mLord: "ID / tên", mMin: "Lực chiến > (M)",
  mFrom: "Từ", mTo: "Đến", mAllianceFrom: "LM cũ", mAllianceTo: "LM mới", mDate: "Thời điểm",
  mTotal: "lượt di cư", mPeople: "người", mPage: "Trang", mPrev: "◀ Trước", mNext: "Sau ▶", mNone: "Không có lượt di cư nào khớp.", mWindow: "Còn ở kingdom cũ lúc {a}, đã ở kingdom mới lúc {b}",
  mIn: "vào", mOut: "ra", mNet: "ròng", mHint: "Lực chiến và các số khác là số mới nhất. Ngày di cư thật nằm trong khoảng hiện ở cột Thời điểm. Chỉ thấy người có trong top lực chiến ≥ 5M ở cả hai đầu.",
});
Object.assign(KS.T.en, {
  descKingdom: "Each kingdom's players by day. Turn on Compare to see how much each one changed between two days.",
  descCompare: "Two sides face to face, each of one or more kingdoms, on the newest day.",
  descRank: "Kingdoms ranked on the newest day, counting players above 15M power now.",
  descMigration: "Who moved from which kingdom to which between two days.",
  navRank: "Rankings", navMigration: "Migration", cmpDays: "Compare", modeLabel: "Mode", modeNormal: "Normal", cmpRemove: "Remove", cmpDaysTip: "Compare two days of one or more kingdoms: how much each player gained",
  noDerived: "No summary data yet (data/derived/).", dvLoadErr: "Could not load the data.",
  rKingdoms: "kingdoms", 
  rSearch: "#kingdom, tag…", rSearchK: "SoS8-10045, #kingdom…", rHint: "Counts players whose power now is above 15M, within each kingdom's power ranking. Click a line to open it.",
  cKingdom: "Kingdom", cGen: "Gen", cTopAlliance: "Alliance", cPlayers: "Players",
  cPower: "Power", cPowerMax: "Max power", cMerits: "Merits", cKills: "Kills", cDeaths: "Dead", cHeals: "Healed", cHelps: "Helps", cGathered: "Gathered",
  cMigration: "Migration score", cDecor: "Max decor", cInf: "Infantry", cCav: "Cavalry", cArc: "Archers", cMag: "Magic",
  gFrom: "From", gTo: "To", gName: "Player",
  mStart: "From", mEnd: "To", mLords: "Players", mServers: "Kingdoms", mKingdom: "Kingdom", mLord: "ID / name", mMin: "Power > (M)",
  mFrom: "From", mTo: "To", mAllianceFrom: "Past alliance", mAllianceTo: "New alliance", mDate: "When",
  mTotal: "moves", mPeople: "players", mPage: "Page", mPrev: "◀ Prev", mNext: "Next ▶", mNone: "No move matches.", mWindow: "Still in the old kingdom at {a}, in the new one at {b}",
  mIn: "in", mOut: "out", mNet: "net", mHint: "Power and the other numbers are the newest known. The real moment lies within the range in the When column. Only players on the power ranking at 5M or more at both ends can be seen.",
});

const PAGE_SIZES = [20, 50, 100, 200, 0]; // 0 = all
// rows a page: 20 each time the site opens; a pick lasts while it stays open, not saved (a page of "All" is heavy to draw)
const sessionSize = {};
const pageSize = () => sessionSize.pageSize ?? 20;
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
// numbers short (1.2M) or in full (1,234,567): a two-way choice, both written out so neither reads as a figure
function fmtBtn(redraw) {
  const b = el("div", "rk-seg fmt-seg");
  b.setAttribute("role", "group"); b.title = tr("fmtTip");
  const press = () => b.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String((x.dataset.c === "1") === state.compact)));
  for (const [c, label] of [["1", "1.2M"], ["0", "1,234,567"]]) {
    const x = el("button", "", label);
    x.type = "button"; x.dataset.c = c;
    x.onclick = () => {
      if ((c === "1") === state.compact) return;
      state.compact = c === "1";
      KS.store.set("compact", state.compact);
      $("fmtBtn").setAttribute("aria-pressed", String(state.compact));
      press(); redraw();
    };
    b.appendChild(x);
  }
  press();
  return b;
}
// "Show [20] per page", then the page buttons: 1 2 3 ... 373
function pager(total, page, go, { size = pageSize(), sizes = PAGE_SIZES, key = "pageSize" } = {}) {
  const pages = size ? Math.max(1, Math.ceil(total / size)) : 1, box = el("div", "dv-pager"), left = el("label", "dv-psize"), pick = el("select"), nums = el("nav", "dv-pnums");
  for (const n of sizes) { const o = el("option", "", n ? String(n) : tr("all")); o.value = n; pick.appendChild(o); }
  pick.value = size;
  pick.onchange = () => { if (key === "pageSize") sessionSize[key] = Number(pick.value); else KS.store.set(key, Number(pick.value)); go(1); };
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
// a sortable table: cols = [{key, label, get(row), text(row), cls(row), tip(row), nosort, ranked, max, bar(row)}]; sort = {key, dir};
// a ranked column takes its colour from the row's place in the whole list, r._i
const HEAD_ICONS = new Set(["power", "merits", "kills", "deaths", "heals"]);
// the cells shared by the tables: a name with its ID under it, a kingdom chip, a figure with its bar
const whoCell = (name, id) => { const d = el("span", "who"); d.append(el("b", "", name ?? "–"), el("small", "", String(id ?? ""))); return d; };
const kdCell = (k, top) => el("span", top ? "kd top" : "kd", "#" + k);
const barCol = (key, label, rows) => ({ key, label: tr(label), get: (r) => r[key], max: rows.reduce((m, r) => Math.max(m, r[key] ?? 0), 0) });
// Widths come from every row of the list (cols.all), not the ones on this page: sorting or paging never moves a column
const NODE_W = { name: 190, kingdom: 76, from: 76, to: 76, kvk: 190, st: 156, alliance: 96, allianceFrom: 96, allianceTo: 96, topAlliance: 96, trades: 84 };
const measure = document.createElement("canvas").getContext("2d");
const digitWs = new Map();
function digitW(font, family) {
  let w = digitWs.get(font);
  if (w === undefined) {
    const s = el("span", "", "0000000000");
    s.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${font} ${family};font-variant-numeric:tabular-nums`;
    document.body.appendChild(s);
    w = s.getBoundingClientRect().width / 10;
    s.remove();
    digitWs.set(font, w);
  }
  return w;
}
function textW(text, font) {
  const family = getComputedStyle(document.body).fontFamily, rest = text.replace(/\d/g, "");
  measure.font = `${font} ${family}`;
  return measure.measureText(rest).width + (text.length - rest.length) * digitW(font, family);
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
    if (!pop.hidden) requestAnimationFrame(() => fitPop(pop)); // kept open across a redraw: placed once it is on the page
    button.setAttribute("aria-haspopup", "true");
    button.setAttribute("aria-expanded", String(!pop.hidden));
    button.onclick = () => {
      const on = pop.hidden; barPop = on ? id + name : "";
      document.querySelectorAll(".dv-tbar .pop").forEach((x) => { x.hidden = true; x.previousElementSibling?.setAttribute("aria-expanded", "false"); });
      pop.hidden = !on; button.setAttribute("aria-expanded", String(on));
      if (on) fitPop(pop);
    };
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
  const viewBtn = el("button", "btn");
  viewBtn.type = "button";
  viewBtn.innerHTML = $("viewBtn").innerHTML; // the Kingdom table's View button as it is: icon, its translated word, the arrow
  const view = el("div", "pop view-pop");
  // and its menu's row for the number format: the same switch line as there
  const fmtRow = el("button", "vopt");
  fmtRow.type = "button"; fmtRow.setAttribute("role", "switch");
  fmtRow.innerHTML = $("fmtBtn").innerHTML;
  fmtRow.setAttribute("aria-pressed", String(state.compact));
  fmtRow.onclick = () => {
    state.compact = !state.compact;
    KS.store.set("compact", state.compact);
    $("fmtBtn").setAttribute("aria-pressed", String(state.compact));
    fmtRow.setAttribute("aria-pressed", String(state.compact));
    redraw();
  };
  view.append(el("h3", "", tr("viewTitle")), fmtRow);
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
  document.querySelectorAll(".dv-tbar .pop").forEach((x) => { x.hidden = true; x.previousElementSibling?.setAttribute("aria-expanded", "false"); });
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
      if (c.max) { // a column may draw its bar from another number than it sorts by
        const bar = c.bar ? c.bar(r) : c.get(r);
        if (bar != null) { td.classList.add("pg", "b-" + c.key); td.style.setProperty("--p", Math.max(0, bar / c.max)); }
      }
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
  $("dvSlot").innerHTML = ""; // what the page puts in its header
  const ctl = el("div", "dv-ctl"), out = el("div", "dv-out");
  box.append(ctl, out);
  return { ctl, out };
}

// ---- ranking: the kingdoms of one scan, optionally against an older one ----
// in the order of the server ranking's columns: the migration score with its bands, then power with max decor after max power;
// helps and gathered last; those two and the merits by troop type hidden until asked for (RANK_HIDDEN)
const RANK_METRICS = [
  ["migrationScore", "cMigration"], ["migration24", "24–27"], ["migration28", "28–30"], ["migration31", "31+"],
  ["power", "cPower"], ["powerMax", "cPowerMax"], ["decorMax", "cDecor"], ["merits", "cMerits"], ["kills", "cKills"], ["deaths", "cDeaths"], ["heals", "cHeals"],
  ["meritInfantry", "cInf"], ["meritCavalry", "cCav"], ["meritArcher", "cArc"], ["meritMagic", "cMag"],
];
const RANK_LAST = [["helps", "cHelps"], ["gathered", "cGathered"]];
const RANK_HIDDEN = [...RANK_LAST.map(([k]) => k), "meritInfantry", "meritCavalry", "meritArcher", "meritMagic"];
const tradesCol = () => ({ key: "trades", label: "Trades", get: (r) => r.trades, tip: () => tr("tradesTip"), node: (r) => el("span", "tr-b", r.trades == null ? "–" : numFmt(0).format(r.trades) + "%") });
const RANK_DEFAULT = { server: "migrationScore", member: "power", kvk: "powerMax" }; // what each ranking is sorted by when it opens
const rank = { q: "", page: 1, sort: { key: RANK_DEFAULT.server, dir: -1 }, mode: "server", st: "", gen: "", at: 0 }; // at: the kingdom to open on

async function showRank() {
  const { ctl, out } = frame();
  const hp = new URLSearchParams(location.hash.slice(1));
  const asked = { players: "member", kvk: "kvk" }[hp.get("m")] || "server";
  if (rank.mode !== asked) { rank.mode = asked; rank.sort = { key: RANK_DEFAULT[asked], dir: -1 }; rank.page = 1; }
  // a shared link, or from a Kingdom page: the server ranking as it opens with the link's filters, on that kingdom's line
  if (asked === "server" && ["at", "st", "gen"].some((x) => hp.has(x)))
    Object.assign(rank, { at: Number(hp.get("at")) || 0, q: "", st: hp.get("st") || "", gen: hp.get("gen") || "", page: 1, sort: { key: RANK_DEFAULT.server, dir: -1 } });
  const redraw = () => drawRank(out);
  const restart = () => { rank.page = 1; redraw(); };
  const seg = el("nav", "rk-seg");
  const box = searchBox("", rank.q, (v) => { rank.q = v; restart(); });
  box.classList.add("dv-wide");
  const paint = () => {
    box.placeholder = tr(rank.mode === "member" ? "rSearchP" : rank.mode === "kvk" ? "rSearchK" : "rSearch");
    seg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.m === rank.mode)));
  };
  for (const [m, label] of [["server", "rServers"], ["member", "rMembers"], ["kvk", "rKvks"]]) {
    const b = el("button", "", tr(label));
    b.type = "button"; b.dataset.m = m;
    b.onclick = () => { if (rank.mode === m) return; rank.mode = m; rank.sort = { key: RANK_DEFAULT[m], dir: -1 }; paint(); restart(); };
    seg.appendChild(b);
  }
  paint();
  $("dvSlot").appendChild(seg);
  ctl.appendChild(box);
  redraw();
}

// the KvK of each kingdom, a chip like the sample's: its code and season
// the Kingdom column of the KvK ranking: two camps a line (a map is mostly 4 camps of 2 kingdoms), as wide as twice
// the widest camp, up to 3 kingdoms a camp: a bigger camp's kingdoms wrap inside its frame. A chip is 40px (47 with
// 4 digits) and 3 apart, a frame 8 around them
const chipW = (k) => (k.k > 999 ? 47 : 40) + 3;
const CAMPS_MAX_W = 2 * (3 * 50 + 5) + 8 + 20;
const campsW = (rows) => Math.min(CAMPS_MAX_W, Math.max(0, ...rows.map((r) =>
  2 * Math.max(...KS.season.camps(r.kvk).map(([, list]) => list.slice(0, 3).reduce((x, k) => x + chipW(k), 5))) + 8 + 20)));
const kvkCell = (b) => {
  if (!b) return el("span", "mut", "–");
  const a = el("a", "rk-kvk");
  a.href = "#kvk=" + b.id;
  a.onclick = (e) => e.stopPropagation();
  a.append(el("b", "", b.name), el("small", "mut", KS.season.title(b.season)));
  return a;
};
// the status column as wide as its longest chip: padding 8 + border 1 a side, the cell's padding 10 a side, and 6 to
// spare: the canvas measures the text a pixel or so short of the page, and the cell's ellipsis shows for any overflow
const statusW = (rows) => Math.ceil(Math.max(0, ...rows.map((r) => textW(KS.season.status(r.st), "600 12px"))) + 18 + 20 + 6);
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
    { key: "kvk", label: "KvK", get: (r) => r.kvk.name, node: (r) => kvkCell(r.kvk) }, // centred like the other columns: the spare width spreads evenly
    { key: "kingdoms", label: tr("cKingdom"), w: campsW(rows), get: (r) => r.kvk.kingdoms.length, node: (r) => {
      // a box per camp, so the camps read apart (kingdoms not given a camp yet: one box of their own)
      const d = el("span", "rk-kds");
      for (const [camp, list] of KS.season.camps(r.kvk)) {
        const box = d.appendChild(el("span", "rk-camp"));
        box.title = camp ? `${tr("kCamp")} ${camp}` : "";
        box.append(...list.map((k) => el("span", "kd", String(k.k)))); // no "#": chipW sizes the camps for the bare number
        box.style.gridTemplateColumns = `repeat(${Math.ceil(list.length / Math.ceil(list.length / 3))}, auto)`; // a big camp in even lines: 6 is 3 + 3
      }
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
  setLink("rank", { st: rank.st, gen: rank.gen }); // the filters picked: the link shares them
  out.innerHTML = "";
  if (!cur) { out.appendChild(el("p", "hint", tr("noDerived"))); return; }
  let rows = objects(cur.kingdomCols, cur.kingdoms);
  rows.forEach((r) => { r.kvk = KS.season.of(kvk, r.kingdom); r.st = kvk?.servers?.[r.kingdom]?.[1]; r.stf = KS.season.filterOf(r.st); r.gen = kvk?.genOf?.[r.kingdom]; });
  const all = rows; // before any filter: the columns keep their width
  const counts = new Map();
  rows.forEach((r) => { if (r.stf != null) counts.set(r.stf, (counts.get(r.stf) || 0) + 1); }); // a filter per status that has one
  if (rank.st && !counts.has(Number(rank.st))) rank.st = "";
  // the two filters, a line each: a name, then its buttons (All, then each value with its colour dot and count)
  const filterLine = (name) => { const line = el("div", "rk-filter"), nav = el("nav", "rk-pills"); line.append(el("span", "rk-filter-l", name), nav); return line; };
  const pills = filterLine(tr("rStatus")), genPills = filterLine(tr("cGen"));
  // a filter button: `prop` of `rank` set to `v`; data-st / data-gen give the dot its colour
  const pill = (line, prop, v, name, n) => {
    const b = el("button");
    b.type = "button";
    if (v !== "") { b.dataset[prop] = v; b.appendChild(el("i", "rk-dot")); }
    b.append(name, el("small", "", numFmt().format(n)));
    b.setAttribute("aria-pressed", String(String(rank[prop]) === String(v)));
    b.onclick = () => { rank[prop] = v; rank.page = 1; drawRank(out); };
    line.lastChild.appendChild(b);
  };
  pill(pills, "st", "", tr("kAll"), rows.length);
  [...counts.entries()].sort((a, b) => b[1] - a[1]).forEach(([st, n]) => pill(pills, "st", st, KS.season.status(st), n));
  if (rank.st !== "") rows = rows.filter((r) => String(r.stf) === String(rank.st));
  // the SoS generation, counted within the status picked
  const gens = new Map();
  rows.forEach((r) => { if (r.gen) gens.set(r.gen, (gens.get(r.gen) || 0) + 1); });
  if (rank.gen && !gens.has(Number(rank.gen))) rank.gen = "";
  if (gens.size) {
    pill(genPills, "gen", "", tr("kAll"), rows.length);
    [...gens.entries()].sort((a, b) => a[0] - b[0]).forEach(([g, n]) => pill(genPills, "gen", g, `${tr("cGen")} ${g}`, n));
  }
  if (rank.gen !== "") rows = rows.filter((r) => String(r.gen) === String(rank.gen));
  const q = rank.q.toLowerCase(), kq = /^#?(\d+)$/.exec(q)?.[1];
  if (q) rows = rows.filter((r) => (kq && String(r.kingdom).startsWith(kq)) || String(r.topAlliance).toLowerCase().includes(q));
  const metricCol = ([key, label]) => ({ key, label: tr(label), get: (r) => r[key], max: rows.reduce((m, r) => Math.max(m, r[key] ?? 0), 0) });
  const cols = [
    { key: "#", label: "#", nosort: true, text: (r) => String(r._i), cls: () => "mut" },
    { key: "kingdom", label: tr("cKingdom"), get: (r) => r.kingdom, node: (r) => kdCell(r.kingdom, r._i <= 8) },
    { key: "topAlliance", label: tr("cTopAlliance"), get: (r) => r.topAlliance, node: (r) => allianceChip(r.topAlliance) }, // its top alliance
    // no KvK column when none of the kingdoms listed is in one (a filter on the ones being paired, say)
    ...(rows.some((r) => r.kvk) ? [{ key: "kvk", label: "KvK", get: (r) => r.kvk?.name ?? "", node: (r) => kvkCell(r.kvk) }] : []),
    { key: "st", label: tr("rStatus"), w: statusW(all), get: (r) => r.st ?? -1, node: (r) => statusCell(r.st) },
    { key: "gen", label: tr("cGen"), w: 60, get: (r) => r.gen ?? 0, node: (r) => { if (!r.gen) return el("span", "mut", "–"); const g = el("span", "rk-gen", String(r.gen)); g.dataset.gen = r.gen; return g; } },
    ...RANK_METRICS.slice(0, 4).map(metricCol), // the migration score and its bands
    { key: "players", label: tr("cPlayers"), get: (r) => r.players, text: (r) => numFmt().format(r.players) },
    ...RANK_METRICS.slice(4).map(metricCol),
    tradesCol(),
    ...RANK_LAST.map(metricCol),
  ];
  const col = cols.find((c) => c.key === rank.sort.key) || cols.find((c) => c.key === RANK_DEFAULT.server);
  rows = sortRows(rows, col.get, rank.sort.dir);
  rows.forEach((r, i) => { r._i = i + 1; r._cls = r.kingdom === rank.at ? "rk-focus" : ""; });
  const at = rows.findIndex((r) => r.kingdom === rank.at), size = pageSize();
  if (at >= 0 && size) rank.page = Math.floor(at / size) + 1;
  const shown = onPage(rows, rank.page);
  out.appendChild(pills);
  if (gens.size) out.appendChild(genPills);
  // a new id: the hidden columns kept under "servers" were saved before helps and gathered were hidden at first
  const view = tableBar(out, { id: "rankServers", title: tr("rServers"), meta: `${numFmt().format(rows.length)} kingdom`, cols, holder: rank, prop: "sort", hideFirst: RANK_HIDDEN, redraw: () => KS.keepScroll($("dv"), () => drawRank(out)) });
  view.all = rows;
  out.appendChild(table(view, shown, { key: col.key, dir: rank.sort.dir }, (k) => { rank.sort = nextSort(rank.sort, k); rank.page = 1; KS.keepScroll($("dv"), () => drawRank(out)); },
    (r) => { location.hash = "k=" + r.kingdom; }));
  out.appendChild(pager(rows.length, rank.page, (p) => { rank.page = p; drawRank(out); }));
  if (at >= 0) requestAnimationFrame(() => out.querySelector("tr.rk-focus")?.scrollIntoView({ block: "center" }));
  rank.at = 0; // once: the next redraw (a sort, a filter) keeps the user's place
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
  const tabs = el("nav", "rk-seg");
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
  $("dvSlot").appendChild(tabs);
  const qBox = searchBox(tr("mLord"), mig.q, (v) => { mig.q = v; restart(); });
  qBox.classList.add("mg-q");
  ctl.classList.add("mg-ctl");
  ctl.append(
    dayField(tr("mStart"), scans.slice().reverse(), mig.a, (v) => { mig.a = v; restart(); }),
    dayField(tr("mEnd"), scans.slice().reverse(), mig.b, (v) => { mig.b = v; restart(); }),
    kBox, qBox, field(tr("mMin"), min));
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
  let list = movesInSpan(moves).filter((m) => KS.filterPower(m) > minP);
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

KS.ui = { el, num, load, objects, table, tableBar, sortRows, nextSort, searchBox, fmtBtn, pager, pageSize, frame, setLink };
KS.pages = {
  rank: { title: "navRank", desc: "descRank", show: showRank },
  migration: { title: "navMigration", desc: "descMigration", show: showMigration },
};
})();
