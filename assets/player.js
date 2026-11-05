// A player's card: a click on a player's name anywhere (the Kingdom table, Rankings, Migration, KvK) opens it over the
// page. Its numbers now, every metric by group, and its history over the kingdom's scans (and the kingdoms it came
// from). A classic script loaded last; what it needs comes through window.KS. Any element with data-pid (+ data-pk,
// the kingdom it was seen in) opens it.
(() => {
"use strict";
const KS = window.KS, { state, tr, numFmt } = KS;
const { el, load, objects } = KS.ui;

Object.assign(KS.T.vi, {
  plOpen: "Xem hồ sơ người chơi", plClose: "Đóng", plOverview: "Tổng quan", plHistory: "Lịch sử", plRank: "Hạng LC",
  plSince: "so với {d}", plLoading: "Đang đọc các đợt quét...", plNone: "Không tìm thấy người chơi này trong dữ liệu.",
  plScans: "{n} đợt quét · {a} – {b}", plScan: "Ngày quét", plKd: "Kingdom", plValue: "Giá trị", plChange: "Thay đổi",
  plMoves: "Chuyển kingdom", plMoved: "#{a} → #{b}", plMovedAt: "giữa {a} và {b}", plOpenK: "Mở kingdom #{k}",
  plOneScan: "Mới có một đợt quét, chưa vẽ được diễn biến.", plCopy: "Chép ID", plCopied: "Đã chép",
  plFromKvk: "Từ đầu KvK · {d}", plFrom: "So với {d}", plPeriodKvk: "Hiệu suất KvK", plPeriod: "Thay đổi",
  plShow: "Hiện chi tiết", plHide: "Ẩn chi tiết", plMetric: "Chỉ số", plAccount: "Sức mạnh tài khoản", plKvkMark: "KvK", plRankIn: "Hạng {r} / {n} người chơi của #{k}", plFirstHas: "từ {d} (đợt quét đầu tiên có số này)", plUnits: "Thiên hướng binh chủng", plUnitsHint: "Theo công trạng cả mùa · chủ yếu {u} ({p}%)",
});
Object.assign(KS.T.en, {
  plOpen: "Open the player's card", plClose: "Close", plOverview: "Overview", plHistory: "History", plRank: "Power rank",
  plSince: "since {d}", plLoading: "Reading the scans...", plNone: "This player is not in the data.",
  plScans: "{n} scans · {a} – {b}", plScan: "Scan", plKd: "Kingdom", plValue: "Value", plChange: "Change",
  plMoves: "Kingdom moves", plMoved: "#{a} → #{b}", plMovedAt: "between {a} and {b}", plOpenK: "Open kingdom #{k}",
  plOneScan: "Only one scan so far: no trend to draw yet.", plCopy: "Copy ID", plCopied: "Copied",
  plFromKvk: "Since the KvK opened · {d}", plFrom: "Since {d}", plPeriodKvk: "KvK performance", plPeriod: "Changes",
  plShow: "Show details", plHide: "Hide details", plMetric: "Metric", plAccount: "Account strength", plKvkMark: "KvK", plRankIn: "Place {r} of {n} players of #{k}", plFirstHas: "since {d} (the first scan with this number)", plUnits: "Unit focus", plUnitsHint: "By the season's merits · mostly {u} ({p}%)",
});

const LEAD = ["merits", "kills", "deaths"];
const MINOR = ["heals", "powerMax", "trades", "migrationScore"];
const TREND = ["power", "merits", "kills", "deaths", "heals", "powerMax"];
const col = (k) => KS.BY_KEY[k];
const val = (k, p) => (p ? KS.value(col(k), p) : undefined);
const fullN = (v) => (v == null ? "–" : numFmt().format(Math.round(v)));
const day = (s) => { const [, m, d] = s.split("-"); return `${d}/${m}`; };
const short = (k, v) => (v == null ? "–" : col(k).type === "pct" ? KS.fmt(col(k), v) : KS.compact(v));
const colName = (k) => KS.label(col(k));

// ---- the data: every scan of the player's kingdom, and of each kingdom a move links to ----
async function historyOf(id, k) {
  const mig = await load("derived/migrations.json");
  const moves = mig ? objects(mig.cols, mig.rows).filter((m) => m.id === id).sort((a, b) => (a.toScan < b.toScan ? -1 : 1)) : [];
  const ks = [...new Set([k, ...moves.flatMap((m) => [m.from, m.to])])].filter((x) => state.list.some((i) => i.kingdom === x));
  const jobs = [];
  for (const kk of ks) for (const scan of state.list.find((i) => i.kingdom === kk).scans) {
    jobs.push(KS.getJSON(`data/scans/${scan}/${kk}.json`).then((d) => {
      const p = d.players.find((x) => x.id === id);
      return p && { scan, k: kk, p, at: d.crawledAt || scan };
    }).catch(() => null));
  }
  const by = new Map(); // one line a day: a day crawled in two kingdoms keeps the later crawl
  for (const e of (await Promise.all(jobs)).filter(Boolean)) if (!by.has(e.scan) || by.get(e.scan).at < e.at) by.set(e.scan, e);
  return { list: [...by.values()].sort((a, b) => (a.scan < b.scan ? -1 : 1)), moves };
}

// ---- the dialog: made once, filled for each player ----
let dlg, token = 0, lastFocus = null;
function frame() {
  if (dlg) return dlg;
  dlg = el("dialog", "dlg pl");
  dlg.setAttribute("aria-labelledby", "plName");
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); }); // a click on the backdrop
  dlg.addEventListener("close", () => { lastFocus?.focus?.(); });
  document.body.appendChild(dlg);
  return dlg;
}
function closeBtn() {
  const b = el("button", "pl-x");
  b.type = "button";
  b.setAttribute("aria-label", tr("plClose"));
  b.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  b.onclick = () => dlg.close();
  return b;
}

