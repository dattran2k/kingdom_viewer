// The KvK page: the running KvKs by season, and one's camps, kingdoms and players since it opened.
// A classic script loaded after pages.js. Reads data/kvk/index.json.
// Links: #p=kvk&g=<group>; a KvK itself: #k=<kingdom>&a=<open day>&also=<kingdoms>&kvk=<id>
(() => {
"use strict";
const KS = window.KS, { state, tr, $, numFmt } = KS;
const { el, num, load, objects, table, sortRows, nextSort, searchBox, fmtBtn, pager, frame, setLink } = KS.ui;

Object.assign(KS.T.vi, {
  navKvk: "KvK", descKvk: "Các KvK đang diễn ra theo mùa. Bấm Dashboard để xem phe, kingdom và người chơi từ lúc mở.",
  kNotOpen: "KvK này chưa mở nên chưa có số liệu. Dưới đây là các phe và lực chiến hiện tại của người chơi.", cName: "Tên", cAlliance: "Liên minh", rServers: "Xếp hạng server", rMembers: "Xếp hạng người chơi", rKvks: "Xếp hạng KvK", kSeeAll: "Xem toàn bộ KvK", kRankOf: "/ {n} KvK", kRankTip: "Xếp theo tổng lực chiến max của mọi người chơi trong KvK", rStatus: "Trạng thái", rSearchP: "Tên, ID, liên minh, #kingdom...", rMembersHint: "{n} người chơi (top {top} mỗi chỉ số, trong {all} người) ", kAll: "Tất cả", kS2: "Mùa Giải 2", kS3: "Mùa Giải 3", kSos: "Mùa Giải Xung Đột", kSearch: "Kingdom hoặc mã KvK...", kTime: "Thời gian", kNone: "Không có KvK nào khớp.", kNoData: "Chưa có dữ liệu KvK.",
  kLive: "Đang diễn ra", kSoon: "Sắp mở", kDayLeft: "còn {n} ngày", kOpenIn: "mở sau {n} ngày", kCamp: "Phe", kOpen: "Dashboard", kRunning: "Đang diễn ra", kKds: "KD", kBack: "← Danh sách KvK",
  kCamps: "Xếp hạng phe", kRankPlayers: "Xếp hạng người chơi", kUngroup: "Bỏ nhóm", kShowCols: "Chỉ số", kView: "Hiển thị", kExport: "Xuất CSV", kShow: "Hiện", kPerPage: "mỗi trang", kGo: "Trang", kShowing: "Hiện {a}–{b} / {n}", kOtherNote: "{n}/{m} kingdom ở khu vực khác: chỉ có lực chiến và công trạng của người chơi lọt top {top} toàn map.", kOther: "khu vực khác", kOtherTip: "Kingdom ở khu vực khác: chỉ có số của người chơi lọt top toàn map.",
  kPending: "Chưa có số liệu.",  kAllCamps: "Mọi phe", kAllKingdoms: "Mọi kingdom",
  kProgress: "Tiến độ KvK",
});
Object.assign(KS.T.en, {
  navKvk: "KvK", descKvk: "The running KvKs by season. Open a Dashboard for its camps, kingdoms and players since it opened.",
  kNotOpen: "This KvK has not opened yet, so it has no numbers. These are its camps, and the players as they are now.", cName: "Name", cAlliance: "Alliance", rServers: "Server ranking", rMembers: "Players ranking", rKvks: "KvK ranking", kSeeAll: "See all KvKs", kRankOf: "/ {n} KvKs", kRankTip: "By the total peak power of all players in the KvK", rStatus: "Status", rSearchP: "Name, ID, alliance, #kingdom...", rMembersHint: "{n} players (top {top} of each metric, out of {all}) ", kAll: "All", kS2: "Season 2", kS3: "Season 3", kSos: "Season of Strife", kSearch: "Kingdom or KvK code...", kTime: "Time", kNone: "No KvK matches.", kNoData: "No KvK data yet.",
  kLive: "Running", kSoon: "Upcoming", kDayLeft: "{n} days left", kOpenIn: "opens in {n} days", kCamp: "Camp", kOpen: "Dashboard", kRunning: "Running", kKds: "KD", kBack: "← All KvKs",
  kCamps: "Camps ranking", kRankPlayers: "Players ranking", kUngroup: "Ungroup", kShowCols: "Show", kView: "View", kExport: "Export CSV", kShow: "Show", kPerPage: "per page", kGo: "Page", kShowing: "Showing {a}–{b} of {n}", kOtherNote: "{n} of {m} kingdoms are in another region: only the power and merits of players in the map's top {top}.", kOther: "other region", kOtherTip: "A kingdom of another region: numbers of the players in the map's top only.",
  kPending: "No numbers yet.",  kAllCamps: "All camps", kAllKingdoms: "All kingdoms",
  kProgress: "KvK progress",
});

const GROUPS = [["S2", "kS2"], ["S3", "kS3"], ["SoS", "kSos"]]; // Season 1 is no KvK: each kingdom is its own map
const groupLabel = (g) => tr(GROUPS.find((x) => x[0] === g)?.[1] ?? g);
const DAY = 86400;
const when = (s) => new Date(s * 1000).toISOString().slice(5, 10).split("-").reverse().join("/");
const nowSec = () => Date.now() / 1000;
const page = { group: "", q: "", battle: 0, camp: 0, kingdom: 0, pq: "", p: 1, sort: { key: "merits", dir: -1 }, kSort: { key: "merits", dir: -1 }, lSort: { key: "open", dir: -1 }, lp: 1, opened: new Set(), grouped: true, open: new Set() };
const tradesCell = (r) => el("span", "tr-b", r.trades == null ? "–" : numFmt(0).format(r.trades) + "%");

const SWORDS = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2l3.2.4 5.3 5.3-1.8 1.8-5.3-5.3zM14 2l-3.2.4-2.3 2.3 1.8 1.8 2.3-2.3zM3.6 10.6l1.8 1.8-1.5 1.5-1.8-1.8zM12.4 10.6l1.5 1.5-1.8 1.8-1.5-1.5zM5 9.2l1.8 1.8-1 1-1.8-1.8zM11 9.2l.9.9-1.8 1.8-.9-.9z"/></svg>`;
// A season's picture and name, from the game: the banner of its intro screen, the name in the game's language files
const ART = { 190: "s2", 301: "tree", 1001: "sos1", 1002: "sos2", 1003: "sos3", 1004: "tree", 1007: "sos7", 1008: "tree" };
const SEASON_TITLE = {
  100: { vi: "Sao Rực Lửa và Tiếng Gọi Của Rồng", en: "Burning Stars and Dragon Calls" }, 190: { vi: "Lời Thề Đóng Băng", en: "The Icebound Oath" },
  301: { vi: "Rồng Trỗi Dậy", en: "Rise of the Dragon" }, 1001: { vi: "Kêu Gọi Dũng Khí", en: "Calling of Courage" }, 1002: { vi: "Đường Đến Bình Minh", en: "The Road to Dawn" },
  1003: { vi: "Nhiều Lưỡi Kiếm, Một Trái Tim", en: "Many Blades, One Heart" }, 1004: { vi: "Rồng Trỗi Dậy", en: "Rise of the Dragon" },
  1007: { vi: "Vây Hãm Rồng", en: "Dragonsiege" }, 1008: { vi: "Bản Giao Hưởng Của Thần", en: "Symphony of the Gods" } };
const label = (o) => o[state.lang] ?? o.vi;
const seasonTitle = (id) => (SEASON_TITLE[id] ? label(SEASON_TITLE[id]) : "");
// what a kingdom is doing: SeasonData.SeasonStatusType of the game
const STATUS = { 1: { vi: "Mùa 1", en: "Season 1" }, 103: { vi: "Sắp tổng kết", en: "Settling soon" }, 110: { vi: "Chuẩn bị chiến tranh", en: "War prep" },
  113: { vi: "Đăng ký mùa mới", en: "Registering" }, 115: { vi: "Đang ghép trận", en: "Matching" }, 120: { vi: "Đã ghép trận", en: "Matched" },
  125: { vi: "Đang trong KvK", en: "In KvK" }, 130: { vi: "KvK đã kết thúc", en: "KvK ended" } };
const statusName = (st) => (STATUS[st] ? label(STATUS[st]) : "");
function setArt(node, season) {
  const url = (path) => `url("${new URL(path, document.baseURI).href}")`; // absolute: a var() in the stylesheet would resolve against assets/
  node.classList.add("has-art");
  node.classList.toggle("art-wide", !ART[season]); // no season of its own: the game's wide picture, filling the frame
  node.style.setProperty("--art", url(ART[season] ? `assets/kvk/${ART[season]}.jpg?v=4` : "assets/kvk/cod_background.jpg"));
  node.style.setProperty("--art-blur", url(`assets/kvk/blur/${ART[season] || "cod_background"}.jpg?v=4`));
  node.style.setProperty("--art-mid", url(`assets/kvk/mid/${ART[season] || "cod_background"}.jpg?v=1`));
}

// ---- the top of a KvK: its name, how far along it is, what opened when ----
function hero(b) {
  const box = el("div", "kv-panel kv-hero");
  setArt(box, b.season);
  const name = el("div", "kv-name");
  name.append(el("h2", "", b.name), el("span", "mut", [seasonTitle(b.season), groupLabel(b.group)].filter(Boolean).join(" · ")));
  box.appendChild(name);
  const now = nowSec();
  if (b.end) {
    const pct = Math.max(0, Math.min(100, (100 * (now - b.open)) / (b.end - b.open)));
    const top = el("div", "kv-prog-h"), t = el("span", "");
    t.append(el("b", "", tr("kProgress")), el("span", "mut", ` ${numFmt(0).format(pct)}%`));
    const left = Math.ceil((b.end - now) / DAY);
    top.append(t, el("span", "mut", tr("kDayLeft").replace("{n}", left)));
    const bar = el("div", "kv-prog");
    bar.appendChild(el("i")).style.width = pct + "%";
    const ends = el("div", "kv-prog-h mut");
    ends.append(el("span", "", when(b.open)), el("span", "", when(b.end)));
    box.append(top, bar, ends);
  }
  return box;
}
function kingdomChip(k) {
  const c = el("span", k.other ? "kd kv-other" : "kd", "#" + k.k);
  if (k.other) c.title = tr("kOtherTip");
  return c;
}
const campsOf = (b) => {
  const m = new Map();
  for (const k of b.kingdoms) { if (!m.has(k.camp)) m.set(k.camp, []); m.get(k.camp).push(k); }
  return [...m.entries()].sort((a, c) => a[0] - c[0]);
};

const METRICS = [["merits", "cMerits"], ["kills", "cKills"], ["deaths", "cDeaths"], ["heals", "cHeals"], ["meritInfantry", "cInf"], ["meritCavalry", "cCav"], ["meritArcher", "cArc"], ["meritMagic", "cMag"]];
const fullNum = (v) => (v == null ? "–" : numFmt().format(v)); // the camps table shows whole numbers, on the Kingdom page too
const metricCols = (list, rows) => list.map(([key, label]) => ({ key, label: tr(label), get: (r) => r[key], text: (r) => fullNum(r[key]), tip: () => "",
  max: rows.reduce((m, r) => Math.max(m, r[key] ?? 0), 0) }));
const tradesCol = () => ({ key: "trades", label: "Trades", get: (r) => r.trades, tip: () => tr("tradesTip"), node: tradesCell });

// A KvK's players are the Kingdom page comparing its kingdoms between the day it opened and today (same table, Show, View)
function kvkLink(b) {
  return b.kingdoms.some((k) => !k.other && state.list.some((x) => x.kingdom === k.k)) ? `kvk=${b.id}` : "p=kvk";
}

// ---- the list: one line per KvK, like the Rankings page ----
const dates = (b) => `${when(b.open)}${b.end ? " – " + when(b.end) : ""}`;
function card(b) {
  const a = el("article", "kv-card");
  a.id = "kv-" + b.id;
  const head = el("div", "kv-card-h"), icon = el("span", b.live ? "kv-ico" : "kv-ico soon"), name = el("div", "kv-card-n");
  icon.innerHTML = SWORDS;
  name.append(el("b", "", b.name), el("small", "mut", dates(b)));
  head.append(icon, name);
  a.appendChild(head);
  const now = nowSec(), left = Math.ceil(((b.live ? b.end : b.open) - now) / DAY);
  if (b.live && b.end) {
    const pct = Math.max(0, Math.min(100, (100 * (now - b.open)) / (b.end - b.open)));
    const bar = el("div", "kv-prog thin");
    bar.appendChild(el("i")).style.width = pct + "%";
    bar.appendChild(el("u")).style.left = pct + "%";
    a.appendChild(bar);
  }
  const state_ = el("div", "kv-state");
  state_.append(el("i", b.live ? "" : "soon"), el("b", "", tr(b.live ? "kRunning" : "kSoon")));
  if ((b.live && b.end) || !b.live) state_.append(el("span", "mut", "· " + tr(b.live ? "kDayLeft" : "kOpenIn").replace("{n}", left)));
  a.appendChild(state_);
  const camps = el("div", b.kingdoms.some((k) => k.camp) ? "kv-camps" : "kv-camps one");
  for (const [camp, list] of campsOf(b)) {
    const c = el("div", `kv-camp c${camp}`), top = el("div", "kv-camp-h");
    top.append(el("b", "", camp ? `${tr("kCamp")} ${camp}` : "Kingdom"), el("small", "mut", `${list.length} ${tr("kKds")}`));
    const chips = el("div", "kv-chips");
    chips.append(...list.map(kingdomChip));
    c.append(top, chips);
    camps.appendChild(c);
  }
  a.appendChild(camps);
  if (b.totals) {
    const n = el("div", "kv-nums");
    for (const [label, key] of [["cMerits", "merits"], ["cKills", "kills"], ["cDeaths", "deaths"], ["cHeals", "heals"]]) {
      const c = el("span");
      c.append(el("small", "mut", tr(label)), el("b", "", num(b.totals[key])));
      n.appendChild(c);
    }
    a.appendChild(n);
  }
  const open = el("a", "btn kv-open", tr("kOpen"));
  const link = kvkLink(b);
  if (link === "p=kvk") open.classList.add("off"); // no kingdom of it crawled yet
  else open.href = "#" + link;
  a.appendChild(open);
  return a;
}
async function showList() {
  const { ctl, out } = frame();
  const all = await load("kvk/index.json");
  if (!all) { out.appendChild(el("p", "hint", tr("kNoData"))); return; }
  const data = { ...all, battles: all.battles.filter((b) => b.group !== "S1") };
  if (!GROUPS.some(([k]) => k === page.group)) page.group = "";
  const tabs = el("nav", "kv-pills");
  const count = (g) => data.battles.filter((b) => !g || b.group === g).length;
  const draw = () => drawList(out, data);
  const press = () => tabs.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.g === page.group)));
  for (const [g, label] of [["", tr("kAll")], ...GROUPS.map(([k]) => [k, groupLabel(k)])]) {
    const n = el("button");
    n.append(label + " ", el("small", "", String(count(g))));
    n.type = "button"; n.dataset.g = g;
    n.onclick = () => { page.group = g; page.lp = 1; press(); draw(); };
    tabs.appendChild(n);
  }
  const q = searchBox(tr("kSearch"), page.q, (v) => { page.q = v; page.lp = 1; draw(); });
  const find = el("label", "kv-find");
  find.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 10.5 14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  find.appendChild(q);
  ctl.classList.add("kv-ctl");
  ctl.append(find, tabs, fmtBtn(draw));
  press();
  draw();
}
// The page's own scroller is moved, so no box inside it can shift
function centerCard(c) {
  const page_ = c?.closest("#dv");
  if (!page_) return;
  const r = c.getBoundingClientRect(), box = page_.getBoundingClientRect();
  page_.scrollTo({ top: page_.scrollTop + r.top - box.top - (page_.clientHeight - r.height) / 2, behavior: "smooth" });
}
function drawList(out, data) {
  setLink("kvk", { g: page.group });
  out.innerHTML = "";
  const kq = page.q.replace("#", "").toLowerCase();
  const rows = data.battles.filter((b) => (!page.group || b.group === page.group)
    && (!kq || b.kingdoms.some((k) => String(k.k).startsWith(kq)) || b.name.toLowerCase().includes(kq)));
  if (!rows.length) { out.appendChild(el("p", "hint mut", tr("kNone"))); return; }
  const seasons = new Map();
  for (const b of rows) { if (!seasons.has(b.seasonName)) seasons.set(b.seasonName, []); seasons.get(b.seasonName).push(b); }
  for (const [name, list] of seasons) {
    list.sort((x, y) => y.open - x.open || x.id - y.id);
    const open = page.opened.has(name) || !!kq; // a search shows its KvKs
    const sec = el("section", "kv-sec"), head = el("div", "kv-sec-h");
    const season = list[0].season, group = groupLabel(list[0].group);
    setArt(sec, season);
    head.setAttribute("role", "button");
    head.tabIndex = 0;
    head.setAttribute("aria-expanded", String(open));
    const t = el("div", "kv-sec-t"), chev = el("span", "kv-chev");
    chev.appendChild(el("i", open ? "kv-arrow on" : "kv-arrow"));
    t.append(el("h3", "", seasonTitle(season) || name), el("span", "kv-count", String(list.length)), chev);
    // Opened in place, so the height can animate; a season's cards are made the first time it opens
    const body = el("div", "kv-body"), inner = el("div", "kv-body-in");
    body.appendChild(inner);
    const fill = () => {
      if (inner.firstChild) return;
      const grid = el("div", "kv-grid");
      grid.append(...list.map(card));
      inner.appendChild(grid);
    };
    // Only the part on screen is animated, at one speed: a tall season must not fill the screen in a blink
    let ms = 0;
    const show = (on, animate = true) => {
      if (on) { page.opened.add(name); fill(); } else page.opened.delete(name);
      body.getAnimations().forEach((a) => a.cancel());
      const seen = Math.max(0, Math.min(inner.offsetHeight, innerHeight - body.getBoundingClientRect().top));
      ms = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : Math.round(Math.max(240, Math.min(620, 160 + Math.min(seen, innerHeight) / 1.6)));
      if (animate && ms && seen) body.animate({ height: on ? ["0px", seen + "px"] : [seen + "px", "0px"] }, { duration: ms, easing: "cubic-bezier(.4, 0, .2, 1)" });
      sec.classList.toggle("open", on);
      head.setAttribute("aria-expanded", String(on));
      chev.firstChild.classList.toggle("on", on);
    };
    const toggle = () => show(!sec.classList.contains("open"));
    head.onclick = toggle;
    head.onkeydown = (e) => { if (e.target === head && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggle(); } };
    const jump = el("div", "kv-jump");
    for (const b of list) {
      const j = el("button", b.live ? "" : "soon", b.name);
      j.type = "button";
      j.onclick = (e) => {
        e.stopPropagation();
        if (!sec.classList.contains("open")) show(true, false); // opened at once: an animation under the scroll is what jerked
        centerCard(document.getElementById("kv-" + b.id));
      };
      jump.appendChild(j);
    }
    head.append(t, el("small", "kv-sec-s", list[0].group === name ? group : `${group} · ${state.lang === "vi" ? name.replace("SoS", "MGXĐ") : name}`), jump);
    sec.append(head, body);
    if (open) { fill(); sec.classList.add("open"); }
    out.appendChild(sec);
  }
}

