import { ALL_MONTHS, LATEST_MONTH, compareMonths, monthEnd, monthOf, periodLabel, periodMonths } from "@/lib/dates";
import type { DataHealthIssue, MonthKey, Period, PortfolioSummary, PropertyPerformance } from "@/lib/types";
import {
  combineFinancials,
  delay,
  driverVariances,
  effectiveImports,
  ledgerRow,
  occupancyMetrics,
  occupancyParts,
  occupancyRow,
  propertyPerformance,
  propertyRecords,
} from "./core";
import { propertyManagers } from "./mock/catalog";

export async function getPortfolioSummary(orgId: string, period: Period): Promise<PortfolioSummary> {
  await delay();
  const records = propertyRecords().filter((p) => p.org_id === orgId);
  const performance = records.map((r) => propertyPerformance(r, period));
  const months = periodMonths(period);
  const financials = combineFinancials(performance.map((p) => p.financials), period, months);
  const parts = performance.map((p) =>
    occupancyParts(p.property.id, p.property.units, p.financials.months.length ? latestIncluded(p) : monthOf(p.property.data_through)),
  );
  return {
    org_id: orgId,
    period,
    period_label: periodLabel(period),
    data_through: monthEnd(LATEST_MONTH),
    financials,
    occupancy: occupancyMetrics(parts, financials),
    drivers: driverVariances(financials),
    properties: performance,
    lagging_property_ids: records.filter((r) => compareMonths(monthOf(r.data_through), LATEST_MONTH) < 0).map((r) => r.id),
    units: records.reduce((s, r) => s + r.units, 0),
  };
}

function latestIncluded(p: PropertyPerformance): MonthKey {
  const through = monthOf(p.property.data_through);
  return p.financials.months.filter((m) => compareMonths(m, through) <= 0).at(-1) ?? through;
}

export interface TrendPoint {
  month: MonthKey;
  noi: number;
  noi_budget: number;
  revenue: number;
  expenses: number;
  physical: number;
  physical_budget: number;
  economic: number;
  delinquency: number;
  /** Properties without actuals for this month, excluded from both lines. */
  missing_property_ids: string[];
}

/** Monthly portfolio series. A month only includes properties that have actuals for it. */
export async function getPortfolioTrend(orgId: string, months = 12, propertyIds?: string[]): Promise<TrendPoint[]> {
  await delay();
  const records = propertyRecords().filter((p) => p.org_id === orgId && (!propertyIds || propertyIds.includes(p.id)));
  return ALL_MONTHS.slice(-months).map((month) => {
    const included = records.filter((r) => compareMonths(month, monthOf(r.data_through)) <= 0);
    let noi = 0, noiBudget = 0, revenue = 0, expenses = 0, gpr = 0, net = 0;
    let occupied = 0, budgetOccupied = 0, units = 0, delinquent = 0, billed = 0;
    for (const r of included) {
      const a = ledgerRow("actual", r.id, month)!;
      const b = ledgerRow("budget", r.id, month)!;
      const rev = a.gross_potential_rent + a.loss_to_lease + a.vacancy_loss + a.concessions + a.bad_debt + a.other_income;
      const revB = b.gross_potential_rent + b.loss_to_lease + b.vacancy_loss + b.concessions + b.bad_debt + b.other_income;
      const exp = a.payroll + a.repairs_maintenance + a.turnover + a.utilities + a.contract_services + a.marketing + a.administrative + a.management_fees + a.insurance + a.property_taxes;
      const expB = b.payroll + b.repairs_maintenance + b.turnover + b.utilities + b.contract_services + b.marketing + b.administrative + b.management_fees + b.insurance + b.property_taxes;
      noi += rev - exp;
      noiBudget += revB - expB;
      revenue += rev;
      expenses += exp;
      gpr += a.gross_potential_rent;
      net += rev - a.other_income;
      const o = occupancyRow(r.id, month)!;
      occupied += o.occupied_units;
      budgetOccupied += o.budget_occupied_units;
      units += r.units;
      delinquent += o.delinquent_balance;
      billed += o.billed_charges;
    }
    return {
      month,
      noi,
      noi_budget: noiBudget,
      revenue,
      expenses,
      physical: units ? occupied / units : 0,
      physical_budget: units ? budgetOccupied / units : 0,
      economic: gpr ? net / gpr : 0,
      delinquency: billed ? delinquent / billed : 0,
      missing_property_ids: records.filter((r) => !included.includes(r)).map((r) => r.id),
    };
  });
}

