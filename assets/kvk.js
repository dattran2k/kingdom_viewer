// The KvK page: the running KvKs by season, and one's camps, kingdoms and players since it opened.
// A classic script loaded after pages.js. Reads data/kvk/index.json.
// Links: #p=kvk&g=<group>; a KvK itself: #k=<kingdom>&a=<open day>&also=<kingdoms>&kvk=<id>
(() => {
"use strict";
const KS = window.KS, { state, tr, $, numFmt } = KS;
const { el, num, load, objects, table, sortRows, nextSort, searchBox, fmtBtn, pager, frame, setLink } = KS.ui;
Object.assign(KS.T.vi, {
  navKvk: "KvK", descKvk: "Các KvK đang diễn ra theo mùa. Bấm Chi tiết KvK để xem phe, kingdom và người chơi từ lúc mở.",
  kNotOpen: "KvK này chưa mở nên chưa có số liệu. Dưới đây là các phe và lực chiến hiện tại của người chơi.", cName: "Tên", cAlliance: "Liên minh", rServers: "Xếp hạng server", rMembers: "Xếp hạng người chơi", rKvks: "Xếp hạng KvK", kSeeAll: "Xếp hạng KvK", kRankOf: "/ {n} KvK", kRankTip: "Xếp theo tổng lực chiến max của người chơi có lực chiến hiện tại trên 15M trong KvK", rStatus: "Trạng thái", rSearchP: "Tên, ID, liên minh, #kingdom...", rMembersHint: "{n} người chơi (top {top} mỗi chỉ số, trong {all} người) ", kAll: "Tất cả", kS2: "Mùa Giải 2", kS3: "Mùa Giải 3", kSos: "Mùa Giải Xung Đột", kSearch: "Kingdom hoặc mã KvK...", kTime: "Thời gian", kHit: "khớp tìm kiếm", kFightsTip: "{n} trận đang diễn ra", kOpenWar: "Mở Lịch sử chiến sự", kvkNone: "Không có KvK nào khớp.", kNoData: "Chưa có dữ liệu KvK.",
  kLive: "Đang diễn ra", kSoon: "Sắp mở", kEnded: "Đã kết thúc", kNow: "Hiện tại", kHist: "Lịch sử", kHistNone: "Chưa có KvK nào kết thúc.", kDayLeft: "còn {n} ngày", kOpenIn: "mở sau {n} ngày", kCamp: "Phe", kOpen: "Chi tiết KvK", kRunning: "Đang diễn ra", kKds: "KD", kBack: "← Danh sách KvK",
  kCamps: "Xếp hạng KvK", kRankPlayers: "Xếp hạng người chơi", kByCamp: "Theo phe", kByKingdom: "Theo kingdom", kGroupBy: "Gộp theo", kNotFound: "Không tìm thấy KvK này. Có thể link đã cũ.", kShowCols: "Chỉ số", kView: "Hiển thị", kExport: "Xuất CSV", kShow: "Hiện", kPerPage: "mỗi trang", kGo: "Trang", kShowing: "Hiện {a}–{b} / {n}", kOtherNote: "{n}/{m} kingdom ở khu vực khác: chỉ có lực chiến và công trạng của người chơi lọt top {top} toàn map.", kOther: "khu vực khác", kOtherTip: "Kingdom ở khu vực khác: chỉ có số của người chơi lọt top toàn map.",
  kPending: "Chưa có số liệu.", kSeeSame: "Kingdom cùng trạng thái →",  kAllCamps: "Mọi phe", kAllKingdoms: "Mọi kingdom",
  kProgress: "Tiến độ KvK", kInfo: "Thông tin KvK", kTopPlayers: "Top người chơi", kTopHint: "{n} người chơi của #{k} có công trạng cao nhất từ lúc KvK mở", kMore: "Chi tiết KvK",
  kTabOverview: "Tổng quan", kTabWar: "Lịch sử chiến sự", kWarSearch: "Liên minh, người chơi, kingdom, #trận...", kWarFight: "Trận", kWarStart: "Bắt đầu (UTC)", kWarDur: "Từ đầu tới giao tranh cuối",
  kWarPeople: "Người tham gia", kWarTop: "Hạng 1", kWarLive: "Đang diễn ra", kWarMeta: "{n} trận · lấy lúc {t} UTC", kWarArea: "Khu {a} · số {t}",
  kWarTop10: "Xếp hạng công trạng (top 10)", kWarAlliances: "Liên minh tham gia", kWarNone: "Không có trận nào khớp.",
  kWarNote: "Game chỉ trả top 10 người mỗi trận. \"Người tham gia\" là số game hiện. Đang diễn ra: trận trong danh sách đang diễn ra của game lúc lấy dữ liệu, chưa có giờ kết thúc (trận đã xong mới vào lịch sử). Một vị trí bị đánh lại nhiều lần vẫn là một trận, nên trận có thể kéo dài nhiều ngày; \"Giao tranh cuối\" là lần cập nhật cuối của server. Merits trade: mọi liên minh và người chơi biết được kingdom đều cùng một kingdom.",
  kMin: "{n} phút", kHour: "{h} giờ {m} phút", kHourOnly: "{h} giờ", kDay: "{d} ngày {h} giờ",
  kPhLeft: "còn {t}", kPhFrom: "từ {d}", kMkPast: "Đã qua", kMkNow: "Đang mở · còn {t}", kMkNext: "Mở sau {t}", kMkEst: "ước tính", kMkReached: "Hoàn thành {t} UTC · mốc sau bắt đầu ngay", kMkOpens: "Mở trên bản đồ {t} UTC", kMkChapter: "Chương: {t}", kMkOpensDay: "Mở trên bản đồ {t} (12 giờ sau khi chương trước kết thúc)", kMkOpened: "Đã mở", kMkQuest: "Nhiệm vụ {a} – {b} UTC", kMkQuestDay: "Nhiệm vụ {a} – {b}", kMkOn: "Đang diễn ra", kMkSoon: "Sắp tới", kMkEarly: "Không có dữ liệu mốc 40000 Đội Tuần Tra Hắc Ám của KvK này: coi như xong trong vòng 12 giờ; không xong thì các mốc sau muộn hơn 18 giờ.", kMkFrom: "Ước tính: lịch mốc của mùa này (thời lượng của game), dời theo ngày mở của KvK này. Chỉ đúng ngày.", kMkFromOther: "Tạm lấy mốc của {k} (mùa khác): mùa này chưa đọc được mốc, nhiệm vụ và behemoth có thể khác.", kMkRead: "Đọc từ game lúc {t} UTC. Mốc chưa mở tính theo thời lượng của game.",
  kWarReal: "Trận thật", kTabTrade: "Phát hiện Merits trade", kTradeMerits: "Công trạng trade", kTradeFights: "Trận trade", kRealMerits: "Công trạng trận thật", kRealFights: "Trận thật", kTradeShare: "% trade", kTradeShareTip: "Phần công trạng từ merits trade trong tổng công trạng của người chơi ở các top 10", kTradeBest: "Trận trade lớn nhất", kTradeMeta: "{n} người chơi · lấy lúc {t} UTC", kTradeNote: "Người chơi có mặt trong top 10 của ít nhất một trận merits trade (chỉ một kingdom tham gia), xếp theo công trạng lấy được ở các trận đó. Game chỉ trả top 10 mỗi trận nên đây là phần thấy được, không phải toàn bộ. Bấm một người để xem các trận trade của họ.", kWarNoLive: "Lần lấy này không có danh sách đang diễn ra của game.", kWarTrade: "Merits trade", kWarTradeTip: "Chỉ một kingdom tham gia: đánh nhau trong cùng kingdom để lấy công trạng", kWarKd: "Kingdom", kWarEnd: "Giao tranh cuối (UTC)",
  kWarShare: "Top 10 chiếm {p}% công trạng trận", kWarOfFight: "{p}% trận", kWarLegion: "Quân đoàn {n}", kWarNoLegion: "Không quân đoàn",
  kWarNowAs: "Tag liên minh của người chơi là liên minh hiện tại (lúc lấy dữ liệu), có thể khác lúc đánh.", kWarUnknownK: "Không rõ kingdom (ngoài bảng xếp hạng đã quét)",
});
Object.assign(KS.T.en, {
  navKvk: "KvK", descKvk: "The running KvKs by season. Open KvK details for its camps, kingdoms and players since it opened.",
  kNotOpen: "This KvK has not opened yet, so it has no numbers. These are its camps, and the players as they are now.", cName: "Name", cAlliance: "Alliance", rServers: "Server ranking", rMembers: "Players ranking", rKvks: "KvK ranking", kSeeAll: "See all KvKs", kRankOf: "/ {n} KvKs", kRankTip: "By the total max power of the KvK's players above 15M power now", rStatus: "Status", rSearchP: "Name, ID, alliance, #kingdom...", rMembersHint: "{n} players (top {top} of each metric, out of {all}) ", kAll: "All", kS2: "Season 2", kS3: "Season 3", kSos: "Season of Strife", kSearch: "Kingdom or KvK code...", kTime: "Time", kHit: "matches the search", kFightsTip: "{n} fights going on", kOpenWar: "Open the War history", kvkNone: "No KvK matches.", kNoData: "No KvK data yet.",
  kLive: "Running", kSoon: "Upcoming", kEnded: "Over", kNow: "Current", kHist: "History", kHistNone: "No KvK has ended yet.", kDayLeft: "{n} days left", kOpenIn: "opens in {n} days", kCamp: "Camp", kOpen: "KvK details", kRunning: "Running", kKds: "KD", kBack: "← All KvKs",
  kCamps: "KvK ranking", kRankPlayers: "Players ranking", kByCamp: "By camp", kByKingdom: "By kingdom", kGroupBy: "Group by", kNotFound: "This KvK was not found. The link may be old.", kShowCols: "Metrics", kView: "View", kExport: "Export CSV", kShow: "Show", kPerPage: "per page", kGo: "Page", kShowing: "Showing {a}–{b} of {n}", kOtherNote: "{n} of {m} kingdoms are in another region: only the power and merits of players in the map's top {top}.", kOther: "other region", kOtherTip: "A kingdom of another region: numbers of the players in the map's top only.",
  kPending: "No numbers yet.", kSeeSame: "Same status →",  kAllCamps: "All camps", kAllKingdoms: "All kingdoms",
  kProgress: "KvK progress", kInfo: "KvK info", kTopPlayers: "Top players", kTopHint: "The {n} players of #{k} with the most merits since the KvK opened", kMore: "See the KvK details",
  kTabOverview: "Overview", kTabWar: "War history", kWarSearch: "Alliance, player, kingdom, #fight...", kWarFight: "Fight", kWarStart: "Start (UTC)", kWarDur: "First to last clash",
  kWarPeople: "Participants", kWarTop: "Top 1", kWarLive: "In progress", kWarMeta: "{n} fights · crawled {t} UTC", kWarArea: "Area {a} · no. {t}",
  kWarTop10: "Merit ranking (top 10)", kWarAlliances: "Alliances in it", kWarNone: "No fight matches.",
  kWarNote: "The game gives the top 10 players of a fight only. \"Participants\" is the game's number. In progress: a fight on the game's in-progress list at the crawl, no end yet (a fight joins the history when it is over). A place fought over again and again stays one fight, so a fight can last days; \"Last clash\" is the server's last update of it. Merits trade: every alliance and player whose kingdom is known is of one kingdom.",
  kMin: "{n} min", kHour: "{h} h {m} min", kHourOnly: "{h} h", kDay: "{d} d {h} h",
  kPhLeft: "{t} left", kPhFrom: "from {d}", kMkPast: "Over", kMkNow: "Open · {t} left", kMkNext: "Opens in {t}", kMkEst: "estimated", kMkReached: "Reached {t} UTC · the next starts then", kMkOpens: "Opens on the map {t} UTC", kMkChapter: "Chapter: {t}", kMkOpensDay: "Opens on the map {t} (12 h after the chapter before ends)", kMkOpened: "Open", kMkQuest: "Quest {a} – {b} UTC", kMkQuestDay: "Quest {a} – {b}", kMkOn: "Running", kMkSoon: "Upcoming", kMkEarly: "No data on this KvK's 40000 Darkling Patrols milestone: taken as done within 12 h; not done, the milestones after it come 18 h later.", kMkFrom: "Estimated: this season's milestones (the game's durations), moved to this KvK's open day. The day only.", kMkFromOther: "For now the milestones of {k} (another season): none read for this season yet, its quests and behemoths may differ.", kMkRead: "Read from the game {t} UTC. Milestones not open yet are timed by the game's durations.",
  kWarReal: "Real fights", kTabTrade: "Merits trade detection", kTradeMerits: "Trade merits", kTradeFights: "Trade fights", kRealMerits: "Real fight merits", kRealFights: "Real fights", kTradeShare: "% trade", kTradeShareTip: "The share of the player's merits in the top 10s that came from merits trades", kTradeBest: "Biggest trade", kTradeMeta: "{n} players · crawled {t} UTC", kTradeNote: "Players in the top 10 of at least one merits trade (one kingdom only), by the merits they took in those fights. The game gives the top 10 of a fight only: this is what can be seen, not all. Click a player for their trade fights.", kWarNoLive: "This crawl has no in-progress list from the game.", kWarTrade: "Merits trade", kWarTradeTip: "One kingdom only: a fight inside one kingdom for merits", kWarKd: "Kingdom", kWarEnd: "Last clash (UTC)",
  kWarShare: "The top 10 have {p}% of the fight's merits", kWarOfFight: "{p}% of fight", kWarLegion: "Legion {n}", kWarNoLegion: "No legion",
  kWarNowAs: "A player's alliance tag is their alliance now (at the crawl), maybe not the one they fought in.", kWarUnknownK: "Kingdom unknown (not in the crawled rankings)",
});

const GROUPS = [["S2", "kS2"], ["S3", "kS3"], ["SoS", "kSos"]]; // Season 1 is no KvK: each kingdom is its own map
const groupLabel = (g) => tr(GROUPS.find((x) => x[0] === g)?.[1] ?? g);
// the KvK page's tabs (the user, 07/11): KvK1 (Season 1: each kingdom its own map), KvK2, KvK3, SoS1, then every Season
// of Strife (SoS1 too: season 1001, the first SoS)
const KVK_TABS = [["S1", "KvK1", (b) => b.group === "S1"], ["S2", "KvK2", (b) => b.group === "S2"], ["S3", "KvK3", (b) => b.group === "S3"],
  ["SoS1", "SoS1", (b) => b.seasonName === "SoS1"], ["SoS", null, (b) => b.group === "SoS"]];
const inTab = (g, b) => !g || !!KVK_TABS.find((x) => x[0] === g)?.[2](b);
const DAY = 86400;
const when = (s) => new Date(s * 1000).toISOString().slice(5, 10).split("-").reverse().join("/");
const nowSec = () => Date.now() / 1000;
const page = { hist: false, group: "", q: "", battle: 0, camp: 0, kingdom: 0, pq: "", p: 1, sort: { key: "merits", dir: -1 }, kSort: { key: "merits", dir: -1 }, lSort: { key: "open", dir: -1 }, lp: 1, opened: new Set(), grouped: true, open: new Set(),
  topSort: { key: "merits", dir: -1 }, tab: "ov", wq: "", wp: 1, wf: "all", wk: null, wSort: { key: "start", dir: -1 }, wOpen: new Set(), tq: "", tp: 1, tk: null, tSort: { key: "trade", dir: -1 } };
const tradesCell = (r) => el("span", "tr-b", r.trades == null ? "–" : numFmt(0).format(r.trades) + "%");

const SWORDS = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2l3.2.4 5.3 5.3-1.8 1.8-5.3-5.3zM14 2l-3.2.4-2.3 2.3 1.8 1.8 2.3-2.3zM3.6 10.6l1.8 1.8-1.5 1.5-1.8-1.8zM12.4 10.6l1.5 1.5-1.8 1.8-1.5-1.5zM5 9.2l1.8 1.8-1 1-1.8-1.8zM11 9.2l.9.9-1.8 1.8-.9-.9z"/></svg>`;
// A season's picture and name, from the game: the banner of its intro screen, the name in the game's language files
const ART = { 190: "s2", 301: "tree", 1001: "sos1", 1002: "sos2", 1003: "sos3", 1004: "shadow", 1007: "sos7", 1008: "shadow" };
const SEASON_TITLE = {
  100: { vi: "Sao Rực Lửa và Tiếng Gọi Của Rồng", en: "Burning Stars and Dragon Calls" }, 190: { vi: "Lời Thề Đóng Băng", en: "The Icebound Oath" },
  301: { vi: "Rồng Trỗi Dậy", en: "Rise of the Dragon" }, 1001: { vi: "Kêu Gọi Dũng Khí", en: "Calling of Courage" }, 1002: { vi: "Đường Đến Bình Minh", en: "The Road to Dawn" },
  1003: { vi: "Nhiều Lưỡi Kiếm, Một Trái Tim", en: "Many Blades, One Heart" }, 1004: { vi: "Rồng Trỗi Dậy", en: "Rise of the Dragon" },
  1007: { vi: "Vây Hãm Rồng", en: "Dragonsiege" }, 1008: { vi: "Bản Giao Hưởng Của Thần", en: "Symphony of the Gods" } };
const label = (o) => o[state.lang] ?? o.vi;
const seasonTitle = (id) => (SEASON_TITLE[id] ? label(SEASON_TITLE[id]) : "");
// what a kingdom is doing: SeasonData.SeasonStatusType of the game
// 113 -> 111 -> 115 -> 120: the steps of the game's Season screen (Register, Seeding, Pairing, Brink of War), our own words;
// 111 (Seeding) is shown as Pairing (user 07/11: one step, seed or not)
const STATUS = { 1: { vi: "Mùa 1", en: "Season 1" }, 103: { vi: "Sắp tổng kết", en: "Settling soon" }, 110: { vi: "Chuẩn bị chiến tranh", en: "War prep" },
  113: { vi: "Đăng ký mùa mới", en: "Registering" }, 115: { vi: "Ghép cặp", en: "Pairing" }, 120: { vi: "Đã ghép trận", en: "Matched" },
  125: { vi: "Đang trong mùa giải", en: "In season" }, 130: { vi: "Đang trong mùa giải", en: "In season" },
  131: { vi: "KvK đã kết thúc", en: "KvK over" } }; // 131: no game status, 130 past its KvK's end day (statusOf)
const statusName = (st) => (STATUS[st] ? label(STATUS[st]) : "");
// a kingdom's status as shown: the game's (index servers), but at 115 one of an SoS wave with no seed (not in the
// Seeding, as #352) is Registering: the whole wave goes to 115 on the pairing day, seeded or not. A Season 2 / 3 kingdom
// has no Seeding: its 115 is its pairing (#985). Needs KS.seeds loaded (rankings, kingdom)
// The data can be days old (a crawl not run yet): a seeded kingdom (or one at 111) goes on with the season screen's
// dates, UTC (seeds.json times): Matched from the match day; never back to a step before its own. 111 is Pairing
const statusOf = (idx, k) => {
  const [season, st] = idx?.servers?.[k] ?? [];
  // its KvK's map in its Summary (130, KvkSettled) is still In season (user 07/11: no status of its own); past the KvK's
  // end day: over (131)
  const kb = (st === 125 || st === 130) && idx.kvkOf?.[k] != null ? idx.battles?.find((b) => b.id === idx.kvkOf[k]) : null;
  if (kb?.settled || st === 130) return kb?.end && nowSec() >= kb.end ? 131 : 125;
  if (season > 1000 && KS.seeds.loaded() && [111, 113, 115].includes(st)) {
    if (!KS.seeds.has(k) && st !== 111) return 113;
    const t = KS.seeds.times(k);
    if (t?.match && Date.now() / 1000 >= t.match) return 120;
  }
  return st === 111 ? 115 : st;
};
// the ranking's status filter of a status: In KvK is Season 2 on (Season 1 is no KvK, the user 03/11); Season 1, settling
// soon and matched have no filter of their own
const filterOf = (st) => ([125, 131, 120, 115, 113, 110].includes(st) ? st : null); // 115: from 07/11, every kingdom of the next wave
function setArt(node, season) {
  const url = (path) => `url("${new URL(path, document.baseURI).href}")`; // absolute: a var() in the stylesheet would resolve against assets/
  node.classList.add("has-art");
  // every picture is wide enough now (the season banners upscaled to 1792 px): all fill the frame, centred
  node.classList.add("art-wide");
  node.style.setProperty("--ar", ART[season] ? "2.435" : "1.778"); // the picture's shape (896:368, 16:9): the Kingdom page's fade is as tall as it
  node.style.setProperty("--art", url(ART[season] ? `assets/kvk/${ART[season]}.jpg?v=7` : "assets/kvk/cod_background.jpg"));
  node.style.setProperty("--art-blur", url(`assets/kvk/blur/${ART[season] || "cod_background"}.jpg?v=7`));
  node.style.setProperty("--art-mid", url(`assets/kvk/mid/${ART[season] || "cod_background"}.jpg?v=4`));
}

// ---- the top of a KvK: its name, how far along it is, what opened when ----
function hero(b) {
  const box = el("div", "kv-panel kv-hero");
  setArt(box, b.season);
  const name = el("div", "kv-name");
  name.append(el("h2", "", b.name), el("span", "mut", [seasonTitle(b.season), groupLabel(b.group)].filter(Boolean).join(" · ")));
  const tag = battleTag(b);
  if (tag) { const top = el("div", "kv-hero-t"); top.append(name, tag); box.appendChild(top); } else box.appendChild(name);
  // under its name, the KvK's schedule (2 rows, big: a calendar to keep)
  const sched = progress(b, true);
  if (sched.length) box.appendChild(el("div", "kv-sched")).append(...sched);
  return box;
}
// how far along a KvK is: its lines, none if its end is not known; here and on the Kingdom page. A KvK whose progress
// was read from the game (kvk_progress_export.py: b.progress) also gets the game's phases on the bar, a dot per
// milestone (behemoth lair, pass, quest) that shows it on hover, focus or tap, and a line naming the phases. That line's
// room is kept from the start, so the file coming in moves nothing. A KvK with none of its own read takes those of one
// of its season that has (b.progressFrom: the same quests and durations), moved to its own open day: an estimate, so
// days only, and no time a lair or pass opens on the map
// big (the KvK page): the time split in 2 rows at the middle day, each with its own first and last day
// milestones false: the phases only (the Kingdom page: its KvK's schedule is on the KvK page)
function progress(b, big = false, rows = big ? 2 : 1, milestones = true) {
  if (!b.end) return [];
  const now = nowSec(), pct = Math.max(0, Math.min(100, (100 * (now - b.open)) / (b.end - b.open)));
  const top = el("div", "kv-prog-h"), t = el("span", "");
  t.append(el("b", "", tr("kProgress")), el("span", "mut", ` ${numFmt(0).format(pct)}%`));
  const left = Math.ceil((b.end - now) / DAY);
  top.append(t, el("span", "mut", left <= 0 ? tr("kEnded") : tr("kDayLeft").replace("{n}", left)));
  const mid = b.open + Math.round((b.end - b.open) / 2 / DAY) * DAY;
  const lines2 = (rows === 2 ? [[b.open, mid], [mid, b.end]] : [[b.open, b.end]]).map(([from, to]) => {
    const track = el("div", "kv-track"), bar = track.appendChild(el("div", "kv-prog"));
    bar.appendChild(el("i")).style.width = Math.max(0, Math.min(100, (100 * (now - from)) / (to - from))) + "%";
    const ends = el("div", "kv-prog-h mut");
    ends.append(el("span", "", when(from)), el("span", "", when(to)));
    return { track, ends, from, to };
  });
  const lines = lines2.flatMap((r) => [r.track, r.ends]);
  const [src, read, srcName, same] = b.progress ? [b.id, b.progress] : b.progressFrom ?? [];
  if (!src) return [top, ...lines];
  // the milestones' numerals and days share the open and end days' line, the phases' names go before the progress (left,
  // where the milestones gone by are small): the box is as high as a KvK's without them
  lines2.forEach((r) => r.ends.classList.add("kv-ends"));
  // with the phases' names there, no "KvK progress" label: its percentage goes before the days left
  const legend = el("span", "kv-phases");
  const pctText = t.lastChild.textContent.trim();
  t.replaceChildren(legend);
  // the Kingdom page (no milestones): the phases' colours only, no days nor percentage (user 06/11)
  if (milestones) top.lastChild.textContent = `${pctText} · ${top.lastChild.textContent}`;
  else top.lastChild.remove();
  t.style.visibility = "hidden"; // shown once with its phase: the progress text does not move when the file comes
  // the Kingdom page (user 07/11, as the pairing block's steps): what is left over the now mark on the top line, each
  // phase with its day on a line under the bar
  const below = milestones ? null : el("div", "kv-prog-h kv-at kv-below");
  if (below) { top.classList.add("kv-at-top"); below.appendChild(legend); below.style.visibility = "hidden"; }
  load(`kvk/progress/${src}.json?v=${read}.6`).then((d) => { if (d) marks(b, b.progress ? d : moved(d, b, srcName, same), lines2, legend, milestones); })
    .finally(() => { t.style.visibility = ""; if (below) below.style.visibility = ""; });
  return milestones ? [top, ...lines] : [top, ...lines2.map((r) => r.track), below];
}

// the game's Season screen (LC_SEASON_MAINPAGE_PROGRESS1..4) and what its milestones open
const PHASES = [{ vi: "Bắt Đầu", en: "Start" }, { vi: "Chiến Đấu", en: "Battle" }, { vi: "Tổng Kết", en: "Summary" }, { vi: "Kết Thúc", en: "End" }];
const KINDS = { boss: { vi: "Behemoth", en: "Behemoth" }, pass: { vi: "Ải", en: "Pass" }, quest: { vi: "Nhiệm vụ", en: "Quest" } };
const MK_ICON = { // a lair, a pass, a quest: told apart by shape as well as colour
  boss: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 .6 9.4 5 5 9.4.6 5z"/></svg>',
  pass: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 9.4V3.2L5 .6l4 2.6v6.2H6.4V6.2H3.6v3.2z"/></svg>',
  quest: '<svg viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="3.4"/></svg>' };
// another KvK's milestones on this one's open day; what only that one's own read can tell is left out. Of another
// season (none of its own read yet): its own open and end days (Summary 48 h before the end, as in every season read),
// Battle as far in as the other's, the milestones past its end dropped
function moved(d, b, name, same = true) {
  const by = b.open - (d.phases?.[0] ?? d.steps[0].start);
  // the 40000 Darkling milestone (s.early) closes when reached and the next starts then: a KvK usually reaches it
  // early (user 06/11: within its first 12 h), so read where it was not, it is taken as reached 6 h in (not at 12 h: its
  // lair would open on the next day's 00:00), all after it 18 h sooner
  const e = d.steps.find((s) => s.early && !s.reached), cut = e ? Math.max(0, e.end - e.start - 6 * 3600) : 0;
  const sh = (t) => t + by - (e && t > e.start ? cut : 0);
  let phases = d.phases?.map((x, i) => (i === 1 ? sh(x) : x + by));
  if (!same && b.end && phases) phases = [b.open, Math.min(phases[1], b.end - 2 * DAY - DAY), b.end - 2 * DAY, b.end];
  // a lair or a pass still opens 12 h after its quest starts (the chapter before it ends): its opens moves with it
  const steps = d.steps.map(({ opens, reached, ...s }) => ({ ...s, start: sh(s.start), end: sh(s.end), est: true, ...(opens ? { opens: sh(opens) } : {}) }))
    .filter((s) => same || !b.end || s.start < b.end);
  return { ...d, estFrom: name, other: !same, early: !!cut, phases, steps };
}
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
function marks(b, d, rows, legend, milestones = true) {
  const exact = !d.estFrom, at2 = (s) => (exact ? utcTime(s) + " UTC" : when(s)); // a time when read, a day when estimated
  const ph = d.phases || [b.open, 0, 0, b.end], now = nowSec();
  rows.at(-1).to = ph[3] || b.end;
  if (ph[1]) {
    const at = ph.findIndex((s, i) => i < 3 && now >= s && now < ph[i + 1]);
    legend.replaceChildren(...[0, 1, 2].map((i) => {
      const item = el("span", `kv-phase p${i}` + (i === at ? " on" : ""));
      item.append(el("i"), el("b", "", label(PHASES[i])));
      const left = exact ? lasted(ph[i + 1] - now) : tr("kDayLeft").replace("{n}", Math.ceil((ph[i + 1] - now) / DAY)).replace(/^còn /, "~");
      const note = i === at ? (exact ? tr("kPhLeft").replace("{t}", left) : left) : now < ph[i] ? tr("kPhFrom").replace("{d}", when(ph[i])) : "";
      if (note && milestones) item.append(el("span", "", "· " + note));
      // the Kingdom page: each phase at its start on the bar, its day, the one going on with what is left of it (the
      // pairing block's steps, user 07/11), on the line the names had (the block keeps its height)
      if (!milestones) {
        item.append(el("small", "kv-ph-d", when(ph[i])));
        if (i === at) { item.dataset.left = tr("kPhLeft").replace("{t}", left); item.append(el("span", "kv-ph-in", "· " + item.dataset.left)); }
        item.dataset.at = (ph[i] - rows[0].from) / (rows[0].to - rows[0].from);
      }
      item.title = `${label(PHASES[i])}: ${at2(ph[i])} – ${at2(ph[i + 1])}` + (exact ? "" : ` · ${tr("kMkEst")}`);
      return item;
    }));
  }
  if (!milestones && ph[1]) placePhases(legend, (now - rows[0].from) / (rows[0].to - rows[0].from), now >= (ph[3] || b.end) ? tr("kEnded") : "");
  rows.forEach((r, i) => row(r, i === rows.length - 1));
  // one row of the bar, from..to: its stretch of each phase, the milestones in it (the last row keeps the end's own)
  function row({ track, from, to }, last) {
  const pos = (s) => Math.max(0, Math.min(100, (100 * (s - from)) / (to - from)));
  // the bar: one stretch per phase, the part gone by in full colour
  const bar = track.querySelector(".kv-prog");
  bar.replaceChildren();
  if (ph[1]) {
    for (let i = 0; i < 3; i++) {
      if (ph[i + 1] <= from || ph[i] >= to) continue;
      const seg = bar.appendChild(el("span", `kv-ph p${i}`));
      seg.style.left = pos(ph[i]) + "%";
      seg.style.width = pos(ph[i + 1]) - pos(ph[i]) + "%";
      const a = Math.max(ph[i], from), z = Math.min(ph[i + 1], to);
      seg.appendChild(el("i")).style.width = Math.max(0, Math.min(100, (100 * (now - a)) / (z - a))) + "%";
      seg.title = `${label(PHASES[i])}: ${at2(ph[i])} – ${at2(ph[i + 1])}` + (exact ? "" : ` · ${tr("kMkEst")}`);
    }
  } else bar.appendChild(el("i")).style.width = pos(now) + "%";
  track.querySelector(".kv-now")?.remove();
  if (now >= from && now <= to) 
  track.appendChild(el("u", "kv-now")).style.left = pos(now) + "%";
  // the milestones: one dot per place; ones too close to tell apart (2 opening an hour apart) share a dot
  track.querySelectorAll(".kv-mk").forEach((x) => x.remove());
  if (!milestones) return;
  // a lair or a pass sits where it opens on the map (its quest + 12 h: s.opens), a quest where it starts
  // closer than a gate's width (24 px, so more of them on a phone) also share one
  const groups = [], at = (s) => s.opens ?? s.start, near = Math.max(1.2, (100 * 24) / (track.offsetWidth || 600));
  for (const s of [...d.steps].filter((x) => at(x) >= from && (at(x) < to || last)).sort((x, y) => at(x) - at(y))) {
    const last = groups.at(-1);
    if (last && pos(at(s)) - pos(at(last[0])) < near) last.push(s); else groups.push([s]);
  }
  for (const g of groups) {
    const main = g.find((s) => s.kind === "pass") ?? g.find((s) => s.kind !== "quest") ?? g[0];
    const st = now >= main.end ? "past" : now >= at(main) ? "now" : "next";
    const mk = el("button", `kv-mk ${main.kind} ${st}`);
    mk.type = "button";
    mk.style.left = pos(at(g[0])) + "%";
    // the open and end days sit at the bar's ends, on the milestones' line: a milestone that close keeps its day for the card
    const px = (pos(at(g[0])) / 100) * (track.offsetWidth || 600);
    if (px < 52 || px > (track.offsetWidth || 600) - 52) mk.classList.add("edge");
    // a pass: the game's gate, under it its level in Roman numerals (from its name when the file has no level) and the
    // day it opens on the map, on one line
    if (main.kind === "pass") {
      const lv = g.filter((s) => s.kind === "pass").map((s) => s.level ?? +(s.en?.name.match(/\d+/)?.[0] ?? 0));
      mk.innerHTML = `<img src="assets/icons/pass.png?v=1" alt=""><span class="kv-mkd"><b>${lv.map((n) => ROMAN[n] ?? n).join("·")}</b><i>${when(at(main))}</i></span>`;
    } else if (main.kind === "boss" && main.boss) {
      // a behemoth: the game's avatar of it (kvk_behemoth_export.py), the day its lair opens under it (the hour is on the card)
      mk.innerHTML = `<img src="assets/behemoths/${main.boss}.png?v=1" alt=""><span class="kv-mkd"><i>${when(at(main))}</i></span>`;
    } else mk.innerHTML = MK_ICON[main.kind];
    mk.setAttribute("aria-label", g.map((s) => `${label(KINDS[s.kind])} ${s[state.lang]?.name ?? s.vi.name}${(s[state.lang] ?? s.vi).title ? ` (${(s[state.lang] ?? s.vi).title})` : ""}, ${at2(at(s))}`).join("; "));
    const show = () => mkPop(mk, g, d);
    mk.onmouseenter = show; mk.onfocus = show;
    mk.onclick = (e) => { e.preventDefault(); e.stopPropagation(); show(); };
    mk.onmouseleave = mkHide; mk.onblur = mkHide;
    track.appendChild(mk);
  }
  // the KvK page's schedule: a label that would run into the one before goes above its milestone (above and below each
  // keep their own line); the Kingdom page's bar has no room above
  // (and one that would run into the row's first or last day, which the Kingdom page's bar hides instead)
  const box = track.getBoundingClientRect(), ends = { down: box.left + 44, up: -1e9 };
  if (track.closest(".kv-sched, .k-prog.two")) for (const lab of track.querySelectorAll(".kv-mkd")) {
    lab.parentNode.classList.remove("edge");
    const r = lab.getBoundingClientRect(), side = r.left < ends.down + 6 || r.right > box.right - 50 ? "up" : "down";
    if (side === "up" && r.left < ends.up + 6) {
      // no room above either (a narrow phone): the day goes to the card, a gate keeps its numeral where it fits
      lab.parentNode.classList.add("nodate");
      const r2 = lab.getBoundingClientRect();
      if (!lab.querySelector("b") || r2.left < ends.down + 4) { lab.style.visibility = "hidden"; continue; }
      ends.down = r2.right;
      continue;
    }
    if (side === "up") lab.parentNode.classList.add("up");
    ends[side] = r.right;
  }
  }
}
// the card of a dot: fixed to the page, so no panel's edge cuts it; above the dot, inside the window
let popBox = null;
function mkHide() { if (popBox) popBox.hidden = true; }
function mkPop(mk, g, d) {
  if (!popBox) {
    popBox = document.body.appendChild(el("div", "kv-mkpop"));
    popBox.setAttribute("role", "tooltip");
    addEventListener("scroll", mkHide, true);
    addEventListener("click", mkHide);
  }
  const now = nowSec(), exact = !d.estFrom, at2 = (t) => (exact ? utcTime(t) : when(t));
  popBox.replaceChildren(...g.map((s) => {
    const row = el("div", `kv-mkrow ${s.kind}`), head = el("div", "kv-mkh");
    // a lair or a pass: open on the map or not yet; a quest: over, running or to come
    // estimated: no countdown, only where it stands
    const st = !exact ? (now >= s.end ? tr("kMkPast") : now >= s.start ? tr("kMkOn") : tr("kMkSoon"))
      : s.opens ? (now >= s.opens ? tr("kMkOpened") : tr("kMkNext").replace("{t}", lasted(s.opens - now)))
      : now >= s.end ? tr("kMkPast") : now >= s.start ? tr("kMkNow").replace("{t}", lasted(s.end - now)) : tr("kMkNext").replace("{t}", lasted(s.start - now));
    const on = s.opens ? now >= s.opens && now < s.end : now >= s.start && now < s.end;
    head.append(el("span", "kv-mkk", label(KINDS[s.kind])), el("span", on ? "kv-mks on" : "kv-mks", st));
    const txt = s[state.lang] ?? s.vi, est = s.est ? ` · ${tr("kMkEst")}` : "";
    const name = el("b", "", txt.name);
    if (s.boss) { const av = el("img", "kv-mkav"); av.src = `assets/behemoths/${s.boss}.png?v=1`; av.alt = ""; name.prepend(av); }
    row.append(head, name);
    // a lair or a pass: the chapter's own title in the game ("Kỷ Nguyên Mới"), its name here being what it opens
    if (txt.title) row.appendChild(el("span", "kv-mkti", tr("kMkChapter").replace("{t}", txt.title)));
    if (s.opens) row.appendChild(el("span", "kv-mko", (exact ? tr("kMkOpens").replace("{t}", utcTime(s.opens)) : tr("kMkOpensDay").replace("{t}", when(s.opens))) + est));
    row.appendChild(el("span", "kv-mkt", tr(exact ? "kMkQuest" : "kMkQuestDay").replace("{a}", at2(s.start)).replace("{b}", at2(s.end)) + (s.opens ? "" : est)));
    // a milestone that closes when reached: when it was, the next one starting then
    if (s.reached) row.appendChild(el("span", "kv-mkt", tr("kMkReached").replace("{t}", utcTime(s.reached))));
    if (txt.task) row.appendChild(el("small", "", txt.task));
    return row;
  }), el("div", "kv-mkf", exact ? tr("kMkRead").replace("{t}", utcTime(d.read)) : tr(d.other ? "kMkFromOther" : "kMkFrom").replace("{k}", d.estFrom) + (d.early ? " " + tr("kMkEarly") : "")));
  popBox.hidden = false;
  const r = mk.getBoundingClientRect(), w = popBox.offsetWidth, h = popBox.offsetHeight;
  const x = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2));
  const above = r.top - h - 10 >= 8;
  popBox.style.left = x + "px";
  popBox.style.top = (above ? r.top - h - 10 : r.bottom + 10) + "px";
}
// a KvK at war: "Battle" in red after its name (Rankings, the Kingdom top, the KvK's own page and cards). With a War
// history it opens it. Only while a fight is going on (kvk/index.json liveWars, as of the last War history crawl): a
// KvK that is running but quiet has none. Not an <a>: on the Rankings page it sits inside the KvK's own link
function battleTag(b) {
  if (!b?.live || b.settled || !b.liveWars) return null; // Summary: no fight goes on
  const t = el("span", "battle-tag go", "Battle");
  t.setAttribute("role", "link");
  t.tabIndex = 0;
  t.title = tr("kFightsTip").replace("{n}", b.liveWars) + " · " + tr("kOpenWar");
  const go = (e) => {
    e.preventDefault(); e.stopPropagation();
    // already on this KvK's page: the link would not change, so switch the tab here
    if (state.kvk === b.id && state.page === "kingdom" && KS.onKvkTab) { page.tab = "war"; KS.onKvkTab(); return; }
    location.hash = `kvk=${b.id}&tab=war`;
  };
  t.onclick = go;
  t.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") go(e); };
  return t;
}
// what the KvK list is searched for: a kingdom that starts with it is framed gold with a star, so it is found at a glance
const STAR = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 .8l1.6 3.3 3.6.5-2.6 2.5.6 3.6L6 9l-3.2 1.7.6-3.6L.8 4.6l3.6-.5z"/></svg>';
let hitQ = "";
const hitK = (k) => !!hitQ && String(k).startsWith(hitQ);
const hitName = (b) => !!hitQ && b.name.toLowerCase().includes(hitQ);
function kingdomChip(k) {
  const c = el("span", (k.other ? "kd kv-other" : "kd") + (hitK(k.k) ? " hit" : ""));
  if (hitK(k.k)) { c.insertAdjacentHTML("beforeend", STAR); c.setAttribute("aria-label", `#${k.k} (${tr("kHit")})`); }
  c.append("#" + k.k);
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
  const a = el("article", hitName(b) ? "kv-card hit" : "kv-card");
  a.id = "kv-" + b.id;
  const head = el("div", "kv-card-h"), icon = el("span", b.live ? "kv-ico" : "kv-ico soon"), name = el("div", "kv-card-n");
  icon.innerHTML = SWORDS;
  name.append(el("b", "", b.name), el("small", "mut", dates(b)));
  head.append(icon, name);
  const bt = battleTag(b); // a fight going on: on the right of the card's top
  if (bt) head.appendChild(bt);
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
  const over = b.end && now >= b.end;
  state_.append(el("i", over ? "over" : b.live ? "" : "soon"), el("b", "", over ? tr("kEnded") : tr(b.live ? "kRunning" : "kSoon")));
  if (!over && ((b.live && b.end) || !b.live)) state_.append(el("span", "mut", "· " + tr(b.live ? "kDayLeft" : "kOpenIn").replace("{n}", left)));
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
// a KvK past its end goes under History (user 07/11), listed by the game still or not (kvk_export: history)
const isOver = (b) => !!b.history || (!!b.end && nowSec() >= b.end);
async function showList() {
  const { ctl, out } = frame();
  const all = await load("kvk/index.json");
  if (!all) { out.appendChild(el("p", "hint", tr("kNoData"))); return; }
  // Current / History, on the right of the search: the list below is one or the other
  const seg = el("nav", "rk-seg kv-hist");
  for (const [h, label] of [[false, "kNow"], [true, "kHist"]]) {
    const b = el("button", "", tr(label));
    b.type = "button";
    b.setAttribute("aria-pressed", String(page.hist === h));
    b.append(" ", el("small", "", String(all.battles.filter((x) => isOver(x) === h).length)));
    b.onclick = () => { if (page.hist === h) return; page.hist = h; page.lp = 1; showList(); };
    seg.appendChild(b);
  }
  const data = { ...all, battles: all.battles.filter((b) => isOver(b) === page.hist) };
  if (!KVK_TABS.some(([k]) => k === page.group)) page.group = "";
  const tabs = el("nav", "kv-pills");
  const count = (g) => data.battles.filter((b) => inTab(g, b)).length;
  const draw = () => drawList(out, data);
  const press = () => tabs.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.g === page.group)));
  for (const [g, label] of [["", tr("kAll")], ...KVK_TABS.map(([k, name]) => [k, name ?? groupLabel(k)])]) {
    const n = el("button");
    n.append(label + " ", el("small", "", String(count(g))));
    n.type = "button"; n.dataset.g = g;
    n.disabled = !!g && !count(g); // no KvK of it now (KvK3 on 07/11)
    n.onclick = () => { page.group = g; page.lp = 1; press(); draw(); };
    tabs.appendChild(n);
  }
  const q = searchBox(tr("kSearch"), page.q, (v) => { page.q = v; page.lp = 1; draw(); });
  const find = el("label", "kv-find");
  find.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 10.5 14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  find.appendChild(q);
  ctl.classList.add("kv-ctl");
  // a phone: the head has room for the search only, the switch takes the first line of the controls
  $("dvSlot").append(find, ...(state.narrow ? [] : [seg]));
  ctl.append(...(state.narrow ? [seg] : []), tabs, fmtBtn(draw));
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
  setLink("kvk", { g: page.group, h: page.hist ? 1 : "" });
  out.innerHTML = "";
  const kq = page.q.replace("#", "").trim().toLowerCase();
  hitQ = kq;
  const rows = data.battles.filter((b) => inTab(page.group, b)
    && (!kq || b.kingdoms.some((k) => String(k.k).startsWith(kq)) || b.name.toLowerCase().includes(kq)));
  if (!rows.length) { out.appendChild(el("p", "hint mut", tr(page.hist && !data.battles.length ? "kHistNone" : "kvkNone"))); return; }
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
      const j = el("button", (b.live ? "" : "soon") + (kq && (hitName(b) || b.kingdoms.some((k) => hitK(k.k))) ? " hit" : ""), b.name);
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
    { key: "name", label: grouped && !state.narrow ? `${tr("kCamp")} / ${tr("cKingdom")}` : grouped ? tr("kCamp") : tr("cKingdom"), left: true, tip: () => "", w: state.narrow ? 128 : 190, get: (r) => (r.list ? r.camp : r.k), node: (r) => {
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
  KS.ui.addFocus(cols, [...kingdoms, ...groups]); // the kingdoms' and camps' merits by unit type, from the KvK file
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

const clearArt = (node) => { node.classList.remove("has-art", "art-wide"); node.style.removeProperty("--art"); node.style.removeProperty("--art-blur"); node.style.removeProperty("--art-mid"); node.style.removeProperty("--ar"); };
const battleOf = (idx, k) => idx?.battles.find((x) => x.id === idx.kvkOf[k]);
KS.season = { battleTag, of: battleOf, filterOf, statusOf, camps: campsOf, title: seasonTitle, status: statusName, dates, progress, list: () => load("kvk/index.json"), art: (node, season) => { clearArt(node); setArt(node, season); } };
KS.onKingdomShown = async (k) => {
  // the kingdom's status; a click on it opens the ranking of every kingdom with the same status, on this one's line
  // (a status the ranking has no filter for is only text)
  let chip = $("kStatus");
  if (!chip) { chip = el("a", "k-status"); chip.id = "kStatus"; chip.hidden = true; $("cmpTags").appendChild(chip); }
  const seen = await load("kvk/index.json");
  await KS.seeds.load();
  const st = statusOf(seen, k);
  const all = state.comparing ? [state.mainK, ...state.also] : [k];
  chip.hidden = !statusName(st) || all.some((x) => seen?.kvkOf[x] !== seen?.kvkOf[k]); // kingdoms apart: no one status for them
  chip.textContent = statusName(st);
  chip.dataset.st = st ?? "";
  if (filterOf(st) == null) { chip.removeAttribute("href"); chip.removeAttribute("title"); }
  else { chip.href = `#p=rank&st=${filterOf(st)}&at=${k}`; chip.title = tr("kSeeSame").replace(/\s*→$/, ""); }
  // its seed (A-D) while it is being paired, after the number, before the status; one kingdom only
  let seed = $("kSeed");
  if (!seed) { seed = el("span", "k-seed"); seed.id = "kSeed"; seed.hidden = true; }
  chip.before(seed);
  const sd = all.length === 1 ? await KS.seeds.of(k) : 0;
  seed.hidden = !sd;
  seed.dataset.s = sd || "";
  seed.textContent = sd ? "Seed " + "ABCD"[sd - 1] : "";
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
  const head = el("div", "kr-head"), place = el("span", "kr-place"), end = el("div", "kr-end"), all = el("a", "kv-info-link", tr("kSeeAll")), box = el("section", "kv-panel");
  all.href = "#p=rank&m=kvk";
  head.append(el("h2", "", tr("kCamps")), place);
  if (b.from) head.append(el("span", "mut", `${b.from} → ${b.to}`));
  head.append(end);
  if (b.rank) {
    place.title = tr("kRankTip");
    place.append(el("b", "kr-main", "#" + b.rank), el("span", "mut", tr("kRankOf").replace("{n}", numFmt().format(b.ranked))),
      el("span", "kr-pill", tr("iTop").replace("{p}", numFmt(1).format((100 * b.rank) / b.ranked))));
  }
  // one table, two ways to read it: by camp (the kingdoms of a camp under it) or one line per kingdom
  const tog = el("div", "rk-seg kv-group-seg"), body = el("div");
  tog.setAttribute("role", "group"); tog.setAttribute("aria-label", tr("kGroupBy"));
  for (const [grouped, label] of [[true, tr("kByCamp")], [false, tr("kByKingdom")]]) {
    const btn = el("button", "", label);
    btn.type = "button";
    btn.onclick = () => {
      if (!!page.grouped === grouped) return;
      page.grouped = grouped; press(); drawCamps(body, b);
    };
    btn.dataset.g = String(grouped);
    tog.appendChild(btn);
  }
  const press = () => tog.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.g === String(!!page.grouped))));
  press();
  if (b.kingdoms.some((k) => k.camp)) end.appendChild(tog);
  end.appendChild(all);
  if (!b.sums) box.appendChild(note(tr("kNotOpen")));
  const others = b.kingdoms.filter((k) => k.other).length;
  if (others) box.appendChild(note(tr("kOtherNote").replace("{n}", others).replace("{m}", b.kingdoms.length).replace("{top}", b.crossTop ?? 600)));
  box.appendChild(body);
  drawCamps(body, b);
  if (!info) { const wrap = el("div"); wrap.append(head, box); return wrap; }
  // first the KvK's place among all (and the way to all of them), then its info over the camps table (and the way to its page);
  // the ways out at the end of their lines, the Ungroup switch right after the dates
  const frame = el("section", "kv-info"), title = el("div", "kv-info-h"), info_ = el("div", "kr-head"), more = el("a", "kv-info-link kv-info-end", tr("kMore"));
  more.href = "#" + kvkLink(b);
  all.className = "kv-info-link kv-info-end";
  title.append(el("h2", "", tr("kCamps")), place, all);
  info_.append(el("h2", "", tr("kInfo")));
  if (b.from) info_.append(el("span", "mut", `${b.from} → ${b.to}`));
  if (b.kingdoms.some((k) => k.camp)) info_.append(tog);
  info_.append(more);
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
  if (d === now) return el("span", "", fullNum(now)); // counted from 0 (merits): the change is the value, a plain cell
  const c = el("span", "d3");
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
      KS.playerLink(who, r.id, r.k, r.name);
      d.append(who);
      return d;
    } },
    { key: "alliance", label: tr("cAlliance"), tip: () => "", w: 88, get: (r) => r.alliance, node: (r) => (r.alliance ? KS.allianceChip(r.alliance) : el("span", "mut", "–")) },
    ...bars, tradesCol(),
  ];
  KS.ui.addFocus(cols, list);
  const col = cols.find((c) => c.key === page.topSort.key) || cols.find((c) => c.key === "merits");
  const rows = sortRows(list.map((r) => ({ ...r })), col.get, page.topSort.dir);
  rows.forEach((r, i) => { r._i = i + 1; });
  cols.all = rows;
  box.appendChild(table(cols, rows, page.topSort, (k) => { page.topSort = nextSort(page.topSort, k); drawTop(box, list); }, (r) => { location.hash = "k=" + r.k; }));
}