async function open(id, k, name) {
  const me = ++token, d = frame();
  lastFocus = document.activeElement;
  d.innerHTML = "";
  d.append(head({ name, id, k }, null), el("p", "pl-wait mut", tr("plLoading")));
  if (!d.open) d.showModal();
  const idx = await load("kvk/index.json");
  const { list, moves } = await historyOf(id, k);
  if (me !== token || !d.open) return;
  d.innerHTML = "";
  if (!list.length) { d.append(head({ name, id, k }, null), el("p", "pl-wait mut", tr("plNone")), foot(k)); return; }
  const now = list[list.length - 1];
  const b = idx && KS.season.of(idx, now.k);
  // the changes count from the day the KvK opened (its first scan, b.vs, as on the KvK page); out of a KvK, or with
  // no scan of the player since then, from the first scan of the player
  let was = b?.live && b.vs ? list.find((e) => e.scan >= b.vs) : null;
  const fromKvk = !!was && was !== now;
  if (!fromKvk) was = list[0] !== now ? list[0] : null;
  const since = was && { scan: was.scan, kvk: fromKvk, text: tr(fromKvk ? "plFromKvk" : "plFrom").replace("{d}", day(was.scan)) };
  const top = head({ name: now.p.name ?? name, id, k: now.k, alliance: now.p.alliance, rank: now.p.rank }, b);
  d.append(top, body(id, now, was, since, list, moves), foot(now.k));
}

function head(x, b) {
  const h = el("header", "pl-head");
  KS.season.art(h, b?.season);
  const who = el("div", "pl-who");
  const t = el("h2", "", x.name ?? String(x.id));
  t.id = "plName";
  const sub = el("div", "pl-sub");
  const idB = el("button", "pl-id", `ID ${x.id}`);
  idB.type = "button";
  idB.title = tr("plCopy");
  idB.onclick = () => navigator.clipboard?.writeText(String(x.id)).then(() => { idB.textContent = tr("plCopied"); setTimeout(() => (idB.textContent = `ID ${x.id}`), 1200); });
  sub.appendChild(idB);
  if (x.alliance) sub.appendChild(KS.allianceChip(x.alliance));
  if (x.k) { const a = el("a", "kd", "#" + x.k); a.href = "#k=" + x.k; a.onclick = () => dlg.close(); sub.appendChild(a); }
  if (x.rank) sub.append(el("span", "pl-rank", `${tr("plRank")} #${x.rank}`));
  const tag = KS.season.battleTag(b);
  if (tag) sub.appendChild(tag);
  who.append(t, sub);
  h.append(who, closeBtn());
  return h;
}

