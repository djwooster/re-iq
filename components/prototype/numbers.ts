/**
 * The numbers behind the prototype: one monthly operating model per property,
 * December 2025 through November 2026. Every table, KPI, and exception reads
 * from here, so a figure on the Overview matches the same figure on the
 * property, the exception, and the owner report.
 *
 * Self-contained on purpose (no imports) so it can be checked with plain Node.
 */

export const MONTHS = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"] as const;
export const MONTH_LONG = ["December 2025", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November"];
export const LAST = MONTHS.length - 1;
export const OCT = LAST - 1;

// ---- Deterministic noise ----

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10_000) / 10_000;
}
/** Centered noise in [-1, 1]. */
const wiggle = (key: string) => hash(key) * 2 - 1;

// ---- Profiles ----

interface Profile {
  units: number;
  floors: number;
  /** Average market rent per unit, November. */
  rent: number;
  occ: number;
  ltl: number;
  conc: number;
  badDebt: number;
  /** Other income per unit per month. */
  other: number;
  /** Repairs and maintenance per unit per month. */
  rm: number;
  budget: { occ: number; ltl: number; conc: number; badDebt: number };
  exposure: number;
  collection: number;
  delinquency: number;
  daysToTurn: number;
  retention: number;
  tradeOut: number;
  dscr: number;
  rate: number;
  cap: number;
  /** Underwriting NOI relative to budget. */
  underwriting: number;
  /** The month the latest package covers. */
  through: number;
  /** Reports missing from November's package. */
  missing?: string[];
}

const BASE = { conc: 0.006, badDebt: 0.008, other: 64, rm: 55, exposure: 0.061, collection: 0.982, delinquency: 0.016, daysToTurn: 7.4, retention: 0.55, tradeOut: 0.024, rate: 0.0565, cap: 0.0550, underwriting: 1, through: LAST };
const BUDGET = { occ: 0.95, ltl: 0.03, conc: 0.007, badDebt: 0.008 };

export const PROFILES: Record<string, Profile> = {
  a: { ...BASE, units: 192, floors: 4, rent: 1625, occ: 0.948, ltl: 0.028, rm: 55, budget: BUDGET, dscr: 1.62, underwriting: 1.02 },
  b: { ...BASE, units: 168, floors: 4, rent: 1540, occ: 0.935, ltl: 0.027, budget: { ...BUDGET, occ: 0.94 }, dscr: 1.55, exposure: 0.072, tradeOut: 0.021, underwriting: 1.05 },
  c: { ...BASE, units: 144, floors: 3, rent: 1480, occ: 0.951, ltl: 0.027, budget: BUDGET, dscr: 1.71, cap: 0.0575 },
  d: { ...BASE, units: 216, floors: 4, rent: 1710, occ: 0.944, ltl: 0.03, budget: BUDGET, exposure: 0.094, dscr: 1.58, retention: 0.47 },
  e: { ...BASE, units: 180, floors: 4, rent: 1395, occ: 0.953, ltl: 0.024, badDebt: 0.021, budget: BUDGET, collection: 0.956, delinquency: 0.041, dscr: 1.49, cap: 0.0575 },
  f: { ...BASE, units: 240, floors: 4, rent: 1580, occ: 0.942, ltl: 0.03, conc: 0.009, budget: BUDGET, dscr: 1.31, rate: 0.0712, underwriting: 1.03 },
  g: { ...BASE, units: 156, floors: 4, rent: 1660, occ: 0.962, ltl: 0.068, budget: { ...BUDGET, occ: 0.945, ltl: 0.045 }, dscr: 1.66, tradeOut: 0.011, retention: 0.63 },
  h: { ...BASE, units: 228, floors: 4, rent: 1820, occ: 0.968, ltl: 0.02, budget: { ...BUDGET, occ: 0.945 }, dscr: 1.84, exposure: 0.048, tradeOut: 0.041, cap: 0.0525, underwriting: 0.96 },
  i: { ...BASE, units: 132, floors: 3, rent: 1450, occ: 0.949, ltl: 0.028, budget: BUDGET, dscr: 1.6, missing: ["AR aging"] },
  j: { ...BASE, units: 204, floors: 4, rent: 1590, occ: 0.946, ltl: 0.029, budget: BUDGET, dscr: 1.52 },
  k: { ...BASE, units: 120, floors: 4, rent: 1510, occ: 0.935, ltl: 0.027, budget: BUDGET, daysToTurn: 12.6, dscr: 1.57, through: OCT },
  l: { ...BASE, units: 176, floors: 4, rent: 1690, occ: 0.957, ltl: 0.025, budget: BUDGET, dscr: 1.69, exposure: 0.055, retention: 0.58 },
};

