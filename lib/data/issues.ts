import { LATEST_MONTH, TODAY, compareMonths, formatDate, formatMonth, monthEnd, monthOf, monthRange, periodMonths } from "@/lib/dates";
import { formatCurrency, formatCurrencyShort, formatPercent, joinList } from "@/lib/format";
import type { GlCategory, IssueEvent, IssueStatus, MonthKey, PmsSystem, PropertyRecord, ResolveReason } from "@/lib/types";
import { allPropertyRecords, categoryVariance, delay, isNewWorkspace, isRevenue, memberName, occupancyRow, propertyRecords, sumFinancials } from "./core";
import { agingBuckets, describeSource, t12Line, type SourceRef } from "./lineage";
import { CURRENT_MEMBER_ID, ORG_ID, capexProjects, propertyManagers } from "./mock/catalog";
import { getGenerated } from "./mock/generate";
import { mappingTemplate } from "./mock/imports";
import { readOverlay, writeOverlay } from "./store";

/**
 * Issues: what's happening, since when, what it costs against budget, what's
 * driving it, and the evidence behind each number. RE-IQ states the facts;
 * the asset manager decides what to do and records it as a status change.
 * Every figure is computed from the same ledger as the rest of the app.
 */

export interface IssueStat {
  label: string;
  value: string;
  detail?: string;
  source?: SourceRef;
  /** Resolved file and line, e.g. "ResMan · Harbor Property Group · T12 Nov 2026 · line 4020 Vacancy Loss". */
  source_label?: string;
}

export interface IssueTable {
  title: string;
  columns: { label: string; align?: "right" }[];
  rows: string[][];
  /** One source per row, so each row opens the line it came from. */
  row_sources?: SourceRef[];
  source?: SourceRef;
  source_label?: string;
}

export interface IssueResult {
  /** NOI a year the result is worth, for the "results this year" total. */
  annual: number;
  before: { label: string; value: string };
  after: { label: string; value: string };
  sentence: string;
  is_estimate: boolean;
}

export type IssueTrendSpec =
  | { kind: "gl"; property_ids: string[]; categories: GlCategory[]; label: string }
  | { kind: "occupancy"; property_id: string }
  | { kind: "delinquency"; property_id: string };

export interface Issue {
  id: string;
  org_id: string;
  property_ids: string[];
  manager_id: string;
  manager_name: string;
  /** "Mesa Verde Apartments" or "Crestline North, South, and Commons". */
  scope_label: string;
  headline: string;
  /** NOI against budget over the issue's window. Negative is unfavorable. */
  impact: number;
  window: { from: MonthKey; to: MonthKey };
  /** "Since Jan 2026" or "May–Sep 2026". */
  window_label: string;
  driver: string;
  stats: IssueStat[];
  table: IssueTable | null;
  trend: IssueTrendSpec;
  status: IssueStatus;
  /** Date of the latest status change. */
  status_at: string;
  /** The asset manager's latest decision note, if any. */
  note: string | null;
  reason: ResolveReason | null;
  history: (IssueEvent & { by_name: string })[];
  result: IssueResult | null;
  data_through: string;
}

const pct = formatPercent;
const money = (x: number) => formatCurrencyShort(Math.abs(x));
const MONTH_NAME = (m: MonthKey) => formatMonth(m, "long").split(" ")[0];

/** Each system's landscaping line, for cost-per-unit comparisons. */
const LANDSCAPING_CODE: Record<PmsSystem, string> = { yardi: "6810-0000", appfolio: "6410", rent_manager: "64100", resman: "5410", entrata: "55000" };

/**
 * What becomes an issue. Shown in Settings; the planted issues were found with
 * these rules. A future org setting.
 */
export const ALERT_RULES: { id: string; label: string; value: string }[] = [
  { id: "line_over", label: "A line is over budget by more than", value: "5% and $5,000" },
  { id: "trend", label: "A line moves the wrong way for", value: "3 months in a row" },
  { id: "economic_gap", label: "Economic occupancy is below physical by more than", value: "5 points" },
  { id: "delinquency", label: "Delinquency rises by more than", value: "50% since its 12-month low" },
  { id: "cost_per_unit", label: "Cost per unit exceeds the rest of the portfolio by more than", value: "25%" },
];

// ---- Helpers ----------------------------------------------------------------------

function through(p: PropertyRecord) {
  return monthOf(p.data_through);
}