// The day a change counts from, for one metric: the KvK's first scan; a metric that scan lacks (scans before 28/10
// held only the basic numbers: no gathering, achievements, alliance activity) from the first later scan that has it
let later = [];
function baseOf(k, was) {
  if (val(k, was?.p) != null) return was;
  return later.find((e) => val(k, e.p) != null) || null;
}
function delta(k, p, was) {
  const from = baseOf(k, was), a = val(k, p), z = val(k, from?.p);
  if (a == null || z == null || col(k).type === "pct") return null;
  const dv = a - z;
  if (!dv) return el("span", "pl-d zero", "→ 0");
  const s = el("span", "pl-d " + (dv > 0 ? "up" : "down"), (dv > 0 ? "↑ " : "↓ ") + KS.compact(Math.abs(dv)));
  s.title = `${dv > 0 ? "+" : "−"}${fullN(Math.abs(dv))} · ${from === was ? sinceText : tr("plFirstHas").replace("{d}", day(from.scan))}`;
  return s;
}

let sinceText = "";
function body(id, now, was, since, list, moves) {
  sinceText = since?.text || "";
  later = was ? list.filter((e) => e.scan > was.scan && e !== now) : []; // the scans a missing metric can count from
  const box = el("div", "pl-body");
  // the power, then the three numbers a KvK is judged on, then the rest on one line
  const lead = el("section", "pl-lead");
  const big = el("div", "pl-big");
  const pw = val("power", now.p);
  const n = el("b", "", short("power", pw));
  n.title = fullN(pw);
  big.append(el("small", "", colName("power")), n);
  const d0 = delta("power", now.p, was);
  if (d0) big.appendChild(d0);
  lead.appendChild(big);
  for (const k of LEAD) {
    const c = el("div", "pl-num"), v = val(k, now.p), b = el("b", "", short(k, v));
    b.title = fullN(v);
    c.append(el("small", "", colName(k)), b);
    const dd = delta(k, now.p, was);
    if (dd) c.appendChild(dd);
    lead.appendChild(c);
  }
  const minor = el("div", "pl-minor");
  for (const k of MINOR) {
    const v = val(k, now.p);
    if (v == null) continue;
    const s = el("span");
    s.append(colName(k) + " ", el("b", "", k === "trades" ? KS.fmt(col(k), v) : short(k, v)));
    s.title = fullN(v);
    minor.appendChild(s);
  }
  if (since) minor.appendChild(el("span", "pl-since", `↑↓ ${since.text}`));
  lead.appendChild(minor);
  box.appendChild(lead);

  // two tabs: every metric now / how they moved over the scans
  const tabs = el("div", "pl-tabs");
  tabs.setAttribute("role", "tablist");
  const panes = [overview(now, was, since, id), history(list, moves, now, was, since)];
  [tr("plOverview"), tr("plHistory")].forEach((label, i) => {
    const t = el("button", "", label);
    t.type = "button";
    t.id = "plTab" + i;
    t.setAttribute("role", "tab");
    t.setAttribute("aria-controls", "plPane" + i);
    panes[i].id = "plPane" + i;
    panes[i].setAttribute("role", "tabpanel");
    panes[i].setAttribute("aria-labelledby", t.id);
    t.onclick = () => pick(i);
    t.onkeydown = (e) => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); pick(1 - i); tabs.children[1 - i].focus(); } };
    tabs.appendChild(t);
  });
  const pick = (i) => {
    [...tabs.children].forEach((t, j) => { t.setAttribute("aria-selected", String(i === j)); t.tabIndex = i === j ? 0 : -1; });
    panes.forEach((p, j) => (p.hidden = i !== j));
  };
  pick(0);
  box.append(tabs, ...panes);
  return box;
}