export const profile = (id: string) => PROFILES[id];
export const unitsPerFloor = (id: string) => PROFILES[id].units / PROFILES[id].floors;
export const TOTAL_UNITS = Object.values(PROFILES).reduce((s, p) => s + p.units, 0);

// ---- Monthly P&L ----

export const REVENUE_LINES = ["Gross potential rent", "Vacancy", "Loss to lease", "Concessions", "Bad debt", "Other income"] as const;
export const EXPENSE_LINES = ["Payroll", "Repairs & maintenance", "Turnover", "Utilities", "Marketing", "Administrative", "Management fee", "Insurance", "Property taxes"] as const;
export type Line = (typeof REVENUE_LINES)[number] | (typeof EXPENSE_LINES)[number];

/** Deductions from rent are stored negative so a P&L column sums straight down. */
export interface Month {
  lines: Record<Line, number>;
  egi: number;
  opex: number;
  noi: number;
}

/** Budgeted expense per unit per month. Management fee is 3% of EGI. */
const EXPENSE_BUDGET: Record<Exclude<Line, (typeof REVENUE_LINES)[number] | "Management fee">, number> = {
  Payroll: 118,
  "Repairs & maintenance": 55,
  Turnover: 24,
  Utilities: 61,
  Marketing: 11,
  Administrative: 26,
  Insurance: 54,
  "Property taxes": 188,
};

/** Seasonal shape for occupancy: softer in winter, firmer in summer. */
const SEASON = [-0.006, -0.008, -0.006, -0.003, 0, 0.003, 0.005, 0.005, 0.003, 0.001, -0.001, 0];

function build(rev: { gpr: number; occ: number; ltl: number; conc: number; badDebt: number; other: number }, exp: Record<string, number>): Month {
  const lines = {
    "Gross potential rent": rev.gpr,
    Vacancy: -rev.gpr * (1 - rev.occ),
    "Loss to lease": -rev.gpr * rev.ltl,
    Concessions: -rev.gpr * rev.conc,
    "Bad debt": -rev.gpr * rev.badDebt,
    "Other income": rev.other,
  } as Record<Line, number>;
  const egi = REVENUE_LINES.reduce((s, l) => s + lines[l], 0);
  for (const [l, v] of Object.entries(exp)) lines[l as Line] = v;
  lines["Management fee"] = egi * 0.03;
  const opex = EXPENSE_LINES.reduce((s, l) => s + lines[l], 0);
  return { lines, egi, opex, noi: egi - opex };
}

/** Story-specific overrides, by property and month index. */
function rmFactor(id: string, m: number) {
  if (id === "a") return m >= 9 ? [1.31, 1.38, 1.46][m - 9] : 1 + wiggle(`a-rm-${m}`) * 0.04;
  return 1 + wiggle(`${id}-rm-${m}`) * 0.08;
}