function window(p: PropertyRecord, from: MonthKey, to?: MonthKey) {
  const end = to && compareMonths(to, through(p)) < 0 ? to : through(p);
  return monthRange(from, end);
}

function lineSum(propertyIds: string[], categories: GlCategory[], from: MonthKey, records: PropertyRecord[], to?: MonthKey) {
  let actual = 0;
  let budget = 0;
  let variance = 0;
  for (const id of propertyIds) {
    const p = records.find((r) => r.id === id)!;
    const f = sumFinancials(id, window(p, from, to), "ytd");
    for (const c of categories) {
      // Costs read as positive amounts, whether contra-revenue or expense.
      actual += isRevenue(c) ? -f.byCategory[c].actual : f.byCategory[c].actual;
      budget += isRevenue(c) ? -f.byCategory[c].budget : f.byCategory[c].budget;
      variance += categoryVariance(f, c);
    }
  }
  return { actual, budget, variance };
}

function codeSum(propertyId: string, category: GlCategory, code: string, months: MonthKey[]) {
  const line = t12Line(propertyId, category, code);
  return months.reduce((s, m) => s + (line?.amounts[m] ?? 0), 0);
}

function labeled(stats: IssueStat[]): IssueStat[] {
  return stats.map((s) => (s.source ? { ...s, source_label: describeSource(s.source).label } : s));
}

function windowLabel(from: MonthKey, to: MonthKey | null) {
  if (!to) return `Since ${formatMonth(from)}`;
  return `${formatMonth(from, "tiny")}–${formatMonth(to)}`;
}

const flagged = (at: string): IssueEvent => ({ status: "open", at, by: "reiq", note: null, reason: null });

// ---- The planted issues -------------------------------------------------------------

type Draft = Omit<Issue, "status" | "status_at" | "note" | "reason" | "history" | "org_id" | "manager_name"> & { seed_history: IssueEvent[] };