// ---- one battle ----
function panel(title) {
  const box = el("section", "kv-panel"), head = el("div", "kv-panel-h"), t = el("div", "kv-panel-t");
  const sub = el("small", "mut");
  t.append(el("h3", "", title), sub);
  head.appendChild(t);
  box.appendChild(head);
  return { box, head, sub };
}
const note = (text) => el("p", "kv-note", text);
const kingdomRow = (b, k) => ({ ...k, ...(b.sums?.[k.k] || {}), _cls: "kv-kd" });
const rankMark = (r) => el("b", r.rank === 1 ? "kv-rk top" : "kv-rk", r.rank ? "#" + r.rank : "–");
// ---- the camps: each with its total, opened to its kingdoms; or all kingdoms in one list ----
function drawCamps(box, b) {
  box.innerHTML = "";
  const groups = (b.camps || []).map((c) => ({ ...c, list: b.kingdoms.filter((k) => k.camp === c.camp), _cls: "kv-total" })), grouped = page.grouped && groups.some((c) => c.camp);
  const kingdoms = b.kingdoms.map((k) => kingdomRow(b, k));
  const scale = grouped ? groups : kingdoms;
  const cols = [
    { key: "name", label: grouped && !state.narrow ? `${tr("kCamp")} / ${tr("cKingdom")}` : grouped ? tr("kCamp") : tr("cKingdom"), left: true, tip: () => "", w: state.narrow ? 108 : 230, get: (r) => (r.list ? r.camp : r.k), node: (r) => {
      if (!r.list) { const d = el("span", "kv-kname"); d.append(kingdomChip(r)); if (r.camp) d.append(el("small", "mut", `${tr("kCamp")} ${r.camp}`)); return d; }
      const d = el("span", "kv-camp-n");
      const top = el("span", "kv-camp-t"), chips = el("span", "kv-chips");
      // a phone: the place on the camp's line, without the kingdom count, to leave the screen to the figures
      if (state.narrow) top.append(rankMark(r), el("b", "", `${tr("kCamp")} ${r.camp}`));
      else top.append(el("b", "", `${tr("kCamp")} ${r.camp}`), el("small", "mut", `${r.list.length} KD`));
      chips.append(...r.list.map(kingdomChip));
      const text = el("span", "kv-camp-s");
      text.append(top, chips);
      d.append(el("i", page.open.has(r.camp) ? "kv-arrow on" : "kv-arrow"));
      if (!state.narrow) d.append(rankMark(r));
      d.append(text);
      return d;
    } },
    { key: "players", label: tr("cPlayers"), get: (r) => r.players, text: (r) => fullNum(r.players), tip: () => "" }, { key: "power", label: tr("cPower"), get: (r) => r.power, text: (r) => fullNum(r.power), tip: () => "" },
    ...metricCols(METRICS, scale), tradesCol(),
  ];
  const col = cols.find((c) => c.key === page.kSort.key) || cols[3];
  const sorted = (rows) => sortRows(rows, col.get, page.kSort.dir);
  let rows;
  if (grouped) {
    rows = [];
    for (const g of sorted(groups)) {
      rows.push(g);
      if (page.open.has(g.camp)) rows.push(...sorted(kingdoms.filter((k) => k.camp === g.camp)));
    }
  } else rows = sorted(kingdoms);
  cols.all = [...kingdoms, ...(grouped ? groups : [])]; // opening a camp moves no column either
  box.appendChild(table(cols, rows, { key: col.key, dir: page.kSort.dir }, (k) => { page.kSort = nextSort(page.kSort, k); drawCamps(box, b); }, (r) => {
    if (r.list) { page.open.has(r.camp) ? page.open.delete(r.camp) : page.open.add(r.camp); drawCamps(box, b); }
  }));
}