/** Missing or stale data worth telling the user about. */
export async function getDataHealth(orgId: string): Promise<DataHealthIssue[]> {
  await delay();
  const imports = effectiveImports();
  const records = propertyRecords(imports).filter((p) => p.org_id === orgId);
  const issues: DataHealthIssue[] = [];
  const lagging = records.filter((r) => compareMonths(monthOf(r.data_through), LATEST_MONTH) < 0);
  if (lagging.length) {
    issues.push({
      id: "missing_latest_t12",
      severity: "warning",
      message: `${lagging.length === 1 ? "1 property is" : `${lagging.length} properties are`} missing the ${monthLong(LATEST_MONTH)} T12`,
      property_ids: lagging.map((r) => r.id),
      import_id: null,
    });
  }
  const review = imports.filter((i) => i.status === "needs_review");
  for (const imp of review) {
    issues.push({ id: `review_${imp.id}`, severity: "warning", message: `${imp.file_name} needs review`, property_ids: [imp.property_id], import_id: imp.id });
  }
  const failed = imports.filter((i) => i.status === "failed");
  for (const imp of failed) {
    issues.push({ id: `failed_${imp.id}`, severity: "warning", message: `${imp.file_name} could not be read`, property_ids: [imp.property_id], import_id: imp.id });
  }
  return issues;
}

function monthLong(month: MonthKey) {
  return new Date(`${month}-01T00:00:00Z`).toLocaleString("en-US", { month: "long", timeZone: "UTC" });
}

export interface ManagerScore {
  manager: (typeof propertyManagers)[number];
  property_ids: string[];
  units: number;
  noi_actual: number;
  noi_budget: number;
  physical: number;
  delinquency: number;
  /** Average days after month end that reports arrived (uploads only). */
  reporting_lag_days: number | null;
}

export async function getManagerScorecard(orgId: string, period: Period): Promise<ManagerScore[]> {
  const summary = await getPortfolioSummary(orgId, period);
  const imports = effectiveImports();
  return propertyManagers
    .filter((m) => m.org_id === orgId)
    .map((manager) => {
      const perf = summary.properties.filter((p) => p.property.property_manager_id === manager.id);
      const parts = perf.map((p) => occupancyParts(p.property.id, p.property.units, latestIncluded(p)));
      const f = combineFinancials(perf.map((p) => p.financials), period, summary.financials.months);
      const lags = imports
        .filter((i) => i.report_type === "t12" && perf.some((p) => p.property.id === i.property_id) && i.status === "processed")
        .map((i) => (Date.parse(i.uploaded_at) - Date.parse(`${monthEnd(i.period)}T23:59:00Z`)) / 86_400_000);
      return {
        manager,
        property_ids: perf.map((p) => p.property.id),
        units: perf.reduce((s, p) => s + p.property.units, 0),
        noi_actual: f.noi.actual,
        noi_budget: f.noi.budget,
        physical: occupancyMetrics(parts, f).physical,
        delinquency: occupancyMetrics(parts, f).delinquency,
        reporting_lag_days: lags.length ? Math.round(lags.reduce((s, x) => s + x, 0) / lags.length) : null,
      };
    });
}

export interface MarketExposure {
  market: string;
  property_ids: string[];
  units: number;
  noi_actual: number;
  noi_budget: number;
}

export async function getMarketExposure(orgId: string, period: Period): Promise<MarketExposure[]> {
  const summary = await getPortfolioSummary(orgId, period);
  const markets = [...new Set(summary.properties.map((p) => p.property.market))];
  return markets
    .map((market) => {
      const perf = summary.properties.filter((p) => p.property.market === market);
      return {
        market,
        property_ids: perf.map((p) => p.property.id),
        units: perf.reduce((s, p) => s + p.property.units, 0),
        noi_actual: perf.reduce((s, p) => s + p.financials.noi.actual, 0),
        noi_budget: perf.reduce((s, p) => s + p.financials.noi.budget, 0),
      };
    })
    .sort((a, b) => b.noi_actual - a.noi_actual);
}

/** Estimated cash flow after debt service. Excludes capex and reserves. */
export function estimatedCashFlow(summary: PortfolioSummary) {
  const debt = summary.properties.reduce((s, p) => s + (p.property.annual_debt_service / 12) * p.financials.months.filter((m) => compareMonths(m, monthOf(p.property.data_through)) <= 0).length, 0);
  return { noi: summary.financials.noi.actual, debt_service: debt, cash_flow: summary.financials.noi.actual - debt };
}