function computeIssues(): Draft[] {
  const records = allPropertyRecords();
  const byId = (id: string) => records.find((r) => r.id === id)!;
  const { workOrders } = getGenerated();
  const out: Draft[] = [];

  // ---- 1. Lakeline Flats: vacancy and concessions ---------------------------------
  {
    const p = byId("prop_lakeline");
    const t = through(p);
    const from = "2026-01";
    const vac = lineSum([p.id], ["vacancy_loss"], from, records);
    const conc = lineSum([p.id], ["concessions"], from, records);
    const dec = occupancyRow(p.id, "2025-12")!;
    const now = occupancyRow(p.id, t)!;
    const last = sumFinancials(p.id, [t], "mtd");
    const concRate = -last.byCategory.concessions.actual / last.gpr.actual;
    const concBudget = -last.byCategory.concessions.budget / last.gpr.budget;
    out.push({
      id: "iss_lakeline_vacancy",
      property_ids: [p.id],
      manager_id: p.property_manager_id,
      scope_label: p.name,
      headline: `Vacancy and concessions ${money(vac.variance + conc.variance)} behind budget since January`,
      impact: vac.variance + conc.variance,
      window: { from, to: t },
      window_label: windowLabel(from, null),
      driver: `Physical occupancy fell from ${pct(dec.occupied_units / p.units)} in December to ${pct(now.occupied_units / p.units)} in ${MONTH_NAME(t)}, against a ${pct(now.budget_occupied_units / p.units)} budget. Concessions ran ${pct(concRate)} of gross potential rent in ${MONTH_NAME(t)}, against ${pct(concBudget)} budgeted.`,
      stats: labeled([
        { label: `Physical occupancy, ${formatDate(monthEnd(t))}`, value: pct(now.occupied_units / p.units), detail: `Budget ${pct(now.budget_occupied_units / p.units)} · ${pct(dec.occupied_units / p.units)} in December`, source: { kind: "rent_roll", property_id: p.id } },
        { label: "Vacant units", value: `${p.units - now.occupied_units} of ${p.units}`, detail: `${now.budget_occupied_units - now.occupied_units} more than budget`, source: { kind: "rent_roll", property_id: p.id } },
        { label: `Vacancy loss, Jan–${formatMonth(t, "tiny")}`, value: formatCurrency(vac.actual), detail: `Budget ${formatCurrency(vac.budget)}`, source: { kind: "t12", property_id: p.id, category: "vacancy_loss" } },
        { label: `Concessions, Jan–${formatMonth(t, "tiny")}`, value: formatCurrency(conc.actual), detail: `Budget ${formatCurrency(conc.budget)}`, source: { kind: "t12", property_id: p.id, category: "concessions" } },
        { label: `Concessions as % of GPR, ${formatMonth(t, "tiny")}`, value: pct(concRate), detail: `Budget ${pct(concBudget)}`, source: { kind: "t12", property_id: p.id, category: "concessions" } },
      ]),
      table: null,
      trend: { kind: "gl", property_ids: [p.id], categories: ["vacancy_loss", "concessions"], label: "Vacancy loss and concessions" },
      data_through: p.data_through,
      seed_history: [flagged("2026-02-12")],
      result: null,
    });
  }

  // ---- 2. Mesa Verde: repeat HVAC failures (resolved) -------------------------------
  {
    const p = byId("prop_mesa");
    const from = "2026-05";
    const to = "2026-09";
    const months = monthRange(from, to);
    const rm = lineSum([p.id], ["repairs_maintenance"], from, records, to);
    const hvacLine = codeSum(p.id, "repairs_maintenance", "62100", months);
    const calls = workOrders.filter((w) => w.property_id === p.id && w.category === "hvac" && w.opened_at >= "2026-05-01" && w.opened_at <= "2026-09-30");
    const counts = new Map<string, number>();
    for (const w of calls) counts.set(w.unit_number!, (counts.get(w.unit_number!) ?? 0) + 1);
    const repeatUnits = [...counts.entries()].filter(([, n]) => n >= 4).sort((a, b) => b[1] - a[1]).map(([u]) => u);
    const toRepeat = calls.filter((w) => repeatUnits.includes(w.unit_number!));
    const repeatCost = toRepeat.reduce((s, w) => s + (w.cost ?? 0), 0);
    const coolflow = calls.filter((w) => w.vendor_id === "ven_coolflow");
    const after = lineSum([p.id], ["repairs_maintenance"], "2026-10", records);
    const afterMonths = window(p, "2026-10").length;
    const capex = capexProjects.find((c) => c.id === "cap_mesa_condensers")!;
    const woSource = (units?: string[]): SourceRef => ({ kind: "work_orders", property_id: p.id, category: "hvac", from: "2026-05-01", to: "2026-09-30", units });
    out.push({
      id: "iss_mesa_hvac",
      property_ids: [p.id],
      manager_id: p.property_manager_id,
      scope_label: p.name,
      headline: `R&M ${money(rm.variance)} over budget, May–Sep`,
      impact: rm.variance,
      window: { from, to },
      window_label: windowLabel(from, to),
      driver: `${toRepeat.length} of ${calls.length} HVAC calls from May through September went to the same ${repeatUnits.length} units: ${joinList(repeatUnits)}. Coolflow Mechanical handled ${coolflow.length === calls.length ? "all of them" : `${coolflow.length} of them`}. R&M ran ${pct(rm.actual / rm.budget - 1)} over budget across those five months.`,
      stats: labeled([
        { label: "R&M, May–Sep", value: formatCurrency(rm.actual), detail: `Budget ${formatCurrency(rm.budget)}`, source: { kind: "t12", property_id: p.id, category: "repairs_maintenance" } },
        { label: "HVAC Repairs line, May–Sep", value: formatCurrency(hvacLine), detail: "Where the overage was booked", source: { kind: "t12", property_id: p.id, category: "repairs_maintenance", code: "62100" } },
        { label: "HVAC calls, May–Sep", value: String(calls.length), detail: `${toRepeat.length} to ${repeatUnits.length} units`, source: woSource() },
        { label: `Repair cost, units ${repeatUnits.join(", ")}`, value: formatCurrency(repeatCost), detail: `${toRepeat.length} calls · Coolflow Mechanical`, source: woSource(repeatUnits) },
      ]),
      table: {
        title: "Units with repeat HVAC calls, May–Sep",
        columns: [{ label: "Unit" }, { label: "Calls", align: "right" }, { label: "Repair cost", align: "right" }, { label: "Last call", align: "right" }],
        rows: repeatUnits.map((u) => {
          const mine = toRepeat.filter((w) => w.unit_number === u);
          return [u, String(mine.length), formatCurrency(mine.reduce((s, w) => s + (w.cost ?? 0), 0)), formatDate(mine.map((w) => w.opened_at).sort().pop()!)];
        }),
        row_sources: repeatUnits.map((u) => woSource([u])),
        source: woSource(repeatUnits),
        source_label: describeSource(woSource(repeatUnits)).label,
      },
      trend: { kind: "gl", property_ids: [p.id], categories: ["repairs_maintenance"], label: "Repairs & maintenance" },
      data_through: p.data_through,
      seed_history: [
        flagged("2026-06-09"),
        { status: "acting", at: "2026-10-12", by: CURRENT_MEMBER_ID, note: "Approved condenser replacement for 4 units, $31K capex.", reason: null },
        { status: "resolved", at: "2026-12-10", by: CURRENT_MEMBER_ID, note: null, reason: "fixed" },
      ],
      result: {
        annual: repeatCost,
        before: { label: "R&M vs budget, May–Sep", value: `${money(rm.variance / months.length)}/mo over` },
        after: { label: `R&M vs budget, Oct–${formatMonth(through(p), "tiny")}`, value: after.variance >= 0 ? `${money(after.variance / afterMonths)}/mo under` : `${money(after.variance / afterMonths)}/mo over` },
        sentence: `R&M back on budget since October · ~${money(repeatCost)}/yr in repairs on the ${repeatUnits.length} units vs. ${money(capex.planned)} one-time capex`,
        is_estimate: true,
      },
    });
  }

  // ---- 3. Willow Bend: contract labor in payroll (acting) ---------------------------
  {
    const p = byId("prop_willow");
    const from = "2026-04";
    const months = window(p, from);
    const pay = lineSum([p.id], ["payroll"], from, records);
    const contract = codeSum(p.id, "payroll", "60500", months);
    const salaried = codeSum(p.id, "payroll", "60000", months) + codeSum(p.id, "payroll", "60100", months);
    const before = codeSum(p.id, "payroll", "60500", monthRange("2025-12", "2026-03"));
    out.push({
      id: "iss_willow_payroll",
      property_ids: [p.id],
      manager_id: p.property_manager_id,
      scope_label: p.name,
      headline: `Payroll ${money(pay.variance)} over budget since April`,
      impact: pay.variance,
      window: { from, to: through(p) },
      window_label: windowLabel(from, null),
      driver: `Contract labor has been booked to payroll since April: ${formatCurrency(contract)} through ${MONTH_NAME(through(p))} on line 60500 Contract Labor, which ${before === 0 ? "had no balance" : `carried ${formatCurrency(before)}`} from December to March. Salaries, wages, and payroll taxes come to ${formatCurrency(salaried)} against a ${formatCurrency(pay.budget)} budget.`,
      stats: labeled([
        { label: `Payroll, Apr–${formatMonth(through(p), "tiny")}`, value: formatCurrency(pay.actual), detail: `Budget ${formatCurrency(pay.budget)}`, source: { kind: "t12", property_id: p.id, category: "payroll" } },
        { label: `Contract Labor, Apr–${formatMonth(through(p), "tiny")}`, value: formatCurrency(contract), detail: before === 0 ? "No balance Dec–Mar" : `${formatCurrency(before)} Dec–Mar`, source: { kind: "t12", property_id: p.id, category: "payroll", code: "60500" } },
        { label: "Salaries, wages, and taxes", value: formatCurrency(salaried), detail: `Budget ${formatCurrency(pay.budget)}`, source: { kind: "t12", property_id: p.id, category: "payroll", code: "60000" } },
      ]),
      table: null,
      trend: { kind: "gl", property_ids: [p.id], categories: ["payroll"], label: "Payroll" },
      data_through: p.data_through,
      seed_history: [flagged("2026-05-08"), { status: "acting", at: "2026-09-22", by: CURRENT_MEMBER_ID, note: "Asked Summit to reclass; reviewing staffing plan.", reason: null }],
      result: null,
    });
  }

  // ---- 4. Peachtree Landing: utilities ----------------------------------------------
  {
    const p = byId("prop_peachtree");
    const from = "2026-06";
    const months = window(p, from);
    const u = lineSum([p.id], ["utilities"], from, records);
    const water = codeSum(p.id, "utilities", "5320", months);
    // Water & Sewer's share of the utilities budget, from Harbor's chart of accounts.
    const waterBudget = Math.round(u.budget * (mappingTemplate("t12", "resman").find((r) => r.source_code === "5320")?.share ?? 0));
    const occ = months.map((m) => occupancyRow(p.id, m)!.occupied_units / p.units);
    out.push({
      id: "iss_peachtree_utilities",
      property_ids: [p.id],
      manager_id: p.property_manager_id,
      scope_label: p.name,
      headline: `Utilities ${pct(u.actual / u.budget - 1, 0)} over budget since June`,
      impact: u.variance,
      window: { from, to: through(p) },
      window_label: windowLabel(from, null),
      driver: `Utilities are ${formatCurrency(-u.variance)} (${pct(u.actual / u.budget - 1)}) over budget since June while physical occupancy held between ${pct(Math.min(...occ))} and ${pct(Math.max(...occ))}. ${(water - waterBudget) / -u.variance >= 0.95 ? "Nearly all" : pct((water - waterBudget) / -u.variance, 0)} of the overage is on line 5320 Water & Sewer.`,
      stats: labeled([
        { label: `Utilities, Jun–${formatMonth(through(p), "tiny")}`, value: formatCurrency(u.actual), detail: `Budget ${formatCurrency(u.budget)}`, source: { kind: "t12", property_id: p.id, category: "utilities" } },
        { label: `Water & Sewer, Jun–${formatMonth(through(p), "tiny")}`, value: formatCurrency(water), detail: `Budget ${formatCurrency(waterBudget)}`, source: { kind: "t12", property_id: p.id, category: "utilities", code: "5320" } },
        { label: "Physical occupancy, same months", value: `${pct(Math.min(...occ))}–${pct(Math.max(...occ))}`, detail: "Month-end rent rolls", source: { kind: "rent_roll", property_id: p.id } },
      ]),
      table: null,
      trend: { kind: "gl", property_ids: [p.id], categories: ["utilities"], label: "Utilities" },
      data_through: p.data_through,
      seed_history: [flagged("2026-07-11")],
      result: null,
    });
  }

  // ---- 5. Magnolia Court: delinquency -----------------------------------------------
  {
    const p = byId("prop_magnolia");
    const t = through(p);
    const from = "2026-03";
    const march = occupancyRow(p.id, from)!;
    const now = occupancyRow(p.id, t)!;
    const rateNow = now.delinquent_balance / now.billed_charges;
    const rateMarch = march.delinquent_balance / march.billed_charges;
    const bd = lineSum([p.id], ["bad_debt"], from, records);
    const buckets = agingBuckets(p.id, t);
    const over60 = buckets.filter((b) => b.label === "61–90" || b.label === "90+").reduce((s, b) => s + b.amount, 0);
    const ratio = rateNow / rateMarch;
    const aging: SourceRef = { kind: "ar_aging", property_id: p.id };
    out.push({
      id: "iss_magnolia_delinquency",
      property_ids: [p.id],
      manager_id: p.property_manager_id,
      scope_label: p.name,
      headline: ratio >= 1.9 ? "Delinquency has doubled since March" : `Delinquency up ${pct(ratio - 1, 0)} since March`,
      impact: bd.variance,
      window: { from, to: t },
      window_label: windowLabel(from, null),
      driver: `Delinquent balances reached ${formatCurrency(now.delinquent_balance)} at ${MONTH_NAME(t)} month end, ${pct(rateNow)} of monthly charges, up from ${pct(rateMarch)} in March. ${pct(over60 / now.delinquent_balance, 0)} of the balance is more than 60 days past due. Bad debt write-offs are ${formatCurrency(-bd.variance)} over budget since March.`,
      stats: labeled([
        { label: `Delinquency, ${formatDate(monthEnd(t))}`, value: pct(rateNow), detail: `${pct(rateMarch)} in March`, source: aging },
        { label: "Delinquent balance", value: formatCurrency(now.delinquent_balance), detail: `${formatCurrency(march.delinquent_balance)} in March`, source: aging },
        { label: "More than 60 days past due", value: formatCurrency(over60), detail: `${pct(over60 / now.delinquent_balance, 0)} of the balance`, source: aging },
        { label: `Bad debt, Mar–${formatMonth(t, "tiny")}`, value: formatCurrency(bd.actual), detail: `Budget ${formatCurrency(bd.budget)}`, source: { kind: "t12", property_id: p.id, category: "bad_debt" } },
      ]),
      table: {
        title: `AR aging, ${formatDate(monthEnd(t), true)}`,
        columns: [{ label: "Days past due" }, { label: "Balance", align: "right" }, { label: "Share", align: "right" }],
        rows: buckets.map((b) => [b.label, formatCurrency(b.amount), pct(b.amount / now.delinquent_balance, 0)]),
        source: aging,
        source_label: describeSource(aging).label,
      },
      trend: { kind: "delinquency", property_id: p.id },
      data_through: p.data_through,
      seed_history: [flagged("2026-05-12")],
      result: null,
    });
  }

  // ---- 6. Crestline: landscaping per unit -------------------------------------------
  {
    const crestline = records.filter((r) => r.property_manager_id === "pm_crestline");
    const others = records.filter((r) => r.property_manager_id !== "pm_crestline");
    const t12 = (r: PropertyRecord) => {
      const code = LANDSCAPING_CODE[r.property_manager.system];
      const months = periodMonths("t12", through(r));
      return codeSum(r.id, "contract_services", code, months);
    };
    const cSpend = crestline.reduce((s, r) => s + t12(r), 0);
    const cUnits = crestline.reduce((s, r) => s + r.units, 0);
    const oSpend = others.reduce((s, r) => s + t12(r), 0);
    const oUnits = others.reduce((s, r) => s + r.units, 0);
    const cPer = cSpend / cUnits;
    const oPer = oSpend / oUnits;
    const from = "2026-01";
    const cs = lineSum(crestline.map((r) => r.id), ["contract_services"], from, records);
    const t = crestline.map((r) => through(r)).sort(compareMonths)[0];
    const line = (r: PropertyRecord): SourceRef => ({ kind: "t12", property_id: r.id, category: "contract_services", code: LANDSCAPING_CODE[r.property_manager.system] });
    out.push({
      id: "iss_crestline_landscaping",
      property_ids: crestline.map((r) => r.id),
      manager_id: "pm_crestline",
      scope_label: `Crestline North, South, and Commons`,
      headline: `Landscaping costs ${pct(cPer / oPer - 1, 0)} more per unit than the rest of the portfolio`,
      impact: cs.variance,
      window: { from, to: t },
      window_label: windowLabel(from, null),
      driver: `Over the 12 months through ${MONTH_NAME(t)}, landscaping at Crestline's three properties cost ${formatCurrency(Math.round(cPer))} per unit, against ${formatCurrency(Math.round(oPer))} per unit at the other ${others.length} properties. GreenScape Grounds Co. holds the contract at all three. Contract services are ${formatCurrency(-cs.variance)} over budget since January.`,
      stats: labeled([
        { label: "Landscaping per unit, Crestline", value: formatCurrency(Math.round(cPer)), detail: `T12 · ${cUnits} units`, source: line(crestline[0]) },
        { label: "Landscaping per unit, other properties", value: formatCurrency(Math.round(oPer)), detail: `T12 · ${others.length} properties, ${oUnits.toLocaleString("en-US")} units` },
        { label: `Contract services, Jan–${formatMonth(t, "tiny")}`, value: formatCurrency(cs.actual), detail: `Budget ${formatCurrency(cs.budget)}`, source: { kind: "t12", property_id: crestline[0].id, category: "contract_services" } },
      ]),
      table: {
        title: "Landscaping, trailing 12 months",
        columns: [{ label: "Property" }, { label: "Units", align: "right" }, { label: "Landscaping", align: "right" }, { label: "Per unit", align: "right" }],
        rows: [...crestline, ...others].map((r) => [r.name, String(r.units), formatCurrency(t12(r)), formatCurrency(Math.round(t12(r) / r.units))]),
        row_sources: [...crestline, ...others].map(line),
      },
      trend: { kind: "gl", property_ids: crestline.map((r) => r.id), categories: ["contract_services"], label: "Contract services, three Crestline properties" },
      data_through: monthEnd(t),
      seed_history: [flagged("2026-03-14")],
      result: null,
    });
  }

  // ---- 7. Oakridge: economic vs physical occupancy ----------------------------------
  {
    const p = byId("prop_oakridge");
    const t = through(p);
    const from = "2026-06";
    const now = occupancyRow(p.id, t)!;
    const f = sumFinancials(p.id, [t], "mtd");
    const econ = (k: "actual" | "budget") =>
      (["gross_potential_rent", "loss_to_lease", "vacancy_loss", "concessions", "bad_debt"] as GlCategory[]).reduce((s, c) => s + f.byCategory[c][k], 0) / f.gpr[k];
    const physical = now.occupied_units / p.units;
    const economic = econ("actual");
    const leak = lineSum([p.id], ["loss_to_lease", "concessions", "bad_debt"], from, records);
    const ltl = lineSum([p.id], ["loss_to_lease"], from, records);
    const conc = lineSum([p.id], ["concessions"], from, records);
    const bd = lineSum([p.id], ["bad_debt"], from, records);
    out.push({
      id: "iss_oakridge_economic",
      property_ids: [p.id],
      manager_id: p.property_manager_id,
      scope_label: p.name,
      headline: `Economic occupancy ${((physical - economic) * 100).toFixed(1)} pts below physical`,
      impact: leak.variance,
      window: { from, to: t },
      window_label: windowLabel(from, null),
      driver: `In ${MONTH_NAME(t)}, ${pct(physical)} of units were occupied but rent collected after loss to lease, concessions, and bad debt was ${pct(economic)} of gross potential rent, against ${pct(econ("budget"))} budgeted. Since June, loss to lease is ${formatCurrency(-ltl.variance)} over budget, concessions ${formatCurrency(-conc.variance)}, and bad debt ${formatCurrency(-bd.variance)}.`,
      stats: labeled([
        { label: `Physical occupancy, ${formatDate(monthEnd(t))}`, value: pct(physical), detail: `Budget ${pct(now.budget_occupied_units / p.units)}`, source: { kind: "rent_roll", property_id: p.id } },
        { label: `Economic occupancy, ${formatMonth(t, "tiny")}`, value: pct(economic), detail: `Budget ${pct(econ("budget"))}`, source: { kind: "t12", property_id: p.id, category: "gross_potential_rent" } },
        { label: `Loss to lease, Jun–${formatMonth(t, "tiny")}`, value: formatCurrency(ltl.actual), detail: `Budget ${formatCurrency(ltl.budget)}`, source: { kind: "t12", property_id: p.id, category: "loss_to_lease" } },
        { label: `Concessions, Jun–${formatMonth(t, "tiny")}`, value: formatCurrency(conc.actual), detail: `Budget ${formatCurrency(conc.budget)}`, source: { kind: "t12", property_id: p.id, category: "concessions" } },
        { label: `Bad debt, Jun–${formatMonth(t, "tiny")}`, value: formatCurrency(bd.actual), detail: `Budget ${formatCurrency(bd.budget)}`, source: { kind: "t12", property_id: p.id, category: "bad_debt" } },
      ]),
      table: null,
      trend: { kind: "occupancy", property_id: p.id },
      data_through: p.data_through,
      seed_history: [flagged("2026-08-12")],
      result: null,
    });
  }

  return out;
}

