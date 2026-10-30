// A classic script (COLUMNS / GROUPS come from columns.js, loaded before it; the other views -- alliances, chart,
// compare -- from views.js, loaded after it, through window.KS). The data is read with fetch, which a page opened
// straight from the disk (file://) may not do: then the page says to open it through a web server.
(() => {
"use strict";

const T = {
  vi: {
    title: "Kingdom Stats", kingdom: "Kingdom", scan: "Đợt scan", latest: "mới nhất", search: "Tìm", searchPh: "Tên, ID, liên minh, #kingdom…", kSearchPh: "Tìm kingdom…", kNone: "Không có kingdom nào", alliance: "Liên minh",
    allAlliances: "Mọi liên minh", noAlliance: "Không liên minh", columns: "Cột", theme: "Đổi giao diện sáng/tối",
    fmtTip: "Số gọn (1.2M) / số đầy đủ", pickCols: "Chọn cột hiển thị", filterCols: "Lọc cột…", all: "Tất cả",
    none: "Bỏ hết", defaults: "Mặc định", players: "người", of: "/", crawled: "Thu thập", loading: "Đang tải…",
    kpiBtn: "Tổng quan", kpiTip: "Ẩn / hiện dải tổng số + trung bình",
    heat: "± TB", heatTip: "Tô màu: cao hơn (xanh) / thấp hơn (đỏ) trung bình cột, trong danh sách đang lọc",
    noRows: "Không có người chơi nào khớp.", minPower: "Lực chiến", loadErr: "Không tải được dữ liệu.", noData: "Chưa có kingdom nào trong data/.", noIndex: "Không đọc được data/kingdoms.json.",
    fileUrl: "Trang cần chạy qua web (GitHub Pages). Trên máy: mở terminal TRONG thư mục chứa index.html, chạy python -m http.server 8000 --bind 127.0.0.1 rồi mở http://localhost:8000/. Mở thẳng file index.html thì trình duyệt không cho đọc dữ liệu.",
    footer: "Thống kê do người chơi tự tổng hợp, không liên quan tới nhà phát hành game. Chỉ gồm người có trên bảng xếp hạng lực chiến.",
  },
  en: {
    title: "Kingdom Stats", kingdom: "Kingdom", scan: "Scan", latest: "latest", search: "Search", searchPh: "Name, ID, alliance, #kingdom…", kSearchPh: "Find a kingdom…", kNone: "No such kingdom", alliance: "Alliance",
    allAlliances: "All alliances", noAlliance: "No alliance", columns: "Columns", theme: "Light / dark",
    fmtTip: "Compact (1.2M) / full numbers", pickCols: "Columns", filterCols: "Filter columns…", all: "All",
    none: "None", defaults: "Defaults", players: "players", of: "/", crawled: "Collected", loading: "Loading…",
    kpiBtn: "Summary", kpiTip: "Show / hide the totals and averages strip",
    heat: "± avg", heatTip: "Colour: above (green) / below (red) the column average, over the players listed",
    noRows: "No player matches.", minPower: "Power", loadErr: "Could not load the data.", noData: "No kingdom in data/ yet.", noIndex: "Could not read data/kingdoms.json.",
    fileUrl: "Open this page through a web server (GitHub Pages). Locally: in a terminal IN the folder that holds index.html, run python -m http.server 8000 --bind 127.0.0.1, then open http://localhost:8000/. Opened straight from the disk, the browser does not let it read its data.",
    footer: "Fan-made statistics, not affiliated with the game's publisher. Only players on the power ranking are listed.",
  },
};

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem("ks." + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("ks." + k, JSON.stringify(v)); } catch { /* private mode */ } },
};

// only players whose power now is above the chosen step are listed: the rest of a ranking is mostly small
// accounts, and what "small" is depends on the kingdom (a weak one has few players above 20M)
const POWER_STEPS = [20e6, 15e6, 10e6, 5e6];
const BY_KEY = Object.fromEntries(COLUMNS.map((c) => [c.key, c]));
const DEFAULT_COLS = COLUMNS.filter((c) => c.def).map((c) => c.key);
const NUMERIC = new Set(["int", "num", "pct", "date", "grade"]);
const value = (c, p) => (c.get ? c.get(p) : p[c.key]);

const state = {
  lang: store.get("lang", navigator.language?.startsWith("vi") ? "vi" : "en"),
  compact: store.get("compact", true),
  shown: new Set(store.get("cols", DEFAULT_COLS).filter((k) => BY_KEY[k])),
  sort: { key: "powerMax", dir: -1 }, // default: highest power ever, top first
  data: null, rows: [], view: [], cols: [], alliance: "", q: "",
  minPower: POWER_STEPS.includes(store.get("minPower")) ? store.get("minPower") : POWER_STEPS[0],
  list: [], mode: "players", heat: store.get("heat", false), avg: {}, avgVer: 0,
  // a phone: the totals strip starts hidden, the name column is narrower
  narrow: matchMedia("(max-width: 640px)").matches,
};
const MODES = ["players", "alliances", "chart"];
COLUMNS.filter((c) => c.fixed).forEach((c) => state.shown.add(c.key));

