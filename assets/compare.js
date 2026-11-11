// The compare page: pairs of sides, each side of several kingdoms, side by side; once a pair has both sides an empty one
// opens under it. A classic script loaded after views.js; what it needs from the page comes through window.KS. Each
// kingdom counts with its newest scan. Link: #p=compare&a=1,2&b=3&a2=4&b2=5 (a2/b2 the second pair, and on)
(() => {
"use strict";
const KS = window.KS, { state, tr, $, numFmt } = KS;

Object.assign(KS.T.vi, {
  navKingdom: "Kingdom", navCompare: "Ghép cặp", openSource: "Mã nguồn mở trên GitHub",
  xSide: "Phe", xAdd: "+ Kingdom", xRemove: "Bỏ", xEmpty: "Thêm kingdom vào cả hai phe để xem so sánh.",
  xPlayers: "người", xReset: "Đặt lại", xFull: "Đầy đủ", xShort: "Rút gọn", xViewTip: "Đầy đủ: mọi chỉ số. Rút gọn: người chơi, Decor max, Pet max, điểm di cư, LC max, công trạng",
  xdDuels: "Decor max, Pet max, các mức điểm di cư và mức LC max đếm số người chơi. Các số còn lại là {agg}.",
  xdShort: "Decor max và Pet max đếm số người chơi. Các số còn lại là {agg}.",
  xAggSum: "tổng của cả phe", xBand: "LC max",
  xInfantry: "CT bộ binh", xCavalry: "CT kỵ binh", xArcher: "CT cung thủ", xMagic: "CT pháp sư",
  xdEach: "Số tổng của từng kingdom ở ngày mới nhất, chỉ tính người qua mức lực chiến đã chọn.",
  xMigrationSum: "Điểm di cư", xMigrationBand: "Điểm di cư", xEach: "Từng kingdom", xScan: "Ngày", xKingdom: "Kingdom",
  xCount: "Người chơi", xLoadErr: "Không tải được:",
  pkTitle: "Thêm kingdom vào", pkPairing: "Đang ghép cặp", pkAll: "Tất cả", pkGroup: "Nhóm", pkSeed: "Seed", pkDone: "Xong",
  pkNote: "Bảng Phân Loại của game, cập nhật {d} UTC, ghép cho {s}. SP-: kingdom khu vực khác, không có dữ liệu người chơi.",
  xShare: "Chia sẻ", xShareTip: "Chép link trang Ghép cặp với các cặp đang chọn", xShared: "Đã chép link",
  pkNoData: "Không có dữ liệu", pkOther: "Ở phe kia", pkPower: "Lực chiến tổng (game)",
  xSplit: "Chia đôi", xSplitTip: "Hai cặp cạnh nhau (Phe 1 vs 2 | Phe 3 vs 4), chỉ ở màn rộng",
});
Object.assign(KS.T.en, {
  navKingdom: "Kingdom", navCompare: "Matchup", openSource: "Open source on GitHub",
  xSide: "Side", xAdd: "+ Kingdom", xRemove: "Remove", xEmpty: "Add kingdoms to both sides to compare them.",
  xPlayers: "players", xReset: "Reset", xFull: "Full", xShort: "Short", xViewTip: "Full: every figure. Short: players, max decor, max pets, migration score, max power, merits",
  xdDuels: "Max decor, Max pets, migration bands and max power bands count players. The other figures are the {agg}.",
  xdShort: "Max decor and Max pets count players. The other figures are the {agg}.",
  xAggSum: "total of the side", xBand: "Max power",
  xInfantry: "Infantry merits", xCavalry: "Cavalry merits", xArcher: "Archer merits", xMagic: "Magic merits",
  xdEach: "Totals of each kingdom on its newest day, only players over the chosen power step.",
  xMigrationSum: "Migration score", xMigrationBand: "Migration score", xEach: "Each kingdom", xScan: "Day", xKingdom: "Kingdom",
  xCount: "Players", xLoadErr: "Could not load:",
  pkTitle: "Add a kingdom to", pkPairing: "Being paired", pkAll: "All", pkGroup: "Group", pkSeed: "Seed", pkDone: "Done",
  pkNote: "The game's seed table, updated {d} UTC, pairing for {s}. SP-: kingdoms of another region, no player data.",
  xShare: "Share", xShareTip: "Copy a link to this matchup, its pairs filled in", xShared: "Link copied",
  pkNoData: "No data", pkOther: "On the other side", pkPower: "Total power (the game's)",
  xSplit: "Split", xSplitTip: "Two pairs side by side (Side 1 vs 2 | Side 3 vs 4), on a wide screen only",
});

const MAX_PER_SIDE = 10, MAX_PAIRS = 5;
const POWER_BANDS = [[100e6, 200e6, "100–200M"], [200e6, 300e6, "200–300M"], [300e6, Infinity, "300M+"]];
const { MIGRATION_BANDS, DECOR_MAX } = KS;

// a first visit opens on #357 vs #375; "Đặt lại" still empties it
const cfg = Object.assign({ pairs: [{ a: [357], b: [375] }], minStep: KS.DEFAULT_POWER, short: false }, KS.store.get("cmp", {}));
delete cfg.top; delete cfg.avg; // the Top N and average switches of before 07/11
const MAX_FILES = 4 * MAX_PER_SIDE + 20; // a couple of full pairs, and some to go back to: a long visit must not keep every kingdom opened
const cache = new Map();   // "<scan>/<kingdom>" -> file (a promise while it loads)
if (cfg.a || cfg.b) { cfg.pairs = [{ a: cfg.a || [], b: cfg.b || [] }]; delete cfg.a; delete cfg.b; } // saved before the pairs
tidy();
let kdRows = null; // rollup.json by kingdom: the kingdoms' own merits by unit type, for the unit focus
let token = 0;             // a newer draw makes an older, still loading one give up

function iconOf(key, cls) { const i = el("img", cls); i.src = `assets/icons/${key}.png?v=3`; i.alt = ""; return i; }
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const num = (v) => (state.compact ? KS.compact(v) : numFmt().format(Math.round(v)));
const itemOf = (id) => state.list.find((k) => k.kingdom === id);

function load(id) {
  const scan = itemOf(id).scan, key = scan + "/" + id;
  // file.value: undefined while it loads (the page is drawn at once without it), null when it failed
  let file = cache.get(key);
  if (!file) {
    file = KS.getJSON(`data/scans/${scan}/${id}.json`).catch((e) => { cache.delete(key); console.error(e); return null; });
    file.then((f) => { file.value = f; });
  }
  cache.delete(key); // to the end of the Map: the first one is the longest unused
  cache.set(key, file);
  while (cache.size > MAX_FILES) cache.delete(cache.keys().next().value);
  return file;
}

// the players of a side: every kingdom's over the power step
function sidePlayers(files) {
  const ps = [];
  for (const f of files) if (f) for (const p of f.players) if (KS.filterPower(p) > KS.minOf(f.kingdom, cfg.minStep)) ps.push(p);
  return ps;
}

// one column over a side: the total; a % never adds up, it is the average
function measure(c, ps) {
  let s = 0, n = 0;
  for (const p of ps) { const v = KS.value(c, p); if (typeof v === "number" && !Number.isNaN(v)) { s += v; n++; } }
  if (!n) return undefined;
  return c.type === "pct" ? s / n : s;
}
const show = (c, v) => (v == null ? "–" : c.type === "pct" ? numFmt(2).format(v) + "%" : c.type === "int" ? numFmt().format(v) : num(v));

// a titled block
function group(icon, title, desc, ...kids) {
  const g = el("section", "x-grp"), top = el("div", "x-grp-top"), text = el("div", "x-gt");
  text.append(el("h3", "", title), el("p", "x-gd", desc.replace("{agg}", tr("xAggSum"))));
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
// the page's link with the pairs: opened, it fills them in (fromHash). Copied; said on the button for a moment
function shareLink(btn) {
  const url = location.origin + location.pathname + linkHash();
  const label = btn.querySelector("span");
  const done = () => { label.textContent = tr("xShared"); btn.classList.add("done"); setTimeout(() => { label.textContent = tr("xShare"); btn.classList.remove("done"); }, 1800); };
  const old = () => { // no clipboard API (http on another host): a selected textarea
    const t = el("textarea"); t.value = url; t.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); done(); } finally { t.remove(); }
  };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done, old); else old();
}
const linkHash = () => "#p=compare" + cfg.pairs.map((p, i) => `&a${i ? i + 1 : ""}=${p.a.join(",")}&b${i ? i + 1 : ""}=${p.b.join(",")}`).join("");

