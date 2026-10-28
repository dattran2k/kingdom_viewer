// The views besides the player table: the totals strip, the alliance breakdown and the bar chart. A classic script
// loaded after app.js; everything it needs from the page comes through window.KS. Every view works on the players
// the filters at the top let through (power step, search, and for the strip and the chart the alliance too).
(() => {
"use strict";
const KS = window.KS, { state, tr, $, numFmt } = KS;

Object.assign(KS.T.vi, {
  mPlayers: "Người chơi", mAlliances: "Liên minh", mChart: "Biểu đồ",
  kPlayers: "Người chơi", kAlliances: "liên minh", kAvg: "TB",
  aTag: "Liên minh", aMembers: "Thành viên", aPower: "Lực chiến", aAvgPower: "LC TB", aTop: "Mạnh nhất",
  aPowerMax: "LC max", aMerits: "Công trạng", aMeritRatio: "CT / LC max", aKills: "Tiêu diệt", aDeaths: "Tử trận",
  aHeals: "Chữa lính", aHelps: "Giúp đỡ", aGather: "Thu thập", aMigration: "Điểm di cư TB", aShare: "Tỷ trọng lực chiến",
  aNone: "(không liên minh)", aHint: "Bấm một liên minh để xem thành viên.",
  cMetric: "Chỉ số", cScope: "Theo", cScopeP: "Người chơi", cScopeA: "Liên minh", cAgg: "Gộp", cSum: "Tổng",
  cAvg: "Trung bình", cTop: "Hiện", cAll: "Tất cả", cOrder: "Thứ tự", cDesc: "Cao → thấp", cAsc: "Thấp → cao",
  cEmpty: "Không có số liệu cho chỉ số này.",
});
Object.assign(KS.T.en, {
  mPlayers: "Players", mAlliances: "Alliances", mChart: "Chart",
  kPlayers: "Players", kAlliances: "alliances", kAvg: "avg",
  aTag: "Alliance", aMembers: "Members", aPower: "Power", aAvgPower: "Avg power", aTop: "Strongest",
  aPowerMax: "Highest power", aMerits: "Merits", aMeritRatio: "Merits / highest power", aKills: "Kills",
  aDeaths: "Deaths", aHeals: "Heals", aHelps: "Helps", aGather: "Gathered", aMigration: "Avg migration score",
  aShare: "Share of power", aNone: "(no alliance)", aHint: "Click an alliance to list its members.",
  cMetric: "Metric", cScope: "By", cScopeP: "Player", cScopeA: "Alliance", cAgg: "Combine", cSum: "Total",
  cAvg: "Average", cTop: "Show", cAll: "All", cOrder: "Order", cDesc: "High → low", cAsc: "Low → high",
  cEmpty: "No data for this metric.",
});

const short = (v) => (v == null || Number.isNaN(v) ? "–" : KS.compact(v));
const full = (v) => (v == null || Number.isNaN(v) ? "" : numFmt().format(Math.round(v)));
const gathered = (p) => {
  const v = (p.gold ?? 0) + (p.wood ?? 0) + (p.ore ?? 0) + (p.mana ?? 0);
  return p.gold == null && p.wood == null && p.ore == null && p.mana == null ? undefined : v;
};
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

// sum + average of a field over a list, only over the players that have it
function agg(list, get) {
  let s = 0, n = 0;
  for (const p of list) { const v = get(p); if (typeof v === "number" && !Number.isNaN(v)) { s += v; n++; } }
  return { sum: n ? s : undefined, avg: n ? s / n : undefined, n };
}

// ---- totals strip (above every view) ----
const KPIS = [
  { key: "power", label: () => KS.label(KS.BY_KEY.power), get: (p) => p.power },
  { key: "merits", label: () => KS.label(KS.BY_KEY.merits), get: (p) => p.merits },
  { key: "kills", label: () => KS.label(KS.BY_KEY.kills), get: (p) => p.kills },
  { key: "deaths", label: () => KS.label(KS.BY_KEY.deaths), get: (p) => p.deaths },
  { key: "heals", label: () => KS.label(KS.BY_KEY.heals), get: (p) => p.heals },
];

function drawKpis() {
  const box = $("kpis"), list = state.view;
  box.innerHTML = "";
  if (!state.data) return;
  const tags = new Set(list.map((p) => p.alliance).filter(Boolean));
  const first = el("div", "kpi lead");
  first.append(el("span", "k-l", tr("kPlayers")), el("b", "k-v", numFmt().format(list.length)),
    el("span", "k-a", `${numFmt().format(tags.size)} ${tr("kAlliances")}`));
  box.appendChild(first);
  for (const k of KPIS) {
    const a = agg(list, k.get), d = el("div", "kpi");
    const v = el("b", "k-v", short(a.sum));
    v.title = full(a.sum);
    const avg = el("span", "k-a", `${tr("kAvg")} ${short(a.avg)}`);
    avg.title = full(a.avg);
    d.append(el("span", "k-l", k.label()), v, avg);
    box.appendChild(d);
  }
}

// ---- alliances ----
// one line per alliance of the players listed (search + power step; not the alliance picker, which this view sets)
function allianceStats() {
  const q = state.q.trim().toLowerCase(), groups = new Map();
  for (const p of state.rows) {
    if (q && !p._s.includes(q)) continue;
    const k = p.alliance || "";
    (groups.get(k) || groups.set(k, []).get(k)).push(p);
  }
  const total = agg(state.rows, (p) => p.power).sum || 1;
  return [...groups].map(([tag, ps]) => {
    const pw = agg(ps, (p) => p.power), pmax = agg(ps, (p) => p.powerMax), mer = agg(ps, (p) => p.merits);
    const top = ps.reduce((a, b) => ((b.power ?? 0) > (a.power ?? 0) ? b : a));
    return {
      tag, members: ps.length, power: pw.sum, avgPower: pw.avg, top, powerMax: pmax.sum, merits: mer.sum,
      meritRatio: mer.sum != null && pmax.sum ? (100 * mer.sum) / pmax.sum : undefined,
      kills: agg(ps, (p) => p.kills).sum, deaths: agg(ps, (p) => p.deaths).sum, heals: agg(ps, (p) => p.heals).sum,
      helps: agg(ps, (p) => p.helps).sum, gather: agg(ps, gathered).sum, migration: agg(ps, (p) => p.migrationScore).avg,
      share: pw.sum != null ? pw.sum / total : 0, players: ps,
    };
  });
}

const A_COLS = [
  { key: "tag", t: "aTag", text: true },
  { key: "members", t: "aMembers", f: (v) => numFmt().format(v) },
  { key: "power", t: "aPower", share: true },
  { key: "avgPower", t: "aAvgPower" },
  { key: "top", t: "aTop", text: true, sortBy: (a) => a.top.power ?? 0 },
  { key: "powerMax", t: "aPowerMax" },
  { key: "merits", t: "aMerits" },
  { key: "meritRatio", t: "aMeritRatio", f: (v) => numFmt(2).format(v) + "%" },
  { key: "kills", t: "aKills" },
  { key: "deaths", t: "aDeaths" },
  { key: "heals", t: "aHeals" },
  { key: "helps", t: "aHelps" },
  { key: "gather", t: "aGather" },
  { key: "migration", t: "aMigration", f: (v) => numFmt(1).format(v) },
];
let aSort = { key: "power", dir: -1 };

function drawAlliances() {
  const panel = $("panel");
  panel.innerHTML = "";
  if (!state.data) return;
  const rows = allianceStats();
  const col = A_COLS.find((c) => c.key === aSort.key) || A_COLS[2];
  const sortVal = col.sortBy || ((a) => a[col.key]);
  rows.sort((a, b) => {
    const x = sortVal(a), y = sortVal(b);
    if (x == null) return y == null ? 0 : 1;
    if (y == null) return -1;
    return (typeof x === "string" ? x.localeCompare(y) : x - y) * aSort.dir || (b.power ?? 0) - (a.power ?? 0);
  });
  panel.appendChild(el("p", "hint mut", tr("aHint")));
  const wrap = el("div", "tbl-wrap"), t = el("table", "tbl");
  const hr = el("tr");
  for (const c of A_COLS) {
    const th = el("th", c.text ? "" : "n", tr(c.t));
    if (aSort.key === c.key) { th.classList.add("on"); th.dataset.dir = aSort.dir > 0 ? "▲" : "▼"; }
    th.onclick = () => { aSort = aSort.key === c.key ? { key: c.key, dir: -aSort.dir } : { key: c.key, dir: c.text ? 1 : -1 }; drawAlliances(); };
    hr.appendChild(th);
  }
  t.appendChild(el("thead")).appendChild(hr);
  const tb = t.appendChild(el("tbody"));
  rows.forEach((a, i) => {
    const r = el("tr");
    if (state.alliance && (state.alliance === a.tag || (state.alliance === "-" && !a.tag))) r.classList.add("sel");
    for (const c of A_COLS) {
      const td = el("td", c.text ? "" : "n");
      if (c.key === "tag") {
        td.append(el("span", "a-i", String(i + 1)), el("b", "", a.tag || tr("aNone")));
      } else if (c.key === "top") {
        td.textContent = a.top.name ?? "";
        td.title = `${a.top.name ?? ""} · ${full(a.top.power)}`;
      } else {
        const v = a[c.key];
        td.textContent = v == null ? "–" : c.f ? c.f(v) : short(v);
        if (v != null && !c.f) td.title = full(v);
        if (c.share) { // the alliance's share of the kingdom's power, as a thin bar under the number
          const bar = el("i", "share");
          bar.style.width = (100 * a.share).toFixed(1) + "%";
          td.title += ` · ${numFmt(1).format(100 * a.share)}% ${tr("aShare").toLowerCase()}`;
          td.appendChild(bar);
        }
      }
      r.appendChild(td);
    }
    r.onclick = () => { KS.setAlliance(a.tag || "-"); KS.setMode("players"); };
    tb.appendChild(r);
  });
  wrap.appendChild(t);
  panel.appendChild(wrap);
}

// ---- chart: horizontal bars of one metric ----
const CHART_SKIP = new Set(["rank", "id", "faction", "cityLevel", "allianceRank", "lastLogin"]);
const chart = Object.assign({ metric: "power", scope: "players", agg: "sum", top: 30, dir: -1 }, KS.store.get("chart", {}));

function metricList() {
  return COLUMNS.filter((c) => !CHART_SKIP.has(c.key) && (c.type === "num" || c.type === "int" || c.type === "pct"));
}

function select(opts, val, on) {
  const s = el("select");
  for (const [v, t] of opts) { const o = el("option", "", t); o.value = v; s.appendChild(o); }
  s.value = String(val);
  s.onchange = () => { on(s.value); KS.store.set("chart", chart); drawChart(); };
  return s;
}

function drawChart() {
  const panel = $("panel");
  panel.innerHTML = "";
  if (!state.data) return;
  const metrics = metricList();
  if (!metrics.some((c) => c.key === chart.metric)) chart.metric = "power";
  const c = KS.BY_KEY[chart.metric];
  const bar = el("div", "ctl");
  const lab = (t, node) => { const l = el("label", "ctl-f"); l.append(el("span", "mut", tr(t)), node); return l; };
  bar.append(
    lab("cMetric", select(metrics.map((m) => [m.key, KS.label(m.tip || m)]), chart.metric, (v) => (chart.metric = v))),
    lab("cScope", select([["players", tr("cScopeP")], ["alliances", tr("cScopeA")]], chart.scope, (v) => (chart.scope = v))),
  );
  if (chart.scope === "alliances" && c.type !== "pct")
    bar.append(lab("cAgg", select([["sum", tr("cSum")], ["avg", tr("cAvg")]], chart.agg, (v) => (chart.agg = v))));
  bar.append(
    lab("cTop", select([[20, "20"], [30, "30"], [50, "50"], [100, "100"], [0, tr("cAll")]], chart.top, (v) => (chart.top = Number(v)))),
    lab("cOrder", select([[-1, tr("cDesc")], [1, tr("cAsc")]], chart.dir, (v) => (chart.dir = Number(v)))),
  );
  panel.appendChild(bar);

  // the items: players of the list, or alliances (their total / average; a % column always averages)
  let items;
  if (chart.scope === "players") {
    items = state.view.map((p) => ({ name: p.name ?? String(p.id), sub: p.alliance || "", v: KS.value(c, p) }));
  } else {
    const groups = new Map();
    for (const p of state.view) { const k = p.alliance || ""; (groups.get(k) || groups.set(k, []).get(k)).push(p); }
    const avg = chart.agg === "avg" || c.type === "pct";
    items = [...groups].map(([tag, ps]) => {
      const a = agg(ps, (p) => KS.value(c, p));
      return { name: tag || tr("aNone"), sub: `${ps.length} ${tr("players")}`, v: avg ? a.avg : a.sum };
    });
  }
  items = items.filter((x) => typeof x.v === "number" && !Number.isNaN(x.v));
  items.sort((a, b) => (a.v - b.v) * chart.dir);
  if (chart.top) items = items.slice(0, chart.top);
  if (!items.length) { panel.appendChild(el("p", "hint mut", tr("cEmpty"))); return; }

  const max = Math.max(...items.map((x) => Math.abs(x.v))) || 1;
  const list = el("ol", "bars");
  items.forEach((x, i) => {
    const li = el("li", i < 3 && chart.dir < 0 ? "top" : "");
    const name = el("span", "b-n");
    name.append(el("span", "b-i", String(i + 1)), el("span", "b-t", x.name));
    if (x.sub) name.appendChild(el("small", "mut", x.sub));
    name.title = x.name;
    const track = el("span", "b-track"), fill = el("i", "b-fill");
    fill.style.width = ((100 * Math.abs(x.v)) / max).toFixed(2) + "%";
    track.appendChild(fill);
    const val = el("span", "b-v", c.type === "pct" ? numFmt(2).format(x.v) + "%" : c.type === "int" ? numFmt().format(x.v) : short(x.v));
    val.title = full(x.v);
    li.append(name, track, val);
    list.appendChild(li);
  });
  panel.appendChild(list);
}

KS.views = { alliances: drawAlliances, chart: drawChart };
// after every change of the list (filters, sort, language, kingdom): the strip, and the view on screen
KS.onRefresh = () => {
  drawKpis();
  if (state.mode !== "players") KS.views[state.mode]?.();
};
})();