const tr = (k) => T[state.lang][k] ?? k;
const label = (o) => o[state.lang] ?? o.vi;

// ---- formatting ----
// Intl formatters are slow to build: one set per language, made on first use
const nf = {};
function numFmt(digits) {
  const k = state.lang + (digits ?? "");
  return (nf[k] ??= new Intl.NumberFormat(state.lang === "vi" ? "vi-VN" : "en-US", digits == null ? {} : { maximumFractionDigits: digits }));
}
function compact(v) {
  const a = Math.abs(v);
  const [d, s] = a >= 1e12 ? [1e12, "T"] : a >= 1e9 ? [1e9, "B"] : a >= 1e6 ? [1e6, "M"] : a >= 1e3 ? [1e3, "K"] : [1, ""];
  return s ? numFmt(a / d >= 100 ? 0 : a / d >= 10 ? 1 : 2).format(v / d) + s : numFmt().format(v);
}
function fmt(c, v) {
  if (v == null || (typeof v === "number" && Number.isNaN(v))) return "";
  switch (c.type) {
    case "text": return String(v);
    case "int": return numFmt().format(v);
    case "num": return state.compact ? compact(v) : numFmt().format(v);
    case "pct": return numFmt(2).format(v) + "%";
    case "grade": return "R" + v;
    case "date": {
      const d = new Date(v);
      return d.toLocaleDateString(state.lang === "vi" ? "vi-VN" : "en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
    }
  }
  return String(v);
}

// ---- data ----
// no-cache = ask the server whether the file changed (GitHub Pages caches 10 min otherwise)
async function getJSON(url) {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(r.status + " " + url);
  return r.json();
}

async function loadIndex() {
  let list = [];
  if (location.protocol === "file:") { showEmpty(tr("fileUrl")); return; }
  try { list = (await getJSON("data/kingdoms.json")).kingdoms || []; } catch (e) { console.error(e); showEmpty(tr("noIndex")); return; }
  state.list = list;
  if (!list.length) { showEmpty(tr("noData")); return; }
  const hp = new URLSearchParams(location.hash.slice(1));
  const want = Number(hp.get("k")) || store.get("kingdom", list[0].kingdom);
  setMode(MODES.includes(hp.get("v")) ? hp.get("v") : store.get("mode", "players"), true);
  // a page opened on the compare view loads no kingdom until the kingdom view is opened
  if (!hp.get("k") && (hp.get("p") || store.get("page", "kingdom")) === "compare") { setPage("compare"); return; }
  setPage("kingdom", true);
  await loadKingdom(list.some((k) => k.kingdom === want) ? want : list[0].kingdom, hp.get("s"));
}

// ---- kingdom picker: a list with a search box (a <select> cannot be searched), and the same list under the main
// search box when what is typed is a kingdom number ("575", "#575") ----
function kingdomMatches(q, max = Infinity) {
  q = q.replace(/[#\s]/g, "");
  const start = [], inside = [];
  for (const k of state.list) {
    const t = String(k.kingdom);
    if (t.startsWith(q)) start.push(k);
    else if (t.includes(q)) inside.push(k);
  }
  return start.concat(inside).slice(0, max); // 57 -> 57, 570..579, then 157, 257...
}
function fillKList(ul, items) {
  const cur = state.data?.kingdom, n = numFmt();
  ul.innerHTML = items.length ? "" : `<li class="none">${tr("kNone")}</li>`;
  for (const k of items) {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.dataset.k = k.kingdom;
    if (k.kingdom === cur) li.className = "cur";
    li.innerHTML = `<b>#${k.kingdom}</b><span>${n.format(k.players)} ${tr("players")}</span>`;
    ul.appendChild(li);
  }
  ul.querySelector("li[data-k]")?.classList.add("act");
}
// arrows move the highlighted line, Enter opens it; true when the key was used
function listKeys(e, ul, pick) {
  const all = [...ul.querySelectorAll("li[data-k]")], i = all.findIndex((li) => li.classList.contains("act"));
  if (e.key === "Enter") { if (all[Math.max(i, 0)]) pick(Number(all[Math.max(i, 0)].dataset.k)); return true; }
  if ((e.key !== "ArrowDown" && e.key !== "ArrowUp") || !all.length) return false;
  const j = Math.min(all.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)));
  all[i]?.classList.remove("act");
  all[j].classList.add("act");
  all[j].scrollIntoView({ block: "nearest" });
  return true;
}
function openKingdom(id) {
  $("grid").scrollTop = 0;
  loadKingdom(id);
}
function showPicker(on) {
  $("kpop").hidden = !on;
  $("kingdom").setAttribute("aria-expanded", String(on));
  if (!on) return;
  $("kq").value = "";
  fillKList($("klist"), state.list);
  const cur = $("klist").querySelector("li.cur");
  if (cur) { $("klist").querySelector(".act")?.classList.remove("act"); cur.classList.add("act"); cur.scrollIntoView({ block: "center" }); }
  $("kq").focus();
}
function showSuggest() {
  const m = /^#?\s*(\d{1,4})$/.exec($("q").value.trim()), items = m ? kingdomMatches(m[1], 6) : [];
  $("qsug").hidden = !items.length;
  if (items.length) fillKList($("qsug"), items);
}
function wireKingdomPicker() {
  $("kingdom").onclick = () => showPicker($("kpop").hidden);
  $("kq").addEventListener("input", () => fillKList($("klist"), kingdomMatches($("kq").value)));
  $("kq").addEventListener("keydown", (e) => {
    if (e.key === "Escape") { showPicker(false); $("kingdom").focus(); }
    else if (listKeys(e, $("klist"), (k) => { showPicker(false); openKingdom(k); })) e.preventDefault();
  });
  $("klist").onclick = (e) => {
    const li = e.target.closest("li[data-k]");
    if (li) { showPicker(false); openKingdom(Number(li.dataset.k)); }
  };
  // the main search box: a kingdom number shows the matching kingdoms under it; picking one clears the search
  const pickFromSearch = (k) => {
    $("q").value = ""; state.q = "";
    $("qsug").hidden = true;
    openKingdom(k);
  };
  $("q").addEventListener("input", showSuggest);
  $("q").addEventListener("focus", showSuggest);
  $("q").addEventListener("blur", () => { $("qsug").hidden = true; });
  $("q").addEventListener("keydown", (e) => {
    if ($("qsug").hidden) return;
    if (e.key === "Escape") $("qsug").hidden = true;
    else if (listKeys(e, $("qsug"), pickFromSearch)) e.preventDefault();
  });
  $("qsug").addEventListener("mousedown", (e) => e.preventDefault()); // keep the focus in the box: no blur before the click
  $("qsug").onclick = (e) => {
    const li = e.target.closest("li[data-k]");
    if (li) pickFromSearch(Number(li.dataset.k));
  };
  // a click anywhere else closes the picker
  document.addEventListener("pointerdown", (e) => { if (!$("kpop").hidden && !e.target.closest(".kpick")) showPicker(false); });
}

// The kingdom's scans (newest first) into #scan; hidden when it has only one
function fillScans(item, scan) {
  const sel = $("scan");
  sel.innerHTML = "";
  for (const [i, s] of item.scans.entries()) {
    const o = document.createElement("option");
    o.value = s;
    o.textContent = i ? s : `${s} · ${tr("latest")}`;
    sel.appendChild(o);
  }
  sel.value = scan;
  sel.parentElement.hidden = item.scans.length < 2;
}

// scan: a folder under data/scans/ (default the kingdom's newest)
async function loadKingdom(id, scan) {
  const item = state.list.find((k) => k.kingdom === id);
  if (!item) return;
  if (!item.scans.includes(scan)) scan = item.scan;
  $("kingdomLbl").textContent = `#${id} · ${numFmt().format(item.players)}`;
  fillScans(item, scan);
  showEmpty(tr("loading"));
  try {
    state.data = await getJSON(`data/scans/${scan}/${id}.json`);
  } catch (e) {
    console.error(e);
    state.data = null; state.rows = [];
    showEmpty(tr("loadErr"));
    return;
  }
  store.set("kingdom", id);
  setHash();
  // search text built once per kingdom, for every player (the power filter can bring more in later)
  for (const p of state.data.players) p._s = `${p.name ?? ""}\n${p.id ?? ""}\n${p.alliance ?? ""}`.toLowerCase();
  pickRows();
  fillAlliances();
  refresh();
  KS.onKingdom?.();
  idle(() => warmFonts(state.data.players));
}

// #k=<kingdom>&s=<scan>&v=<view>: a link opens the same kingdom, scan and view (no s = the newest scan)
function setHash() {
  if (state.page !== "kingdom") return; // the compare view keeps its own link
  const d = state.data, item = d && state.list.find((k) => k.kingdom === d.kingdom);
  history.replaceState(null, "", "#" + (d ? "k=" + d.kingdom : "") + (item && d.scan !== item.scan ? "&s=" + d.scan : "")
    + (state.mode !== "players" ? "&v=" + state.mode : ""));
}

// The two pages of the side menu. quiet: only switch what is on screen (the caller loads and sets the link).
function setPage(p, quiet) {
  state.page = p;
  store.set("page", p);
  $("kingdomPage").hidden = p !== "kingdom";
  $("comparePage").hidden = p !== "compare";
  document.querySelectorAll(".side-nav button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.page === p)));
  showMenu(false);
  if (quiet) return;
  if (p === "compare") { KS.compare.show(); return; }
  if (state.data) { setHash(); rowH = 0; drawn = ""; schedule(); } // the table had no size while hidden
  else if (state.list.length) loadKingdom(store.get("kingdom", state.list[0].kingdom));
}
// a narrow window: the side menu is a drawer over the page
function showMenu(on) {
  $("side").classList.toggle("open", on);
  $("scrim").hidden = !on;
}

// players = the table (#grid); the other views draw into #panel (views.js)
function setMode(m, quiet) {
  state.mode = m;
  store.set("mode", m);
  document.body.dataset.mode = m;
  document.querySelectorAll("#modes button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
  $("grid").hidden = m !== "players";
  $("panel").hidden = m === "players";
  if (quiet) return;
  setHash();
  if (m === "players") { drawn = ""; render(); }
  else KS.views?.[m]?.();
}

// Names use letters the page font does not have (ᴬᵁᴿᴬ, Hangul, Han, kana...). The first time the browser meets such a
// letter it looks for a system font that has it and loads that font, which can take tens of ms (a CJK font is tens of
// MB); in the middle of a scroll that is a stall. So every such letter of the kingdom is laid out once, hidden, right
// after it loads: the fonts are in before the rows are scrolled to.
function warmFonts(players) {
  const seen = new Set();
  for (const p of players) for (const t of [p.name, p.alliance]) if (t) for (const ch of t) if (ch.codePointAt(0) > 0x2ff) seen.add(ch);
  if (!seen.size) return;
  let w = $("fontWarm");
  if (!w) {
    w = document.createElement("div");
    w.id = "fontWarm";
    w.className = "c";
    w.setAttribute("aria-hidden", "true");
    w.style.cssText = "position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;contain:strict;width:1px;height:1px";
    document.body.appendChild(w);
  }
  w.textContent = [...seen].join("");
  void w.scrollWidth; // lay it out now (this is what loads the fonts)
}

function pickRows() {
  state.rows = state.data ? state.data.players.filter((p) => (p.power ?? 0) > state.minPower) : [];
}

function fillPower() {
  const sel = $("minPower");
  sel.innerHTML = "";
  for (const v of POWER_STEPS) {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = `${tr("minPower")} > ${v / 1e6}M`;
    sel.appendChild(o);
  }
  sel.value = state.minPower;
}

function fillAlliances() {
  const sel = $("alliance"), count = new Map();
  let none = 0;
  for (const p of state.rows) p.alliance ? count.set(p.alliance, (count.get(p.alliance) || 0) + 1) : none++;
  const keep = count.has(state.alliance) || (state.alliance === "-" && none) ? state.alliance : "";
  sel.innerHTML = "";
  const add = (v, t) => { const o = document.createElement("option"); o.value = v; o.textContent = t; sel.appendChild(o); };
  add("", tr("allAlliances"));
  [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).forEach(([a, n]) => add(a, `${a} (${n})`));
  if (none) add("-", `${tr("noAlliance")} (${none})`);
  sel.value = state.alliance = keep;
}

// ---- view: filter + sort ----
function refresh() {
  const q = state.q.trim().toLowerCase(), al = state.alliance;
  let v = state.rows.filter((p) => (!q || p._s.includes(q)) && (!al || (al === "-" ? !p.alliance : p.alliance === al)));
  const c = BY_KEY[state.sort.key] || BY_KEY.rank, dir = state.sort.dir, num = NUMERIC.has(c.type);
  const keyed = v.map((p) => [value(c, p), p]);
  keyed.sort((a, b) => {
    const x = a[0], y = b[0];
    if (x == null || x === "") return y == null || y === "" ? a[1].rank - b[1].rank : 1; // blanks last either way
    if (y == null || y === "") return -1;
    return (num ? x - y : String(x).localeCompare(String(y), undefined, { sensitivity: "base" })) * dir || a[1].rank - b[1].rank;
  });
  state.view = keyed.map((k) => k[1]);
  if (state.heat) averages();
  const n = numFmt(), at = state.data && new Date(state.data.crawledAt), loc = state.lang === "vi" ? "vi-VN" : "en-GB";
  // a phone: "202/202" and the date only, beside the view tabs
  $("count").textContent = state.narrow ? `${n.format(state.view.length)}/${n.format(state.rows.length)}`
    : `${n.format(state.view.length)} ${tr("of")} ${n.format(state.rows.length)} ${tr("players")}`;
  $("crawled").textContent = !at ? "" : state.narrow ? at.toLocaleDateString(loc) : `${tr("crawled")}: ${at.toLocaleString(loc)}`;
  $("crawled").title = at ? at.toLocaleString(loc) : "";
  if (!state.view.length) showEmpty(state.data ? tr("noRows") : tr("loadErr"));
  else $("empty").hidden = true;
  $("sizer").style.height = `calc(var(--hh) + ${state.view.length} * var(--rh))`;
  drawHead();
  resetPool();
  render();
  KS.onRefresh?.();
}

const NO_AVG = new Set(["rank", "faction", "allianceRank"]); // numbers that are labels, not amounts
// column averages over the players listed, for the above / below colouring (numbers only, blanks left out)
function averages() {
  state.avg = {};
  for (const c of COLUMNS) {
    if (!["num", "pct", "int"].includes(c.type) || NO_AVG.has(c.key)) continue;
    let s = 0, n = 0;
    for (const p of state.view) { const v = value(c, p); if (typeof v === "number" && !Number.isNaN(v)) { s += v; n++; } }
    if (n) state.avg[c.key] = s / n;
  }
  state.avgVer++;
}

function showEmpty(msg) {
  const e = $("empty");
  e.textContent = msg;
  e.hidden = false;
  if (!state.view.length) resetPool();
}

// ---- header ----
function layout() {
  state.cols = COLUMNS.filter((c) => state.shown.has(c.key));
  let left = 0;
  const pins = state.cols.filter((c) => c.pin);
  fitWidths();
  state.cols.forEach((c) => { c._left = c.pin ? left : null; if (c.pin) left += c.w; c._last = c === pins[pins.length - 1]; });
  state.pinW = left;
  state.rankI = state.cols.findIndex((c) => c.key === "rank");
  let x = 0;
  state.cols.forEach((c) => { c._cls = cellClass(c, false); c._x0 = x; x += c.w; });
  newCellKey();
  const w = state.cols.reduce((s, c) => s + c.w, 0);
  $("sizer").style.width = w + "px";
  $("colsCount").textContent = $("colsCount2").textContent = `${state.cols.length}/${COLUMNS.length}`;
}

// A column is as wide as the wider of its header (one line) and the longest value it has in the kingdom (every
// player, not only the ones listed, so widths do not move while filtering), both measured in the page font. Kept
// per column until the kingdom, the number style or the language change. The name column keeps its fixed width.
let fitKey = "", fitted = new Map(), measure = null;
function textWidth(text, font) {
  if (!measure) measure = document.createElement("canvas").getContext("2d");
  measure.font = font;
  return measure.measureText(text).width;
}
function fitWidths() {
  const key = `${state.data?.kingdom}|${state.compact}|${state.lang}|${state.narrow}`;
  if (key !== fitKey) { fitKey = key; fitted = new Map(); }
  const family = getComputedStyle(document.body).fontFamily;
  for (const c of state.cols) {
    if (c.key === "name") { c.w = state.narrow ? Math.min(c.width, 120) : c.width; continue; }
    // a phone: # in small type, only as wide as its numbers (the place in the list, at most 600) + its padding
    if (c.key === "rank" && state.narrow) { c.w = Math.ceil(textWidth("600", `700 11px ${family}`)) + 9; continue; }
    let w = fitted.get(c.key);
    if (w === undefined) {
      // header: bold 12px + the sort arrow's room (10px + 4px gap); values: bold 13px (the top 3 rows are bold)
      w = textWidth(label(c), `700 12px ${family}`) + 14;
      if (state.data) {
        let longest = "";
        for (const p of state.data.players) {
          const s = fmt(c, value(c, p)) + (p.atLeast && p.atLeast.includes(c.key) ? "+" : "");
          if (s.length > longest.length) longest = s;
        }
        w = Math.max(w, textWidth(longest, `700 13px ${family}`));
      }
      w = Math.ceil(w) + 20 + 4; // + the cell's padding + a little air
      fitted.set(c.key, w);
    }
    c.w = w;
  }
}

function cellClass(c, head) {
  let s = head ? "h" : "c";
  if (NUMERIC.has(c.type)) s += " n";
  if (c.pin) s += " pin" + (c._last ? " last" : "");
  if (c.key === "rank") s += " rk";
  return s;
}

function drawHead() {
  layout();
  const h = $("head");
  h.innerHTML = "";
  for (const c of state.cols) {
    const d = document.createElement("div");
    d.className = cellClass(c, true);
    d.style.width = c.w + "px";
    if (c.pin) d.style.left = c._left + "px";
    d.setAttribute("role", "columnheader");
    d.title = c.tip ? label(c.tip) : label(c);
    const s = document.createElement("span");
    s.textContent = label(c);
    d.appendChild(s);
    if (state.sort.key === c.key) { d.classList.add("on"); d.dataset.dir = state.sort.dir > 0 ? "▲" : "▼"; }
    d.onclick = () => {
      const num = NUMERIC.has(c.type) && c.key !== "rank";
      state.sort = state.sort.key === c.key ? { key: c.key, dir: -state.sort.dir } : { key: c.key, dir: num ? -1 : 1 };
      refresh();
    };
    h.appendChild(d);
  }
}

// ---- rows: a pool of row elements reused while scrolling ----
let pool = [], raf = 0, rowH = 0;
// read once (and on resize): getComputedStyle in every scroll event forces a style pass
const RH = () => rowH || (rowH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rh")) || 34);

// The pinned columns (# and name) of every row sit in ONE sticky box, #pins, not as sticky cells in each row: each
// sticky cell becomes a compositor layer, and with a hundred of them a fast scroll goes to painting and rebuilding
// the layer tree. A row is two elements, its main part in #body and its pinned part in #pins, moved and filled
// together.
function resetPool() {
  const b = $("body");
  b.innerHTML = "";
  const pins = document.createElement("div");
  pins.id = "pins";
  pins.className = "pins";
  pins.style.width = state.pinW + "px";
  pins.style.height = `calc(${state.view.length} * var(--rh))`;
  b.appendChild(pins);
  pool = [];
  drawn = ""; partial = false;
  clearTimeout(finish);
}

function makeRow() {
  const r = document.createElement("div"), pin = document.createElement("div");
  r.className = "row";
  pin.className = "row prow";
  r.setAttribute("role", "row");
  r._cells = [];
  for (const c of state.cols) {
    const d = document.createElement("div");
    d.className = c._cls;
    d.style.width = c.w + "px";
    (c.pin ? pin : r).appendChild(d);
    r._cells.push(d);
  }
  r.style.width = $("sizer").style.width;
  r.style.paddingLeft = state.pinW + "px";
  pin.style.width = state.pinW + "px";
  r._pin = pin; pin._main = r;
  r.hidden = pin.hidden = true; // until a row is put in it
  r._idx = -1;
  $("body").appendChild(r);
  $("pins").appendChild(pin);
  return r;
}

// What each cell of a player shows (text, class, tooltip) is worked out once per player and kept until the columns,
// the number style or the language change: number formatting is most of the cost of drawing a row, and a fast scroll
// draws ~30 rows x every column a frame. Built ahead while the page is idle (warmCells), else on first draw.
let cellKey = "", warmJob = 0;
function newCellKey() {
  cellKey = state.cols.map((c) => c.key).join() + "|" + state.compact + "|" + state.lang + "|" + (state.heat ? state.avgVer : 0);
  warmCells();
}

function cellsOf(p) {
  if (p._ck === cellKey) return p._cells;
  const out = new Array(state.cols.length);
  for (let i = 0; i < state.cols.length; i++) {
    const c = state.cols[i], v = value(c, p), s = fmt(c, v);
    if (s === "") { out[i] = { text: "–", cls: c._cls + " blank", title: "", plus: false }; continue; }
    let title = "";
    if (c.type === "num" && state.compact) title = numFmt().format(v);
    else if (c.type === "text" && s.length > 16) title = s;
    let cls = c._cls;
    const a = state.heat ? state.avg[c.key] : undefined; // above / below the column average
    if (a !== undefined && typeof v === "number" && v !== a) cls += v > a ? " hi" : " lo";
    out[i] = { text: s, cls, title, plus: !!(p.atLeast && p.atLeast.includes(c.key)) };
  }
  p._ck = cellKey;
  return (p._cells = out);
}

// fill the cache of the current view in small slices between frames, so a fast scroll finds it ready
function warmCells() {
  cancelIdle(warmJob);
  let i = 0;
  const step = (dl) => {
    const v = state.view;
    let n = 0; // at least a slice each time, more while the browser says it is idle
    while (i < v.length && (n++ < 20 || (dl && dl.timeRemaining() > 2))) cellsOf(v[i++]);
    if (i < v.length) warmJob = idle(step);
  };
  warmJob = idle(step);
}
const idle = (f) => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 500 }) : setTimeout(f, 30));
const cancelIdle = (id) => (window.cancelIdleCallback ? cancelIdleCallback(id) : clearTimeout(id));

// Only the columns on screen (lo..hi, + the pinned ones) are written, and only where they differ from what the
// element shows: laying out a cell's text is the cost of a row (~9 us a cell), and with every column on a row is
// ~50 cells wide but ~10 are in view. A cell outside the window is emptied when its row gets another player.
// The # column is the place in the list as it is shown (sorted + filtered: 1, 2, 3... down the screen), not the
// power ranking: written here from the row's position, the one cell not taken from the player's cache.
function fill(r, p, lo, hi) {
  const cells = cellsOf(p), kids = r._cells, cols = state.cols;
  if (state.rankI >= 0) {
    const d = kids[state.rankI], n = r._idx + 1;
    if (d._n !== n) {
      d._n = n;
      d.textContent = n;
      d.className = cols[state.rankI]._cls + (n <= 3 ? " r" + n : "");
    }
  }
  for (let i = 0; i < cells.length; i++) {
    if (i === state.rankI) continue;
    const x = cells[i], d = kids[i], was = d._x;
    if (was === x) continue;
    if ((i < lo || i > hi) && !cols[i].pin) {
      if (was) { d.textContent = ""; d._x = null; }
      continue;
    }
    d._x = x;
    if (x.plus) {
      d.textContent = x.text;
      const b = document.createElement("span");
      b.className = "plus";
      b.textContent = "+";
      d.appendChild(b);
    } else if (!was || was.text !== x.text || was.plus) d.textContent = x.text;
    if (!was || was.cls !== x.cls) d.className = x.cls;
    if (!was || was.title !== x.title) x.title ? (d.title = x.title) : d.removeAttribute("title");
  }
}

// Drawn in blocks: the rows drawn are whole blocks of CHUNK rows, the ones on screen plus one block above and one
// below, so most scroll frames change nothing in the page (render returns at once) and a fast scroll runs over rows
// already drawn while the next block is filled (only its CHUNK new rows). Sideways the same with COL_BLOCK px. A
// scroll that jumps past everything drawn (a very fast scroll, the scrollbar dragged) draws only the rows and columns
// on screen, about a third of the work; the blocks around them come FINISH_MS after the last such jump.
const CHUNK = 16, COL_BLOCK = 400, FINISH_MS = 90;
let drawn = "", dFirst = 0, dLast = 0, partial = false, finish = 0;

function render(full) {
  raf = 0;
  const g = $("grid"), rh = RH(), n = state.view.length;
  const top = Math.floor(g.scrollTop / rh), bottom = Math.min(n, Math.ceil((g.scrollTop + g.clientHeight) / rh));
  const inside = drawn !== "" && top >= dFirst && bottom <= dLast;
  if (partial && inside && full !== true) return; // the screen is drawn; the rest comes with the timer
  const quick = drawn !== "" && !inside && full !== true;
  let first, last, x0, x1;
  if (quick) {
    first = Math.max(0, top); last = bottom;
    x0 = g.scrollLeft; x1 = x0 + g.clientWidth;
  } else {
    first = Math.max(0, (Math.floor(top / CHUNK) - 1) * CHUNK);
    last = Math.min(n, (Math.floor(bottom / CHUNK) + 2) * CHUNK);
    x0 = Math.floor(g.scrollLeft / COL_BLOCK) * COL_BLOCK - COL_BLOCK; x1 = x0 + g.clientWidth + 3 * COL_BLOCK;
  }
  partial = quick;
  clearTimeout(finish);
  if (quick) finish = setTimeout(() => render(true), FINISH_MS);
  dFirst = first; dLast = last;
  const cols = state.cols;
  let lo = 0, hi = cols.length - 1;
  while (lo < hi && cols[lo]._x0 + cols[lo].w < x0) lo++;
  while (hi > lo && cols[hi]._x0 > x1) hi--;
  const key = `${first},${last},${lo},${hi},${n}`;
  if (key === drawn) return;
  drawn = key;
  // the pool is sized once for the largest window (screen rows rounded up to blocks + 2 blocks)
  const need = Math.min(n, (Math.ceil(g.clientHeight / rh / CHUNK) + 3) * CHUNK);
  if (pool.length < need) {
    while (pool.length < need) pool.push(makeRow());
    pool.forEach((r) => { r._idx = -1; r.hidden = r._pin.hidden = true; }); // slots move with the pool size
  }
  // Row idx always lives in slot idx % size, and only the rows of first..last are touched: an element outside them
  // keeps showing the row of the place it sits at (off screen), so nothing has to be hidden or moved for it.
  const size = pool.length;
  for (let idx = first; idx < last; idx++) {
    const r = pool[idx % size];
    if (r.hidden) r.hidden = r._pin.hidden = false;
    if (r._idx === idx && r._p === state.view[idx]) {
      if (r._lo !== lo || r._hi !== hi) { r._lo = lo; r._hi = hi; fill(r, r._p, lo, hi); } // scrolled sideways
      continue;
    }
    r._idx = idx;
    r._p = state.view[idx];
    r._lo = lo; r._hi = hi;
    r.style.top = r._pin.style.top = idx * rh + "px";
    if (r._alt !== idx % 2) { r._alt = idx % 2; r.classList.toggle("alt", r._alt === 1); r._pin.classList.toggle("alt", r._alt === 1); }
    fill(r, r._p, lo, hi);
  }
}
const schedule = () => { if (!raf) raf = requestAnimationFrame(render); };

// ---- column picker ----
function drawPicker() {
  const list = $("colsList"), q = $("colsQ").value.trim().toLowerCase();
  list.innerHTML = "";
  for (const g of GROUPS) {
    const cols = COLUMNS.filter((c) => c.group === g.id && (!q || label(c).toLowerCase().includes(q) || c.key.toLowerCase().includes(q)));
    if (!cols.length) continue;
    const box = document.createElement("section");
    box.className = "grp";
    const h = document.createElement("h3");
    h.textContent = label(g);
    if (g.note) { const s = document.createElement("small"); s.textContent = "· " + label(g.note); h.appendChild(s); }
    box.appendChild(h);
    for (const c of cols) {
      const l = document.createElement("label");
      l.className = "tog" + (state.shown.has(c.key) ? " on" : "");
      const s = document.createElement("span");
      s.textContent = c.tip ? label(c.tip) : label(c); // the full name here; the header shows the short one
      s.title = label(c);
      const i = document.createElement("input");
      i.type = "checkbox";
      i.checked = state.shown.has(c.key);
      i.disabled = !!c.fixed;
      i.onchange = () => { i.checked ? state.shown.add(c.key) : state.shown.delete(c.key); l.classList.toggle("on", i.checked); colsChanged(); };
      l.append(s, i);
      box.appendChild(l);
    }
    list.appendChild(box);
  }
}

function colsChanged() {
  store.set("cols", [...state.shown]);
  drawHead();
  resetPool();
  render();
}

function setCols(keys) {
  state.shown = new Set(keys);
  COLUMNS.filter((c) => c.fixed).forEach((c) => state.shown.add(c.key));
  drawPicker();
  colsChanged();
}

// ---- language / theme ----
function applyLang() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-i18n]").forEach((e) => (e.textContent = tr(e.dataset.i18n)));
  document.querySelectorAll("[data-i18n-ph]").forEach((e) => (e.placeholder = tr(e.dataset.i18nPh)));
  document.querySelectorAll("[data-i18n-title]").forEach((e) => (e.title = tr(e.dataset.i18nTitle)));
  $("langBtn").textContent = state.lang === "vi" ? "EN" : "VI";
  const item = state.data && state.list.find((k) => k.kingdom === state.data.kingdom);
  if (item) fillScans(item, state.data.scan);
}

