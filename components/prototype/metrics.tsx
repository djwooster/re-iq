import { formatCurrency, formatCurrencyShort, formatPercent, formatPoints, formatSignedPercent, formatVariance, formatVarianceShort } from "@/lib/format";
import { LAST, MONTHS, debt, kpis, month, periodTotal, portfolioTotal, profile, reported, series, type Basis, type Period } from "./numbers";
import { PROPERTIES } from "./seed";

/** Figures the screens show, worked out from numbers.ts in one place. */

export const fmt = {
  usd: formatCurrency,
  usdShort: formatCurrencyShort,
  delta: formatVariance,
  deltaShort: formatVarianceShort,
  pct: (v: number, digits = 1) => formatPercent(v, digits),
  signedPct: formatSignedPercent,
  pts: formatPoints,
  x: (v: number) => `${v.toFixed(2)}x`,
  days: (v: number) => `${v.toFixed(1)} days`,
  int: (v: number) => Math.round(v).toLocaleString("en-US"),
};

export type Compare = Exclude<Basis, "Actual">;

const ids = PROPERTIES.map((p) => p.id);

/** NOI for one property against the chosen comparison. Null when nothing's reported. */
export function noiVs(id: string, period: Period, compare: Compare) {
  const a = periodTotal(id, period);
  const b = periodTotal(id, period, compare);
  if (!a || !b) return null;
  return { actual: a.noi, plan: b.noi, variance: a.noi - b.noi, pct: a.noi / b.noi - 1 };
}

export function portfolioNoi(period: Period, compare: Compare) {
  const a = portfolioTotal(ids, period);
  const b = portfolioTotal(ids, period, compare);
  return { actual: a.noi, plan: b.noi, variance: a.noi - b.noi, pct: a.noi / b.noi - 1, egi: a.egi, opex: a.opex };
}

/** Properties whose November package is in. */
export const reporting = () => ids.filter((id) => reported(id, LAST));

const weighted = (pick: (id: string) => number | null, among = reporting()) => {
  const rows = among.map((id) => ({ v: pick(id), u: profile(id).units })).filter((r): r is { v: number; u: number } => r.v !== null);
  const units = rows.reduce((s, r) => s + r.u, 0);
  return rows.reduce((s, r) => s + r.v * r.u, 0) / units;
};

export type Status = "ok" | "watch" | "breach";

/** Portfolio KPIs for the latest month, unit-weighted, with their 12-month trend. */
export function portfolioKpis() {
  const trend = (pick: (id: string, m: number) => number | null) =>
    MONTHS.map((month, m) => {
      const rows = ids.filter((id) => reported(id, m)).map((id) => ({ v: pick(id, m), u: profile(id).units })).filter((r): r is { v: number; u: number } => r.v !== null);
      const units = rows.reduce((s, r) => s + r.u, 0);
      return { month, value: units ? rows.reduce((s, r) => s + r.v * r.u, 0) / units : null };
    });
  const occ = weighted((id) => kpis(id).occupancy);
  const econ = weighted((id) => kpis(id).economic);
  const exposure = weighted((id) => kpis(id).exposure);
  const leased = weighted((id) => kpis(id).leased);
  const collection = weighted((id) => kpis(id).collection);
  const service = ids.reduce((s, id) => s + debt(id).service, 0);
  const noi12 = ids.reduce((s, id) => s + debt(id).noi12, 0);
  const dscr = noi12 / service;
  return {
    occupancy: { value: occ, status: (occ < 0.93 ? "breach" : occ > 0.96 ? "watch" : "ok") as Status, trend: trend((id, m) => kpis(id, m).occupancy) },
    economic: { value: econ, gap: occ - econ, status: (occ - econ > 0.05 ? "breach" : "ok") as Status, trend: trend((id, m) => kpis(id, m).economic) },
    leased: { value: leased, exposure, status: (exposure > 0.08 ? "breach" : "ok") as Status, trend: trend((id, m) => kpis(id, m).leased) },
    collection: { value: collection, status: (collection < 0.97 ? "breach" : "ok") as Status, excluded: ids.filter((id) => reported(id, LAST) && kpis(id).collection === null) },
    dscr: { value: dscr, status: (dscr < 1.35 ? "watch" : "ok") as Status, lowest: ids.map((id) => ({ id, dscr: profile(id).dscr })).sort((a, b) => a.dscr - b.dscr)[0] },
  };
}