// ---- Public API -------------------------------------------------------------------

function withStatus(d: Draft): Issue {
  const { seed_history, ...rest } = d;
  const history = [...seed_history, ...(readOverlay().issueEvents[d.id] ?? [])];
  const last = history[history.length - 1];
  const lastNote = [...history].reverse().find((e) => e.note)?.note ?? null;
  // A seeded result only holds while the issue stays resolved the way it was seeded.
  const reopened = history.length > seed_history.length;
  return {
    ...rest,
    org_id: ORG_ID,
    manager_name: propertyManagers.find((m) => m.id === d.manager_id)?.name ?? "",
    history: history.map((e) => ({ ...e, by_name: e.by === "reiq" ? "RE-IQ" : memberName(e.by) })),
    status: last.status,
    status_at: last.at,
    note: lastNote,
    reason: last.status === "resolved" ? last.reason : null,
    result: last.status === "resolved" && !reopened ? d.result : null,
  };
}

let cache: { key: string; drafts: Draft[] } | null = null;

function drafts(): Draft[] {
  // Issues depend on which reports are in; recompute when the import set changes.
  const key = allPropertyRecords().map((r) => r.data_through).join("|");
  if (!cache || cache.key !== key) cache = { key, drafts: computeIssues() };
  return cache.drafts;
}