function applyTheme(t) {
  if (t) document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}

// ---- wiring ----
function init() {
  applyLang();
  fillPower();
  applyTheme(store.get("theme", ""));
  $("fmtBtn").setAttribute("aria-pressed", String(state.compact));
  $("heatBtn").setAttribute("aria-pressed", String(state.heat));
  $("heatBtn").onclick = () => {
    state.heat = !state.heat;
    store.set("heat", state.heat);
    $("heatBtn").setAttribute("aria-pressed", String(state.heat));
    if (state.data) refresh();
  };
  document.querySelectorAll("#modes button[data-mode]").forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));
  document.querySelectorAll(".side-nav button").forEach((b) => (b.onclick = () => setPage(b.dataset.page)));
  document.querySelectorAll(".menu-btn").forEach((b) => (b.onclick = () => showMenu(true)));
  $("scrim").onclick = () => showMenu(false);
  addEventListener("keydown", (e) => { if (e.key === "Escape") showMenu(false); });
  // the totals strip: shown or not is kept per device kind (a phone has little room for it)
  const kpiKey = state.narrow ? "kpisPhone" : "kpis";
  const showKpis = (on) => {
    $("kpis").hidden = !on;
    $("kpiBtn").setAttribute("aria-expanded", String(on));
    rowH = 0; drawn = ""; schedule(); // the table got taller or shorter
  };
  showKpis(store.get(kpiKey, !state.narrow));
  $("kpiBtn").onclick = () => { const on = $("kpis").hidden; store.set(kpiKey, on); showKpis(on); };
  // scroll events already come once a frame: drawing right away leaves no blank rows behind a fast scroll
  $("grid").addEventListener("scroll", render, { passive: true });
  // a row's two halves (main + pinned) light up together
  let hov = null;
  $("body").addEventListener("mouseover", (e) => {
    const r = e.target.closest(".row"), m = r && (r._main || r);
    if (m === hov) return;
    if (hov) { hov.classList.remove("hov"); hov._pin.classList.remove("hov"); }
    hov = m;
    if (m) { m.classList.add("hov"); m._pin.classList.add("hov"); }
  });
  $("body").addEventListener("mouseleave", () => { if (hov) { hov.classList.remove("hov"); hov._pin.classList.remove("hov"); hov = null; } });
  addEventListener("resize", () => {
    const narrow = matchMedia("(max-width: 640px)").matches;
    if (narrow !== state.narrow) { state.narrow = narrow; if (state.data) refresh(); }
    rowH = 0; drawn = ""; schedule();
  });
  let qt = 0;
  $("q").addEventListener("input", (e) => { clearTimeout(qt); qt = setTimeout(() => { state.q = e.target.value; $("grid").scrollTop = 0; refresh(); }, 120); });
  $("alliance").onchange = (e) => { state.alliance = e.target.value; $("grid").scrollTop = 0; refresh(); };
  $("minPower").onchange = (e) => {
    state.minPower = Number(e.target.value);
    store.set("minPower", state.minPower);
    $("grid").scrollTop = 0;
    pickRows();
    if (state.data) { fillAlliances(); refresh(); }
  };
  wireKingdomPicker();
  $("scan").onchange = (e) => loadKingdom(state.data.kingdom, e.target.value);
  $("colsBtn").onclick = () => { $("colsQ").value = ""; drawPicker(); $("cols").showModal(); };
  $("colsQ").addEventListener("input", drawPicker);
  $("cols").addEventListener("click", (e) => {
    if (e.target === $("cols")) $("cols").close(); // click on the backdrop
    const act = e.target.dataset?.act;
    if (act === "all") setCols(COLUMNS.map((c) => c.key));
    if (act === "none") setCols([]);
    if (act === "def") setCols(DEFAULT_COLS);
  });
  $("fmtBtn").onclick = () => {
    state.compact = !state.compact;
    store.set("compact", state.compact);
    $("fmtBtn").setAttribute("aria-pressed", String(state.compact));
    if (state.data) refresh(); // column widths follow the number style (the strip and the other views too)
  };
  $("langBtn").onclick = () => {
    state.lang = state.lang === "vi" ? "en" : "vi";
    store.set("lang", state.lang);
    applyLang();
    fillPower();
    if (state.data) { fillAlliances(); refresh(); }
    if (state.page === "compare") KS.compare.draw();
  };
  $("themeBtn").onclick = () => {
    const dark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    const t = dark ? "light" : "dark";
    store.set("theme", t);
    applyTheme(t);
  };
  addEventListener("hashchange", () => {
    const hp = new URLSearchParams(location.hash.slice(1)), k = Number(hp.get("k"));
    if (hp.get("p") === "compare") { setPage("compare"); return; }
    if (state.page === "compare") { setPage("kingdom", true); rowH = 0; drawn = ""; schedule(); }
    if (MODES.includes(hp.get("v") || "players") && (hp.get("v") || "players") !== state.mode) setMode(hp.get("v") || "players");
    const item = state.list.find((x) => x.kingdom === k), scan = hp.get("s") || item?.scan;
    if (item && (k !== state.data?.kingdom || scan !== state.data?.scan)) {
      loadKingdom(k, scan);
    }
  });
  loadIndex();
}

// what views.js uses
const KS = (window.KS = {
  state, T, tr, label, $, store, fmt, compact, numFmt, getJSON, BY_KEY, NUMERIC, value, idle, POWER_STEPS,
  setMode, refresh, setHash, kingdomMatches, listKeys,
  setAlliance(al) { state.alliance = al; fillAlliances(); refresh(); },
});
// views.js (a deferred script after this one) is in by then
document.addEventListener("DOMContentLoaded", init);
})();
