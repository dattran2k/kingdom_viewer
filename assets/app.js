// A classic script (COLUMNS / GROUPS come from columns.js, loaded before it; the other views -- alliances, chart,
// compare -- from views.js, loaded after it, through window.KS). The data is read with fetch, which a page opened
// straight from the disk (file://) may not do: then the page says to open it through a web server.
(() => {
"use strict";

const RUNNING_VERSION = /[?&]v=(\d+)/.exec(document.currentScript?.src || "")?.[1];

const T = {
  vi: {
    sortBy: "Sắp theo", sortDirTip: "Đổi chiều sắp xếp", colSet: "Chỉ số",
    sortValue: "Giá trị", sortValueTip: "Sắp theo giá trị của chỉ số", sortDeltaTip: "Sắp theo mức tăng / giảm giữa 2 ngày", sortDeltaOff: "Chỉ có khi so sánh 2 ngày khác nhau",
    yes: "Có", no: "Không", title: "Kingdom Stats", kingdom: "Kingdom", scan: "Ngày", latest: "mới nhất", search: "Tìm", searchPh: "Tên, ID, liên minh, #kingdom…", kSearchPh: "Tìm kingdom…", kNone: "Không có kingdom nào", alliance: "Liên minh",
    allAlliances: "Mọi liên minh", noAlliance: "Không liên minh", columns: "Chỉ số", theme: "Đổi giao diện sáng/tối",
    fmtTip: "Số gọn (1.2M) / số đầy đủ", pickCols: "Chọn chỉ số hiển thị", filterCols: "Lọc chỉ số…", all: "Tất cả",
    none: "Bỏ hết", defaults: "Mặc định", players: "người", of: "/", crawled: "Thu thập", loading: "Đang tải…",
    heat: "± TB", heatTip: "Tô màu: cao hơn (xanh) / thấp hơn (đỏ) trung bình cột, trong danh sách đang lọc",
    noRows: "Không có người chơi nào khớp.", minPower: "Lực chiến", loadErr: "Không tải được dữ liệu.", noData: "Chưa có kingdom nào trong data/.", noIndex: "Không đọc được data/kingdoms.json.",
    fileUrl: "Trang cần chạy qua web (GitHub Pages). Trên máy: mở terminal TRONG thư mục chứa index.html, chạy python -m http.server 8000 --bind 127.0.0.1 rồi mở http://localhost:8000/. Mở thẳng file index.html thì trình duyệt không cho đọc dữ liệu.",
  },
  en: {
    sortBy: "Sort by", sortDirTip: "Reverse the order", colSet: "Metrics",
    sortValue: "Value", sortValueTip: "Sort by the metric's value", sortDeltaTip: "Sort by the change between the two days", sortDeltaOff: "Only while comparing two different days",
    yes: "Yes", no: "No", title: "Kingdom Stats", kingdom: "Kingdom", scan: "Day", latest: "latest", search: "Search", searchPh: "Name, ID, alliance, #kingdom…", kSearchPh: "Find a kingdom…", kNone: "No such kingdom", alliance: "Alliance",
    allAlliances: "All alliances", noAlliance: "No alliance", columns: "Metrics", theme: "Light / dark",
    fmtTip: "Compact (1.2M) / full numbers", pickCols: "Metrics", filterCols: "Filter metrics…", all: "All",
    none: "None", defaults: "Defaults", players: "players", of: "/", crawled: "Collected", loading: "Loading…",
    heat: "± avg", heatTip: "Colour: above (green) / below (red) the column average, over the players listed",
    noRows: "No player matches.", minPower: "Power", loadErr: "Could not load the data.", noData: "No kingdom in data/ yet.", noIndex: "Could not read data/kingdoms.json.",
    fileUrl: "Open this page through a web server (GitHub Pages). Locally: in a terminal IN the folder that holds index.html, run python -m http.server 8000 --bind 127.0.0.1, then open http://localhost:8000/. Opened straight from the disk, the browser does not let it read its data.",
  },
};

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem("ks." + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("ks." + k, JSON.stringify(v)); } catch { /* private mode */ } },
};

// only players whose power now is above the chosen step are listed: the rest of a ranking is mostly small
// accounts, and what "small" is depends on the kingdom (a weak one has few players above 20M)
const POWER_STEPS = [20e6, 15e6, 10e6, 5e6], DEFAULT_POWER = 15e6;
const BY_KEY = Object.fromEntries(COLUMNS.map((c) => [c.key, c]));
const DEFAULT_COLS = COLUMNS.filter((c) => c.def).map((c) => c.key);
const NUMERIC = new Set(["int", "num", "pct", "date", "grade", "yesno", "kingdom"]);
const COMPARED = new Set(["int", "num", "pct"]); // shown as before / change / after while comparing
const MAX_COMPARED = 10;
const value = (c, p) => (c.get ? c.get(p) : p[c.key]);