// ---- the kingdom picker: a dialog, the kingdoms being paired (by group and seed, data/kvk/seeds.json) or all of them;
// a click puts a kingdom in the side or takes it out, and the dialog stays open to pick more ----
let seeds = null;          // seeds.json once loaded: {cols, groups: [{season, updated, rows}]}
const seedOf = new Map();  // kingdom -> [seed 1-4, its group]
const pk = { n: 0, side: "a", tab: "pair", group: 0, on: new Set([1, 2, 3, 4]) }; // tab, group and seeds stay between opens
const LETTER = ["", "A", "B", "C", "D"];
const OTHER = 100000000;   // another region's kingdom: 1000000xx, shown as the game does, SP-xx
const kName = (k) => (k >= OTHER ? "SP-" + (k - OTHER) : "#" + k);
// a side's name: numbered on through the pairs (the second pair is Side 3 vs Side 4, as a map's camps)
const sideName = (n, side) => `${tr("xSide")} ${2 * n + (side === "a" ? 1 : 2)}`;
const seasonName = (s) => (s > 1000 ? "SoS" + (s - 1000) : "S" + s);
const two = (v) => String(v).padStart(2, "0");
function loadSeeds() {
  return KS.ui.load("kvk/seeds.json").then((d) => {
    if (d && !seeds) {
      seeds = d;
      const c = d.cols.indexOf("seed");
      d.groups.forEach((g, i) => g.rows.forEach((r) => seedOf.set(r[0], [r[c], i])));
    }
    return seeds;
  });
}
const seedBadge = (k) => { const s = seedOf.get(k)?.[0]; return s ? `<i class="seed s${s}">${LETTER[s]}</i>` : ""; };

