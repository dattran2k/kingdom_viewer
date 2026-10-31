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
  rSearch: "#kingdom, tag…", rHint: "Tính theo người có lực chiến hiện tại trên 15M, trong top lực chiến mỗi kingdom. Bấm một dòng để mở.",
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
  rSearch: "#kingdom, tag…", rHint: "Counts players whose power now is above 15M, within each kingdom's power ranking. Click a line to open it.",
  cKingdom: "Kingdom", cTopAlliance: "Top alliance", cPlayers: "Players", cAlliances: "Alliances",
  cPower: "Power", cPowerMax: "Peak power", cMerits: "Merits", cKills: "Kills", cDeaths: "Dead", cHeals: "Healed", cHelps: "Helps", cGathered: "Gathered",
  cMigration: "Migration score", cDecor: "Max decor", cInf: "Infantry", cCav: "Cavalry", cArc: "Archers", cMag: "Magic",
  gFrom: "From", gTo: "To", gName: "Player",
  mStart: "From", mEnd: "To", mLords: "Players", mServers: "Kingdoms", mKingdom: "Kingdom", mLord: "ID / name", mMin: "Power ≥ (M)",
  mFrom: "From", mTo: "To", mAllianceFrom: "Past alliance", mAllianceTo: "New alliance", mDate: "When",
  mTotal: "moves", mPeople: "players", mPage: "Page", mPrev: "◀ Prev", mNext: "Next ▶", mNone: "No move matches.", mWindow: "Still in the old kingdom at {a}, in the new one at {b}",
  mIn: "in", mOut: "out", mNet: "net", mHint: "Power and the other numbers are the newest known. The real moment lies within the range in the When column. Only players on the power ranking at 5M or more at both ends can be seen.",
});