// KvK performance: each KvK number's change since the KvK opened, the player's place in the kingdom by that change
// (#n, and a bar: full for #1), as the KvK dashboards show. The places need the whole kingdom on both days, so they
// come in a moment later, into boxes already drawn
const PERF = ["merits", "kills", "deaths", "heals", "power"];
async function kingdomRanks(id, now, was) {
  if (!was || was.k !== now.k) return null; // moved in during the KvK: no one day to rank the kingdom from
  const [a, z] = await Promise.all([KS.getJSON(`data/scans/${now.scan}/${now.k}.json`), KS.getJSON(`data/scans/${was.scan}/${was.k}.json`)]);
  const old = new Map(z.players.map((p) => [p.id, p])), out = {};
  for (const k of PERF) {
    const ds = [];
    for (const p of a.players) { const o = old.get(p.id), x = val(k, p), y = val(k, o); if (o && x != null && y != null) ds.push([p.id, x - y]); }
    ds.sort((m, n) => n[1] - m[1]);
    const i = ds.findIndex(([pid]) => pid === id);
    if (i >= 0) out[k] = { rank: i + 1, n: ds.length };
  }
  return out;
}
function perfSection(id, now, was, since) {
  const sec = el("section", "pl-perf"), h = el("div", "pl-period-h"), what = el("div");
  what.append(el("h3", "", tr(since?.kvk ? "plPeriodKvk" : "plPeriod")), el("small", "mut", `${day(since.scan)} – ${day(now.scan)}`));
  h.appendChild(what);
  const cards = el("div", "pl-pcs"), boxes = {};
  for (const k of PERF) {
    const a = val(k, now.p), z = val(k, was.p);
    if (a == null || z == null) continue; // a metric the first day lacks has no change to show
    const dv = a - z, c = el("div", "pl-pc b-" + k);
    const v = el("b", "", (dv > 0 ? "↑ " : dv < 0 ? "↓ " : "") + KS.compact(Math.abs(dv)));
    v.title = (dv < 0 ? "−" : "+") + fullN(Math.abs(dv));
    const line = el("span", "pl-pc-v"), badge = el("span", "pl-rk"), bar = el("i", "pl-bar");
    line.append(icon(k), v);
    bar.appendChild(el("u"));
    c.append(badge, line, el("small", "", colName(k)), bar);
    boxes[k] = c;
    cards.appendChild(c);
  }
  sec.append(h, cards);
  kingdomRanks(id, now, was).then((r) => {
    if (!r) { cards.querySelectorAll('.pl-bar').forEach((b) => b.remove()); return; } // no place to show: no empty bars
    for (const [k, c] of Object.entries(boxes)) {
      const x = r?.[k];
      if (!x) continue;
      const b = c.querySelector(".pl-rk");
      b.textContent = "#" + x.rank;
      b.classList.add(x.rank <= 3 ? "top" : "on");
      b.title = tr("plRankIn").replace("{k}", now.k).replace("{r}", x.rank).replace("{n}", x.n);
      c.querySelector(".pl-bar u").style.width = (x.n > 1 ? 100 * (1 - (x.rank - 1) / (x.n - 1)) : 100) + "%";
    }
  }).catch(() => {});
  return sec;
}

// What the player fights with: the season's merits by unit type, as one bar and a line a type (picture, share, merits)
function unitSection(now) {
  const sp = unitSplit(now.p);
  if (!sp) return null;
  const sec = el("section", "pl-units"), h = el("div", "pl-period-h"), what = el("div");
  what.append(el("h3", "", tr("plUnits")), el("small", "mut", tr("plUnitsHint").replace("{u}", KS.label(sp.top)).replace("{p}", numFmt(0).format(100 * sp.top.share))));
  h.appendChild(what);
  const bar = el("div", "us-bar big");
  for (const u of sp.parts) {
    if (!u.v) continue;
    const s = el("i", "b-" + u.key);
    s.style.flexGrow = u.share;
    s.title = `${KS.label(u)} ${numFmt(1).format(100 * u.share)}%`;
    bar.appendChild(s);
  }
  const list = el("div", "pl-ulist");
  for (const u of [...sp.parts].sort((a, b) => b.v - a.v)) {
    const r = el("div", "pl-u b-" + u.key + (u === sp.top ? " top" : "")), ic = el("img", "pl-uic");
    ic.src = `assets/icons/${u.key}.png`; ic.alt = "";
    const n = el("span", "pl-un");
    n.append(el("b", "", KS.label(u)), el("small", "", KS.compact(u.v)));
    const pc = el("b", "pl-up", numFmt(0).format(100 * u.share) + "%");
    pc.title = fullN(u.v);
    r.append(ic, n, pc);
    list.appendChild(r);
  }
  sec.append(h, bar, list);
  return sec;
}