// ---- the players of one camp or kingdom: a menu in the table's bar ----
function setFilter(ks, label, btn) {
  state.kOnly = ks ? new Set(ks) : null;
  btn.firstChild.textContent = label;
  KS.repick();
}
function drawFilter(b) {
  $("kvkFilter")?.remove();
  const wrap = el("div", "vpick"), btn = el("button", "btn kv-pick"), pop = el("div", "pop kv-pop");
  wrap.id = "kvkFilter";
  btn.type = "button"; btn.append(el("span", "", tr("kAllCamps"))); pop.hidden = true;
  const outside = (e) => { if (!wrap.contains(e.target)) close(); };
  const close = () => { pop.hidden = true; document.removeEventListener("pointerdown", outside); };
  const pick = (ks, label) => { setFilter(ks, label, btn); close(); };
  const line = (label, ks, right) => {
    const r = el("button", "kv-opt");
    r.type = "button";
    r.append(el("b", "", label));
    if (right) r.append(right);
    r.onclick = () => pick(ks, label);
    return r;
  };
  pop.appendChild(line(tr("kAllCamps"), null));
  for (const [camp, list] of campsOf(b)) {
    const ours = list.filter((k) => !k.other);
    if (!ours.length) continue;
    if (camp) pop.appendChild(line(`${tr("kCamp")} ${camp}`, ours.map((k) => k.k), el("small", "mut", `${ours.length} KD`)));
    for (const k of ours) { const r = line(`#${k.k}`, [k.k]); r.classList.add("kv-sub"); pop.appendChild(r); }
  }
  btn.onclick = () => {
    if (!pop.hidden) { close(); return; }
    pop.hidden = false;
    document.addEventListener("pointerdown", outside);
  };
  wrap.append(btn, pop);
  $("pq").closest("label").before(wrap);
  state.kOnly = null;
}