const PAGE_SIZE = 50, MOVES_PAGE_SIZE = 300;
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
function pager(total, page, go, size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(total / size)), box = el("div", "dv-pager");
  if (pages < 2) return box;
  const btn = (t, to, off) => { const b = el("button", "btn", t); b.type = "button"; b.disabled = off; b.onclick = () => go(to); return b; };
  box.append(btn(tr("mPrev"), page - 1, page <= 1), el("span", "mut", `${tr("mPage")} ${page} / ${pages}`), btn(tr("mNext"), page + 1, page >= pages));
  return box;
}
// a sortable table: cols = [{key, label, get(row), text(row), cls(row), tip(row), nosort, ranked}]; sort = {key, dir};
// a ranked column takes its colour from the row's place in the whole list, r._i
function table(cols, rows, sort, onSort, onRow) {
  const wrap = el("div", "tbl-wrap dv-wrap"), t = el("table", "tbl"), hr = el("tr");
  for (const c of cols) {
    const th = el("th", sort.key === c.key ? "on" : "", c.label);
    if (sort.key === c.key) th.dataset.dir = sort.dir < 0 ? "▼" : "▲";
    if (c.nosort) th.classList.add("nosort");
    else th.onclick = () => onSort(c.key);
    hr.appendChild(th);
  }
  t.appendChild(el("thead")).appendChild(hr);
  const tb = t.appendChild(el("tbody"));
  for (const r of rows) {
    const line = el("tr");
    for (const c of cols) {
      const td = el("td", c.cls?.(r) || "", c.node ? null : c.text ? c.text(r) : num(c.get(r)));
      if (c.node) td.appendChild(c.node(r));
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
const rank = { q: "", page: 1, sort: { key: "powerMax", dir: -1 } };

async function showRank() {
  const { ctl, out } = frame();
  const redraw = () => drawRank(out);
  const restart = () => { rank.page = 1; redraw(); };
  ctl.append(searchBox(tr("rSearch"), rank.q, (v) => { rank.q = v; restart(); }), fmtBtn(redraw));
  redraw();
}

let rankToken = 0;
async function drawRank(out) {
  const me = ++rankToken;
  const cur = await load("derived/rollup.json");
  if (me !== rankToken) return;
  setLink("rank", {});
  out.innerHTML = "";
  if (!cur) { out.appendChild(el("p", "hint", tr("noDerived"))); return; }
  let rows = objects(cur.kingdomCols, cur.kingdoms);
  const q = rank.q.toLowerCase(), kq = /^#?(\d+)$/.exec(q)?.[1];
  if (q) rows = rows.filter((r) => (kq && String(r.kingdom).startsWith(kq)) || String(r.topAlliance).toLowerCase().includes(q));
  const cols = [
    { key: "#", label: "#", nosort: true, text: (r) => String(r._i), cls: () => "mut" },
    { key: "kingdom", label: tr("cKingdom"), get: (r) => r.kingdom, text: (r) => "#" + r.kingdom, cls: () => "dv-b", ranked: true },
    { key: "topAlliance", label: tr("cTopAlliance"), get: (r) => r.topAlliance, node: (r) => allianceChip(r.topAlliance) },
    { key: "players", label: tr("cPlayers"), get: (r) => r.players, text: (r) => numFmt().format(r.players) },
    { key: "alliances", label: tr("cAlliances"), get: (r) => r.alliances, text: (r) => numFmt().format(r.alliances) },
    ...RANK_METRICS.map(([key, label]) => ({ key, label: tr(label), get: (r) => r[key] })),
  ];
  const col = cols.find((c) => c.key === rank.sort.key) || cols.find((c) => c.key === "powerMax");
  rows = sortRows(rows, col.get, rank.sort.dir);
  rows.forEach((r, i) => { r._i = i + 1; });
  const shown = rows.slice((rank.page - 1) * PAGE_SIZE, rank.page * PAGE_SIZE);
  out.appendChild(el("p", "hint mut", `${numFmt().format(rows.length)} ${tr("rKingdoms")} · ${cur.scan}. ${tr("rHint")}`));
  out.appendChild(table(cols, shown, { key: col.key, dir: rank.sort.dir }, (k) => { rank.sort = nextSort(rank.sort, k); rank.page = 1; KS.keepScroll($("dv"), () => drawRank(out)); },
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
    kBox, searchBox(tr("mLord"), mig.q, (v) => { mig.q = v; restart(); }), field(tr("mMin"), min), fmtBtn(redraw));
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
  const stat = (key, label) => ({ key, label: tr(label), get: (m) => m[key] });
  const kCell = (key, label, cls) => ({ key, label: tr(label), get: (m) => m[key], text: (m) => "#" + m[key], cls: () => cls });
  const cols = [
    { key: "id", label: "ID", get: (m) => m.id, text: (m) => String(m.id), cls: () => "mut" },
    { key: "name", label: tr("gName"), get: (m) => m.name, text: (m) => m.name ?? "", cls: () => "dv-b", ranked: true },
    kCell("from", "mFrom", "dv-b"), kCell("to", "mTo", "dv-b mv-to"),
    { key: "allianceFrom", label: tr("mAllianceFrom"), get: (m) => m.allianceFrom, node: (m) => allianceChip(m.allianceFrom) },
    { key: "allianceTo", label: tr("mAllianceTo"), get: (m) => m.allianceTo, node: (m) => allianceChip(m.allianceTo) },
    stat("power", "cPower"), stat("merits", "cMerits"), stat("kills", "cKills"), stat("deaths", "cDeaths"), stat("heals", "cHeals"),
    { key: "date", label: tr("mDate"), get: (m) => m.arrivedAt, text: (m) => `${stamp(m.seenAt)} → ${stamp(m.arrivedAt)}`,
      tip: (m) => tr("mWindow").replace("{a}", stamp(m.seenAt)).replace("{b}", stamp(m.arrivedAt)), cls: () => "mut" },
  ];
  const col = cols.find((c) => c.key === mig.sort.key) || cols[6];
  list = sortRows(list, col.get, mig.sort.dir);
  list.forEach((m, i) => { m._i = i + 1; });
  const people = new Set(list.map((m) => m.id)).size;
  out.appendChild(el("p", "hint mut", `${numFmt().format(list.length)} ${tr("mTotal")} · ${numFmt().format(people)} ${tr("mPeople")}. ${tr("mHint")}`));
  if (!list.length) { out.appendChild(el("p", "hint mut", tr("mNone"))); return; }
  const go = () => drawMigration(out, moves);
  out.appendChild(table(cols, list.slice((mig.page - 1) * MOVES_PAGE_SIZE, mig.page * MOVES_PAGE_SIZE), { key: col.key, dir: mig.sort.dir },
    (k) => { mig.sort = nextSort(mig.sort, k); mig.page = 1; KS.keepScroll($("dv"), go); }));
  out.appendChild(pager(list.length, mig.page, (p) => { mig.page = p; go(); }, MOVES_PAGE_SIZE));
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
    { key: "kingdom", label: tr("cKingdom"), get: (r) => r.kingdom, text: (r) => "#" + r.kingdom, cls: () => "dv-b", ranked: true },
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
  out.appendChild(el("p", "hint mut", `${numFmt().format(rows.length)} ${tr("rKingdoms")} · ${numFmt().format(list.length)} ${tr("mTotal")}.`));
  out.appendChild(table(cols, rows.slice((mig.page - 1) * MOVES_PAGE_SIZE, mig.page * MOVES_PAGE_SIZE), { key: col.key, dir: mig.flowSort.dir },
    (k) => { mig.flowSort = nextSort(mig.flowSort, k); mig.page = 1; KS.keepScroll($("dv"), go); },
    (r) => {
      mig.k = r.kingdom; mig.page = 1; mig.view = "lords"; mig.q = "";
      setLink("migration", { a: mig.a, b: mig.b, k: mig.k });
      showMigration();
    }));
  out.appendChild(pager(rows.length, mig.page, (p) => { mig.page = p; go(); }, MOVES_PAGE_SIZE));
}

KS.pages = {
  rank: { title: "navRank", desc: "descRank", show: showRank },
  migration: { title: "navMigration", desc: "descMigration", show: showMigration },
};
})();