// every metric the scan has, by the table's groups; a change since the KvK opened where there is one
function overview(now, was, since, id) {
  const pane = el("div", "pl-pane pl-groups");
  if (was && since) pane.appendChild(perfSection(id, now, was, since));
  const units = unitSection(now);
  if (units) pane.appendChild(units);
  // the migration score and the achievements say how built up the account is: one group, "Account strength"
  const groups = [{ id: "account", label: tr("plAccount"), of: ["basic", "trophy"] },
    ...GROUPS.filter((g) => g.id !== "basic" && g.id !== "trophy").map((g) => ({ id: g.id, label: KS.label(g), of: [g.id] }))];
  const order = ["power", "combat", "account", "merit", "alliance", "gather"];
  groups.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  for (const g of groups) {
    const cols = COLUMNS.filter((c) => g.of.includes(c.group) && c.type !== "split" && !["rank", "name", "id", "alliance", "home"].includes(c.key));
    const rows = cols.map((c) => [c, KS.value(c, now.p)]).filter(([, v]) => v != null);
    if (!rows.length) continue;
    const sec = el("section", "pl-grp");
    sec.appendChild(el("h3", "", g.label));
    const dl = el("dl");
    for (const [c, v] of rows) {
      const dt = el("dt", "", KS.label(c)), dd = el("dd"); // the short name; the full one on hover
      if (c.tip) dt.title = KS.label(c.tip);
      const t = el("b", "", KS.fmt(c, v) + (now.p.atLeast?.includes(c.key) ? "+" : ""));
      if (typeof v === "number" && c.type !== "pct") t.title = fullN(v);
      dd.appendChild(t);
      if (KS.NUMERIC.has(c.type) && c.type !== "pct" && c.type !== "grade") { const x = delta(c.key, now.p, was); if (x && !x.classList.contains("zero")) dd.appendChild(x); } // only what moved
      dl.append(dt, dd);
    }
    sec.appendChild(dl);
    pane.appendChild(sec);
  }
  return pane;
}

// History: each metric's change over the period (from the KvK's first day), one metric's line over every scan, and the
// scans as rows. Each metric has its own colour and picture, as on the Kingdom page's cards
let trendKey = "power", details = true;
const ICON = { power: "power", powerMax: "power", merits: "merits", kills: "kills", deaths: "deaths", heals: "heals" };
function icon(k) { const i = el("img", "pl-ic"); i.src = `assets/icons/${ICON[k]}.png`; i.alt = ""; return i; }
function history(list, moves, now, was, since) {
  const pane = el("div", "pl-pane");
  const meta = el("p", "pl-meta mut", tr("plScans").replace("{n}", list.length).replace("{a}", day(list[0].scan)).replace("{b}", day(list[list.length - 1].scan)));
  const pills = el("div", "pl-pills");
  pills.setAttribute("role", "group");
  pills.setAttribute("aria-label", tr("plMetric"));
  const chart = el("div", "pl-chart"), rows = el("div", "pl-rows");
  const draw = () => {
    [...pills.children].forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === trendKey)));
    chart.className = "pl-chart b-" + trendKey;
    chart.innerHTML = "";
    rows.innerHTML = "";
    const pts = list.map((e) => ({ scan: e.scan, k: e.k, v: val(trendKey, e.p) })).filter((x) => x.v != null);
    if (pts.length < 2) chart.appendChild(el("p", "mut", tr("plOneScan")));
    else chart.appendChild(lineChart(pts, since?.kvk ? since.scan : null));
    rows.appendChild(scanTable(pts));
  };
  for (const k of TREND) {
    const b = el("button", "b-" + k);
    b.type = "button";
    b.dataset.k = k;
    b.append(icon(k), colName(k));
    b.onclick = () => { trendKey = k; draw(); };
    pills.appendChild(b);
  }
  // the scans as rows fold away (the KvK's changes are on the Overview tab)
  const top = el("div", "pl-period-h"), fold = el("button", "pl-fold");
  fold.type = "button";
  rows.id = "plRows";
  fold.setAttribute("aria-controls", "plRows");
  const setFold = () => {
    fold.replaceChildren(tr(details ? "plHide" : "plShow"), el("i", details ? "pl-chev up" : "pl-chev"));
    fold.setAttribute("aria-expanded", String(details));
    rows.hidden = !details;
  };
  fold.onclick = () => { details = !details; setFold(); };
  top.append(meta, fold);
  pane.append(top, pills, chart, rows);
  if (moves.length) {
    const sec = el("section", "pl-moves");
    sec.appendChild(el("h3", "", tr("plMoves")));
    for (const m of moves) {
      const li = el("div", "pl-move");
      li.append(el("b", "", tr("plMoved").replace("{a}", m.from).replace("{b}", m.to)),
        el("span", "mut", tr("plMovedAt").replace("{a}", day(m.fromScan)).replace("{b}", day(m.toScan))));
      sec.appendChild(li);
    }
    pane.appendChild(sec);
  }
  setFold();
  draw();
  return pane;
}