/** Portfolio NOI by month against the comparison, counting only properties that reported. */
export function noiTrend(compare: Compare) {
  return MONTHS.map((label, m) => {
    const among = ids.filter((id) => reported(id, m));
    const sum = (b: Basis) => among.reduce((s, id) => s + month(id, m, b).noi, 0);
    return { month: label, actual: sum("Actual"), plan: sum(compare) };
  });
}

/** One property's scorecard values with status against Brian's targets. */
export function scorecard(id: string) {
  const k = kpis(id);
  const d = debt(id);
  const n = noiVs(id, "Month", "Budget");
  const st = (bad: boolean, near = false): Status => (bad ? "breach" : near ? "watch" : "ok");
  const s = (pick: Parameters<typeof series>[1]) => series(id, pick);
  return [
    { kpi: "Net operating income", value: n ? fmt.usd(n.actual) : "–", sub: n && <SubDelta v={n.pct} />, status: st(!!n && n.pct < -0.03), trend: s((x) => x.noi) },
    { kpi: "Effective gross income", value: fmt.usd(periodTotal(id, "Month")!.egi), status: st(false), trend: s((_, m) => month(id, m).egi) },
    { kpi: "Physical occupancy", value: fmt.pct(k.occupancy), status: st(k.occupancy < 0.93, k.occupancy > 0.965), trend: s((x) => x.occupancy) },
    { kpi: "Economic occupancy", value: fmt.pct(k.economic), sub: <span className="text-fg-3">{fmt.pts(k.economic - k.occupancy)} vs. physical</span>, status: st(k.occupancy - k.economic > 0.05), trend: s((x) => x.economic) },
    { kpi: "Leased % / 60-day exposure", value: `${fmt.pct(k.leased)} / ${fmt.pct(k.exposure)}`, status: st(k.exposure > 0.08), trend: s((x) => x.leased) },
    { kpi: "Loss to lease", value: fmt.pct(k.ltl), status: st(k.ltl > 0.05), trend: s((x) => x.ltl) },
    { kpi: "Collection rate", value: k.collection === null ? "Not received" : fmt.pct(k.collection), status: st(k.collection !== null && k.collection < 0.97), trend: s((x) => x.collection) },
    { kpi: "Bad debt %", value: fmt.pct(k.badDebt), status: st(k.badDebt > 0.02, k.badDebt > 0.01), trend: s((x) => x.badDebt) },
    { kpi: "Expense ratio", value: fmt.pct(k.expenseRatio), status: st(false), trend: s((x) => x.expenseRatio) },
    { kpi: "Cost per unit", value: `${fmt.usd(k.costPerUnit)}/yr`, status: st(false) },
    { kpi: "Retention rate", value: fmt.pct(k.retention), status: st(k.retention < 0.5, k.retention > 0.6) },
    { kpi: "Days to turn", value: fmt.days(k.daysToTurn), status: st(k.daysToTurn > 10) },
    { kpi: "Trade-out %", value: fmt.signedPct(k.tradeOut), status: st(k.tradeOut < 0) },
    { kpi: "DSCR", value: fmt.x(k.dscr), sub: <span className="text-fg-3">{fmt.x(d.cushion)} cushion</span>, status: st(k.dscr < 1.25, k.dscr < 1.35) },
  ];
}

function SubDelta({ v }: { v: number }) {
  return <span className={v >= 0 ? "num text-favorable" : "num text-unfavorable"}>{fmt.signedPct(v)} vs. budget</span>;
}