const clearArt = (node) => { node.classList.remove("has-art", "art-wide"); node.style.removeProperty("--art"); node.style.removeProperty("--art-blur"); };
const battleOf = (idx, k) => idx?.battles.find((x) => x.id === idx.kvkOf[k]);
KS.season = { of: battleOf, title: seasonTitle, status: statusName, dates, list: () => load("kvk/index.json"), art: (node, season) => { clearArt(node); setArt(node, season); } };
KS.onKingdomShown = async (k) => {
  let chip = $("kStatus");
  if (!chip) { chip = el("span", "k-status"); chip.id = "kStatus"; chip.hidden = true; $("cmpTags").appendChild(chip); }
  const seen = await load("kvk/index.json"), st = seen?.servers?.[k]?.[1];
  const all = state.comparing ? [state.mainK, ...state.also] : [k];
  chip.hidden = !statusName(st) || all.some((x) => seen?.kvkOf[x] !== seen?.kvkOf[k]); // kingdoms apart: no one status for them
  chip.textContent = statusName(st);
  chip.dataset.st = st ?? "";
  const box = $("kCamps"), idx = await load("kvk/index.json");
  const ks = state.comparing ? [state.mainK, ...state.also] : [k];
  // kingdoms apart have no camps to share: shown only when all of them are in the one KvK
  const one = battleOf(idx, k);
  const list = !state.kvk && one && ks.every((x) => idx.kvkOf[x] === one.id) ? [one] : [];
  const of = list.map((x) => x.id).join();
  if (box.dataset.of === of) return;
  box.dataset.of = of;
  box.innerHTML = "";
  box.hidden = !list.length;
  for (const b of list) box.appendChild(campsPanel(b));
};