function scanTable(pts) {
  const t = el("table", "pl-tbl");
  const hr = el("tr");
  for (const h of [tr("plScan"), tr("plKd"), tr("plValue"), tr("plChange")]) hr.appendChild(el("th", "", h));
  t.appendChild(el("thead")).appendChild(hr);
  const tb = t.appendChild(el("tbody"));
  for (let i = pts.length - 1; i >= 0; i--) {
    const x = pts[i], prev = pts[i - 1], r = el("tr");
    const dv = prev ? x.v - prev.v : null;
    r.append(el("td", "", day(x.scan)), el("td", "", "#" + x.k), el("td", "num", fullN(x.v)),
      el("td", "num " + (dv > 0 ? "up" : dv < 0 ? "down" : "mut"), dv == null ? "–" : dv === 0 ? "0" : (dv > 0 ? "+" : "−") + fullN(Math.abs(dv))));
    tb.appendChild(r);
  }
  return t;
}

// an axis label in the unit of the top value, with as many decimals as the step between labels needs (196M, 196M
// twice would say nothing when the line moves by 0.2M)
function tick(v, step, top) {
  const [u, s] = Math.abs(top) >= 1e9 ? [1e9, "B"] : Math.abs(top) >= 1e6 ? [1e6, "M"] : Math.abs(top) >= 1e3 ? [1e3, "K"] : [1, ""];
  const dec = Math.max(0, Math.min(2, Math.ceil(-Math.log10(step / u))));
  return numFmt(dec).format(v / u) + s;
}
// A curve through the points that never overshoots them (monotone cubic, Fritsch-Carlson): a rise stays a rise, a
// flat stretch stays flat, and the corners of a straight polyline are gone
function smooth(pts) {
  const n = pts.length, f = (v) => v.toFixed(1);
  const dx = [], s = [], m = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; s[i] = dx[i] ? (pts[i + 1][1] - pts[i][1]) / dx[i] : 0; }
  m[0] = s[0]; m[n - 1] = s[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = s[i - 1] * s[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / s[i - 1] + (dx[i] + 2 * dx[i - 1]) / s[i]);
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${f(pts[i][0] + h)},${f(pts[i][1] + m[i] * h)} ${f(pts[i + 1][0] - h)},${f(pts[i + 1][1] - m[i + 1] * h)} ${f(pts[i + 1][0])},${f(pts[i + 1][1])}`;
  }
  return d;
}
// a smooth line over the scans, spaced by date; y from a rounded floor so a small change still shows
function lineChart(pts, kvkScan) {
  const W = state.narrow ? 360 : 640, H = state.narrow ? 220 : 200, L = 52, R = 12, T = 12, B = 26; // a phone: fewer units across, so the labels stay readable
  const t0 = Date.parse(pts[0].scan), t1 = Date.parse(pts[pts.length - 1].scan);
  let lo = Math.min(...pts.map((p) => p.v)), hi = Math.max(...pts.map((p) => p.v));
  if (lo === hi) { lo -= Math.abs(lo) * 0.05 || 1; hi += Math.abs(hi) * 0.05 || 1; }
  const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
  if (lo < 0 && pts.every((p) => p.v >= 0)) lo = 0;
  const x = (s) => L + ((Date.parse(s) - t0) / (t1 - t0 || 1)) * (W - L - R);
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ns = "http://www.w3.org/2000/svg", mk = (tag, a) => { const e = document.createElementNS(ns, tag); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const svg = mk("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `${colName(trendKey)}: ${pts.map((p) => `${day(p.scan)} ${KS.compact(p.v)}`).join(", ")}` });
  for (let i = 0; i <= 3; i++) {
    const v = lo + ((hi - lo) * i) / 3, yy = y(v);
    svg.append(mk("line", { x1: L, x2: W - R, y1: yy, y2: yy, class: "g" }));
    const tx = mk("text", { x: L - 8, y: yy + 4, "text-anchor": "end" });
    tx.textContent = tick(v, (hi - lo) / 3, hi);
    svg.appendChild(tx);
  }
  // where the KvK opened: a dashed line, when it falls inside the scans shown
  if (kvkScan && kvkScan > pts[0].scan && kvkScan <= pts[pts.length - 1].scan) {
    const kx = x(kvkScan);
    svg.append(mk("line", { x1: kx, x2: kx, y1: T, y2: H - B, class: "kv" }));
    const kt = mk("text", { x: kx + 4, y: T + 10, class: "kvt" });
    kt.textContent = tr("plKvkMark");
    svg.appendChild(kt);
  }
  const xy = pts.map((p) => [x(p.scan), y(p.v)]), curve = smooth(xy);
  const area = `M${xy[0][0].toFixed(1)},${H - B}L${xy[0][0].toFixed(1)},${xy[0][1].toFixed(1)}${curve.slice(curve.indexOf("C"))}L${xy[xy.length - 1][0].toFixed(1)},${H - B}Z`;
  svg.append(mk("path", { d: area, class: "a" }), mk("path", { d: curve, class: "l", pathLength: 1 }));
  // a date under a point only where it has room: the first and last always, one in between at least GAP from both sides
  const GAP = 46, lastX = x(pts[pts.length - 1].scan);
  let placed = -Infinity;
  pts.forEach((p, i) => {
    const c = mk("circle", { cx: x(p.scan), cy: y(p.v), r: 3.5, class: "d" });
    const tt = mk("title", {});
    tt.textContent = `${day(p.scan)} · #${p.k} · ${fullN(p.v)}`;
    c.appendChild(tt);
    svg.appendChild(c);
    const px = x(p.scan), end = i === pts.length - 1;
    if (end || (px - placed >= GAP && lastX - px >= GAP)) {
      placed = px;
      const tx = mk("text", { x: x(p.scan), y: H - 8, "text-anchor": i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle" });
      tx.textContent = day(p.scan);
      svg.appendChild(tx);
    }
  });
  return svg;
}