// the Kingdom page's phases under the bar, each where it starts: pushed right off the one before and back left off the
// one after or the end; no room (a phone): first the days of the phases not going on go, then every day, then the names
// of the phases not going on (their dot stays, its title says it); only then the line wraps. Over the bar, what is left
// of the phase going on, centred on the now mark and kept inside the bar's ends
function placePhases(legend, nowAt, over = "") {
  const head = legend.closest(".kv-prog-h"), top = head.parentNode.querySelector(".kv-at-top");
  const cur = [...legend.children].find((x) => x.dataset.left), text = cur?.dataset.left || over; // over: "Đã kết thúc" at the end
  const tip = top && text ? el("span", "kv-ph-left", text) : null;
  if (top) top.replaceChildren(...(tip ? [tip] : []));
  const lay = () => {
    const W = head.clientWidth, items = [...legend.children], GAP = 14;
    if (!W) return;
    if (tip) tip.style.left = Math.max(0, Math.min(W - tip.offsetWidth, nowAt * W - tip.offsetWidth / 2)) + "px";
    for (const tight of [0, 1, 2, 3]) {
      for (const n of [1, 2, 3]) head.classList.toggle("tight" + n, tight >= n);
      head.classList.remove("wrap");
      const w = items.map((x) => x.offsetWidth), x = items.map((it) => Math.max(0, Number(it.dataset.at) * W));
      for (let i = 1; i < x.length; i++) x[i] = Math.max(x[i], x[i - 1] + w[i - 1] + GAP);
      x[x.length - 1] = Math.min(x[x.length - 1], W - w[w.length - 1]);
      for (let i = x.length - 2; i >= 0; i--) x[i] = Math.min(x[i], x[i + 1] - GAP - w[i]);
      if (x[0] >= 0) { items.forEach((it, i) => (it.style.left = x[i] + "px")); return; }
    }
    head.classList.add("wrap");
    items.forEach((it) => (it.style.left = ""));
  };
  lay();
  if (!head._lay) { head._lay = new ResizeObserver(lay); head._lay.observe(head); }
}