// ---- the camps of a KvK, on its page and under the cards of a kingdom in it ----
function campsPanel(b) {
  const wrap = el("div"), head = el("div", "kr-head"), place = el("span", "kr-place"), end = el("div", "kr-end"), all = el("a", "btn kr-link", tr("kSeeAll")), box = el("section", "kv-panel");
  all.href = "#p=rank&m=kvk";
  head.append(el("h2", "", tr("kCamps")), place);
  if (b.from) head.append(el("span", "mut", `${b.from} → ${b.to}`));
  head.append(end);
  wrap.append(head, box);
  if (b.rank) {
    place.title = tr("kRankTip");
    place.append(el("b", "kr-main", "#" + b.rank), el("span", "mut", tr("kRankOf").replace("{n}", numFmt().format(b.ranked))),
      el("span", "kr-pill", tr("iTop").replace("{p}", numFmt(1).format((100 * b.rank) / b.ranked))));
  }
  const tog = el("button", "mode-sw kv-sw");
  tog.type = "button";
  tog.setAttribute("role", "switch");
  tog.setAttribute("aria-checked", String(!page.grouped));
  tog.append(el("i", "mode-t"), el("span", "mode-b", tr("kUngroup")));
  const body = el("div");
  tog.onclick = () => { page.grouped = !page.grouped; tog.setAttribute("aria-checked", String(!page.grouped)); drawCamps(body, b); };
  if (b.kingdoms.some((k) => k.camp)) end.appendChild(tog);
  end.appendChild(all);
  if (!b.sums) box.appendChild(note(tr("kNotOpen")));
  const others = b.kingdoms.filter((k) => k.other).length;
  if (others) box.appendChild(note(tr("kOtherNote").replace("{n}", others).replace("{m}", b.kingdoms.length).replace("{top}", b.crossTop ?? 600)));
  box.appendChild(body);
  drawCamps(body, b);
  return wrap;
}