function actualMonth(id: string, m: number): Month {
  const p = PROFILES[id];
  const growth = 1 - 0.0028 * (LAST - m);
  const gpr = p.units * p.rent * growth;
  const drift = m === LAST ? 0 : wiggle(`${id}-occ-${m}`) * 0.004;
  const occ = Math.min(0.985, p.occ + SEASON[m] - SEASON[LAST] + drift);
  const badDebt = id === "e" ? [0.008, 0.009, 0.008, 0.01, 0.009, 0.011, 0.012, 0.013, 0.015, 0.017, 0.019, 0.021][m] : p.badDebt;
  const ltl = id === "g" ? 0.048 + (0.02 * m) / LAST : p.ltl + (m === LAST ? 0 : wiggle(`${id}-ltl-${m}`) * 0.003);
  const exp: Record<string, number> = {};
  for (const [l, v] of Object.entries(EXPENSE_BUDGET)) {
    const f = l === "Repairs & maintenance" ? rmFactor(id, m) : 1 + wiggle(`${id}-${l}-${m}`) * (l === "Property taxes" || l === "Insurance" ? 0.005 : 0.035);
    exp[l] = p.units * v * f * (l === "Turnover" && id === "k" ? 1.18 : 1);
  }
  return build({ gpr, occ, ltl, conc: p.conc, badDebt, other: p.units * p.other * growth }, exp);
}

function budgetMonth(id: string, m: number): Month {
  const p = PROFILES[id];
  const growth = 1 - 0.0025 * (LAST - m);
  const gpr = p.units * p.rent * 0.996 * growth;
  const exp: Record<string, number> = {};
  for (const [l, v] of Object.entries(EXPENSE_BUDGET)) exp[l] = p.units * v;
  return build({ gpr, occ: p.budget.occ + SEASON[m] - SEASON[LAST], ltl: p.budget.ltl, conc: p.budget.conc, badDebt: p.budget.badDebt, other: p.units * BASE.other }, exp);
}

const scale = (x: Month, f: number): Month => ({
  lines: Object.fromEntries(Object.entries(x.lines).map(([k, v]) => [k, v * f])) as Record<Line, number>,
  egi: x.egi * f,
  opex: x.opex * f,
  noi: x.noi * f,
});

/** Prior year: the same month a year earlier, about 3.5% lower on revenue. */
function priorMonth(id: string, m: number): Month {
  const a = actualMonth(id, m);
  const f = 1 / (1.035 + wiggle(`${id}-py-${m}`) * 0.01);
  const e = 1 / (1.03 + wiggle(`${id}-pye-${m}`) * 0.01);
  const lines = { ...a.lines };
  for (const l of REVENUE_LINES) lines[l] *= f;
  for (const l of EXPENSE_LINES) lines[l] *= e;
  const egi = REVENUE_LINES.reduce((s, l) => s + lines[l], 0);
  const opex = EXPENSE_LINES.reduce((s, l) => s + lines[l], 0);
  return { lines, egi, opex, noi: egi - opex };
}

const memo = new Map<string, Month>();
const cached = (key: string, fn: () => Month) => {
  let v = memo.get(key);
  if (!v) memo.set(key, (v = fn()));
  return v;
};

export type Basis = "Actual" | "Budget" | "Prior year" | "Underwriting";

export function month(id: string, m: number, basis: Basis = "Actual"): Month {
  return cached(`${id}:${m}:${basis}`, () => {
    if (basis === "Actual") return actualMonth(id, m);
    if (basis === "Budget") return budgetMonth(id, m);
    if (basis === "Prior year") return priorMonth(id, m);
    return scale(budgetMonth(id, m), PROFILES[id].underwriting);
  });
}

/** Has this property reported month m? Manager 4's November package is late. */
export const reported = (id: string, m: number) => m <= PROFILES[id].through;

// ---- Periods ----

export type Period = "Month" | "YTD" | "T-3" | "T-12";

/** Month indexes in a period ending November. YTD is January through November. */
export function periodMonths(period: Period, end = LAST): number[] {
  const n = { Month: 1, "T-3": 3, YTD: 11, "T-12": 12 }[period];
  return Array.from({ length: n }, (_, i) => end - n + 1 + i).filter((m) => m >= 0);
}