// ---- War history: every fight of the map (kvk_battles_export.py), the live ones first ----
const utcTime = (s) => { const t = new Date(s * 1000).toISOString(); return `${t.slice(8, 10)}/${t.slice(5, 7)} ${t.slice(11, 16)}`; };
function lasted(s) {
  const m = Math.max(0, Math.round(s / 60));
  if (m < 60) return tr("kMin").replace("{n}", m);
  if (m < 48 * 60 && m % 60 === 0) return tr("kHourOnly").replace("{h}", m / 60);
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
    line.append(KS.playerLink(el("b", "kv-war-pn", p.name), p.id, p.k, p.name));
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
    box.style.gridTemplateColumns = `repeat(${Math.ceil(list.length / Math.ceil(list.length / 3))}, auto)`;
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
const pageRows = (rows, p) => { const size = KS.ui.pageSize(); return size ? rows.slice((p - 1) * size, p * size) : rows; };
const lastPage = (rows) => { const size = KS.ui.pageSize(); return size ? Math.max(1, Math.ceil(rows.length / size)) : 1; };

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
      d.append(KS.playerLink(el("b", "", p.name), p.id, p.k, p.name), el("small", "", `${p.abbr ? "[" + p.abbr + "] " : ""}${p.k ? "#" + p.k + " · " : ""}${num(p.merits)}`));
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
    { key: "name", label: tr("cName"), left: true, w: state.narrow ? 130 : 190, get: (r) => r.name, node: (r) => { const d = el("span", "who"); d.append(el("b", "", r.name), el("small", "", String(r.id))); return KS.playerLink(d, r.id, r.k, r.name); } },
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
const TABS = ["ov", "war", "trade"];
KS.kvkTab = () => (page.tab !== "ov" ? "&tab=" + page.tab : ""); // the link of a KvK: its tab
function tabs(b, ov, war) {
  const nav = el("nav", "rk-seg kv-tabs"); // one of three views: the tabs look (ink pill), not the filter pills
  const press = () => nav.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.t === page.tab)));
  for (const [t, label, n] of [["ov", tr("kTabOverview")], ["war", tr("kTabWar"), b.wars], ["trade", tr("kTabTrade")]]) {
    const btn = el("button");
    btn.type = "button"; btn.dataset.t = t;
    btn.append(label);
    if (n) btn.append(" ", el("small", "", String(n)));
    btn.onclick = () => { page.tab = t; press(); showTab(b, ov, war); KS.setHash(); };
    nav.appendChild(btn);
  }
  KS.onKvkTab = () => { press(); showTab(b, ov, war); KS.setHash(); $("kvkWar")?.scrollIntoView({ block: "start" }); };
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
    $("kvkBack").replaceChildren();
    $("kvkPage").classList.remove("kv-war-on");
    $("kvkWar")?.remove();
    $("kvkFilter")?.remove();
    if (state.kOnly) { state.kOnly = null; KS.repick(); }
    return;
  }
  if (slotOf === state.kvk + state.lang) return;
  const idx = await load("kvk/index.json");
  const b = idx?.battles.find((x) => x.id === state.kvk);
  if (!b) { // an old or mistyped link: say so, and the way back to the list
    slotOf = state.kvk + state.lang;
    const back = el("a", "btn kv-back", tr("kBack")); back.href = "#p=kvk";
    $("kvkBack").replaceChildren(back); // the way back to the list sits in the header, beside the page's title
    slot.replaceChildren(el("p", "kv-note", tr("kNotFound")));
    return;
  }
  if (slotOf && state.kOnly) { state.kOnly = null; KS.repick(); } // the filter menu is drawn anew, on "all"
  slotOf = b.id + state.lang;
  slot.innerHTML = "";
  const back = el("a", "btn kv-back", tr("kBack"));
  back.href = page.group ? `#p=kvk&g=${page.group}` : "#p=kvk";
  $("kvkBack").replaceChildren(back); // the way back to the list sits in the header, beside the page's title
  slot.append(hero(b));
  const ov = campsPanel(b), war = el("div", "dv-out kv-war-out");
  war.id = "kvkWar";
  // the tab of the link (#kvk=<id>&tab=war|trade), else the Overview
  const asked = new URLSearchParams(location.hash.slice(1)).get("tab");
  page.tab = b.wars && TABS.includes(asked) ? asked : "ov";
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
  if (hp.get("p") === "kvk") page.hist = hp.get("h") === "1";
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
