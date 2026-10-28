import {
  LATEST_MONTH,
  TODAY,
  compareMonths,
  formatDate,
  formatDateTime,
  formatMonth,
  monthOf,
  monthRange,
  periodPhrase,
} from "@/lib/dates";
import { formatCurrency, formatCurrencyShort, formatPercent, joinList, pluralize } from "@/lib/format";
import { DRIVER_LABELS, REPORT_TYPE_SHORT } from "@/lib/labels";
import type {
  EvidenceSource,
  Import,
  Insight,
  MonthKey,
  Period,
  PropertyRecord,
  ReportType,
  Role,
  SummarySentence,
} from "@/lib/types";
import {
  allPropertyRecords,
  categoryVariance,
  combineFinancials,
  delay,
  effectiveImports,
  isNewWorkspace,
  memberName,
  occupancyRow,
  propertyPerformance,
  propertyRecords,
  sumFinancials,
} from "./core";
import { ORG_ID, properties, propertyManagers } from "./mock/catalog";
import { getGenerated } from "./mock/generate";
import { estimatedCashFlow, getPortfolioSummary } from "./portfolio";
import { BELOW_MARKET_THRESHOLD, RENEWAL_CAPTURE, RENEWAL_WINDOW_DAYS, portfolioRentRoll, renewalWindowEnd, vendorSpend } from "./properties";

/**
 * Insights are computed from the same records the rest of the app reads, so
 * every number in a diagnosis matches the tables and charts. With a real
 * backend these become rows written by the analysis pipeline.
 */

/** The uploads or connector syncs behind a property's numbers. */
export function sourcesFor(property: PropertyRecord, types: ReportType[] = ["t12"], imports: Import[] = effectiveImports()): EvidenceSource[] {
  const source = property.primary_source;
  if (source.type !== "upload") {
    return [
      {
        kind: "connector",
        id: source.id,
        label: source.name,
        detail: `Synced ${formatDateTime(source.last_sync_at!)} · ledger, rent roll, and work orders`,
      },
    ];
  }
  return types
    .map((type) => imports.find((i) => i.property_id === property.id && i.report_type === type && i.status === "processed"))
    .filter((i): i is Import => Boolean(i))
    .map((i) => ({
      kind: "import" as const,
      id: i.id,
      label: i.file_name,
      detail: `${REPORT_TYPE_SHORT[i.report_type]} · uploaded ${formatDate(i.uploaded_at.slice(0, 10))} by ${memberName(i.uploaded_by)}`,
    }));
}

const pct = formatPercent;
const money = (x: number) => formatCurrencyShort(Math.abs(x));

function sumVariance(propertyId: string, months: MonthKey[], categories: Parameters<typeof categoryVariance>[1][]) {
  const f = sumFinancials(propertyId, months, "ytd");
  return {
    variance: categories.reduce((s, c) => s + categoryVariance(f, c), 0),
    actual: categories.reduce((s, c) => s + f.byCategory[c].actual, 0),
    budget: categories.reduce((s, c) => s + f.byCategory[c].budget, 0),
  };
}

function monthsSince(from: MonthKey, property: PropertyRecord) {
  return monthRange(from, monthOf(property.data_through));
}