const sumMonths = (ms: Month[]): Month => {
  const lines = Object.fromEntries([...REVENUE_LINES, ...EXPENSE_LINES].map((l) => [l, ms.reduce((s, x) => s + x.lines[l], 0)])) as Record<Line, number>;
  return { lines, egi: ms.reduce((s, x) => s + x.egi, 0), opex: ms.reduce((s, x) => s + x.opex, 0), noi: ms.reduce((s, x) => s + x.noi, 0) };
};

/**
 * One property over a period. Months the property hasn't reported are left
 * out of both sides, so a late package never reads as a variance.
 */
export function periodTotal(id: string, period: Period, basis: Basis = "Actual"): Month | null {
  const ms = periodMonths(period).filter((m) => reported(id, m));
  if (!ms.length) return null;
  return sumMonths(ms.map((m) => month(id, m, basis)));
}

export function portfolioTotal(ids: string[], period: Period, basis: Basis = "Actual") {
  return sumMonths(ids.map((id) => periodTotal(id, period, basis)).filter((x): x is Month => !!x));
}

// ---- Operating KPIs (latest reported month) ----

export interface Kpis {
  occupancy: number;
  economic: number;
  leased: number;
  exposure: number;
  ltl: number;
  collection: number | null;
  delinquency: number | null;
  badDebt: number;
  expenseRatio: number;
  costPerUnit: number;
  retention: number;
  daysToTurn: number;
  tradeOut: number;
  dscr: number;
  noi: number;
  noiBudget: number;
}

export function kpis(id: string, m = PROFILES[id].through): Kpis {
  const p = PROFILES[id];
  const a = month(id, m);
  const b = month(id, m, "Budget");
  const gpr = a.lines["Gross potential rent"];
  const occ = (a.lines.Vacancy + gpr) / gpr;
  const noAr = m === LAST && p.missing?.includes("AR aging");
  const t12 = periodTotal(id, "T-12")!;
  return {
    occupancy: occ,
    economic: (gpr + a.lines.Vacancy + a.lines["Loss to lease"] + a.lines.Concessions + a.lines["Bad debt"]) / gpr,
    leased: occ + 0.018 - (p.exposure - BASE.exposure) * 0.4,
    exposure: p.exposure,
    ltl: -a.lines["Loss to lease"] / gpr,
    collection: noAr ? null : p.collection,
    delinquency: noAr ? null : p.delinquency,
    badDebt: -a.lines["Bad debt"] / gpr,
    expenseRatio: a.opex / a.egi,
    costPerUnit: t12.opex / p.units,
    retention: p.retention,
    daysToTurn: p.daysToTurn,
    tradeOut: p.tradeOut,
    dscr: p.dscr,
    noi: a.noi,
    noiBudget: b.noi,
  };
}

/** One KPI across the twelve months, for sparklines and trend charts. */
export function series(id: string, pick: (k: Kpis, m: number) => number | null) {
  return MONTHS.map((label, m) => ({ month: label, value: reported(id, m) ? pick(kpis(id, m), m) : null }));
}

// ---- Debt and value ----

export function debt(id: string) {
  const p = PROFILES[id];
  const noi12 = periodTotal(id, "T-12")!.noi;
  const service = noi12 / p.dscr;
  const balance = service / (p.rate + 0.012);
  const value = noi12 / p.cap;
  return { noi12, service, balance, rate: p.rate, value, ltv: balance / value, debtYield: noi12 / balance, cushion: p.dscr - 1.25 };
}

/** T-12 DSCR at each month, for the covenant trend. */
export function dscrSeries(id: string) {
  const p = PROFILES[id];
  return MONTHS.map((label, m) => {
    if (id !== "f") return { month: label, value: p.dscr + wiggle(`${id}-dscr-${m}`) * 0.03 + (LAST - m) * 0.004 };
    const v = m < 9 ? 1.52 + wiggle(`f-dscr-${m}`) * 0.02 : [1.41, 1.36, 1.31][m - 9];
    return { month: label, value: v };
  });
}

// ---- Units ----

export type UnitStatus = "Classic" | "In renovation" | "Renovated vacant" | "Renovated leased";
export type Occupancy = "Occupied" | "Vacant" | "Notice to vacate" | "Vacant, not ready";