const state = {
  lang: store.get("lang", navigator.language?.startsWith("vi") ? "vi" : "en"),
  compact: store.get("compact", true),
  shown: new Set(store.get("cols", DEFAULT_COLS).filter((k) => BY_KEY[k])),
  sort: { key: "powerMax", dir: -1 }, // default: highest power ever, top first
  // comparing two scans: same columns and order as always, each cell before / change / after; vs = the older scan
  comparing: false, diff: false, vs: "", also: [], mainK: 0, // also = the other kingdoms compared with mainK
  sortDelta: false,
  data: null, rows: [], view: [], cols: [], alliance: "", q: "",
  minPower: POWER_STEPS.includes(store.get("powerStep")) ? store.get("powerStep") : DEFAULT_POWER,
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
    case "kingdom": return "#" + v;
    case "pct": return numFmt(2).format(v) + "%";
    case "grade": return "R" + v;
    case "yesno": return tr(v ? "yes" : "no");
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
  // a page opened on another view loads no kingdom until the kingdom view is opened
  const first = hp.get("p") || (hp.get("k") ? "kingdom" : store.get("page", "kingdom"));
  if (first === "compare" || KS.pages[first]) { setPage(first); return; }
  setPage("kingdom", true);
  if (hp.get("a")) { state.vs = hp.get("a"); setCompare(true); state.also = alsoOf(hp); }
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
const selection = () => (state.comparing ? [state.mainK, ...state.also] : [state.data?.kingdom]);
const alsoOf = (hp) => [...new Set((hp.get("also") || "").split(",").map(Number).filter(Boolean))].slice(0, MAX_COMPARED - 1);
// can this kingdom join the comparison: it needs both scans (one, when the two are the same day)
const hasBoth = (k) => k.scans.includes(state.data?.scan) && k.scans.includes(state.vs);
function fillKList(ul, items) {
  const picked = selection(), n = numFmt();
  ul.innerHTML = items.length ? "" : `<li class="none">${tr("kNone")}</li>`;
  for (const k of items) {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.dataset.k = k.kingdom;
    if (picked.includes(k.kingdom)) li.className = "cur";
    else if (state.comparing && state.data && !hasBoth(k)) li.className = "off";
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
  toTable();
  state.also = [];
  loadKingdom(id);
}
// comparing: a kingdom of the list goes in or out, and the list stays open to pick more
function toggleKingdom(id) {
  const now = selection(), item = state.list.find((k) => k.kingdom === id);
  let next;
  if (now.includes(id)) next = now.filter((k) => k !== id);
  else if (now.length < MAX_COMPARED && item && hasBoth(item)) next = [...now, id];
  if (!next?.length) return;
  state.also = next.slice(1);
  toTable();
  loadKingdom(next[0], state.data?.scan);
  const y = $("klist").scrollTop;
  fillKList($("klist"), $("kq").value ? kingdomMatches($("kq").value) : state.list);
  $("klist").scrollTop = y;
}
const pickKingdom = (k) => {
  if (state.comparing) { toggleKingdom(k); return; }
  showPicker(false);
  openKingdom(k);
};
function showPicker(on) {
  $("kpop").hidden = !on;
  $("kingdom").setAttribute("aria-expanded", String(on));
  if (!on) return;
  placePop($("kingdom"), $("kpop"));
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
    else if (listKeys(e, $("klist"), pickKingdom)) e.preventDefault();
  });
  $("klist").onclick = (e) => {
    const li = e.target.closest("li[data-k]");
    if (li) pickKingdom(Number(li.dataset.k));
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

// ---- the day menu: stands in for a <select> of days, which stays (hidden) as what holds the value and fires "change" ----
function dayText(day) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return day;
  if (state.lang === "vi") return `${Number(m[3])} Tháng ${Number(m[2])}, ${m[1]}`;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
function dayDrop(sel) {
  const dd = document.createElement("div"), btn = document.createElement("button"), pop = document.createElement("ul");
  dd.className = "dd";
  btn.type = "button"; btn.className = "dd-btn"; btn.setAttribute("aria-haspopup", "listbox"); btn.setAttribute("aria-expanded", "false");
  pop.className = "dd-pop"; pop.hidden = true; pop.setAttribute("role", "listbox");
  dd.append(btn, pop);
  sel.hidden = true;
  sel.after(dd);
  const part = (cls, text) => { const s = document.createElement("span"); s.className = cls; s.textContent = text; return s; };
  const open = (on) => {
    pop.hidden = !on;
    btn.setAttribute("aria-expanded", String(on));
    if (!on) return;
    placePop(btn, pop);
    pop.classList.remove("right");
    if (pop.getBoundingClientRect().right > innerWidth - 8) pop.classList.add("right");
    pop.querySelector(".on")?.scrollIntoView({ block: "nearest" });
  };
  const sync = () => {
    btn.innerHTML = "";
    if (sel.dataset.prefix) btn.appendChild(part("dd-pre", sel.dataset.prefix));
    btn.append(part("dd-day", dayText(sel.value)), part("dd-arrow", ""));
    pop.innerHTML = "";
    for (const o of sel.options) {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      if (o.value === sel.value) { li.className = "on"; li.setAttribute("aria-selected", "true"); }
      li.append(part("dd-day", dayText(o.value)));
      li.onclick = () => { open(false); if (o.value !== sel.value) { sel.value = o.value; sync(); sel.dispatchEvent(new Event("change")); } };
      pop.appendChild(li);
    }
  };
  btn.onclick = () => open(pop.hidden);
  dd.addEventListener("keydown", (e) => { if (e.key === "Escape" && !pop.hidden) { open(false); btn.focus(); } });
  const outside = (e) => {
    if (!dd.isConnected) document.removeEventListener("pointerdown", outside); // a page redraw replaced this menu
    else if (!pop.hidden && !dd.contains(e.target)) open(false);
  };
  document.addEventListener("pointerdown", outside);
  sel._dd = { sync };
  sync();
}

// A phone: the rows scroll sideways and would cut off a menu inside them, so it opens over the page, under its button
function placePop(btn, pop) {
  const phone = matchMedia("(max-width: 680px)").matches, r = btn.getBoundingClientRect();
  pop.style.position = phone ? "fixed" : "";
  pop.style.top = phone ? r.bottom + 6 + "px" : "";
  pop.style.left = phone ? "16px" : "";
  pop.style.right = phone ? "16px" : "";
  pop.style.width = phone ? "auto" : "";
}

// The kingdom's scans (newest first) into #scan; hidden when it has only one
function fillScans(item, scan) {
  const sel = $("scan");
  sel.innerHTML = "";
  for (const s of item.scans) {
    const o = document.createElement("option");
    o.value = s;
    o.textContent = s;
    sel.appendChild(o);
  }
  sel.value = scan;
  sel.dataset.prefix = state.comparing ? tr("gTo") : "";
  sel._dd.sync();
  sel.parentElement.hidden = item.scans.length < 2;
  $("vsBtn").hidden = item.scans.length < 2;
}

// The scan to compare from: any of them; the same day as "to" means the plain table
function fillVs(item) {
  const sel = $("vs");
  sel.innerHTML = "";
  for (const s of item.scans) { const o = document.createElement("option"); o.value = s; o.textContent = s; sel.appendChild(o); }
  sel.value = state.vs;
  sel.dataset.prefix = tr("gFrom");
  sel._dd.sync();
}

// the scans of the kingdoms compared: only those all of them have
const scansOf = (item) => {
  if (!state.comparing) return item.scans;
  const others = state.also.map((k) => state.list.find((x) => x.kingdom === k)).filter(Boolean);
  return item.scans.filter((s) => others.every((o) => o.scans.includes(s)));
};

function setCompare(on) {
  if (on === state.comparing) return;
  if (!on) { state.also = []; state.vs = ""; }
  state.comparing = on;
  document.body.dataset.compare = on ? "1" : "";
  $("vsBtn").setAttribute("aria-checked", String(on));
  if (!on) $("cmpChips").innerHTML = "";
}

// Two different scans: the columns and sort of the changes, swapped in and out
function setDiff(on) {
  if (on === state.diff) return;
  state.diff = on;
  state.sortDelta = on; // comparing opens sorted by the change
  document.body.dataset.diff = on ? "1" : "";
  // each cell holds three lines
  document.documentElement.style.setProperty("--rh", on ? "60px" : "");
  rowH = 0;
}

// the kingdoms compared, as chips: a click takes one out (the last one stays)
function drawChips() {
  const box = $("cmpChips");
  box.innerHTML = "";
  const ks = [state.mainK, ...state.also];
  for (const k of ks) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "x-tag"; b.textContent = "#" + k;
    b.disabled = ks.length < 2;
    if (!b.disabled) b.title = `${tr("cmpRemove")} #${k}`;
    b.onclick = () => toggleKingdom(k);
    box.appendChild(b);
  }
}

// scan: a folder under data/scans/ (default the kingdom's newest)
let loadToken = 0;
async function loadKingdom(id, scan) {
  const item = state.list.find((k) => k.kingdom === id), me = ++loadToken;
  if (!item) return;
  if (state.comparing) {
    state.also = state.also.filter((k) => k !== id && state.list.some((x) => x.kingdom === k));
    if (scansOf(item).length < 2) state.also = [];
    if (item.scans.length < 2) setCompare(false);
  }
  state.mainK = id;
  const scans = scansOf(item);
  if (!scans.includes(scan)) scan = scans[0];
  if (state.comparing) {
    if (!scans.includes(state.vs)) state.vs = scans.find((s) => s < scan) || scan; // by default the scan before
    if (state.vs > scan) [state.vs, scan] = [scan, state.vs]; // picked the wrong way round: the older one is always "from"
  }
  setDiff(state.comparing && state.vs !== scan);
  $("kingdomLbl").textContent = state.comparing ? tr("xAdd") : `#${id} · ${numFmt().format(item.players)}`;
  fillScans({ ...item, scans }, scan);
  if (state.comparing) { fillVs({ scans }); drawChips(); }
  showEmpty(tr("loading"));
  try {
    const d = await getJSON(`data/scans/${scan}/${id}.json`);
    if (state.comparing) await addComparison(d);
    if (me !== loadToken) return; // a newer pick is on its way
    state.data = d;
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

// Comparing: each player of the newer scan gets the same player of the older one (p._was); who is in the older one
// only is added to the list (p._left). Several kingdoms: the player is found in whichever of them, so a move between
// them still has its changes.
async function addComparison(d) {
  d._a = state.vs;
  const ks = (d._ks = [d.kingdom, ...state.also]);
  const others = await Promise.all(state.also.map((k) => getJSON(`data/scans/${d.scan}/${k}.json`)));
  for (const p of d.players) p._k = d.kingdom;
  for (const f of others) for (const p of f.players) { p._k = f.kingdom; d.players.push(p); }
  if (state.vs === d.scan) return; // the same day twice: nothing to compare, the plain table
  d._vs = state.vs;
  const olds = await Promise.all(ks.map((k) => getJSON(`data/scans/${d._vs}/${k}.json`)));
  const before = new Map();
  for (const f of olds) for (const p of f.players) { p._k = f.kingdom; before.set(p.id, p); }
  const after = new Set(d.players.map((p) => p.id));
  for (const p of d.players) p._was = before.get(p.id);
  for (const o of before.values()) if (!after.has(o.id)) d.players.push({ ...o, _left: true });
}
// the change of a column between the two scans; undefined when a side has no number
function deltaOf(c, p) {
  if (!p._was || p._left) return undefined;
  const a = value(c, p._was), b = value(c, p);
  return typeof a === "number" && typeof b === "number" ? b - a : undefined;
}

// #k=<kingdom>&s=<scan>&v=<view>&a=<older scan>: a link opens the same kingdom, scan, view and comparison (no s = the newest scan)
function setHash() {
  if (state.page !== "kingdom") return; // the compare view keeps its own link
  const d = state.data, item = d && state.list.find((k) => k.kingdom === d.kingdom);
  history.replaceState(null, "", "#" + (d ? "k=" + d.kingdom : "") + (item && d.scan !== item.scan ? "&s=" + d.scan : "") + (d?._a ? "&a=" + d._a : "") + (d?._ks?.length > 1 ? "&also=" + d._ks.slice(1).join() : "")
    + (state.mode !== "players" ? "&v=" + state.mode : ""));
}

// The pages of the side menu. quiet: only switch what is on screen (the caller loads and sets the link).
function setPage(p, quiet) {
  state.page = p;
  store.set("page", p);
  $("kingdomPage").hidden = p !== "kingdom";
  $("comparePage").hidden = p !== "compare";
  $("dvPage").hidden = !KS.pages[p];
  document.querySelectorAll(".side-nav button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.page === p)));
  showMenu(false);
  if (quiet) return;
  if (p === "compare") { KS.compare.show(); return; }
  if (KS.pages[p]) { drawDvHead(); KS.pages[p].show(); return; }
  if (state.data) { setHash(); rowH = 0; drawn = ""; schedule(); } // the table had no size while hidden
  else if (state.list.length) loadKingdom(store.get("kingdom", state.list[0].kingdom));
}
function drawDvHead() {
  $("dvTitle").textContent = tr(KS.pages[state.page].title);
  $("dvDesc").textContent = tr(KS.pages[state.page].desc);
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
  for (const p of players) for (const t of [p.name, p.alliance]) if (t) for (const ch of String(t)) if (ch.codePointAt(0) > 0x2ff) seen.add(ch);
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

// The alliance filter comes from a click in the alliance view; the chip says which one and takes it off
function fillAlliances() {
  const has = state.alliance === "-" ? state.rows.some((p) => !p.alliance) : state.rows.some((p) => p.alliance === state.alliance);
  if (!has) state.alliance = "";
  const b = $("allianceOff");
  b.hidden = !state.alliance;
  b.textContent = `${state.alliance === "-" ? tr("noAlliance") : state.alliance} ✕`;
}

// ---- view: filter + sort ----
function refresh() {
  const q = state.q.trim().toLowerCase(), al = state.alliance;
  let v = state.rows.filter((p) => (!q || p._s.includes(q)) && (!al || (al === "-" ? !p.alliance : p.alliance === al)));
  const c = BY_KEY[state.sort.key] || BY_KEY.rank, dir = state.sort.dir, num = NUMERIC.has(c.type);
  const byDelta = state.diff && state.sortDelta && COMPARED.has(c.type);
  const keyed = v.map((p) => [byDelta ? deltaOf(c, p) : value(c, p), p]);
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
  // both numbers only while a filter hides someone
  const listed = state.view.length === state.rows.length ? n.format(state.rows.length) : `${n.format(state.view.length)}${state.narrow ? "/" : ` ${tr("of")} `}${n.format(state.rows.length)}`;
  $("count").textContent = state.narrow ? listed : `${listed} ${tr("players")}`;
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
const pickable = () => COLUMNS.filter((c) => !c.auto);
function layout() {
  const many = state.data?._ks?.length > 1; // several kingdoms: say whose each line is
  state.cols = COLUMNS.filter((c) => (c.auto ? c.key === "home" && many : state.shown.has(c.key)));
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
  $("colsCount").textContent = $("colsCount2").textContent = `${state.cols.length}/${pickable().length}`;
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
  const key = `${state.data?.kingdom}|${state.data?.scan}|${state.data?._vs}|${state.data?._ks}|${state.compact}|${state.lang}|${state.narrow}`;
  if (key !== fitKey) { fitKey = key; fitted = new Map(); }
  const family = getComputedStyle(document.body).fontFamily;
  for (const c of state.cols) {
    if (c.key === "name") { c.w = state.narrow ? Math.min(c.width, 110) : c.width; continue; }
    // a phone: # in small type, only as wide as its numbers (the place in the list, at most 600) + its padding
    if (c.key === "rank" && state.narrow) { c.w = Math.ceil(textWidth("600", `700 11px ${family}`)) + 9; continue; }
    let w = fitted.get(c.key);
    if (w === undefined) {
      // header: bold 12px + the sort arrow's room (10px + 4px gap); values: bold 13px (the top 3 rows are bold).
      // A phone: header in 11px with a 2px gap, a thinner chip and padding (see the 640px block of the stylesheet)
      w = state.narrow ? textWidth(label(c), `700 11px ${family}`) + 12 : textWidth(label(c), `700 12px ${family}`) + 14;
      if (state.data) {
        let longest = "";
        for (const p of state.data.players) {
          // while comparing the change sits in the cell too, with its sign
          // an alliance cell: its longest tag + the chip's padding (two tags stack, they don't add up)
          const s = c.key === "alliance" ? tagsOf(p).reduce((a, t) => (String(t).length > a.length ? String(t) : a), "") + (state.narrow ? "M" : "MM") : (state.data._vs && COMPARED.has(c.type) ? "+" : "") + fmt(c, value(c, p)) + (p.atLeast && p.atLeast.includes(c.key) ? "+" : "");
          if (s.length > longest.length) longest = s;
        }
        w = Math.max(w, textWidth(longest, `700 13px ${family}`));
      }
      w = Math.ceil(w) + (state.narrow ? 10 : 20 + 4); // + the cell's padding + a little air (none on a phone)
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

// A chip per set of metrics, several at once: the table has # + name + ID + alliance plus what the chips lit bring. A
// chip is lit while all its columns are shown, so "all" lights every chip, and taking one out turns "all" off.
const BASE_COLS = COLUMNS.filter((c) => c.fixed || ["id", "alliance"].includes(c.key)).map((c) => c.key);
const COL_SETS = [
  { id: "def", name: () => tr("defaults"), keys: () => DEFAULT_COLS },
  ...GROUPS.filter((g) => g.id !== "basic").map((g) => ({ id: g.id, name: () => label(g), keys: () => [...BASE_COLS, ...COLUMNS.filter((c) => c.group === g.id && !c.auto).map((c) => c.key)] })),
  { id: "all", name: () => tr("all"), keys: () => pickable().map((c) => c.key) },
];
function toggleColSet(set, lit) {
  if (!lit) { setCols([...state.shown, ...set.keys()]); return; }
  // "all" or the defaults while everything is shown: down to the defaults
  const everything = COL_SETS.find((s) => s.id === "all").keys().every((k) => state.shown.has(k));
  if (set.id === "all" || (set.id === "def" && everything)) { setCols(DEFAULT_COLS); return; }
  // out, but what another lit chip also brings stays. A chip that is all inside this one goes with it; if this one is
  // all inside another, it still goes (a click must do something) and that other chip goes dark
  const has = (s, k) => s.keys().includes(k);
  const lits = COL_SETS.filter((s) => s !== set && s.id !== "all" && s.keys().every((k) => state.shown.has(k)) && !s.keys().every((k) => has(set, k)));
  const keep = new Set([...BASE_COLS, ...lits.flatMap((s) => s.keys())]);
  let drop = set.keys().filter((k) => !keep.has(k));
  if (!drop.length) drop = set.keys().filter((k) => !BASE_COLS.includes(k));
  setCols([...state.shown].filter((k) => !drop.includes(k)));
}
function drawColChips() {
  const box = $("colChips");
  box.innerHTML = "";
  const lab = document.createElement("span");
  lab.className = "col-chips-l";
  lab.textContent = tr("colSet");
  box.appendChild(lab);
  for (const s of COL_SETS) {
    const keys = s.keys(), b = document.createElement("button");
    b.type = "button";
    b.textContent = s.name();
    const lit = keys.every((k) => state.shown.has(k));
    b.setAttribute("aria-pressed", String(lit));
    b.onclick = () => toggleColSet(s, lit);
    box.appendChild(b);
  }
}

// the "sort by" box: the columns on screen (and the sorted one, if it was hidden since)
function drawSortBox() {
  const sel = $("sortKey"), cur = BY_KEY[state.sort.key];
  sel.innerHTML = "";
  for (const c of cur && !state.cols.includes(cur) ? [...state.cols, cur] : state.cols) {
    const o = document.createElement("option");
    o.value = c.key;
    o.textContent = label(c); // the name the table shows
    sel.appendChild(o);
  }
  sel.value = state.sort.key;
  $("sortDir").textContent = state.sort.dir < 0 ? "↓" : "↑";
  const d = state.diff && state.sortDelta, delta = $("sortDelta");
  $("sortValue").setAttribute("aria-pressed", String(!d));
  delta.setAttribute("aria-pressed", String(d));
  delta.classList.toggle("off", !state.diff);
  delta.title = tr(state.diff ? "sortDeltaTip" : "sortDeltaOff");
}

function drawHead() {
  layout();
  drawColChips();
  drawSortBox();
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
  cellKey = state.cols.map((c) => c.key).join() + "|" + state.compact + "|" + state.lang + "|" + (state.heat ? state.avgVer : 0) + "|" + (state.data?._vs || "");
  warmCells();
}

// a cell while comparing, when the value changed or is on one side only: [text, class] per line; null = a plain cell
function comparedCell(c, p, v) {
  if (c.pin || !state.data?._vs) return null;
  const was = p._left ? v : p._was ? value(c, p._was) : undefined, now = p._left ? undefined : v;
  if (was === now || (was == null && now == null)) return null;
  if (COMPARED.has(c.type)) {
    const d = deltaOf(c, p);
    const text = d == null ? "" : c.type === "pct" ? numFmt(2).format(d) + "%" : fmt(c, d);
    const sign = d > 0 ? "+" : "", mark = d > 0 ? " hi" : d < 0 ? " lo" : "";
    return [[fmt(c, was) || "–", "d-a"], [d == null ? "" : sign + text, "d-d" + mark], [fmt(c, now) || "–", "d-b"]];
  }
  return c.type === "text" && p._was && !p._left ? [[fmt(c, was) || "–", "d-a"], ["→", "d-d"], [fmt(c, now) || "–", "d-b"]] : null;
}

// the one way an alliance tag is shown, on every page
function allianceChip(tag) {
  const s = document.createElement("span");
  s.className = "al-tag";
  s.textContent = tag;
  return s;
}
// the tags of a player's alliance cell: two when comparing and the alliance changed
const tagsOf = (p) => (p._was && !p._left && p._was.alliance && p._was.alliance !== p.alliance && p.alliance ? [p._was.alliance, p.alliance] : p.alliance ? [p.alliance] : []);

function cellsOf(p) {
  if (p._ck === cellKey) return p._cells;
  const out = new Array(state.cols.length);
  for (let i = 0; i < state.cols.length; i++) {
    const c = state.cols[i], v = value(c, p), s = fmt(c, v), parts = c.key === "alliance" ? null : comparedCell(c, p, v);
    if (c.key === "alliance" && v != null) {
      const tags = tagsOf(p);
      out[i] = { text: tags.join("→"), cls: c._cls + " al-cell", title: "", plus: false, chips: tags };
      continue;
    }
    if (parts) {
      const title = c.type === "num" && state.compact ? `${parts[0][0] === "–" ? "–" : numFmt().format(p._left ? v : value(c, p._was))} → ${parts[2][0] === "–" ? "–" : numFmt().format(v)}` : "";
      out[i] = { text: parts.map((x) => x[0]).join("|"), cls: c._cls, title, plus: false, parts };
      continue;
    }
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
    if (x.chips) {
      if (x.chips.length > 1) { // was, now: one above the other, like the numbers beside them
        const box = document.createElement("div");
        box.className = "al-stack";
        box.append(...x.chips.map(allianceChip));
        d.replaceChildren(box);
      } else d.replaceChildren(...x.chips.map(allianceChip));
    } else if (x.parts) {
      const box = document.createElement("div");
      box.className = "d3";
      for (const [t, cl] of x.parts) { const s = document.createElement("span"); s.className = cl; s.textContent = t; box.appendChild(s); }
      d.replaceChildren(box);
    } else if (x.plus) {
      d.textContent = x.text;
      const b = document.createElement("span");
      b.className = "plus";
      b.textContent = "+";
      d.appendChild(b);
    } else if (!was || was.text !== x.text || was.plus || was.parts || was.chips) d.textContent = x.text;
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
  // the page scrolls, the rows start under what is above the table and the table's header
  const g = $("kingdomPage"), rh = RH(), n = state.view.length, y = g.scrollTop - $("grid").offsetTop - $("head").offsetHeight;
  const top = Math.max(0, Math.floor(y / rh)), bottom = Math.max(0, Math.min(n, Math.ceil((y + g.clientHeight) / rh)));
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
// a new list: back to its first row, if the page has scrolled past it
function toTable() {
  const g = $("kingdomPage"), t = $("grid").offsetTop;
  if (g.scrollTop > t) g.scrollTop = t;
}

// ---- column picker ----
function drawPicker() {
  const list = $("colsList"), q = $("colsQ").value.trim().toLowerCase();
  list.innerHTML = "";
  for (const g of GROUPS) {
    const cols = pickable().filter((c) => c.group === g.id && (!q || label(c).toLowerCase().includes(q) || (c.tip && label(c.tip).toLowerCase().includes(q)) || c.key.toLowerCase().includes(q)));
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
      s.textContent = label(c); // the name the table shows; the full one in the tooltip
      if (c.tip) s.title = label(c.tip);
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
  if (item) { const scans = scansOf(item); fillScans({ ...item, scans }, state.data.scan); if (state.comparing) { fillVs({ scans }); drawChips(); } }
  if (state.comparing) $("kingdomLbl").textContent = tr("xAdd");
}

function applyTheme(t) {
  if (t) document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}

// ---- wiring ----
function init() {
  dayDrop($("scan"));
  dayDrop($("vs"));
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
  // the menu button: a wide window hides / shows the side menu (remembered), a narrow one opens it as a drawer
  document.body.classList.toggle("side-off", store.get("sideOff", false));
  document.querySelectorAll(".menu-btn").forEach((b) => (b.onclick = () => {
    if (matchMedia("(max-width: 900px)").matches) { showMenu(true); return; }
    store.set("sideOff", document.body.classList.toggle("side-off"));
    rowH = 0; drawn = ""; schedule(); // the table got wider or narrower
  }));
  $("scrim").onclick = () => showMenu(false);
  addEventListener("keydown", (e) => { if (e.key === "Escape") showMenu(false); });
  // scroll events already come once a frame: drawing right away leaves no blank rows behind a fast scroll
  $("kingdomPage").addEventListener("scroll", render, { passive: true });
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
  $("q").addEventListener("input", (e) => { clearTimeout(qt); qt = setTimeout(() => { state.q = e.target.value; toTable(); refresh(); }, 120); });
  $("allianceOff").onclick = () => { toTable(); KS.setAlliance(""); };
  $("minPower").onchange = (e) => {
    state.minPower = Number(e.target.value);
    store.set("powerStep", state.minPower);
    toTable();
    pickRows();
    if (state.data) { fillAlliances(); refresh(); }
  };
  wireKingdomPicker();
  $("sortKey").onchange = (e) => {
    const c = BY_KEY[e.target.value];
    state.sort = { key: c.key, dir: NUMERIC.has(c.type) && c.key !== "rank" ? -1 : 1 };
    if (state.data) refresh();
  };
  $("sortDir").onclick = () => { state.sort = { ...state.sort, dir: -state.sort.dir }; if (state.data) refresh(); };
  $("scan").onchange = (e) => loadKingdom(state.data.kingdom, e.target.value);
  $("vs").onchange = (e) => { state.vs = e.target.value; loadKingdom(state.data.kingdom, state.data.scan); };
  $("vsBtn").onclick = () => {
    const d = state.data;
    if (!d) return;
    setCompare(!state.comparing);
    if (state.comparing) loadKingdom(d.kingdom); // the newest day against the one before
    else loadKingdom(d.kingdom, d.scan);
  };
  const sortMode = (on) => { if (state.diff && state.sortDelta !== on) { state.sortDelta = on; if (state.data) refresh(); } };
  $("sortValue").onclick = () => sortMode(false);
  $("sortDelta").onclick = () => sortMode(true);
  $("colsBtn").onclick = () => { $("colsQ").value = ""; drawPicker(); $("cols").showModal(); };
  $("colsQ").addEventListener("input", drawPicker);
  $("cols").addEventListener("click", (e) => {
    if (e.target === $("cols")) $("cols").close(); // click on the backdrop
    const act = e.target.dataset?.act;
    if (act === "all") setCols(pickable().map((c) => c.key));
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
    if (KS.pages[state.page]) { drawDvHead(); KS.pages[state.page].show(); }
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
    if (hp.get("p") === "compare" || KS.pages[hp.get("p")]) { setPage(hp.get("p")); return; }
    if (state.page !== "kingdom") { setPage("kingdom", true); rowH = 0; drawn = ""; schedule(); }
    const older = hp.get("a") || "";
    if (older) state.vs = older;
    setCompare(!!older);
    const also = alsoOf(hp);
    if (older) state.also = also;
    if (MODES.includes(hp.get("v") || "players") && (hp.get("v") || "players") !== state.mode) setMode(hp.get("v") || "players");
    const item = state.list.find((x) => x.kingdom === k), scan = hp.get("s") || item?.scan;
    if (item && (k !== state.data?.kingdom || scan !== state.data?.scan || older !== (state.data?._a || "") || also.join() !== (state.data?._ks?.slice(1) || []).join())) {
      loadKingdom(k, scan);
    }
  });
  loadIndex();
  checkVersion();
}

// ---- new version check ----
// GitHub Pages lets a browser keep index.html for 10 minutes, so a reload can bring back the old page. The running
// version is the ?v= of this script; index.html, asked for past the cache, says the newest one. When they differ the
// page reloads once under a new address (?r=<version>), which has no cached copy. Once per version: if the new address
// still brings the old page, it stays until the cache expires.
const VERSION_RE = /assets\/app\.js\?v=(\d+)/;
const CHECK_EVERY_MS = 5 * 60 * 1000;
let lastCheck = 0;
async function checkVersion() {
  if (!RUNNING_VERSION || location.protocol === "file:") return;
  lastCheck = Date.now();
  let newest;
  try { newest = VERSION_RE.exec(await (await fetch("index.html", { cache: "no-cache" })).text())?.[1]; } catch { return; } // offline
  if (!newest || newest === RUNNING_VERSION || sessionStorage.getItem("ks.reloadedFor") === newest) return;
  sessionStorage.setItem("ks.reloadedFor", newest);
  const url = new URL(location.href);
  url.searchParams.set("r", newest);
  location.replace(url.href);
}
// a phone keeps a tab for days: check again when the page comes back on screen
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && Date.now() - lastCheck > CHECK_EVERY_MS) checkVersion();
});

// A redraw that rebuilds a table loses where it was scrolled to: back to the same place (once the new table is in,
// which may be after a file load)
function keepScroll(root, draw) {
  const w = root.querySelector(".tbl-wrap"), top = root.scrollTop, y = w?.scrollTop, x = w?.scrollLeft;
  draw();
  requestAnimationFrame(() => {
    root.scrollTop = top;
    const n = root.querySelector(".tbl-wrap");
    if (n && w) { n.scrollTop = y; n.scrollLeft = x; }
  });
}

// what views.js uses
const KS = (window.KS = {
  state, T, tr, label, $, store, fmt, compact, numFmt, getJSON, BY_KEY, NUMERIC, value, idle, POWER_STEPS, DEFAULT_POWER,
  setMode, refresh, setHash, kingdomMatches, listKeys, checkVersion, deltaOf, keepScroll, allianceChip, dayDrop,
  setAlliance(al) { state.alliance = al; fillAlliances(); refresh(); },
});
// views.js (a deferred script after this one) is in by then
document.addEventListener("DOMContentLoaded", init);
})();