// ---- above the Kingdom table, when it shows a KvK ----
let slotOf = 0;
async function drawSlot() {
  const slot = $("kvkSlot");
  if (!state.kvk) {
    slot.innerHTML = ""; slotOf = 0;
    $("kvkFilter")?.remove();
    if (state.kOnly) { state.kOnly = null; KS.repick(); }
    return;
  }
  if (slotOf === state.kvk) return;
  const idx = await load("kvk/index.json");
  const b = idx?.battles.find((x) => x.id === state.kvk);
  if (!b) return;
  slotOf = b.id;
  slot.innerHTML = "";
  const back = el("a", "btn kv-back", tr("kBack"));
  back.href = page.group ? `#p=kvk&g=${page.group}` : "#p=kvk";
  slot.append(back, hero(b));
  drawFilter(b);
  slot.appendChild(campsPanel(b));
}
KS.onKvk = drawSlot;

async function show() {
  const hp = new URLSearchParams(location.hash.slice(1));
  if (hp.get("p") === "kvk" && hp.has("g")) page.group = hp.get("g");
  const id = hp.get("p") === "kvk" ? Number(hp.get("b")) : 0;
  if (id) { // an older link
    const b = (await load("kvk/index.json"))?.battles.find((x) => x.id === id);
    if (b) { location.hash = kvkLink(b); return; }
  }
  drawSlot();
  return showList();
}
KS.pages.kvk = { title: "navKvk", desc: "descKvk", show };
})();