function computeInsights(): Insight[] {
  const imports = effectiveImports();
  const records = allPropertyRecords(imports);
  const byId = (id: string) => records.find((r) => r.id === id)!;
  const { workOrders } = getGenerated();
  const out: Insight[] = [];

  // ---- Issue: vacancy and concessions -------------------------------------
  {
    const p = byId("prop_lakeline");
    const perf = propertyPerformance(p, "qtd");
    const vac = perf.drivers.find((d) => d.driver === "vacancy")!.variance;
    const conc = perf.drivers.find((d) => d.driver === "concessions")!.variance;
    const through = monthOf(p.data_through);
    const before = occupancyRow(p.id, "2025-12")!;
    const now = occupancyRow(p.id, through)!;
    const f = perf.financials;
    const lastMonth = sumFinancials(p.id, [through], "mtd");
    const concRate = -lastMonth.byCategory.concessions.actual / lastMonth.gpr.actual;
    const concBudgetRate = -lastMonth.byCategory.concessions.budget / lastMonth.gpr.budget;
    const vacant = p.units - now.occupied_units;
    out.push({
      id: "ins_lakeline_vacancy",
      org_id: ORG_ID,
      type: "issue",
      property_id: p.id,
      title: `Vacancy and concessions are ${money(vac + conc)} behind budget at ${p.name}`,
      summary: `${p.name} accounts for most of the gap: vacancy and concessions cost ${money(vac + conc)} against budget ${periodPhrase("qtd")}.`,
      diagnosis: `Physical occupancy fell from ${pct(before.occupied_units / p.units)} in December to ${pct(now.occupied_units / p.units)} in ${formatMonth(through, "long").split(" ")[0]}, against a ${pct(now.budget_occupied_units / p.units)} budget, as new lease-ups in Frisco competed on price. Vacancy cost ${money(vac)} and concessions ${money(conc)} against budget ${periodPhrase("qtd")}. Concessions now run ${pct(concRate)} of gross potential rent against a ${pct(concBudgetRate)} budget.`,
      drivers: ["vacancy", "concessions"],
      impact: -(vac + conc),
      impact_label: "vs budget this quarter",
      is_estimate: false,
      confidence: "high",
      severity: -(vac + conc),
      evidence: [
        { label: "Physical occupancy", value: pct(now.occupied_units / p.units), detail: `Budget ${pct(now.budget_occupied_units / p.units)} · ${formatDate(p.data_through)}` },
        { label: "Vacant units", value: `${vacant} of ${p.units}`, detail: `${now.budget_occupied_units - now.occupied_units} more than budget` },
        { label: "Vacancy loss, QTD", value: formatCurrency(-f.byCategory.vacancy_loss.actual), detail: `Budget ${formatCurrency(-f.byCategory.vacancy_loss.budget)}` },
        { label: "Concessions, QTD", value: formatCurrency(-f.byCategory.concessions.actual), detail: `Budget ${formatCurrency(-f.byCategory.concessions.budget)}` },
        { label: "Concessions as % of GPR", value: pct(concRate), detail: `${formatMonth(through)} · budget ${pct(concBudgetRate)}` },
      ],
      sources: sourcesFor(p),
      data_through: p.data_through,
      recommended_action: "Ask Harbor Property Group for a 60-day leasing plan with a concession cap and weekly traffic and conversion reporting.",
    });
  }

  // ---- Issue: recurring HVAC failures -------------------------------------
  {
    const p = byId("prop_mesa");
    const months = monthsSince("2026-05", p);
    const rm = sumVariance(p.id, months, ["repairs_maintenance"]);
    const hvac = workOrders.filter((w) => w.property_id === p.id && w.category === "hvac" && w.opened_at >= "2026-05-01");
    const repeats = hvac.filter((w) => w.repeat);
    const repeatUnits = [...new Set(repeats.map((w) => w.unit_number))];
    const coolflow = vendorSpend(p.id, monthOf(p.data_through)).find((v) => v.vendor.id === "ven_coolflow");
    const openHvac = hvac.filter((w) => w.status !== "completed").length;
    out.push({
      id: "ins_mesa_hvac",
      org_id: ORG_ID,
      type: "issue",
      property_id: p.id,
      title: `Repeat HVAC failures put ${p.name} R&M ${money(rm.variance)} over budget`,
      summary: `R&M at ${p.short_name} is ${money(rm.variance)} over budget since May, driven by repeat HVAC calls to the same ${repeatUnits.length} units.`,
      diagnosis: `R&M is ${money(rm.variance)} over budget since May (${pct(rm.actual / rm.budget - 1)} above plan). ${pluralize(hvac.length, "HVAC work order")} were opened since May 1, and ${repeats.length} of them were repeat calls to the same ${repeatUnits.length} units. The pattern points to failing original condensers in the 1986 buildings rather than one-off repairs.`,
      drivers: ["repairs_maintenance"],
      impact: -rm.variance,
      impact_label: "vs budget since May",
      is_estimate: false,
      confidence: "high",
      severity: -rm.variance,
      evidence: [
        { label: "R&M, May–" + formatMonth(monthOf(p.data_through), "tiny"), value: formatCurrency(rm.actual), detail: `Budget ${formatCurrency(rm.budget)}` },
        { label: "HVAC work orders since May 1", value: String(hvac.length), detail: `${openHvac} still open` },
        { label: "Repeat calls", value: String(repeats.length), detail: `Units ${repeatUnits.join(", ")}` },
        ...(coolflow ? [{ label: "Coolflow Mechanical, T12", value: formatCurrency(coolflow.spend_t12), detail: "HVAC vendor of record" }] : []),
      ],
      sources: sourcesFor(p),
      data_through: p.data_through,
      recommended_action: `Get condenser replacement bids for units ${repeatUnits.join(", ")} and compare them with the current repair run-rate.`,
    });
  }

  // ---- Issue: rising bad debt -----------------------------------------------
  {
    const p = byId("prop_magnolia");
    const perf = propertyPerformance(p, "qtd");
    const bd = perf.drivers.find((d) => d.driver === "bad_debt")!.variance;
    const through = monthOf(p.data_through);
    const now = occupancyRow(p.id, through)!;
    const march = occupancyRow(p.id, "2026-03")!;
    out.push({
      id: "ins_magnolia_bad_debt",
      org_id: ORG_ID,
      type: "issue",
      property_id: p.id,
      title: `Delinquency at ${p.name} has more than doubled since March`,
      summary: `Delinquency at ${p.name} reached ${pct(now.delinquent_balance / now.billed_charges)} of billed charges, up from ${pct(march.delinquent_balance / march.billed_charges)} in March.`,
      diagnosis: `Delinquent balances reached ${formatCurrencyShort(now.delinquent_balance)}, or ${pct(now.delinquent_balance / now.billed_charges)} of monthly charges, up from ${pct(march.delinquent_balance / march.billed_charges)} in March. Bad debt write-offs are ${money(bd)} over budget ${periodPhrase("qtd")}.${isLagging(p) ? ` ${formatMonth(LATEST_MONTH, "long").split(" ")[0]} is not included yet because its T12 has not posted.` : ""}`,
      drivers: ["bad_debt"],
      impact: -bd,
      impact_label: "vs budget this quarter",
      is_estimate: false,
      confidence: "medium",
      severity: -bd * 2.2,
      evidence: [
        { label: "Delinquency", value: pct(now.delinquent_balance / now.billed_charges), detail: `${formatDate(p.data_through)} · ${pct(march.delinquent_balance / march.billed_charges)} in March` },
        { label: "Delinquent balance", value: formatCurrency(now.delinquent_balance), detail: formatDate(p.data_through) },
        { label: "Bad debt, QTD", value: formatCurrency(-perf.financials.byCategory.bad_debt.actual), detail: `Budget ${formatCurrency(-perf.financials.byCategory.bad_debt.budget)}` },
      ],
      sources: sourcesFor(p, ["t12", "ar_aging"]),
      data_through: p.data_through,
      recommended_action: "Review every account more than 60 days past due with Meridian and agree on a payment-plan or filing decision for each.",
    });
  }

  // ---- Issue: utilities spike ------------------------------------------------
  {
    const p = byId("prop_peachtree");
    const months = monthsSince("2026-06", p);
    const u = sumVariance(p.id, months, ["utilities"]);
    const occ = months.map((m) => occupancyRow(p.id, m)!.occupied_units / p.units);
    out.push({
      id: "ins_peachtree_utilities",
      org_id: ORG_ID,
      type: "issue",
      property_id: p.id,
      title: `Utilities at ${p.name} are ${pct(u.actual / u.budget - 1)} over budget since June`,
      summary: `Utilities at ${p.short_name} are ${money(u.variance)} over budget since June while occupancy held steady.`,
      diagnosis: `Utilities are ${money(u.variance)} (${pct(u.actual / u.budget - 1)}) over budget since June while occupancy held between ${pct(Math.min(...occ))} and ${pct(Math.max(...occ))}. A jump this size with flat occupancy usually means a leak or an irrigation fault rather than resident usage.`,
      drivers: ["utilities"],
      impact: -u.variance,
      impact_label: "vs budget since June",
      is_estimate: false,
      confidence: "medium",
      severity: -u.variance,
      evidence: [
        { label: "Utilities, Jun–" + formatMonth(monthOf(p.data_through), "tiny"), value: formatCurrency(u.actual), detail: `Budget ${formatCurrency(u.budget)}` },
        { label: "Physical occupancy range", value: `${pct(Math.min(...occ))}–${pct(Math.max(...occ))}`, detail: "Same period" },
      ],
      sources: sourcesFor(p),
      data_through: p.data_through,
      recommended_action: "Schedule a leak-detection survey and pull the last four water bills by meter.",
    });
  }

  // ---- Issue: contract labor -------------------------------------------------
  {
    const p = byId("prop_willow");
    const months = monthsSince("2026-04", p);
    const pay = sumVariance(p.id, months, ["payroll"]);
    const staffbridge = vendorSpend(p.id, monthOf(p.data_through)).find((v) => v.vendor.id === "ven_staffbridge");
    out.push({
      id: "ins_willow_payroll",
      org_id: ORG_ID,
      type: "issue",
      property_id: p.id,
      title: `Contract labor is pushing ${p.name} payroll over budget`,
      summary: `Payroll at ${p.short_name} is ${money(pay.variance)} over budget since April because contract labor is covering two open maintenance roles.`,
      diagnosis: `Payroll is ${money(pay.variance)} over budget since April (${pct(pay.actual / pay.budget - 1)} above plan). StaffBridge contract technicians have covered two open maintenance positions since then, at a higher hourly cost than staff.`,
      drivers: ["payroll"],
      impact: -pay.variance,
      impact_label: "vs budget since April",
      is_estimate: false,
      confidence: "medium",
      severity: -pay.variance,
      evidence: [
        { label: "Payroll, Apr–" + formatMonth(monthOf(p.data_through), "tiny"), value: formatCurrency(pay.actual), detail: `Budget ${formatCurrency(pay.budget)}` },
        ...(staffbridge ? [{ label: "StaffBridge Maintenance, T12", value: formatCurrency(staffbridge.spend_t12), detail: "GL 5015 Contract Labor" }] : []),
      ],
      sources: sourcesFor(p),
      data_through: p.data_through,
      recommended_action: "Ask Harbor for a hiring timeline for both maintenance technician roles.",
    });
  }

  // ---- Opportunity: below-market renewals ---------------------------------
  {
    const p = byId("prop_brookstone");
    const roll = portfolioRentRoll([p.id]).filter((r) => r.lease);
    const below = roll.filter((r) => r.gap_pct >= BELOW_MARKET_THRESHOLD);
    const expiring = below.filter((r) => (r.days_to_expiry ?? 999) <= RENEWAL_WINDOW_DAYS);
    const uplift = expiring.reduce((s, r) => s + r.gap * 12 * RENEWAL_CAPTURE, 0);
    const avgGap = below.reduce((s, r) => s + r.gap_pct, 0) / Math.max(1, below.length);
    const rrSources = sourcesFor(p, ["rent_roll"]);
    out.push({
      id: "opp_brookstone_renewals",
      org_id: ORG_ID,
      type: "opportunity",
      property_id: p.id,
      title: `${expiring.length} below-market leases at ${p.name} expire in the next 90 days`,
      summary: `${p.name} has ${expiring.length} below-market leases expiring by ${formatDate(renewalWindowEnd())}, worth an estimated ${formatCurrencyShort(uplift)} a year if renewed closer to market.`,
      diagnosis: `${below.length} of ${roll.length} occupied units lease at least ${pct(BELOW_MARKET_THRESHOLD, 0)} below market, ${pct(avgGap)} on average. ${expiring.length} of them expire by ${formatDate(renewalWindowEnd())}. Renewing those at ${pct(RENEWAL_CAPTURE, 0)} of the gap would add an estimated ${formatCurrencyShort(uplift)} in annual revenue.`,
      drivers: ["loss_to_lease"],
      impact: uplift,
      impact_label: "estimated annual revenue",
      is_estimate: true,
      confidence: "medium",
      severity: uplift,
      evidence: [
        { label: "Units 5%+ below market", value: `${below.length} of ${roll.length}`, detail: `Average gap ${pct(avgGap)}` },
        { label: "Expiring by " + formatDate(renewalWindowEnd()), value: String(expiring.length), detail: "Below-market leases only" },
        { label: "Monthly gap on expiring leases", value: formatCurrency(expiring.reduce((s, r) => s + r.gap, 0)), detail: "Market rent minus lease rent" },
        { label: "Assumption", value: `${pct(RENEWAL_CAPTURE, 0)} of gap`, detail: "Captured at renewal; estimate" },
      ],
      sources: rrSources,
      data_through: p.data_through,
      recommended_action: `Set renewal offers for the ${expiring.length} expiring below-market leases at or near market, starting with the largest gaps.`,
    });
  }

  // ---- Opportunity: landscaping above benchmark ---------------------------
  {
    const crestline = records.filter((r) => r.property_manager_id === "pm_crestline");
    const rows = crestline.map((r) => ({ r, v: vendorSpend(r.id, monthOf(r.data_through)).find((x) => x.vendor.id === "ven_greenscape")! }));
    const spend = rows.reduce((s, x) => s + x.v.spend_t12, 0);
    const units = crestline.reduce((s, r) => s + r.units, 0);
    const benchmark = rows[0].v.benchmark_per_unit ?? 0;
    const excess = rows.reduce((s, x) => s + Math.max(0, x.v.spend_t12 - benchmark * x.r.units), 0);
    const others = records.filter((r) => r.property_manager_id !== "pm_crestline");
    const terra = others.map((r) => vendorSpend(r.id, monthOf(r.data_through)).find((x) => x.vendor.id === "ven_terra")!);
    const terraPerUnit = terra.reduce((s, x) => s + x.spend_t12, 0) / others.reduce((s, r) => s + r.units, 0);
    out.push({
      id: "opp_landscaping_rebid",
      org_id: ORG_ID,
      type: "opportunity",
      property_id: null,
      title: `Landscaping at Crestline properties runs ${pct(spend / units / benchmark - 1)} above benchmark`,
      summary: `Landscaping at the ${crestline.length} Crestline properties costs ${formatCurrency(Math.round(spend / units))} per unit a year against a ${formatCurrency(benchmark)} benchmark.`,
      diagnosis: `GreenScape Grounds Co. serves all ${crestline.length} Crestline Residential properties at ${formatCurrency(Math.round(spend / units))} per unit over the last 12 months, against a ${formatCurrency(benchmark)} market benchmark and ${formatCurrency(Math.round(terraPerUnit))} at the rest of the portfolio. Rebidding at benchmark would save an estimated ${formatCurrencyShort(excess)} a year.`,
      drivers: ["contract_services"],
      impact: excess,
      impact_label: "estimated annual savings",
      is_estimate: true,
      confidence: "medium",
      severity: excess,
      evidence: [
        { label: "GreenScape spend, T12", value: formatCurrency(spend), detail: `${joinList(crestline.map((r) => r.short_name))}` },
        { label: "Cost per unit", value: formatCurrency(Math.round(spend / units)), detail: `${formatCurrency(benchmark)} benchmark` },
        { label: "Rest of portfolio", value: formatCurrency(Math.round(terraPerUnit)), detail: "Terra Verde Landscapes, per unit" },
      ],
      sources: crestline.flatMap((r) => sourcesFor(r)),
      data_through: crestline.map((r) => r.data_through).sort()[0],
      recommended_action: "Ask Crestline to rebid landscaping across all four properties before the contract renews.",
    });
  }

  // ---- Opportunity: renewal pricing portfolio-wide -------------------------
  {
    const rest = records.filter((r) => r.id !== "prop_brookstone");
    const roll = portfolioRentRoll(rest.map((r) => r.id)).filter((r) => r.lease);
    const expiring = roll.filter((r) => (r.days_to_expiry ?? 999) <= RENEWAL_WINDOW_DAYS);
    const below = expiring.filter((r) => r.gap_pct >= BELOW_MARKET_THRESHOLD);
    const uplift = below.reduce((s, r) => s + r.gap * 12 * RENEWAL_CAPTURE, 0);
    const props = [...new Set(below.map((r) => r.unit.property_id))];
    const top = props
      .map((id) => ({ id, n: below.filter((r) => r.unit.property_id === id).length }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 3)
      .map((x) => byId(x.id).short_name);
    out.push({
      id: "opp_portfolio_renewals",
      org_id: ORG_ID,
      type: "opportunity",
      property_id: null,
      title: `${below.length} more below-market renewals across the portfolio`,
      summary: `${below.length} other leases expiring in the next 90 days are at least 5% below market.`,
      diagnosis: `Outside Brookstone Park, ${expiring.length} leases expire by ${formatDate(renewalWindowEnd())} and ${below.length} of them are at least ${pct(BELOW_MARKET_THRESHOLD, 0)} below market, concentrated at ${joinList(top)}. Pricing those renewals at ${pct(RENEWAL_CAPTURE, 0)} of the gap would add an estimated ${formatCurrencyShort(uplift)} a year.`,
      drivers: ["loss_to_lease"],
      impact: uplift,
      impact_label: "estimated annual revenue",
      is_estimate: true,
      confidence: "low",
      severity: uplift * 0.8,
      evidence: [
        { label: "Leases expiring in 90 days", value: String(expiring.length), detail: `${rest.length} properties` },
        { label: "5%+ below market", value: String(below.length), detail: joinList(top) + " lead" },
        { label: "Assumption", value: `${pct(RENEWAL_CAPTURE, 0)} of gap`, detail: "Captured at renewal; estimate" },
      ],
      sources: rest.flatMap((r) => sourcesFor(r, ["rent_roll"])).slice(0, 6),
      data_through: monthEndOfLatest(rest),
      recommended_action: "Review renewal pricing for the next 90 days of expirations with each property manager.",
    });
  }

  return out;
}

/** Properties a portfolio-level insight draws on; it shows only once all of them are in. */
const PORTFOLIO_SCOPE: Record<string, string[]> = {
  opp_landscaping_rebid: properties.filter((p) => p.property_manager_id === "pm_crestline").map((p) => p.id),
  opp_portfolio_renewals: properties.map((p) => p.id),
};

/** Insights for the properties in the portfolio. A new workspace sees only what its uploads support. */
function visibleInsights(): Insight[] {
  const all = computeInsights();
  if (!isNewWorkspace()) return all;
  const inPortfolio = new Set(propertyRecords().map((r) => r.id));
  return all.filter((i) => (i.property_id ? [i.property_id] : (PORTFOLIO_SCOPE[i.id] ?? [])).every((id) => inPortfolio.has(id)));
}

function monthEndOfLatest(records: PropertyRecord[]) {
  return records.map((r) => r.data_through).sort()[0];
}

export async function listInsights(orgId: string, filter: { type?: Insight["type"]; propertyId?: string } = {}): Promise<Insight[]> {
  await delay();
  return visibleInsights()
    .filter((i) => i.org_id === orgId)
    .filter((i) => !filter.type || i.type === filter.type)
    .filter((i) => !filter.propertyId || i.property_id === filter.propertyId)
    .sort((a, b) => b.severity - a.severity);
}

export async function getInsight(id: string): Promise<Insight | null> {
  await delay();
  return visibleInsights().find((i) => i.id === id) ?? null;
}

// ---- Executive summary --------------------------------------------------

export interface ExecutiveSummary {
  sentences: SummarySentence[];
  data_through: string;
  lagging: PropertyRecord[];
  generated_at: string;
}

export async function getExecutiveSummary(orgId: string, role: Role): Promise<ExecutiveSummary> {
  const summary = await getPortfolioSummary(orgId, "qtd");
  const insights = await listInsights(orgId);
  const records = summary.properties.map((p) => p.property);
  const lagging = records.filter((r) => summary.lagging_property_ids.includes(r.id));
  const f = summary.financials;
  const variance = f.noi.actual - f.noi.budget;
  const issues = insights.filter((i) => i.type === "issue");
  const opportunities = insights.filter((i) => i.type === "opportunity");
  const allSources = records.flatMap((r) => sourcesFor(r)).slice(0, 8);

  const headline: SummarySentence = {
    text: `Portfolio NOI is ${formatCurrencyShort(f.noi.actual)} ${periodPhrase("qtd")}, ${money(variance)} (${pct(Math.abs(variance / f.noi.budget))}) ${variance < 0 ? "below" : "above"} budget.`,
    evidence: [
      { label: "NOI, QTD", value: formatCurrency(f.noi.actual), detail: summary.period_label },
      { label: "Budget", value: formatCurrency(f.noi.budget), detail: "Same months, same properties" },
      { label: "Variance", value: formatCurrency(variance), detail: variance < 0 ? "Unfavorable" : "Favorable" },
      { label: "Properties included", value: String(records.length), detail: `${summary.units.toLocaleString("en-US")} units` },
    ],
    sources: allSources,
  };

  const fromInsight = (i: Insight | undefined): SummarySentence[] =>
    i ? [{ text: i.summary, evidence: i.evidence, sources: i.sources, insight_id: i.id, is_estimate: i.is_estimate }] : [];

  const freshness: SummarySentence[] = lagging.length
    ? [
        {
          text: `${joinList(lagging.map((r) => r.name))} ${lagging.length === 1 ? "has" : "have"} no ${formatMonth(LATEST_MONTH, "long").split(" ")[0]} T12 yet, so ${lagging.length === 1 ? "its" : "their"} numbers run through ${formatDate(lagging[0].data_through)}.`,
          evidence: lagging.map((r) => ({ label: r.name, value: `Through ${formatDate(r.data_through)}`, detail: r.property_manager.name })),
          sources: lagging.flatMap((r) => sourcesFor(r)),
        },
      ]
    : [];

  let sentences: SummarySentence[];
  if (role === "owner") {
    const cash = estimatedCashFlow(summary);
    const byManager = propertyManagers.map((m) => {
      const perf = summary.properties.filter((p) => p.property.property_manager_id === m.id);
      const fm = combineFinancials(perf.map((p) => p.financials), "qtd", f.months);
      return { m, variance: fm.noi.actual - fm.noi.budget, budget: fm.noi.budget };
    });
    const worst = [...byManager].sort((a, b) => a.variance - b.variance)[0];
    const rest = byManager.filter((x) => x !== worst);
    const restVar = rest.reduce((s, x) => s + x.variance, 0) / rest.reduce((s, x) => s + x.budget, 0);
    sentences = [
      headline,
      {
        text: `Estimated cash flow after debt service is ${formatCurrencyShort(cash.cash_flow)} ${periodPhrase("qtd")}, before capital expenditures and reserves.`,
        evidence: [
          { label: "NOI, QTD", value: formatCurrency(cash.noi) },
          { label: "Debt service, QTD", value: formatCurrency(cash.debt_service), detail: "Scheduled payments" },
          { label: "Cash flow after debt service", value: formatCurrency(cash.cash_flow), detail: "Estimate" },
        ],
        sources: allSources,
        is_estimate: true,
      },
      {
        text: `${worst.m.name} is ${money(worst.variance)} behind budget, mostly at Lakeline Flats; the other three managers are ${pct(Math.abs(restVar))} ${restVar < 0 ? "below" : "above"} budget combined.`,
        evidence: byManager.map((x) => ({ label: x.m.name, value: formatCurrency(x.variance), detail: `${pct(x.variance / x.budget)} vs budget` })),
        sources: allSources,
      },
      ...fromInsight(opportunities[0]),
      ...freshness,
    ];
  } else if (role === "executive") {
    const t12 = await getPortfolioSummary(orgId, "t12");
    const t12Var = t12.financials.noi.actual - t12.financials.noi.budget;
    const dfw = summary.properties.filter((p) => p.property.market === "Dallas–Fort Worth");
    const dfwUnits = dfw.reduce((s, p) => s + p.property.units, 0);
    const unfavorable = summary.properties.map((p) => p.financials.noi.actual - p.financials.noi.budget).filter((v) => v < 0);
    const dfwUnfav = dfw.map((p) => p.financials.noi.actual - p.financials.noi.budget).filter((v) => v < 0);
    const share = dfwUnfav.reduce((s, v) => s + v, 0) / unfavorable.reduce((s, v) => s + v, 0);
    const oppTotal = opportunities.reduce((s, i) => s + i.impact, 0);
    sentences = [
      {
        text: `Trailing 12-month NOI is ${formatCurrencyShort(t12.financials.noi.actual)}, ${pct(Math.abs(t12Var / t12.financials.noi.budget))} below budget; ${periodPhrase("qtd")} the gap widened to ${pct(Math.abs(variance / f.noi.budget))}.`,
        evidence: [
          { label: "NOI, T12", value: formatCurrency(t12.financials.noi.actual), detail: `Budget ${formatCurrency(t12.financials.noi.budget)}` },
          { label: "NOI, QTD", value: formatCurrency(f.noi.actual), detail: `Budget ${formatCurrency(f.noi.budget)}` },
        ],
        sources: allSources,
      },
      {
        text: `Dallas–Fort Worth holds ${pct(dfwUnits / summary.units, 0)} of units but ${pct(share, 0)} of the unfavorable NOI variance ${periodPhrase("qtd")}.`,
        evidence: dfw.map((p) => ({ label: p.property.name, value: formatCurrency(p.financials.noi.actual - p.financials.noi.budget), detail: `${p.property.units} units` })),
        sources: dfw.flatMap((p) => sourcesFor(p.property)),
      },
      ...fromInsight(issues.find((i) => i.id === "ins_magnolia_bad_debt")),
      {
        text: `Open opportunities add up to an estimated ${formatCurrencyShort(oppTotal)} a year in NOI.`,
        evidence: opportunities.map((i) => ({ label: i.title, value: formatCurrencyShort(i.impact), detail: i.impact_label })),
        sources: [],
        is_estimate: true,
      },
      ...freshness,
    ];
  } else {
    sentences = [headline, ...fromInsight(issues[0]), ...fromInsight(issues[1]), ...fromInsight(opportunities[0]), ...freshness];
  }

  return { sentences, data_through: summary.data_through, lagging, generated_at: `${TODAY}T07:00:00Z` };
}

export function isLagging(record: PropertyRecord) {
  return compareMonths(monthOf(record.data_through), LATEST_MONTH) < 0;
}

/** A short AI summary for one property, built from its numbers and insights. */
export async function getPropertySummary(propertyId: string, period: Period = "qtd"): Promise<SummarySentence[]> {
  const records = propertyRecords();
  const property = records.find((r) => r.id === propertyId);
  if (!property) return [];
  const perf = propertyPerformance(property, period);
  const f = perf.financials;
  const variance = f.noi.actual - f.noi.budget;
  const sources = sourcesFor(property, ["t12", "rent_roll"]);
  const sentences: SummarySentence[] = [];

  if (f.months.length === 0) {
    sentences.push({
      text: `No ${formatMonth(LATEST_MONTH, "long").split(" ")[0]} actuals yet for ${property.name}; the latest data runs through ${formatDate(property.data_through)}.`,
      evidence: [{ label: "Data through", value: formatDate(property.data_through, true) }],
      sources,
    });
    return sentences;
  }

  sentences.push({
    text: `NOI is ${formatCurrencyShort(f.noi.actual)} ${periodPhrase(period)}, ${money(variance)} (${pct(Math.abs(variance / f.noi.budget))}) ${variance < 0 ? "below" : "above"} budget.`,
    evidence: [
      { label: "NOI", value: formatCurrency(f.noi.actual) },
      { label: "Budget", value: formatCurrency(f.noi.budget) },
      { label: "Revenue", value: formatCurrency(f.revenue.actual), detail: `Budget ${formatCurrency(f.revenue.budget)}` },
      { label: "Expenses", value: formatCurrency(f.expenses.actual), detail: `Budget ${formatCurrency(f.expenses.budget)}` },
    ],
    sources,
  });

  const worst = [...perf.drivers].sort((a, b) => a.variance - b.variance)[0];
  const best = [...perf.drivers].sort((a, b) => b.variance - a.variance)[0];
  if (worst.variance < -1_000) {
    sentences.push({
      text: `The largest drag is ${DRIVER_LABELS[worst.driver].toLowerCase()}, ${money(worst.variance)} against budget${best.variance > 1_000 ? `, partly offset by ${DRIVER_LABELS[best.driver].toLowerCase()} (${formatCurrencyShort(best.variance)} favorable)` : ""}.`,
      evidence: perf.drivers.map((d) => ({ label: DRIVER_LABELS[d.driver], value: formatCurrency(d.variance), detail: d.variance >= 0 ? "Favorable" : "Unfavorable" })),
      sources,
    });
  }

  const o = perf.occupancy;
  sentences.push({
    text: `Physical occupancy is ${pct(o.physical)} against a ${pct(o.physical_budget)} budget; economic occupancy is ${pct(o.economic)}.`,
    evidence: [
      { label: "Physical occupancy", value: pct(o.physical), detail: `Budget ${pct(o.physical_budget)} · month end` },
      { label: "Economic occupancy", value: pct(o.economic), detail: `Budget ${pct(o.economic_budget)} · ${periodPhrase(period)}` },
      { label: "Delinquency", value: pct(o.delinquency), detail: formatCurrency(o.delinquent_balance) },
    ],
    sources,
  });

  for (const insight of visibleInsights().filter((i) => i.property_id === propertyId)) {
    sentences.push({ text: insight.summary, evidence: insight.evidence, sources: insight.sources, insight_id: insight.id, is_estimate: insight.is_estimate });
  }
  if (isLagging(property)) {
    sentences.push({
      text: `The ${formatMonth(LATEST_MONTH, "long").split(" ")[0]} T12 has not posted yet, so these numbers run through ${formatDate(property.data_through)}.`,
      evidence: [{ label: "Data through", value: formatDate(property.data_through, true) }],
      sources,
    });
  }
  return sentences;
}