/** Property B's eight pilot units. Everything else is classic. */
export const PILOT: Record<string, UnitStatus> = {
  "105": "Renovated leased",
  "112": "Renovated leased",
  "204": "Renovated leased",
  "207": "Renovated leased",
  "302": "Renovated leased",
  "210": "Renovated vacant",
  "306": "Renovated vacant",
  "311": "In renovation",
};

const NOTICE: Record<string, string[]> = { d: ["204", "206", "305", "307"] };
const NOT_READY: Record<string, string[]> = { k: ["102", "106", "201", "403"] };
export const DELINQUENT: Record<string, Record<string, { balance: number; bucket: string }>> = {
  e: { "108": { balance: 2_865, bucket: "61–90 days" }, "203": { balance: 3_120, bucket: "61–90 days" }, "305": { balance: 2_790, bucket: "61–90 days" } },
};

export const FLOOR_PLANS = [
  { name: "1A", beds: "1 bd / 1 ba", sf: 690, rel: 0.86 },
  { name: "1B", beds: "1 bd / 1 ba", sf: 760, rel: 0.93 },
  { name: "2A", beds: "2 bd / 2 ba", sf: 1040, rel: 1.12 },
  { name: "2B", beds: "2 bd / 2 ba", sf: 1120, rel: 1.19 },
] as const;

export function unitNumbers(id: string) {
  const per = unitsPerFloor(id);
  return Array.from({ length: PROFILES[id].floors }, (_, f) => PROFILES[id].floors - f).flatMap((f) => Array.from({ length: per }, (_, i) => `${f}${String(i + 1).padStart(2, "0")}`));
}

export function unit(id: string, num: string) {
  const p = PROFILES[id];
  const n = Number(num.slice(1));
  const plan = FLOOR_PLANS[n % 4];
  const status: UnitStatus = id === "b" ? (PILOT[num] ?? "Classic") : "Classic";
  const market = Math.round((p.rent * plan.rel * (status.startsWith("Renovated") ? 1 : 1)) / 5) * 5 + (status.startsWith("Renovated") ? 142 : 0);
  const h = hash(`${id}-${num}`);
  let occupancy: Occupancy = h < p.occ ? "Occupied" : "Vacant";
  if (NOTICE[id]?.includes(num)) occupancy = "Notice to vacate";
  if (NOT_READY[id]?.includes(num)) occupancy = "Vacant, not ready";
  if (status === "In renovation" || status === "Renovated vacant") occupancy = "Vacant";
  if (status === "Renovated leased" || DELINQUENT[id]?.[num]) occupancy = "Occupied";
  const vacant = occupancy.startsWith("Vacant");
  const gap = id === "g" && ["103", "108", "208", "302"].includes(num) ? 0.11 : p.ltl * (0.4 + hash(`${id}-${num}-g`) * 1.2);
  const leaseRent = vacant ? null : Math.round((market * (1 - gap)) / 5) * 5;
  const start = 1 + Math.floor(hash(`${id}-${num}-s`) * 12);
  return {
    num,
    plan,
    status,
    occupancy,
    market,
    leaseRent,
    balance: DELINQUENT[id]?.[num]?.balance ?? (vacant ? 0 : hash(`${id}-${num}-b`) < 0.08 ? Math.round(hash(`${id}-${num}-bb`) * 900) : 0),
    leaseStart: vacant ? null : `${start > 11 ? 2025 : 2026}-${String(start > 11 ? 12 : start).padStart(2, "0")}-01`,
    leaseEnd: vacant ? null : `${start > 11 ? 2026 : 2027}-${String(start > 11 ? 12 : start).padStart(2, "0")}-01`,
  };
}

export const unitCounts = (id: string) => {
  const us = unitNumbers(id).map((u) => unit(id, u));
  return { occupied: us.filter((u) => u.occupancy === "Occupied" || u.occupancy === "Notice to vacate").length, total: us.length };
};