/** Issues for properties in the portfolio, ranked by dollars against budget. */
export async function listIssues(orgId: string): Promise<Issue[]> {
  await delay();
  const inPortfolio = new Set(propertyRecords().map((r) => r.id));
  return drafts()
    .filter((d) => !isNewWorkspace() || d.property_ids.every((id) => inPortfolio.has(id)))
    .map(withStatus)
    .filter((i) => i.org_id === orgId)
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

export async function getIssue(id: string): Promise<Issue | null> {
  const all = await listIssues(ORG_ID);
  return all.find((i) => i.id === id) ?? null;
}

export async function setIssueStatus(id: string, status: IssueStatus, input: { note?: string; reason?: ResolveReason } = {}): Promise<void> {
  await delay(200);
  writeOverlay((d) => {
    const list = d.issueEvents[id] ?? [];
    list.push({ status, at: TODAY, by: CURRENT_MEMBER_ID, note: input.note?.trim() || null, reason: status === "resolved" ? (input.reason ?? "fixed") : null });
    d.issueEvents[id] = list;
  });
}

export const RESOLVE_REASONS: { id: ResolveReason; label: string; hint: string }[] = [
  { id: "fixed", label: "Fixed", hint: "The cause was addressed" },
  { id: "not_an_issue", label: "Not an issue", hint: "Expected, e.g. planned capex or a timing difference" },
  { id: "other", label: "Other", hint: "Explain in the note" },
];

// ---- Trend --------------------------------------------------------------------------

export interface IssueTrendPoint {
  month: MonthKey;
  actual: number | null;
  reference: number | null;
}

export interface IssueTrend {
  format: "currency" | "percent";
  actual_label: string;
  reference_label: string;
  points: IssueTrendPoint[];
}

/** The issue's line by month over the trailing 12 months, with its comparison. */
export async function getIssueTrend(issue: Issue): Promise<IssueTrend> {
  await delay();
  const records = allPropertyRecords();
  const months = periodMonths("t12", LATEST_MONTH);
  const spec = issue.trend;
  if (spec.kind === "gl") {
    const props = spec.property_ids.map((id) => records.find((r) => r.id === id)!);
    return {
      format: "currency",
      actual_label: spec.label,
      reference_label: "Budget",
      points: months.map((m) => {
        const has = props.every((p) => compareMonths(m, through(p)) <= 0);
        let a = 0;
        let b = 0;
        for (const p of props) {
          const f = sumFinancials(p.id, [m], "mtd");
          for (const c of spec.categories) {
            a += isRevenue(c) ? -f.byCategory[c].actual : f.byCategory[c].actual;
            b += isRevenue(c) ? -f.byCategory[c].budget : f.byCategory[c].budget;
          }
        }
        return { month: m, actual: has ? a : null, reference: b };
      }),
    };
  }
  const p = records.find((r) => r.id === spec.property_id)!;
  if (spec.kind === "occupancy") {
    return {
      format: "percent",
      actual_label: "Economic occupancy",
      reference_label: "Physical occupancy",
      points: months.map((m) => {
        if (compareMonths(m, through(p)) > 0) return { month: m, actual: null, reference: null };
        const f = sumFinancials(p.id, [m], "mtd");
        const net = (["gross_potential_rent", "loss_to_lease", "vacancy_loss", "concessions", "bad_debt"] as GlCategory[]).reduce((s, c) => s + f.byCategory[c].actual, 0);
        return { month: m, actual: net / f.gpr.actual, reference: occupancyRow(p.id, m)!.occupied_units / p.units };
      }),
    };
  }
  const rest = records.filter((r) => r.id !== p.id);
  return {
    format: "percent",
    actual_label: "Delinquency",
    reference_label: "Rest of portfolio",
    points: months.map((m) => {
      const o = occupancyRow(p.id, m)!;
      const others = rest.filter((r) => compareMonths(m, through(r)) <= 0).map((r) => occupancyRow(r.id, m)!);
      const restRate = others.reduce((s, x) => s + x.delinquent_balance, 0) / Math.max(1, others.reduce((s, x) => s + x.billed_charges, 0));
      return { month: m, actual: compareMonths(m, through(p)) <= 0 ? o.delinquent_balance / o.billed_charges : null, reference: restRate };
    }),
  };
}

// ---- Decisions ------------------------------------------------------------------------

export interface Decisions {
  acting: Issue[];
  resolved: Issue[];
  /** NOI a year from issues resolved this calendar year. An estimate. */
  results_this_year: number;
}

/** Everything the asset manager is acting on, and what came of what's resolved. */
export async function getDecisions(orgId: string): Promise<Decisions> {
  const issues = await listIssues(orgId);
  const resolved = issues.filter((i) => i.status === "resolved");
  return {
    acting: issues.filter((i) => i.status === "acting"),
    resolved,
    results_this_year: resolved.filter((i) => i.status_at.startsWith(TODAY.slice(0, 4))).reduce((s, i) => s + (i.result?.annual ?? 0), 0),
  };
}

/** When an issue moved to Acting, and the note recorded then. */
export function actingEvent(issue: Issue) {
  return [...issue.history].reverse().find((e) => e.status === "acting") ?? null;
}
