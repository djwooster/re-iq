import { LATEST_MONTH, TODAY, addMonths, compareMonths, monthOf, monthRange, periodMonths } from "@/lib/dates";
import type { GlCategory, Period, PropertyManager, PropertyPerformance, PropertyRecord } from "@/lib/types";
import { combineFinancials, delay, occupancyMetrics, occupancyParts, propertyPerformance, propertyRecords, sumFinancials } from "./core";
import { listIssues, type Issue } from "./issues";
import { loans, propertyManagers, renewalRates } from "./mock/catalog";

/**
 * Manager scorecards. Fair measures come first: each manager against their
 * own properties' budgets, and which way that's moving. Raw numbers follow
 * with the context (class, age, market) a person needs to judge them.
 */

/** Expenses a property manager controls. Taxes, insurance, and management fees are excluded. */
export const CONTROLLABLE: GlCategory[] = ["payroll", "repairs_maintenance", "turnover", "utilities", "contract_services", "marketing", "administrative"];

/** Change in NOI-vs-budget between the last 6 months and the 6 before, in points, below which a trend reads as steady. */
const TREND_STEADY = 0.01;

export interface Measures {
  noi_vs_budget: number;
  controllable_vs_budget: number;
  /** NOI vs budget, last 6 months minus the 6 before. Positive is improving. */
  trend: number;
  trend_label: "Improving" | "Declining" | "Steady";
  physical: number;
  economic: number;
  delinquency: number;
  renewal_rate: number;
  noi_variance: number;
}

function measures(records: PropertyRecord[], perf: PropertyPerformance[]): Measures {
  const f = combineFinancials(perf.map((p) => p.financials), perf[0]?.financials.period ?? "qtd", perf[0]?.financials.months ?? []);
  const parts = perf.map((p) => occupancyParts(p.property.id, p.property.units, p.financials.months.filter((m) => compareMonths(m, monthOf(p.property.data_through)) <= 0).at(-1) ?? monthOf(p.property.data_through)));
  const occ = occupancyMetrics(parts, f);
  const ctrl = CONTROLLABLE.reduce((s, c) => ({ a: s.a + f.byCategory[c].actual, b: s.b + f.byCategory[c].budget }), { a: 0, b: 0 });
  const window = (from: number, to: number) => {
    let a = 0;
    let b = 0;
    for (const r of records) {
      const end = monthOf(r.data_through);
      const months = monthRange(addMonths(end, from), addMonths(end, to));
      const x = sumFinancials(r.id, months, "ytd");
      a += x.noi.actual;
      b += x.noi.budget;
    }
    return a / b - 1;
  };
  const trend = window(-5, 0) - window(-11, -6);
  const units = records.reduce((s, r) => s + r.units, 0);
  return {
    noi_vs_budget: f.noi.actual / f.noi.budget - 1,
    controllable_vs_budget: (ctrl.b - ctrl.a) / ctrl.b,
    trend,
    trend_label: trend > TREND_STEADY ? "Improving" : trend < -TREND_STEADY ? "Declining" : "Steady",
    physical: occ.physical,
    economic: occ.economic,
    delinquency: occ.delinquency,
    renewal_rate: records.reduce((s, r) => s + (renewalRates[r.id] ?? 0) * r.units, 0) / units,
    noi_variance: f.noi.actual - f.noi.budget,
  };
}

export interface PropertyContext {
  classes: string;
  avg_age: number;
  markets: string;
  units: number;
}

function context(records: PropertyRecord[]): PropertyContext {
  const year = Number(TODAY.slice(0, 4));
  const count = (c: string) => records.filter((r) => r.class === c).length;
  return {
    classes: ["A", "B", "C"].filter((c) => count(c)).map((c) => `${count(c)} ${c}`).join(", "),
    avg_age: Math.round(records.reduce((s, r) => s + (year - r.year_built), 0) / records.length),
    markets: [...new Set(records.map((r) => r.market))].join(", "),
    units: records.reduce((s, r) => s + r.units, 0),
  };
}

export interface ManagerCard {
  manager: PropertyManager;
  property_ids: string[];
  measures: Measures;
  context: PropertyContext;
  open_issues: number;
  /** Set when some properties' latest reports haven't arrived. */
  data_through: string;
}

export async function getManagerScores(orgId: string, period: Period): Promise<ManagerCard[]> {
  await delay();
  const records = propertyRecords().filter((r) => r.org_id === orgId);
  const issues = await listIssues(orgId);
  return propertyManagers
    .filter((m) => records.some((r) => r.property_manager_id === m.id))
    .map((manager) => {
      const mine = records.filter((r) => r.property_manager_id === manager.id);
      return {
        manager,
        property_ids: mine.map((r) => r.id),
        measures: measures(mine, mine.map((r) => propertyPerformance(r, period))),
        context: context(mine),
        open_issues: issues.filter((i) => i.manager_id === manager.id && i.status !== "resolved").length,
        data_through: mine.map((r) => r.data_through).sort()[0],
      };
    });
}

export interface ManagerDetail {
  score: ManagerCard;
  properties: { property: PropertyRecord; measures: Measures }[];
  /** NOI vs budget by month for this manager and for the whole portfolio. */
  trend: { month: string; manager: number | null; portfolio: number | null }[];
  issues: Issue[];
}

export async function getManagerDetail(orgId: string, managerId: string, period: Period): Promise<ManagerDetail | null> {
  const scores = await getManagerScores(orgId, period);
  const score = scores.find((s) => s.manager.id === managerId);
  if (!score) return null;
  const records = propertyRecords().filter((r) => r.org_id === orgId);
  const mine = records.filter((r) => score.property_ids.includes(r.id));
  const pct = (rs: PropertyRecord[], month: string) => {
    const has = rs.filter((r) => compareMonths(month, monthOf(r.data_through)) <= 0);
    if (!has.length) return null;
    const a = has.reduce((s, r) => s + sumFinancials(r.id, [month], "mtd").noi.actual, 0);
    const b = has.reduce((s, r) => s + sumFinancials(r.id, [month], "mtd").noi.budget, 0);
    return a / b - 1;
  };
  const issues = (await listIssues(orgId)).filter((i) => i.manager_id === managerId);
  return {
    score,
    properties: mine.map((r) => ({ property: r, measures: measures([r], [propertyPerformance(r, period)]) })),
    trend: periodMonths("t12", LATEST_MONTH).map((m) => ({ month: m, manager: pct(mine, m), portfolio: pct(records, m) })),
    issues,
  };
}

// ---- Loans ---------------------------------------------------------------------

export interface LoanStatus {
  property: PropertyRecord;
  lender: string;
  balance: number;
  rate: number;
  annual_debt_service: number;
  noi_t12: number;
  dscr: number;
  covenant: number;
  /** DSCR minus covenant. Negative means the covenant is breached. */
  headroom: number;
  debt_yield: number;
}

export async function listLoans(orgId: string): Promise<LoanStatus[]> {
  await delay();
  return propertyRecords()
    .filter((r) => r.org_id === orgId)
    .map((property) => {
      const loan = loans.find((l) => l.property_id === property.id)!;
      const noi = sumFinancials(property.id, periodMonths("t12", monthOf(property.data_through)), "t12").noi.actual;
      const dscr = noi / property.annual_debt_service;
      return {
        property,
        lender: loan.lender,
        balance: loan.balance,
        rate: loan.rate,
        annual_debt_service: property.annual_debt_service,
        noi_t12: noi,
        dscr,
        covenant: loan.dscr_covenant,
        headroom: dscr - loan.dscr_covenant,
        debt_yield: noi / loan.balance,
      };
    });
}
