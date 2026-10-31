// What goes with the player table: the totals strip and the two bar charts. A classic script
// loaded after app.js; everything it needs from the page comes through window.KS. Every view works on the players
// the filters at the top let through (power step, search).
(() => {
"use strict";
const KS = window.KS, { state, tr, $, numFmt } = KS;

Object.assign(KS.T.vi, {
  kPlayers: "Người chơi", kAlliances: "liên minh", kAvg: "TB", kMigration: "Tổng di cư", kPetSome: "Pet max ≥ 1", kPetNone: "0 pet max",
  cMetric: "Chỉ số", cTop: "Hiện", cAll: "Tất cả", cOrder: "Thứ tự", cDesc: "Cao → thấp", cAsc: "Thấp → cao",
  cEmpty: "Không có số liệu cho chỉ số này.", cDelta: "Mức thay đổi",
});
Object.assign(KS.T.en, {
  kPlayers: "Players", kAlliances: "alliances", kAvg: "avg", kMigration: "Total migration", kPetSome: "Max pets ≥ 1", kPetNone: "0 max pets",
  cMetric: "Metric", cTop: "Show", cAll: "All", cOrder: "Order", cDesc: "High → low", cAsc: "Low → high",
  cEmpty: "No data for this metric.", cDelta: "Change",
});

const short = (v) => (v == null || Number.isNaN(v) ? "–" : KS.compact(v));
const full = (v) => (v == null || Number.isNaN(v) ? "" : numFmt().format(Math.round(v)));
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

// sum + average of a field over a list, only over the players that have it
function agg(list, get) {
  let s = 0, n = 0;
  for (const p of list) { const v = get(p); if (typeof v === "number" && !Number.isNaN(v)) { s += v; n++; } }
  return { sum: n ? s : undefined, avg: n ? s / n : undefined, n };
}

// ---- totals strip (above every view) ----
KS.MIGRATION_BANDS = [[24, 28, "24–27"], [28, 31, "28–30"], [31, Infinity, "31+"]];
KS.DECOR_MAX = 5; // the last tier of the achievement: an account with this many counts as max decor
const isMaxDecor = (p) => ((p.maxDecor ?? 0) >= KS.DECOR_MAX ? 1 : 0);
// the small line of a card: plain strings stay quiet, { b: value } stands out
function kSub(...bits) {
  const s = el("span", "k-a");
  for (const bit of bits) s.append(typeof bit === "string" ? bit : el("b", null, bit.b));
  return s;
}
// one card; its colour comes from data-k in the stylesheet, its picture from assets/icons/<key>.png
function kpiCard(key, label, value, sub) {
  const d = el("div", "kpi"), head = el("div", "k-top"), icon = el("img", "k-i");
  d.dataset.k = key;
  icon.src = `assets/icons/${key}.png`;
  icon.alt = "";
  head.append(icon, el("span", "k-l", label));
  d.append(head, value, sub);
  return d;
}
const KPIS = [
  { key: "power", label: () => KS.label(KS.BY_KEY.power), get: (p) => p.power },
  { key: "merits", label: () => KS.label(KS.BY_KEY.merits), get: (p) => p.merits },
  { key: "kills", label: () => KS.label(KS.BY_KEY.kills), get: (p) => p.kills },
  { key: "deaths", label: () => KS.label(KS.BY_KEY.deaths), get: (p) => p.deaths },
  { key: "heals", label: () => KS.label(KS.BY_KEY.heals), get: (p) => p.heals },
];

// comparing two scans: what changed over the players listed, and from what to what
// (the same figures as the plain strip: switching the mode must not change the strip's height)
const GROWTH_KPIS = [["power", (p) => p.power], ["merits", (p) => p.merits], ["kills", (p) => p.kills], ["deaths", (p) => p.deaths], ["heals", (p) => p.heals],
  ["migrationScore", (p) => p.migrationScore], ["maxDecor", isMaxDecor]];
function drawGrowthKpis(box, list) {
  const n = numFmt(), joined = list.filter((p) => !p._was && !p._left).length, left = list.filter((p) => p._left).length;
  box.appendChild(kpiCard("players", tr("kPlayers"), el("b", "k-v", n.format(list.length - left)), kSub({ b: `+${n.format(joined)}` }, " · ", { b: `−${n.format(left)}` })));
  for (const [k, get] of GROWTH_KPIS) {
    let a = 0, b = 0;
    for (const p of list) {
      if (p._left) { a += get(p) ?? 0; continue; }
      b += get(p) ?? 0;
      if (p._was) a += get(p._was) ?? 0;
    }
    const v = el("b", "k-v " + (b > a ? "up" : b < a ? "down" : ""), (b > a ? "+" : "") + short(b - a));
    v.title = full(b - a);
    box.appendChild(kpiCard(k, k === "migrationScore" ? tr("kMigration") : KS.label(KS.BY_KEY[k]), v, kSub({ b: short(a) }, " → ", { b: short(b) })));
  }
}

// a total with its breakdown under it, one small figure per part
function breakdownKpi(key, label, value, parts) {
  const v = el("b", "k-v", numFmt().format(value)), box = el("span", "k-a k-parts");
  v.title = full(value);
  for (const [l, n] of parts) {
    const part = el("span", "k-p", `${l} `);
    part.appendChild(el("b", null, numFmt().format(n)));
    box.appendChild(part);
  }
  return kpiCard(key, label, v, box);
}
const countIf = (list, test) => list.reduce((n, p) => n + (test(p) ? 1 : 0), 0);

// The crawl has no kingdom-wide migration score, only each player's: the total is theirs added up. Players without the
// figure (a crawl that did not get it) are in no band.
function migrationKpi(list) {
  const has = list.filter((p) => p.migrationScore != null);
  const bands = [[-Infinity, 24, "<24"], ...KS.MIGRATION_BANDS];
  return breakdownKpi("migrationScore", tr("kMigration"), agg(has, (p) => p.migrationScore).sum ?? 0,
    bands.map(([lo, hi, l]) => [l, countIf(has, (p) => p.migrationScore >= lo && p.migrationScore < hi)]));
}
function decorKpi(list) {
  // the breakdown splits the card's own figure: of the max decor accounts, who also has a max pet
  const has = list.filter((p) => isMaxDecor(p) && p.pets8Skills3Star != null);
  return breakdownKpi("maxDecor", KS.label(KS.BY_KEY.maxDecor), countIf(list, isMaxDecor),
    [[tr("kPetSome"), countIf(has, (p) => p.pets8Skills3Star >= 1)], [tr("kPetNone"), countIf(has, (p) => p.pets8Skills3Star === 0)]]);
}

function drawKpis() {
  const box = $("kpis"), list = state.view;
  box.innerHTML = "";
  if (!state.data) return;
  if (state.data._vs) { drawGrowthKpis(box, list); return; }
  const tags = new Set(list.map((p) => p.alliance).filter(Boolean));
  box.appendChild(kpiCard("players", tr("kPlayers"), el("b", "k-v", numFmt().format(list.length)),
    kSub({ b: numFmt().format(tags.size) }, ` ${tr("kAlliances")}`)));
  for (const k of KPIS) {
    const a = agg(list, k.get);
    const v = el("b", "k-v", short(a.sum));
    v.title = full(a.sum);
    const avg = kSub(`${tr("kAvg")} `, { b: short(a.avg) });
    avg.title = full(a.avg);
    box.appendChild(kpiCard(k.key, k.label(), v, avg));
  }
  box.append(migrationKpi(list), decorKpi(list));
}

// ---- charts: horizontal bars of one metric, the same on every page ----
// A page's two charts, remembered under a key of their own: [{ metric, top, dir }]
KS.chartSet = (key, metrics) => {
  const saved = KS.store.get(key, []);
  return metrics.map((metric, i) => Object.assign({ metric, top: 10, dir: -1 }, saved[i]));
};
// one chart. metrics = [[key, label]]; items(key) = [{ name, tag, v }]; text(key, v) = the value as shown;
// delta(key) = the values are changes (signed, coloured); changed() runs after the viewer picks something.
// The first bar has the full colour and each one after fades, down to almost white on the last
KS.barCard = (chart, { metrics, items, text, delta, changed }) => {
  if (!metrics.some(([k]) => k === chart.metric)) chart.metric = metrics[0][0];
  const card = el("div", "chart-card"), bar = el("div", "ctl"), isDelta = !!delta?.(chart.metric);
  card.dataset.k = chart.metric;
  const pick = (t, opts, val, on) => {
    const l = el("label", "ctl-f"), s = el("select");
    for (const [v, name] of opts) { const o = el("option", "", name); o.value = v; s.appendChild(o); }
    s.value = String(val);
    s.onchange = () => { on(s.value); changed(); };
    l.append(el("span", "mut", tr(t)), s);
    return l;
  };
  bar.append(
    pick("cMetric", metrics, chart.metric, (v) => (chart.metric = v)),
    pick("cTop", [[10, "10"], [20, "20"], [30, "30"], [50, "50"], [100, "100"], [0, tr("cAll")]], chart.top, (v) => (chart.top = Number(v))),
    pick("cOrder", [[-1, tr("cDesc")], [1, tr("cAsc")]], chart.dir, (v) => (chart.dir = Number(v))),
  );
  card.appendChild(bar);

  let list = items(chart.metric).filter((x) => typeof x.v === "number" && !Number.isNaN(x.v));
  list.sort((a, b) => (a.v - b.v) * chart.dir);
  if (chart.top) list = list.slice(0, chart.top);
  if (!list.length) { card.appendChild(el("p", "hint mut", tr("cEmpty"))); return card; }

  const max = Math.max(...list.map((x) => Math.abs(x.v))) || 1, ol = el("ol", "bars");
  list.forEach((x, i) => {
    const li = el("li", i < 3 && chart.dir < 0 ? "top" : ""), name = el("span", "b-n");
    name.append(el("span", "b-i", String(i + 1)), el("span", "b-t", x.name));
    if (x.tag) name.appendChild(KS.allianceChip(x.tag));
    name.title = x.name;
    const track = el("span", "b-track"), fill = el("i", "b-fill");
    fill.style.width = ((100 * Math.abs(x.v)) / max).toFixed(2) + "%";
    const colour = list.length > 1 ? 100 - (88 * i) / (list.length - 1) : 100;
    fill.style.background = `color-mix(in srgb, ${x.v < 0 ? "var(--down)" : "var(--t, var(--acc))"} ${colour.toFixed(1)}%, var(--b-end))`;
    track.appendChild(fill);
    const val = el("span", "b-v" + (isDelta ? (x.v > 0 ? " up" : x.v < 0 ? " down" : "") : ""), (isDelta && x.v > 0 ? "+" : "") + text(chart.metric, x.v));
    val.title = full(x.v);
    li.append(name, track, val);
    ol.appendChild(li);
  });
  card.appendChild(ol);
  return card;
};

// ---- the kingdom page's charts, over the players listed ----
// Only metrics that say something as bars: the rest are mostly 0, capped, or follow power
const CHART_METRICS = ["power", "merits", "meritRatio", "kills", "deaths", "heals", "gathered", "migrationScore"];
const charts = KS.chartSet("charts", ["power", "merits"]);

function drawCharts() {
  const panel = $("panel");
  panel.innerHTML = "";
  if (!state.data) return;
  const diff = !!state.data._vs; // the bars show the change between the two scans
  if (diff) panel.appendChild(el("p", "hint mut", `${tr("cDelta")}: ${state.data._vs} → ${state.data.scan}`));
  panel.append(...charts.map((chart) => KS.barCard(chart, {
    metrics: CHART_METRICS.map((k) => [k, KS.label(KS.BY_KEY[k].tip || KS.BY_KEY[k])]),
    items: (k) => state.view.map((p) => ({ name: p.name ?? String(p.id), tag: p.alliance, v: diff ? KS.deltaOf(KS.BY_KEY[k], p) : KS.value(KS.BY_KEY[k], p) })),
    text: (k, v) => { const c = KS.BY_KEY[k]; return c.type === "pct" ? numFmt(2).format(v) + "%" : c.type === "int" ? numFmt().format(v) : short(v); },
    delta: () => diff,
    changed: () => { KS.store.set("charts", charts); KS.keepScroll($("kingdomPage"), drawCharts); },
  })));
}

// after every change of the list (filters, sort, language, kingdom): the strip and the charts
KS.onRefresh = () => {
  drawKpis();
  KS.keepScroll($("kingdomPage"), drawCharts);
};
})();
