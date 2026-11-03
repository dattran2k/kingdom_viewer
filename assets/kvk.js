// The KvK page: the running KvKs by season, and one's camps, kingdoms and players since it opened.
// A classic script loaded after pages.js. Reads data/kvk/index.json.
// Links: #p=kvk&g=<group>; a KvK itself: #k=<kingdom>&a=<open day>&also=<kingdoms>&kvk=<id>
(() => {
"use strict";
const KS = window.KS, { state, tr, $, numFmt } = KS;
const { el, num, load, objects, table, sortRows, nextSort, searchBox, fmtBtn, pager, frame, setLink } = KS.ui;
Object.assign(KS.T.vi, {
  navKvk: "KvK", descKvk: "Các KvK đang diễn ra theo mùa. Bấm Chi tiết KvK để xem phe, kingdom và người chơi từ lúc mở.",
  kNotOpen: "KvK này chưa mở nên chưa có số liệu. Dưới đây là các phe và lực chiến hiện tại của người chơi.", cName: "Tên", cAlliance: "Liên minh", rServers: "Xếp hạng server", rMembers: "Xếp hạng người chơi", rKvks: "Xếp hạng KvK", kSeeAll: "Xem toàn bộ KvK", kRankOf: "/ {n} KvK", kRankTip: "Xếp theo tổng lực chiến max của người chơi có lực chiến max trên 15M trong KvK", rStatus: "Trạng thái", rSearchP: "Tên, ID, liên minh, #kingdom...", rMembersHint: "{n} người chơi (top {top} mỗi chỉ số, trong {all} người) ", kAll: "Tất cả", kS2: "Mùa Giải 2", kS3: "Mùa Giải 3", kSos: "Mùa Giải Xung Đột", kSearch: "Kingdom hoặc mã KvK...", kTime: "Thời gian", kNone: "Không có KvK nào khớp.", kNoData: "Chưa có dữ liệu KvK.",
  kLive: "Đang diễn ra", kSoon: "Sắp mở", kDayLeft: "còn {n} ngày", kOpenIn: "mở sau {n} ngày", kCamp: "Phe", kOpen: "Chi tiết KvK", kRunning: "Đang diễn ra", kKds: "KD", kBack: "← Danh sách KvK",
  kCamps: "Xếp hạng KvK", kRankPlayers: "Xếp hạng người chơi", kUngroup: "Bỏ nhóm", kShowCols: "Chỉ số", kView: "Hiển thị", kExport: "Xuất CSV", kShow: "Hiện", kPerPage: "mỗi trang", kGo: "Trang", kShowing: "Hiện {a}–{b} / {n}", kOtherNote: "{n}/{m} kingdom ở khu vực khác: chỉ có lực chiến và công trạng của người chơi lọt top {top} toàn map.", kOther: "khu vực khác", kOtherTip: "Kingdom ở khu vực khác: chỉ có số của người chơi lọt top toàn map.",
  kPending: "Chưa có số liệu.",  kAllCamps: "Mọi phe", kAllKingdoms: "Mọi kingdom",
  kProgress: "Tiến độ KvK", kInfo: "Thông tin KvK", kTopPlayers: "Top người chơi", kTopHint: "{n} người chơi của #{k} có công trạng cao nhất từ lúc KvK mở", kMore: "Xem chi tiết thông tin KvK",
  kTabOverview: "Tổng quan", kTabWar: "Lịch sử chiến sự", kWarSearch: "Liên minh, người chơi, kingdom, #trận...", kWarFight: "Trận", kWarStart: "Bắt đầu (UTC)", kWarDur: "Từ đầu tới giao tranh cuối",
  kWarPeople: "Người tham gia", kWarTop: "Hạng 1", kWarLive: "Đang diễn ra", kWarMeta: "{n} trận · lấy lúc {t} UTC", kWarArea: "Khu {a} · số {t}",
  kWarTop10: "Xếp hạng công trạng (top 10)", kWarAlliances: "Liên minh tham gia", kWarNone: "Không có trận nào khớp.",
  kWarNote: "Game chỉ trả top 10 người mỗi trận. \"Người tham gia\" là số game hiện. Đang diễn ra: trận trong danh sách đang diễn ra của game lúc lấy dữ liệu, chưa có giờ kết thúc (trận đã xong mới vào lịch sử). Một vị trí bị đánh lại nhiều lần vẫn là một trận, nên trận có thể kéo dài nhiều ngày; \"Giao tranh cuối\" là lần cập nhật cuối của server. Merits trade: mọi liên minh và người chơi biết được kingdom đều cùng một kingdom.",
  kMin: "{n} phút", kHour: "{h} giờ {m} phút", kDay: "{d} ngày {h} giờ",
  kWarReal: "Trận thật", kTabTrade: "Merits trade detection", kTradeMerits: "Công trạng trade", kTradeFights: "Trận trade", kRealMerits: "Công trạng trận thật", kRealFights: "Trận thật", kTradeShare: "% trade", kTradeShareTip: "Phần công trạng từ merits trade trong tổng công trạng của người chơi ở các top 10", kTradeBest: "Trận trade lớn nhất", kTradeMeta: "{n} người chơi · lấy lúc {t} UTC", kTradeNote: "Người chơi có mặt trong top 10 của ít nhất một trận merits trade (chỉ một kingdom tham gia), xếp theo công trạng lấy được ở các trận đó. Game chỉ trả top 10 mỗi trận nên đây là phần thấy được, không phải toàn bộ. Bấm một người để xem các trận trade của họ.", kWarNoLive: "Lần lấy này không có danh sách đang diễn ra của game.", kWarTrade: "Merits trade", kWarTradeTip: "Chỉ một kingdom tham gia: đánh nhau trong cùng kingdom để lấy công trạng", kWarKd: "Kingdom", kWarEnd: "Giao tranh cuối (UTC)",
  kWarShare: "Top 10 chiếm {p}% công trạng trận", kWarOfFight: "{p}% trận", kWarLegion: "Quân đoàn {n}", kWarNoLegion: "Không quân đoàn",
  kWarNowAs: "Tag liên minh của người chơi là liên minh hiện tại (lúc lấy dữ liệu), có thể khác lúc đánh.", kWarUnknownK: "Không rõ kingdom (ngoài bảng xếp hạng đã quét)",
});
Object.assign(KS.T.en, {
  navKvk: "KvK", descKvk: "The running KvKs by season. Open KvK details for its camps, kingdoms and players since it opened.",
  kNotOpen: "This KvK has not opened yet, so it has no numbers. These are its camps, and the players as they are now.", cName: "Name", cAlliance: "Alliance", rServers: "Server ranking", rMembers: "Players ranking", rKvks: "KvK ranking", kSeeAll: "See all KvKs", kRankOf: "/ {n} KvKs", kRankTip: "By the total max power of the KvK's players above 15M max power", rStatus: "Status", rSearchP: "Name, ID, alliance, #kingdom...", rMembersHint: "{n} players (top {top} of each metric, out of {all}) ", kAll: "All", kS2: "Season 2", kS3: "Season 3", kSos: "Season of Strife", kSearch: "Kingdom or KvK code...", kTime: "Time", kNone: "No KvK matches.", kNoData: "No KvK data yet.",
  kLive: "Running", kSoon: "Upcoming", kDayLeft: "{n} days left", kOpenIn: "opens in {n} days", kCamp: "Camp", kOpen: "KvK details", kRunning: "Running", kKds: "KD", kBack: "← All KvKs",
  kCamps: "KvK ranking", kRankPlayers: "Players ranking", kUngroup: "Ungroup", kShowCols: "Show", kView: "View", kExport: "Export CSV", kShow: "Show", kPerPage: "per page", kGo: "Page", kShowing: "Showing {a}–{b} of {n}", kOtherNote: "{n} of {m} kingdoms are in another region: only the power and merits of players in the map's top {top}.", kOther: "other region", kOtherTip: "A kingdom of another region: numbers of the players in the map's top only.",
  kPending: "No numbers yet.",  kAllCamps: "All camps", kAllKingdoms: "All kingdoms",
  kProgress: "KvK progress", kInfo: "KvK info", kTopPlayers: "Top players", kTopHint: "The {n} players of #{k} with the most merits since the KvK opened", kMore: "See the KvK details",
  kTabOverview: "Overview", kTabWar: "War history", kWarSearch: "Alliance, player, kingdom, #fight...", kWarFight: "Fight", kWarStart: "Start (UTC)", kWarDur: "First to last clash",
  kWarPeople: "Participants", kWarTop: "Top 1", kWarLive: "In progress", kWarMeta: "{n} fights · crawled {t} UTC", kWarArea: "Area {a} · no. {t}",
  kWarTop10: "Merit ranking (top 10)", kWarAlliances: "Alliances in it", kWarNone: "No fight matches.",
  kWarNote: "The game gives the top 10 players of a fight only. \"Participants\" is the game's number. In progress: a fight on the game's in-progress list at the crawl, no end yet (a fight joins the history when it is over). A place fought over again and again stays one fight, so a fight can last days; \"Last clash\" is the server's last update of it. Merits trade: every alliance and player whose kingdom is known is of one kingdom.",
  kMin: "{n} min", kHour: "{h} h {m} min", kDay: "{d} d {h} h",
  kWarReal: "Real fights", kTabTrade: "Merits trade detection", kTradeMerits: "Trade merits", kTradeFights: "Trade fights", kRealMerits: "Real fight merits", kRealFights: "Real fights", kTradeShare: "% trade", kTradeShareTip: "The share of the player's merits in the top 10s that came from merits trades", kTradeBest: "Biggest trade", kTradeMeta: "{n} players · crawled {t} UTC", kTradeNote: "Players in the top 10 of at least one merits trade (one kingdom only), by the merits they took in those fights. The game gives the top 10 of a fight only: this is what can be seen, not all. Click a player for their trade fights.", kWarNoLive: "This crawl has no in-progress list from the game.", kWarTrade: "Merits trade", kWarTradeTip: "One kingdom only: a fight inside one kingdom for merits", kWarKd: "Kingdom", kWarEnd: "Last clash (UTC)",
  kWarShare: "The top 10 have {p}% of the fight's merits", kWarOfFight: "{p}% of fight", kWarLegion: "Legion {n}", kWarNoLegion: "No legion",
  kWarNowAs: "A player's alliance tag is their alliance now (at the crawl), maybe not the one they fought in.", kWarUnknownK: "Kingdom unknown (not in the crawled rankings)",
});

const GROUPS = [["S2", "kS2"], ["S3", "kS3"], ["SoS", "kSos"]]; // Season 1 is no KvK: each kingdom is its own map
const groupLabel = (g) => tr(GROUPS.find((x) => x[0] === g)?.[1] ?? g);
const DAY = 86400;
const when = (s) => new Date(s * 1000).toISOString().slice(5, 10).split("-").reverse().join("/");
const nowSec = () => Date.now() / 1000;
const page = { group: "", q: "", battle: 0, camp: 0, kingdom: 0, pq: "", p: 1, sort: { key: "merits", dir: -1 }, kSort: { key: "merits", dir: -1 }, lSort: { key: "open", dir: -1 }, lp: 1, opened: new Set(), grouped: true, open: new Set(),
  topSort: { key: "merits", dir: -1 }, tab: "ov", wq: "", wp: 1, wf: "all", wk: null, wSort: { key: "start", dir: -1 }, wOpen: new Set(), tq: "", tp: 1, tk: null, tSort: { key: "trade", dir: -1 } };
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
  box.append(...progress(b));
  return box;
}
// how far along a KvK is: its lines, none if its end is not known; here and on the Kingdom page
function progress(b) {
  if (!b.end) return [];
  const now = nowSec(), pct = Math.max(0, Math.min(100, (100 * (now - b.open)) / (b.end - b.open)));
  const top = el("div", "kv-prog-h"), t = el("span", "");
  t.append(el("b", "", tr("kProgress")), el("span", "mut", ` ${numFmt(0).format(pct)}%`));
  const left = Math.ceil((b.end - now) / DAY);
  top.append(t, el("span", "mut", tr("kDayLeft").replace("{n}", left)));
  const bar = el("div", "kv-prog");
  bar.appendChild(el("i")).style.width = pct + "%";
  const ends = el("div", "kv-prog-h mut");
  ends.append(el("span", "", when(b.open)), el("span", "", when(b.end)));
  return [top, bar, ends];
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
  $("dvSlot").appendChild(find);
  ctl.append(tabs, fmtBtn(draw));
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
    const show = (on, animate = true) => {
      if (on) { page.opened.add(name); fill(); } else page.opened.delete(name);
      const from = body.offsetHeight; // from where it is now: a second click mid-way does not jump
      body.getAnimations().forEach((a) => a.cancel());
      if (animate && !matchMedia("(prefers-reduced-motion: reduce)").matches) body.animate({ height: [from + "px", (on ? inner.offsetHeight : 0) + "px"] }, { duration: 280, easing: "ease" });
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
    { key: "name", label: grouped && !state.narrow ? `${tr("kCamp")} / ${tr("cKingdom")}` : grouped ? tr("kCamp") : tr("cKingdom"), left: true, tip: () => "", w: state.narrow ? 108 : 190, get: (r) => (r.list ? r.camp : r.k), node: (r) => {
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
    { key: "players", label: tr("cPlayers"), get: (r) => r.players, text: (r) => fullNum(r.players), tip: () => "" },
    ...metricCols([["power", "cPower"], ["powerMax", "cPowerMax"], ...METRICS], scale), tradesCol(),
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
function setFilter(ks) {
  state.kOnly = ks ? new Set(ks) : null;
  KS.repick();
}
// the menu of a KvK's camps and kingdoms: on(kingdoms or null for all, label)
function campPicker(b, label, on) {
  const wrap = el("div", "vpick"), btn = el("button", "btn kv-pick"), pop = el("div", "pop kv-pop");
  btn.type = "button"; btn.append(el("span", "", label)); pop.hidden = true;
  const outside = (e) => { if (!wrap.contains(e.target)) close(); };
  const close = () => { pop.hidden = true; document.removeEventListener("pointerdown", outside); };
  const pick = (ks, text) => { btn.firstChild.textContent = text; close(); on(ks, text); };
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
  return wrap;
}
function drawFilter(b) {
  $("kvkFilter")?.remove();
  const wrap = campPicker(b, tr("kAllCamps"), (ks) => setFilter(ks));
  wrap.id = "kvkFilter";
  $("pq").closest("label").before(wrap);
  state.kOnly = null;
}

const clearArt = (node) => { node.classList.remove("has-art", "art-wide"); node.style.removeProperty("--art"); node.style.removeProperty("--art-blur"); };
const battleOf = (idx, k) => idx?.battles.find((x) => x.id === idx.kvkOf[k]);
KS.season = { of: battleOf, camps: campsOf, title: seasonTitle, status: statusName, dates, progress, list: () => load("kvk/index.json"), art: (node, season) => { clearArt(node); setArt(node, season); } };
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
  const of = state.lang + k + list.map((x) => x.id).join(); // a new language or kingdom draws them again (its top players)
  if (box.dataset.of === of) return;
  box.dataset.of = of;
  box.innerHTML = "";
  box.hidden = !list.length;
  for (const b of list) box.appendChild(campsPanel(b, k));
};

// ---- the camps of a KvK, on its page and under the cards of a kingdom in it ----
// On the Kingdom page (info = the kingdom shown) it sits in one frame titled KvK info, with that kingdom's top players under the camps and a
// way to the KvK page; both tables are the camps table's (same cells, same bars)
function campsPanel(b, info) {
  const head = el("div", "kr-head"), place = el("span", "kr-place"), end = el("div", "kr-end"), all = el("a", "btn kr-link", tr("kSeeAll")), box = el("section", "kv-panel");
  all.href = "#p=rank&m=kvk";
  head.append(el("h2", "", tr("kCamps")), place);
  if (b.from) head.append(el("span", "mut", `${b.from} → ${b.to}`));
  head.append(end);
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
  if (!info) { const wrap = el("div"); wrap.append(head, box); return wrap; }
  // first the KvK's place among all (and the way to all of them), then its info over the camps table (and the way to its page)
  const frame = el("section", "kv-info"), title = el("div", "kv-info-h"), info_ = el("div", "kr-head"), more = el("a", "kv-info-link", tr("kMore"));
  more.href = "#" + kvkLink(b);
  all.className = "kv-info-link";
  title.append(el("h2", "", tr("kCamps")), place, all);
  info_.append(el("h2", "", tr("kInfo")), more);
  if (b.from) info_.append(el("span", "mut", `${b.from} → ${b.to}`));
  info_.append(end);
  frame.append(title, info_, box);
  const mine = b.top?.[info] || [];
  if (mine.length) {
    const topHead = el("div", "kr-head"), topBox = el("section", "kv-panel"), topBody = el("div");
    topHead.append(el("h2", "", tr("kTopPlayers")), el("span", "mut", tr("kTopHint").replace("{n}", mine.length).replace("{k}", info)));
    topBox.appendChild(topBody);
    drawTop(topBody, mine);
    frame.append(topHead, topBox);
  }
  return frame;
}
// a figure now and its change since the KvK opened: the Kingdom table's cell while comparing
function changeCell(now, d) {
  const c = el("span", "d3");
  if (d === now) { c.append(el("span", "d-b", fullNum(now))); return c; } // counted from 0 (merits): the change is the value, shown once
  if (d) c.append(el("span", "d-d " + (d > 0 ? "hi" : "lo"), (d > 0 ? "↑ " : "↓ ") + fullNum(Math.abs(d))));
  else c.append(el("span", "d-d", "→ 0"));
  c.append(el("span", "d-b", fullNum(now)));
  return c;
}
// the KvK's top players, in the camps table's columns: each figure with its bar (of the value now) and its change
function drawTop(box, list) {
  box.innerHTML = "";
  const dKey = (k) => "d" + k[0].toUpperCase() + k.slice(1);
  const bars = metricCols([["power", "cPower"], ["merits", "cMerits"], ["kills", "cKills"], ["deaths", "cDeaths"], ["heals", "cHeals"]], list)
    // ordered by the change since the KvK opened; the bar is its size, rise or fall alike, as everywhere a change is shown
    .map((c) => ({ ...c, get: (r) => r[dKey(c.key)], bar: (r) => Math.abs(r[dKey(c.key)] ?? 0), max: list.reduce((m, r) => Math.max(m, Math.abs(r[dKey(c.key)] ?? 0)), 0),
      node: (r) => changeCell(r[c.key], r[dKey(c.key)]), tip: (r) => `${c.label}: ${fullNum(r[c.key])}` }));
  const cols = [
    { key: "name", label: tr("cName"), left: true, tip: () => "", w: state.narrow ? 150 : 170, get: (r) => r.name, node: (r) => {
      const d = el("span", "kv-kname");
      d.append(el("b", r._i === 1 ? "kv-rk top" : "kv-rk", "#" + r._i));
      const who = el("span", "who");
      who.append(el("b", "", r.name), el("small", "", String(r.id))); // all of one kingdom: its number is in the line above the table
      d.append(who);
      return d;
    } },
    { key: "alliance", label: tr("cAlliance"), tip: () => "", w: 88, get: (r) => r.alliance, node: (r) => (r.alliance ? KS.allianceChip(r.alliance) : el("span", "mut", "–")) },
    ...bars, tradesCol(),
  ];
  const col = cols.find((c) => c.key === page.topSort.key) || cols.find((c) => c.key === "merits");
  const rows = sortRows(list.map((r) => ({ ...r })), col.get, page.topSort.dir);
  rows.forEach((r, i) => { r._i = i + 1; });
  cols.all = rows;
  box.appendChild(table(cols, rows, page.topSort, (k) => { page.topSort = nextSort(page.topSort, k); drawTop(box, list); }, (r) => { location.hash = "k=" + r.k; }));
}

// ---- War history: every fight of the map (kvk_battles_export.py), the live ones first ----
const utcTime = (s) => { const t = new Date(s * 1000).toISOString(); return `${t.slice(8, 10)}/${t.slice(5, 7)} ${t.slice(11, 16)}`; };
function lasted(s) {
  const m = Math.max(0, Math.round(s / 60));
  if (m < 60) return tr("kMin").replace("{n}", m);
  if (m < 48 * 60) return tr("kHour").replace("{h}", Math.floor(m / 60)).replace("{m}", m % 60);
  return tr("kDay").replace("{d}", Math.floor(m / 1440)).replace("{h}", Math.floor((m % 1440) / 60));
}
const badge = (cls, text, tip) => { const b = el("span", "kv-badge " + cls, text); if (tip) b.title = tip; return b; };
const pct = (a, b) => (b ? numFmt(a / b >= 0.1 ? 0 : 1).format((100 * a) / b) : "0");
// a kingdom chip of a fight's player or alliance, a dash when our scans do not know it
const kdOf = (k) => { if (k) return el("span", "kd", "#" + k); const d = el("span", "kd kv-war-unk", "?"); d.title = tr("kWarUnknownK"); return d; };
function allianceChips(list, max) {
  const d = el("span", "kv-war-as");
  for (const a of list.slice(0, max)) { const c = el("span", "kv-war-a", a.abbr || "–"); c.title = a.name; d.appendChild(c); }
  if (list.length > max) d.appendChild(el("small", "mut", `+${list.length - max}`));
  return d;
}
function stat(label, value) {
  const s = el("div", "kv-war-stat");
  s.append(el("small", "", label), el("b", "", value));
  return s;
}
function warDetail(r, crawled) {
  const box = el("div", "kv-war-det"), head = el("div", "kv-war-stats");
  head.append(stat(tr("kWarStart"), utcTime(r.start)), stat(tr("kWarEnd"), r.end ? utcTime(r.end) : tr("kWarLive")), stat(tr("kWarDur"), lasted((r.end || crawled) - r.start)),
    stat(tr("kWarPeople"), numFmt().format(r.fights)), stat(tr("cMerits"), numFmt().format(r.merits)));
  const topSum = r.top.reduce((s, p) => s + p.merits, 0);
  const share = el("div", "kv-war-share"), bar = el("div", "kv-prog thin");
  bar.appendChild(el("i")).style.width = Math.min(100, r.merits ? (100 * topSum) / r.merits : 0) + "%";
  share.append(el("span", "mut", tr("kWarShare").replace("{p}", pct(topSum, r.merits))), bar);
  const cols = el("div", "kv-war-cols"), top = el("div", "kv-war-col"), as = el("div", "kv-war-col");
  top.appendChild(el("h4", "", tr("kWarTop10")));
  const ol = el("ol", "kv-war-top"), best = r.top[0]?.merits || 0;
  r.top.forEach((p, i) => {
    const li = el("li", i < 3 ? "p" + (i + 1) : ""), who = el("div", "kv-war-who"), line = el("div", "kv-war-line"), fill = el("div", "kv-war-bar");
    li.title = `ID ${p.id}`;
    line.append(el("b", "kv-war-pn", p.name));
    if (p.abbr) line.append(el("span", "kv-war-tag", `[${p.abbr}]`));
    line.append(kdOf(p.k));
    fill.appendChild(el("i")).style.width = (best ? (100 * p.merits) / best : 0) + "%";
    who.append(line, fill);
    const n = el("div", "kv-war-n");
    n.append(el("b", "", num(p.merits)), el("small", "mut", tr("kWarOfFight").replace("{p}", pct(p.merits, r.merits))));
    li.append(el("span", "kv-war-medal", String(i + 1)), who, n);
    ol.appendChild(li);
  });
  top.append(ol, el("p", "kv-war-foot mut", tr("kWarNowAs")));
  as.appendChild(el("h4", "", `${tr("kWarAlliances")} (${r.alliances.length})`));
  const legions = new Map(); // the alliances of one legion together, the legion of most first
  for (const a of r.alliances) { const k = a.legion || ""; if (!legions.has(k)) legions.set(k, []); legions.get(k).push(a); }
  for (const [legion, list] of [...legions].sort((x, y) => (!x[0]) - (!y[0]) || y[1].length - x[1].length)) {
    const g = el("div", "kv-war-legion");
    g.appendChild(el("h5", "", legion ? tr("kWarLegion").replace("{n}", legion) : tr("kWarNoLegion")));
    for (const a of list) {
      const row = el("div", "kv-war-al");
      row.append(el("b", "", a.abbr || "–"), el("span", "kv-war-aln", a.name), kdOf(a.k));
      g.appendChild(row);
    }
    as.appendChild(g);
  }
  cols.append(top, as);
  box.append(head, share, cols);
  return box;
}
// the filters over the fights: [key, label, test]; real fights before the merits trades
const WAR_FILTERS = [["all", "kAll", () => true], ["live", "kWarLive", (r) => r.live], ["real", "kWarReal", (r) => !r.trade], ["trade", "kWarTrade", (r) => r.trade]];
const SEARCH_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 10.5 14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
// the kingdoms of a fight, a box per camp of the KvK (as on the KvK ranking), the unknown ones apart
function campCell(ks, campOf) {
  const d = el("span", "rk-kds kv-war-kds"), camps = new Map();
  for (const k of ks) { const c = campOf.get(k) ?? 0; if (!camps.has(c)) camps.set(c, []); camps.get(c).push(k); }
  for (const [camp, list] of [...camps].sort((x, y) => x[0] - y[0])) {
    const box = d.appendChild(el("span", "rk-camp"));
    box.title = camp ? `${tr("kCamp")} ${camp}` : "";
    box.append(...list.map(kdOf));
    box.style.gridTemplateColumns = `repeat(${Math.min(list.length, 3)}, auto)`;
  }
  if (!ks.length) d.append(kdOf(null));
  return d;
}
// the controls under a table bar: the filter buttons, the kingdom menu, the search
function warControls(out, b, { filters, current, count, onFilter, kingdom, onKingdom, q, onSearch }) {
  const ctl = el("div", "kv-war-ctl");
  if (filters) {
    const seg = el("div", "rk-seg");
    for (const [key, label, f] of filters) {
      const btn = el("button", "", tr(label));
      btn.type = "button";
      btn.setAttribute("aria-pressed", String(current === key));
      btn.append(el("small", "", " " + count(f)));
      btn.onclick = () => onFilter(key);
      seg.appendChild(btn);
    }
    ctl.appendChild(seg);
  }
  const pick = campPicker(b, kingdom?.label || tr("kAllCamps"), (ks, label) => onKingdom(ks ? { ks, label } : null));
  const find = el("label", "kv-find");
  find.innerHTML = SEARCH_ICON;
  find.appendChild(searchBox(tr("kWarSearch"), q, (v) => { onSearch(v); out.querySelector(".kv-war-ctl input")?.focus(); }));
  ctl.append(pick, find);
  out.appendChild(ctl);
}
const crawlMeta = (data, n, key) => { const t = data.crawled.slice(0, 16); return tr(key).replace("{n}", numFmt().format(n)).replace("{t}", `${t.slice(8, 10)}/${t.slice(5, 7)} ${t.slice(11, 16)}`); };
const pageRows = (rows, p) => { const size = KS.store.get("pageSize", 20); return size ? rows.slice((p - 1) * size, p * size) : rows; };
const lastPage = (rows) => { const size = KS.store.get("pageSize", 20); return size ? Math.max(1, Math.ceil(rows.length / size)) : 1; };

function drawWarTable(out, data, b) {
  out.innerHTML = "";
  const crawled = Date.parse(data.crawled) / 1000, campOf = new Map(b.kingdoms.map((k) => [k.k, k.camp]));
  const q = page.wq.toLowerCase().replace(/^#/, "");
  const match = (r) => (!page.wk || r.kingdoms.some((k) => page.wk.ks.includes(k))) && (!q || String(r.i) === q || r.alliances.some((a) => a.abbr.toLowerCase().includes(q) || a.name.toLowerCase().includes(q))
    || r.top.some((p) => p.name.toLowerCase().includes(q) || String(p.id) === q));
  // a fight in progress has no end yet: it has lasted until the crawl
  const all = data.fights.map((r) => ({ ...r, dur: (r.end || crawled) - r.start, topName: r.top[0]?.name ?? "" }));
  const cols = [
    { key: "#", label: "#", get: (r) => r.i, text: (r) => "#" + r.i, cls: () => "mut", tip: () => "" },
    { key: "name", label: tr("kWarFight"), left: true, w: state.narrow ? 140 : 190, get: (r) => r.start, nosort: true, node: (r) => {
      const d = el("span", "kv-war-name"), top = el("span", "kv-war-t");
      top.append(el("b", "", `X:${r.x} Y:${r.y}`));
      if (r.live) top.append(badge("live", tr("kWarLive")));
      if (r.trade) top.append(badge("trade", tr("kWarTrade"), tr("kWarTradeTip")));
      d.append(top);
      if (r.times) d.appendChild(el("small", "", tr("kWarArea").replace("{a}", r.areas.join(", ") || "–").replace("{t}", r.times)));
      return d;
    } },
    { key: "kingdoms", label: tr("cKingdom"), nopin: true, get: (r) => r.kingdoms.length, w: state.narrow ? 170 : 260, node: (r) => campCell(r.kingdoms, campOf) },
    { key: "start", label: tr("kWarStart"), get: (r) => r.start, text: (r) => utcTime(r.start), tip: () => "" },
    { key: "end", label: tr("kWarEnd"), get: (r) => r.end || Infinity, text: (r) => (r.end ? utcTime(r.end) : "–"), tip: (r) => `${tr("kWarDur")}: ${lasted(r.dur)}` },
    { key: "alliance", label: tr("cAlliance"), get: (r) => r.alliances.length, w: state.narrow ? 140 : 200, node: (r) => allianceChips(r.alliances, state.narrow ? 2 : 4) },
    { key: "fights", label: tr("kWarPeople"), get: (r) => r.fights, text: (r) => numFmt().format(r.fights), max: all.reduce((m, r) => Math.max(m, r.fights), 0) },
    { key: "merits", label: tr("cMerits"), get: (r) => r.merits, max: all.reduce((m, r) => Math.max(m, r.merits), 0) },
    { key: "topName", label: tr("kWarTop"), nosort: true, w: 190, get: (r) => r.topName, node: (r) => {
      const p = r.top[0];
      if (!p) return el("span", "mut", "–");
      const d = el("span", "who");
      d.append(el("b", "", p.name), el("small", "", `${p.abbr ? "[" + p.abbr + "] " : ""}${p.k ? "#" + p.k + " · " : ""}${num(p.merits)}`));
      return d;
    } },
  ];
  const redraw = () => KS.keepScroll($("kvkPage"), () => drawWarTable(out, data, b));
  const col = cols.find((c) => c.key === page.wSort.key) || cols.find((c) => c.key === "start");
  const test = (WAR_FILTERS.find((f) => f[0] === page.wf) || WAR_FILTERS[0])[2];
  const found = all.filter(match);
  const sorted = sortRows(found.filter(test), col.get, page.wSort.dir);
  // the live ones on top, then the real fights, the merits trades last, each in the order picked
  const rows = [...sorted.filter((r) => r.live), ...sorted.filter((r) => !r.live && !r.trade), ...sorted.filter((r) => !r.live && r.trade)];
  const view = KS.ui.tableBar(out, { id: "war", title: tr("kTabWar"), meta: crawlMeta(data, rows.length, "kWarMeta"), cols, holder: page, prop: "wSort", redraw });
  warControls(out, b, { filters: WAR_FILTERS, current: page.wf, count: (f) => found.filter(f).length, onFilter: (k) => { page.wf = k; page.wp = 1; redraw(); },
    kingdom: page.wk, onKingdom: (k) => { page.wk = k; page.wp = 1; redraw(); }, q: page.wq, onSearch: (v) => { page.wq = v; page.wp = 1; drawWarTable(out, data, b); } });
  out.appendChild(el("p", "kv-war-hint mut", tr("kWarNote") + (data.liveKnown ? "" : " " + tr("kWarNoLive"))));
  if (!rows.length) { out.appendChild(el("p", "hint mut kv-war-hint", tr("kWarNone"))); return; }
  page.wp = Math.min(page.wp, lastPage(rows));
  const shown = pageRows(rows, page.wp);
  view.all = all;
  const tbl = table(view, shown, page.wSort, (k) => { page.wSort = nextSort(page.wSort, k); page.wp = 1; redraw(); }, (r) => {
    page.wOpen.has(r.i) ? page.wOpen.delete(r.i) : page.wOpen.add(r.i);
    redraw();
  });
  const trs = tbl.querySelectorAll("tbody > tr");
  shown.forEach((r, i) => {
    trs[i].classList.add("kv-war-row");
    if (r.live) trs[i].classList.add("live");
    if (r.trade) trs[i].classList.add("trade");
    if (!page.wOpen.has(r.i)) return;
    trs[i].classList.add("open");
    const line = el("tr", "kv-war-more"), td = el("td");
    td.colSpan = view.length;
    td.appendChild(warDetail(r, crawled));
    line.appendChild(td);
    trs[i].after(line);
  });
  out.appendChild(tbl);
  out.appendChild(pager(rows.length, page.wp, (n) => { page.wp = n; redraw(); }));
}

// ---- Merits trade detection: the players of the fights' top 10, by the merits they took in fights of one kingdom ----
function tradePlayers(data) {
  const by = new Map();
  for (const f of data.fights) {
    for (const p of f.top) {
      let r = by.get(p.id);
      if (!r) { r = { id: p.id, name: p.name, abbr: p.abbr, k: p.k, trade: 0, tradeN: 0, real: 0, realN: 0, best: null }; by.set(p.id, r); }
      if (f.trade) {
        r.trade += p.merits; r.tradeN += 1;
        if (!r.best || p.merits > r.best.merits) r.best = { i: f.i, merits: p.merits };
      } else { r.real += p.merits; r.realN += 1; }
    }
  }
  return [...by.values()].filter((r) => r.tradeN).map((r) => ({ ...r, share: r.trade + r.real ? r.trade / (r.trade + r.real) : 0 }));
}
function drawTradeTable(out, data, b) {
  out.innerHTML = "";
  const all = tradePlayers(data);
  const q = page.tq.toLowerCase().replace(/^#/, "");
  const rows0 = all.filter((r) => (!page.tk || page.tk.ks.includes(r.k)) && (!q || r.name.toLowerCase().includes(q) || String(r.id) === q || (r.abbr || "").toLowerCase().includes(q)));
  const cols = [
    { key: "#", label: "#", nosort: true, text: (r) => String(r._i), cls: () => "mut" },
    { key: "name", label: tr("cName"), left: true, w: state.narrow ? 130 : 190, get: (r) => r.name, node: (r) => { const d = el("span", "who"); d.append(el("b", "", r.name), el("small", "", String(r.id))); return d; } },
    { key: "kingdom", label: tr("cKingdom"), nopin: true, get: (r) => r.k, node: (r) => kdOf(r.k) },
    { key: "alliance", label: tr("cAlliance"), get: (r) => r.abbr, node: (r) => (r.abbr ? KS.allianceChip(r.abbr) : el("span", "mut", "–")) },
    { key: "trade", label: tr("kTradeMerits"), get: (r) => r.trade, max: all.reduce((m, r) => Math.max(m, r.trade), 0) },
    { key: "tradeN", label: tr("kTradeFights"), get: (r) => r.tradeN, text: (r) => String(r.tradeN) },
    { key: "real", label: tr("kRealMerits"), get: (r) => r.real, max: all.reduce((m, r) => Math.max(m, r.real), 0) },
    { key: "realN", label: tr("kRealFights"), get: (r) => r.realN, text: (r) => String(r.realN) },
    { key: "share", label: tr("kTradeShare"), get: (r) => r.share, text: (r) => numFmt(0).format(100 * r.share) + "%", tip: () => tr("kTradeShareTip") },
    { key: "best", label: tr("kTradeBest"), nosort: true, get: (r) => r.best?.i, text: (r) => (r.best ? `#${r.best.i} · ${num(r.best.merits)}` : "–") },
  ];
  const redraw = () => KS.keepScroll($("kvkPage"), () => drawTradeTable(out, data, b));
  const col = cols.find((c) => c.key === page.tSort.key) || cols.find((c) => c.key === "trade");
  const rows = sortRows(rows0, col.get, page.tSort.dir);
  rows.forEach((r, i) => { r._i = i + 1; });
  const view = KS.ui.tableBar(out, { id: "wartrade", title: tr("kTabTrade"), meta: crawlMeta(data, rows.length, "kTradeMeta"), cols, holder: page, prop: "tSort", redraw });
  warControls(out, b, { kingdom: page.tk, onKingdom: (k) => { page.tk = k; page.tp = 1; redraw(); }, q: page.tq, onSearch: (v) => { page.tq = v; page.tp = 1; drawTradeTable(out, data, b); } });
  out.appendChild(el("p", "kv-war-hint mut", tr("kTradeNote")));
  if (!rows.length) { out.appendChild(el("p", "hint mut kv-war-hint", tr("kWarNone"))); return; }
  page.tp = Math.min(page.tp, lastPage(rows));
  view.all = rows;
  // a player opens the War history on their merits trades
  out.appendChild(table(view, pageRows(rows, page.tp), page.tSort, (k) => { page.tSort = nextSort(page.tSort, k); page.tp = 1; redraw(); },
    (r) => { page.wq = String(r.id); page.wf = "trade"; page.wk = null; page.wp = 1; page.tab = "war"; KS.onKvkTab?.(); }));
  out.appendChild(pager(rows.length, page.tp, (n) => { page.tp = n; redraw(); }));
}

async function drawWar(wrap, b) {
  const data = await load(`kvk/battles/${b.id}.json`);
  wrap.innerHTML = "";
  if (!data) { wrap.appendChild(note(tr("kNoData"))); return; }
  if (page.tab === "trade") drawTradeTable(wrap, data, b);
  else drawWarTable(wrap, data, b);
}
function tabs(b, ov, war) {
  const nav = el("nav", "kv-pills kv-tabs");
  const press = () => nav.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.t === page.tab)));
  for (const [t, label, n] of [["ov", tr("kTabOverview")], ["war", tr("kTabWar"), b.wars], ["trade", tr("kTabTrade")]]) {
    const btn = el("button");
    btn.type = "button"; btn.dataset.t = t;
    btn.append(label);
    if (n) btn.append(" ", el("small", "", String(n)));
    btn.onclick = () => { page.tab = t; press(); showTab(b, ov, war); };
    nav.appendChild(btn);
  }
  KS.onKvkTab = () => { press(); showTab(b, ov, war); $("kvkWar")?.scrollIntoView({ block: "start" }); };
  press();
  return nav;
}
function showTab(b, ov, war) {
  const on = page.tab !== "ov" && !!b.wars;
  $("kvkPage").classList.toggle("kv-war-on", on); // the Kingdom table and its bar step aside
  ov.hidden = on;
  war.hidden = !on;
  if (on) drawWar(war, b);
}

// ---- above the Kingdom table, when it shows a KvK ----
let slotOf = "";
async function drawSlot() {
  const slot = $("kvkSlot");
  if (!state.kvk) {
    slot.innerHTML = ""; slotOf = "";
    $("kvkPage").classList.remove("kv-war-on");
    $("kvkWar")?.remove();
    $("kvkFilter")?.remove();
    if (state.kOnly) { state.kOnly = null; KS.repick(); }
    return;
  }
  if (slotOf === state.kvk + state.lang) return;
  const idx = await load("kvk/index.json");
  const b = idx?.battles.find((x) => x.id === state.kvk);
  if (!b) return;
  if (slotOf && state.kOnly) { state.kOnly = null; KS.repick(); } // the filter menu is drawn anew, on "all"
  slotOf = b.id + state.lang;
  slot.innerHTML = "";
  const back = el("a", "btn kv-back", tr("kBack"));
  back.href = page.group ? `#p=kvk&g=${page.group}` : "#p=kvk";
  slot.append(back, hero(b));
  const ov = campsPanel(b), war = el("div", "dv-out kv-war-out");
  war.id = "kvkWar";
  if (!b.wars) page.tab = "ov";
  if (b.wars) slot.appendChild(tabs(b, ov, war));
  drawFilter(b);
  slot.appendChild(ov);
  $("kvkWar")?.remove();
  $("kvkPage").appendChild(war); // the width of the players table: edge to edge, under the KvK top
  showTab(b, ov, war);
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