let dlg = null;
function pickDialog() {
  if (dlg) return dlg;
  dlg = el("dialog", "dlg xp");
  dlg.innerHTML = `<form method="dialog" class="dlg-in">
    <div class="dlg-top"><h2><span class="xp-t"></span> <b class="pill xp-n"></b></h2><button class="btn icon" value="close" aria-label="Close">✕</button></div>
    <div class="xp-tabs rk-seg" role="group"></div>
    <div class="xp-f"></div>
    <input class="xp-q" type="search" autocomplete="off" inputmode="numeric">
    <p class="xp-note"></p>
    <ul class="klist xp-list" role="listbox" aria-multiselectable="true"></ul>
    <div class="xp-foot"><button class="btn primary xp-done" value="close"></button></div>
  </form>`;
  document.body.appendChild(dlg);
  const q = dlg.querySelector(".xp-q"), ul = dlg.querySelector(".xp-list");
  q.addEventListener("input", () => fillPick());
  q.addEventListener("keydown", (e) => { if (KS.listKeys(e, ul, togglePick)) e.preventDefault(); });
  ul.onclick = (e) => { const li = e.target.closest("li[data-k]"); if (li) togglePick(Number(li.dataset.k)); };
  return dlg;
}
const pairOf = () => cfg.pairs[pk.n] ?? { a: [], b: [] };
function togglePick(k) {
  const pair = pairOf(), mine = pair[pk.side], other = pair[pk.side === "a" ? "b" : "a"];
  if (!itemOf(k) || other.includes(k)) return;
  if (mine.includes(k)) pair[pk.side] = mine.filter((x) => x !== k);
  else if (mine.length < MAX_PER_SIDE) pair[pk.side] = [...mine, k];
  else return;
  cfg.pairs[pk.n] = pair; // the empty pair under the others is kept from its first kingdom on
  save(); draw();
  fillPick(true);
}
function openPick(n, side) {
  Object.assign(pk, { n, side });
  const d = pickDialog();
  d.querySelector(".xp-q").value = "";
  loadSeeds().then(() => {
    if (!seeds) pk.tab = "all";
    else {
      // the group of a kingdom already in this pair, else the one looked at last
      const pair = pairOf(), had = [...pair.a, ...pair.b].map((k) => seedOf.get(k)?.[1]).find((g) => g != null);
      pk.group = had ?? Math.min(pk.group, seeds.groups.length - 1);
    }
    fillPick();
    if (!d.open) d.showModal();
    d.querySelector(".xp-list").scrollTop = 0;
    if (!matchMedia("(pointer: coarse)").matches) d.querySelector(".xp-q").focus(); // no keyboard over the list on a phone
  });
}
// the dialog's head, filters and list, drawn again on each change (keepY: a pick keeps the list where it was)
function fillPick(keepY) {
  const d = dlg, pair = pairOf(), mine = pair[pk.side], other = pair[pk.side === "a" ? "b" : "a"], nf = numFmt();
  const title = d.querySelector(".xp-t");
  title.textContent = `${tr("pkTitle")} ${sideName(pk.n, pk.side)}`;
  title.className = "xp-t " + pk.side;
  d.querySelector(".xp-n").textContent = `${mine.length}/${MAX_PER_SIDE}`;
  d.querySelector(".xp-done").textContent = tr("pkDone");
  d.querySelector(".xp-q").placeholder = tr("kSearchPh");
  const seg = (box, opts, cur, on) => {
    box.innerHTML = "";
    for (const [v, label] of opts) {
      const b = el("button", "", label);
      b.type = "button"; b.setAttribute("aria-pressed", String(v === cur));
      b.onclick = () => { on(v); fillPick(); };
      box.appendChild(b);
    }
  };
  const tabs = d.querySelector(".xp-tabs"), f = d.querySelector(".xp-f"), note = d.querySelector(".xp-note");
  tabs.hidden = !seeds;
  if (seeds) seg(tabs, [["pair", tr("pkPairing")], ["all", tr("pkAll")]], pk.tab, (v) => (pk.tab = v));
  const pairing = !!seeds && pk.tab === "pair", g = pairing ? seeds.groups[pk.group] : null;
  f.hidden = note.hidden = !pairing;
  if (pairing) {
    f.innerHTML = "";
    if (seeds.groups.length > 1) {
      const gs = el("div", "rk-seg xp-g");
      gs.setAttribute("role", "group");
      seg(gs, seeds.groups.map((x, i) => [i, `${tr("pkGroup")} ${i + 1} · ${x.rows.length}`]), pk.group, (v) => (pk.group = v));
      f.appendChild(gs);
    }
    // the seeds as toggles: all on at first; the last one on, clicked, turns them all back on
    const chips = el("div", "xp-seeds");
    chips.setAttribute("role", "group");
    chips.appendChild(el("span", "xp-sl", tr("pkSeed")));
    for (const s of [1, 2, 3, 4]) {
      const n = g.rows.filter((r) => r[1] === s).length, b = el("button", "xp-s");
      b.type = "button"; b.setAttribute("aria-pressed", String(pk.on.has(s)));
      b.innerHTML = `<i class="seed s${s}">${LETTER[s]}</i><span>${n}</span>`;
      b.onclick = () => {
        if (pk.on.size === 4) pk.on = new Set([s]); // from all: just this one
        else if (!pk.on.has(s)) pk.on.add(s);
        else if (pk.on.size === 1) pk.on = new Set([1, 2, 3, 4]);
        else pk.on.delete(s);
        fillPick();
      };
      chips.appendChild(b);
    }
    f.appendChild(chips);
    const at = new Date(g.updated || seeds.updated);
    note.textContent = tr("pkNote").replace("{d}", `${two(at.getUTCDate())}/${two(at.getUTCMonth() + 1)} ${two(at.getUTCHours())}:${two(at.getUTCMinutes())}`).replace("{s}", seasonName(g.season));
  }
  const q = d.querySelector(".xp-q").value.replace(/[#\s]/g, "").replace(/^sp-?/i, "");
  const ul = d.querySelector(".xp-list"), y = ul.scrollTop;
  // [kingdom, total power or null]: the group's in the game's order (seed, then power), or every kingdom of the index
  let items;
  if (pairing) {
    const pc = seeds.cols.indexOf("power"), num = (k) => String(k % OTHER);
    items = g.rows.filter((r) => pk.on.has(r[1])).map((r) => [r[0], r[pc]]);
    if (q) items = items.filter(([k]) => num(k).includes(q)).sort(([x], [z]) => num(z).startsWith(q) - num(x).startsWith(q));
  } else items = (q ? KS.kingdomMatches(q) : state.list).map((k) => [k.kingdom, null]);
  if (!items.length) { ul.innerHTML = `<li class="none">${tr("kNone")}</li>`; return; }
  const full = mine.length >= MAX_PER_SIDE, players = tr("players");
  // a few hundred lines, built again on every pick: one string
  ul.innerHTML = items.map(([k, power]) => {
    const it = itemOf(k), on = mine.includes(k), there = other.includes(k);
    const cls = on ? "cur" : !it || there || full ? "off" : "";
    const sub = !it ? tr("pkNoData") : there ? tr("pkOther") : `${nf.format(it.players)} ${players}`;
    const pw = power != null ? `<em title="${tr("pkPower")}">${KS.compact(power)}</em>` : "";
    return `<li role="option" aria-selected="${on}" data-k="${k}"${cls ? ` class="${cls}"` : ""}><b>${kName(k)}${seedBadge(k)}</b>${pw}<span>${sub}</span><s aria-hidden="true"></s></li>`;
  }).join("");
  (ul.querySelector("li[data-k]:not(.off)") || ul.querySelector("li[data-k]")).classList.add("act");
  if (keepY) ul.scrollTop = y;
}

function picker(n, side) {
  const wrap = el("div", "x-add"), pair = cfg.pairs[n] ?? { a: [], b: [] };
  const add = el("button", "x-add-btn", tr("xAdd"));
  add.type = "button";
  add.disabled = pair[side].length >= MAX_PER_SIDE;
  add.onclick = () => openPick(n, side);
  wrap.appendChild(add);
  return wrap;
}

// ---- a kingdom dragged from one side to another (the other side of its pair, or a side of another pair): pointer
// events, so a finger drags it too; a press that does not move is still the click that takes it out ----
let dragged = false;
function dragStart(e, tag, n, side, id) {
  if (e.button !== 0) return;
  e.preventDefault(); // no text selected on the way
  const x0 = e.clientX, y0 = e.clientY;
  let ghost = null, over = null;
  dragged = false;
  const target = (x, y) => {
    const box = document.elementFromPoint(x, y)?.closest(".x-side[data-n]");
    if (!box) return null;
    const tn = Number(box.dataset.n), ts = box.dataset.side, p = cfg.pairs[tn] ?? { a: [], b: [] };
    const ok = !(tn === n && ts === side) && !p[ts].includes(id) && p[ts].length < MAX_PER_SIDE;
    return ok ? box : null;
  };
  const move = (ev) => {
    if (!ghost) {
      if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
      dragged = true;
      const r = tag.getBoundingClientRect();
      document.body.classList.add("x-drag-on"); // first: it takes off the hover's red, read just below
      const cs = getComputedStyle(tag); // out of its side the clone keeps the side's colours this way
      ghost = tag.cloneNode(true);
      ghost.classList.add("x-ghost");
      for (const k of ["color", "backgroundColor", "borderColor", "fontSize", "padding", "borderRadius"]) ghost.style[k] = cs[k];
      Object.assign(ghost.style, { width: r.width + "px", height: r.height + "px", left: r.left + "px", top: r.top + "px" });
      ghost._dx = x0 - r.left; ghost._dy = y0 - r.top;
      document.body.appendChild(ghost);
      tag.classList.add("x-dragging");
      document.body.classList.add("x-drag-on");
    }
    ghost.style.left = ev.clientX - ghost._dx + "px";
    ghost.style.top = ev.clientY - ghost._dy + "px";
    const t = target(ev.clientX, ev.clientY);
    if (t !== over) { over?.classList.remove("x-drop"); t?.classList.add("x-drop"); over = t; }
  };
  const end = (ev) => {
    removeEventListener("pointermove", move);
    removeEventListener("pointerup", end);
    removeEventListener("pointercancel", end);
    if (!ghost) return;
    ghost.remove(); tag.classList.remove("x-dragging"); document.body.classList.remove("x-drag-on");
    over?.classList.remove("x-drop");
    setTimeout(() => (dragged = false)); // the click that follows the release is not a remove
    const t = ev.type === "pointerup" ? target(ev.clientX, ev.clientY) : null;
    if (!t) return;
    const tn = Number(t.dataset.n), ts = t.dataset.side;
    cfg.pairs[n][side] = cfg.pairs[n][side].filter((k) => k !== id);
    const p = (cfg.pairs[tn] ??= { a: [], b: [] });
    p[ts] = [...p[ts], id];
    save(); draw();
  };
  addEventListener("pointermove", move);
  addEventListener("pointerup", end);
  addEventListener("pointercancel", end);
}

function sidePanel(n, side, ps) {
  const box = el("div", "x-side " + side), pair = cfg.pairs[n] ?? { a: [], b: [] }, ids = pair[side];
  box.dataset.n = n; box.dataset.side = side; // a kingdom dragged here lands in this side
  const head = el("div", "x-side-head");
  head.appendChild(el("h3", "", sideName(n, side)));
  if (ids.length) head.appendChild(el("span", "x-side-n", `${numFmt().format(ps.length)} ${tr("xPlayers")}`));
  const tags = el("div", "x-tags");
  for (const id of ids) {
    const tag = el("button", "x-tag");
    tag.innerHTML = "#" + id + seedBadge(id);
    tag.type = "button";
    tag.title = `${tr("xRemove")} #${id}`;
    tag.onclick = () => { if (dragged) return; pair[side] = pair[side].filter((k) => k !== id); save(); draw(); };
    tag.addEventListener("pointerdown", (e) => dragStart(e, tag, n, side, id));
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
  const fmt = KS.ui.fmtBtn(() => { if (state.data) KS.refresh(); draw(); });
  // every figure or the short list: a two-way choice, the chosen one pressed
  const view = el("div", "rk-seg");
  view.setAttribute("role", "group"); view.title = tr("xViewTip");
  for (const [v, label] of [[false, tr("xFull")], [true, tr("xShort")]]) {
    const x = el("button", "", label);
    x.type = "button"; x.setAttribute("aria-pressed", String(!!cfg.short === v));
    x.onclick = () => { if (!!cfg.short === v) return; cfg.short = v; save(); draw(); };
    view.appendChild(x);
  }
  // two pairs side by side (Side 1 vs 2 | Side 3 vs 4 of a map): a switch, kept; only on a wide screen (style.css)
  const split = el("button", "btn x-split-btn");
  split.type = "button"; split.title = tr("xSplitTip");
  split.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2h5v12H2zM9 2h5v12H9z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg><span>${tr("xSplit")}</span>`;
  split.setAttribute("aria-pressed", String(!!cfg.split));
  split.onclick = () => { cfg.split = !cfg.split; save(); draw(); };
  const share = el("button", "btn x-share");
  share.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M12 1a3 3 0 1 1-2.2 5l-3.9 2a3 3 0 0 1 0 1l3.9 2a3 3 0 1 1-.7 1.3l-3.9-2a3 3 0 1 1 0-4.6l3.9-2A3 3 0 0 1 12 1z"/></svg><span>${tr("xShare")}</span>`;
  share.type = "button"; share.title = tr("xShareTip");
  share.disabled = !cfg.pairs.some((p) => p.a.length || p.b.length);
  share.onclick = () => shareLink(share);
  const reset = el("button", "btn x-reset", tr("xReset"));
  reset.type = "button";
  reset.onclick = () => { cfg.pairs = []; save(); draw(); };
  bar.append(
    sel(KS.POWER_STEPS.map((v) => [v, KS.powerLabel(v)]), cfg.minStep, (v) => (cfg.minStep = v)),
    fmt, view, split, share, reset,
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
    const rows = files.filter(Boolean).map((f) => ({ f, ps: f.players.filter((p) => KS.filterPower(p) > KS.minOf(f.kingdom, cfg.minStep)) }));
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
// a side's unit focus, from its kingdoms' own figures (rollup.json), not from their players added up here: a side of
// several kingdoms is those kingdoms' figures together. Drawn as the Kingdom table's column, in the Players card
function focusOf(ks) {
  const r = {};
  let any = false;
  for (const k of ks) {
    const x = kdRows?.get(k);
    if (!x) continue;
    any = true;
    for (const u of ["meritInfantry", "meritCavalry", "meritArcher", "meritMagic"]) r[u] = (r[u] || 0) + (x[u] || 0);
  }
  const c = el("div", "x-c x-focus");
  c.appendChild(any ? KS.ui.focusCell(r) : el("span", "mut", "–"));
  return c;
}

function duels(pa, pb, pair, pn) {
  const box = el("div", "x-duels"), int = (v) => numFmt().format(v);
  const short = (c) => (v) => (c.type === "num" && state.compact ? KS.compact(v) : show(c, v)); // follows the 1.2M switch
  const col = (k, name, icon) => { const c = KS.BY_KEY[k]; return [name || KS.label(c), (ps) => measure(c, ps), short(c), icon]; };
  const main = (k, name) => col(k, name).slice(0, 3); // a card's own figure: name, value, text
  const counted = (key, lo, hi, name, tip) => [name, (ps) => ps.filter((p) => (p[key] ?? 0) >= lo && (p[key] ?? 0) < hi).length, int, null, null, tip];
  const owners = (k) => counted(k, 1, Infinity, KS.label(KS.BY_KEY[k]));
  const peak = [[cfg.minStep, POWER_BANDS[0][0], `${cfg.minStep / 1e6}–100M`], ...POWER_BANDS];
  // a breakdown of the card's own figure (its players by band): one line of small figures under it, named by the band
  const bands = (key, list, name) => list.map(([lo, hi, t]) => counted(key, lo, hi, t, `${name} ${t}`));
  // under the players: how many have the max decor and the max pets, small (user 11/11: no card of their own)
  const decorPets = [[KS.label(KS.BY_KEY.maxDecor), (ps) => ps.filter((p) => (p.maxDecor ?? 0) >= DECOR_MAX).length, int], owners("pets8Skills3Star")];
  // [key, card name = its own figure's, value, text, the other figures, the breakdown line, how many figures lead]; a
  // card with a breakdown shows its leading figures larger: the rest is more about them
  const items = [
    ["players", tr("xCount"), (ps) => ps.length, int, [], decorPets],
    ["migrationScore", ...main("migrationScore", tr("xMigrationSum")), [], bands("migrationScore", MIGRATION_BANDS, tr("xMigrationBand"))],
    ["power", ...main("powerMax"), [col("power")], bands("powerMax", peak, tr("xBand")), 2],
    ["merits", ...main("merits"), [col("meritsMax")],
      [col("meritInfantry", tr("xInfantry")), col("meritCavalry", tr("xCavalry")), col("meritArcher", tr("xArcher")), col("meritMagic", tr("xMagic"))], 2],
    ["kills", ...main("kills"), [col("deaths", null, "deaths"), col("heals", null, "heals")]],
  ];
  if (cfg.short) items.splice(0, items.length,
    ["players", tr("xCount"), (ps) => ps.length, int, [], decorPets],
    ["migrationScore", ...main("migrationScore", tr("xMigrationSum")), []],
    ["power", ...main("powerMax"), []],
    ["merits", ...main("merits"), []]);
  const value = (side, v, other, text) => {
    const lead = v != null && other != null && v > other, b = el("b", side + (lead ? " lead" : ""));
    b.appendChild(el("span", "", v == null ? "–" : text(v)));
    if (lead) b.appendChild(el("small", "", "+" + text(v - other))); // how far ahead, small, after the value
    return b;
  };
  const cell = (side, v, other, text, cls) => {
    const c = el("div", "x-c" + (cls ? " " + cls : "")), high = Math.max(v || 0, other || 0);
    c.appendChild(value(side, v, other, text));
    c.appendChild(el("span", "x-d-bar " + side)).appendChild(el("i")).style.width = (high > 0 ? (100 * Math.max(0, v || 0)) / high : 0).toFixed(2) + "%";
    return c;
  };
  // the figures in blocks of n columns: a head of names, then side 1's line and side 2's. small: the breakdown line
  // (smaller text, thinner bars); big: how many figures, from the first, are drawn larger
  const blocks = (body, figs, n, small, big = 0) => {
    for (let at = 0; at < figs.length; at += n) {
      const part = figs.slice(at, at + n), g = body.appendChild(el("div", "x-blk" + (small ? " x-sm" : "")));
      g.style.gridTemplateColumns = `${SIDE_W}px repeat(${part.length}, minmax(0, 1fr))`; // each block fills the width
      g.appendChild(el("span"));
      for (const [name, , , , icon, , tip] of part) {
        const h = g.appendChild(el("span", "x-h"));
        if (icon) h.appendChild(iconOf(icon, "x-d-si"));
        h.appendChild(el("span", "", name)).title = tip || name;
      }
      for (const side of ["a", "b"]) {
        g.appendChild(el("span", "x-sd " + side, sideName(pn, side)));
        part.forEach(([, va, vb, text, , own], j) => {
          const cls = at + j < big ? "x-main" : "";
          g.appendChild(own ? own(side) : side === "a" ? cell("a", va, vb, text, cls) : cell("b", vb, va, text, cls));
        });
      }
    }
  };
  // a split page's cards are half as wide: narrower columns, so a card's two leading figures still share their line
  const wide = !(cfg.split && matchMedia("(min-width: 1100px)").matches);
  const colW = wide ? COL_W[state.compact ? "compact" : "full"] : state.compact ? 104 : 150;
  const cols = [0, 1].map(() => box.appendChild(el("div", "x-col")));
  const figsOf = (list) => list.map(([name, of, fmt, icon, own, tip]) => [name, of(pa), of(pb), fmt, icon, own, tip]);
  items.forEach(([key, label, get, text, subs, parts, lead = 1], i) => {
    const d = el("div", "x-duel"), top = el("div", "x-d-top"), body = el("div", "x-d-body");
    d.dataset.k = key;
    top.append(iconOf(key, "x-d-i"), el("span", "x-d-l", label));
    const figs = [[label, get(pa), get(pb), text], ...figsOf(subs || [])], small = figsOf(parts || []);
    if (key === "merits" && !cfg.short) figs.push([KS.label(KS.BY_KEY.unitFocus), null, null, null, null, (side) => focusOf(pair[side])]); // after the best season
    let n = 0, m = 0;
    // as many columns as fit, then shared out evenly between the blocks: 7 in 4 is 4 + 3, not 4 + 4 empty slots.
    // Run at once when the card is put in the page (a page drawn again keeps its height, so its scroll stays), and on resize
    const even = (count, w) => { const most = Math.max(1, Math.floor((body.clientWidth - SIDE_W) / w)); return Math.ceil(count / Math.ceil(count / most)); };
    body.fit = () => {
      if (!body.clientWidth) return;
      // the breakdown: each of its cells as wide as its longest value needs at its size (~7.5 px a character: a band's
      // count of players "95", or full merits "1,291,476,754"), all on one line when they fit
      const fit = even(figs.length, colW), need = Math.max(48, 10 + 7.5 * Math.max(...small.map(([, va, vb, text]) =>
        Math.max(va == null ? 1 : text(va).length, vb == null ? 1 : text(vb).length)), 0));
      const fitS = !small.length ? 0 : even(small.length, need);
      if (fit === n && fitS === m) return;
      body.innerHTML = "";
      blocks(body, figs, (n = fit), false, small.length ? lead : 0);
      if (small.length) blocks(body, small, (m = fitS), true);
    };
    new ResizeObserver(body.fit).observe(body);
    d.append(top, body);
    d.style.order = i; // one column on a phone: the cards read in order
    cols[i % 2].appendChild(d);
  });
  return box;
}

async function draw() {
  const me = ++token;
  // kingdoms that left the index (a link from another time)
  for (const p of cfg.pairs) { p.a = p.a.filter(itemOf); p.b = p.b.filter(itemOf); }
  tidy();
  // a kingdom just picked shows at once; its figures follow when its file comes (Pages can take most of a second)
  const loads = cfg.pairs.map((p) => [p.a.map(load), p.b.map(load)]);
  const waiting = loads.flat(2).some((f) => f.value === undefined);
  if (waiting) paint(loads.map((sides) => sides.map((fs) => fs.map((f) => f.value))));
  const [files, roll] = await Promise.all([Promise.all(loads.map((sides) => Promise.all(sides.map((fs) => Promise.all(fs))))), KS.ui.load("derived/rollup.json"), loadSeeds()]);
  kdRows ||= new Map(roll ? KS.ui.objects(roll.cols, roll.rows).map((x) => [x.kingdom, x]) : []);
  if (me !== token) return;
  paint(files);
}

// files: [pair][side][kingdom], undefined = still loading, null = failed
function paint(files) {
  const box = $("cmp"), keepY = box.scrollTop;
  const before = [...box.querySelectorAll(":scope > .x-pair")]; // a pair still waiting keeps these figures: no blink, no jump
  box.innerHTML = "";
  box.classList.toggle("x-split", !!cfg.split);
  box.appendChild(controls());
  const pairHead = (n, pa, pb) => {
    const head = el("div", "x-head");
    head.append(sidePanel(n, "a", pa), el("div", "x-vs", "VS"), sidePanel(n, "b", pb));
    return head;
  };
  const note = () => el("p", "x-gd x-note", tr(cfg.short ? "xdShort" : "xdDuels").replace("{agg}", tr("xAggSum")));
  // split: one note over both columns, under the controls, from the first pair with two sides on (loading or not), so
  // the two pairs' cards start on the same line
  let noted = !!cfg.split && cfg.pairs.some(ready);
  if (noted) box.appendChild(note());
  cfg.pairs.forEach((p, n) => {
    const [fa, fb] = files[n], pa = sidePlayers(fa), pb = sidePlayers(fb), sec = box.appendChild(el("section", "x-pair"));
    sec.appendChild(pairHead(n, pa, pb));
    const bad = [...p.a.filter((_, i) => fa[i] === null), ...p.b.filter((_, i) => fb[i] === null)];
    if (bad.length) sec.appendChild(el("p", "hint x-err", `${tr("xLoadErr")} ${bad.map((k) => "#" + k).join(", ")}`));
    // one box for the two hints, as high as the longer one, so going from one to the other moves nothing
    const hint = (key) => {
      const h = sec.appendChild(el("p", "hint mut x-hint"));
      for (const k of ["xEmpty", "loading"]) h.appendChild(el("span", k === key ? "" : "off", tr(k)));
    };
    if (!ready(p)) { hint("xEmpty"); return; }
    if ([...fa, ...fb].includes(undefined)) {
      const kept = before[n] ? [...before[n].querySelectorAll(":scope > .x-note, :scope > .x-duels, :scope > .x-grp")] : [];
      if (kept.length) { sec.append(...kept); noted ||= kept[0].classList.contains("x-note"); }
      else hint("loading");
      return;
    }
    if (!noted) sec.appendChild(note());
    noted = true;
    sec.append(duels(pa, pb, p, n), group("players", tr("xEach"), tr("xdEach"), eachKingdom(fa, fb)));
    sec.querySelectorAll(".x-d-body").forEach((b) => b.fit());
  });
  // the last pair has both sides: an empty one under it for the next, kept once a kingdom is picked in it
  const n = cfg.pairs.length;
  if (n < MAX_PAIRS && ready(cfg.pairs[n - 1])) box.appendChild(el("section", "x-pair")).appendChild(pairHead(n, [], []));
  box.scrollTop = keepY;
}

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

KS.seeds = { load: loadSeeds, badge: seedBadge, of: (k) => loadSeeds().then(() => seedOf.get(k)?.[0] || 0),
  // the kingdom's pairing group: {seed, n (its number), season, times, rows}, or null (the Kingdom page's pairing block, kinfo.js)
  loaded: () => !!seeds, has: (k) => seedOf.has(k),
  at: (k) => seedOf.get(k), // [seed 1-4, its group's index] once loaded (the ranking's Seed filter)
  // the season screen's dates (UTC s) of the kingdom's group, else of the first group (one wave: the same dates)
  times: (k) => (seedOf.has(k) ? seeds.groups[seedOf.get(k)[1]] : seeds?.groups[0])?.times,
  group: (k) => loadSeeds().then(() => { const s = seedOf.get(k); return s ? { seed: s[0], n: s[1] + 1, ...seeds.groups[s[1]] } : null; }) }; // the ranking's kingdom column (pages.js)
KS.compare = {
  draw,
  show() { fromHash(); history.replaceState(null, "", linkHash()); draw(); },
};
})();