function foot(k) {
  const f = el("footer", "pl-foot");
  if (k) { const a = el("a", "btn", tr("plOpenK").replace("{k}", k)); a.href = "#k=" + k; a.onclick = () => dlg.close(); f.appendChild(a); }
  const c = el("button", "btn", tr("plClose"));
  c.type = "button";
  c.onclick = () => dlg.close();
  f.appendChild(c);
  return f;
}

// what opens a card: any [data-pid] on the page; a click there does not also do what its row does
function target(e) { return e.target.closest?.("[data-pid]"); }
document.addEventListener("click", (e) => {
  const t = target(e);
  if (!t || dlg?.contains(t)) return;
  e.preventDefault();
  e.stopPropagation();
  open(Number(t.dataset.pid), Number(t.dataset.pk) || state.data?.kingdom, t.dataset.pn || t.textContent);
}, true);
document.addEventListener("keydown", (e) => {
  const t = (e.key === "Enter" || e.key === " ") && target(e);
  if (!t) return;
  e.preventDefault();
  e.stopPropagation();
  t.click();
}, true);
// marks a name as a way to the card
KS.playerLink = (node, id, k, name) => {
  node.dataset.pid = id;
  if (k) node.dataset.pk = k;
  if (name != null) node.dataset.pn = name;
  node.classList.add("pl-link");
  node.tabIndex = 0;
  node.setAttribute("role", "button");
  node.title = tr("plOpen");
  return node;
};
KS.openPlayer = open;
})();
