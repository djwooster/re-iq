import { LATEST_MONTH, TODAY, formatDate, formatMonth, periodLabel } from "@/lib/dates";
import { formatCurrency, formatCurrencyShort, formatPercent, formatSignedPercent, joinList } from "@/lib/format";
import type { Period } from "@/lib/types";
import { delay, propertyRecords } from "./core";
import { getDecisions, listIssues } from "./issues";
import { ORG_ID } from "./mock/catalog";
import { getManagerScores, listLoans } from "./performance";
import { getPortfolioSummary } from "./portfolio";
import { BELOW_MARKET, expiryWindowEnd, getRentRoll, isBelowMarketExpiring } from "./property-detail";
// Share of the gap to market assumed recovered at renewal. An estimate.
import { RENEWAL_CAPTURE } from "./properties";
import { readOverlay, writeOverlay } from "./store";

/**
 * Reports for the people Jordan answers to, built from the same numbers as
 * every screen. Jordan edits the words; tables stay tied to the data.
 */

export type ReportKind = "owner_monthly" | "lp_quarterly" | "lender";

export const REPORT_KINDS: { id: ReportKind; label: string; audience: string; period: string }[] = [
  { id: "owner_monthly", label: "Monthly owner update", audience: "Dana Whitfield, Owner / GP", period: formatMonth(LATEST_MONTH, "long") },
  { id: "lp_quarterly", label: "Quarterly LP update", audience: "Limited partners", period: periodLabel("qtd") },
  { id: "lender", label: "Lender covenant report", audience: "Lenders", period: `Trailing 12 months through ${formatMonth(LATEST_MONTH)}` },
];

export type ReportBlock =
  | { kind: "text"; id: string; text: string }
  | { kind: "metrics"; id: string; items: { label: string; value: string; detail?: string }[] }
  | { kind: "table"; id: string; columns: { label: string; align?: "right" }[]; rows: string[][] };

export interface ReportSection {
  id: string;
  title: string;
  blocks: ReportBlock[];
}

export interface ReportDoc {
  kind: ReportKind;
  sections: ReportSection[];
  edited_at: string | null;
}

// ---- Where NOI can grow --------------------------------------------------------------

export interface GrowthItem {
  property_name: string;
  text: string;
  annual: number;
}

/** Upside already in the rent rolls: below-market leases that expire soon. Facts plus one stated assumption. */
export async function listGrowth(orgId: string): Promise<GrowthItem[]> {
  await delay();
  const records = propertyRecords().filter((r) => r.org_id === orgId);
  const items: GrowthItem[] = [];
  for (const r of records) {
    const rows = (await getRentRoll(r.id)).filter(isBelowMarketExpiring);
    if (rows.length < 8) continue;
    const gap = rows.reduce((s, x) => s + x.gap, 0);
    const annual = gap * 12 * RENEWAL_CAPTURE;
    items.push({
      property_name: r.name,
      annual,
      text: `${rows.length} leases at least ${formatPercent(BELOW_MARKET, 0)} below market expire by ${formatDate(expiryWindowEnd())}, ${formatCurrency(gap)} a month under market rent. At ${formatPercent(RENEWAL_CAPTURE, 0)} of the gap, renewals would add about ${formatCurrencyShort(annual)} a year (estimate).`,
    });
  }
  return items.sort((a, b) => b.annual - a.annual).slice(0, 3);
}

// ---- Building reports ------------------------------------------------------------------

let seq = 0;
const bid = (prefix: string) => `${prefix}_${++seq}`;

async function performanceSections(period: Period): Promise<ReportSection[]> {
  const s = await getPortfolioSummary(ORG_ID, period);
  const f = s.financials;
  const v = f.noi.actual - f.noi.budget;
  const lagging = s.properties.filter((p) => s.lagging_property_ids.includes(p.property.id)).map((p) => p.property);
  return [
    {
      id: "summary",
      title: "Summary",
      blocks: [
        {
          kind: "text",
          id: bid("t"),
          text: `NOI was ${formatCurrencyShort(f.noi.actual)} for ${s.period_label}, ${formatCurrencyShort(Math.abs(v))} (${formatPercent(Math.abs(v / f.noi.budget))}) ${v < 0 ? "below" : "above"} budget. Physical occupancy was ${formatPercent(s.occupancy.physical)} and economic occupancy ${formatPercent(s.occupancy.economic)}.${lagging.length ? ` ${joinList(lagging.map((p) => p.name))} ${lagging.length === 1 ? "is" : "are"} included through ${formatDate(lagging[0].data_through)}; ${formatMonth(LATEST_MONTH, "long").split(" ")[0]} reports had not arrived by ${formatDate(TODAY)}.` : ""}`,
        },
        {
          kind: "metrics",
          id: bid("m"),
          items: [
            { label: "NOI", value: formatCurrencyShort(f.noi.actual), detail: `Budget ${formatCurrencyShort(f.noi.budget)}` },
            { label: "Vs budget", value: formatSignedPercent(v / f.noi.budget), detail: formatCurrencyShort(v) },
            { label: "Physical occupancy", value: formatPercent(s.occupancy.physical), detail: `Budget ${formatPercent(s.occupancy.physical_budget)}` },
            { label: "Economic occupancy", value: formatPercent(s.occupancy.economic), detail: `Budget ${formatPercent(s.occupancy.economic_budget)}` },
          ],
        },
      ],
    },
    {
      id: "properties",
      title: "Property performance",
      blocks: [
        {
          kind: "table",
          id: bid("tb"),
          columns: [{ label: "Property" }, { label: "Manager" }, { label: "NOI", align: "right" }, { label: "Budget", align: "right" }, { label: "Vs budget", align: "right" }, { label: "Occupancy", align: "right" }],
          rows: s.properties.map((p) => [
            p.property.name,
            p.property.property_manager.name,
            formatCurrency(p.financials.noi.actual),
            formatCurrency(p.financials.noi.budget),
            formatSignedPercent(p.financials.noi.actual / p.financials.noi.budget - 1),
            formatPercent(p.occupancy.physical),
          ]),
        },
      ],
    },
  ];
}

async function issuesSection(includeOpen: boolean): Promise<ReportSection> {
  const { resolved } = await getDecisions(ORG_ID);
  const issues = await listIssues(ORG_ID);
  const open = issues.filter((i) => i.status !== "resolved");
  const blocks: ReportBlock[] = resolved.map((i) => ({
    kind: "text" as const,
    id: bid("t"),
    text: `${i.scope_label}. ${i.headline}. ${i.driver.split(". ")[0]}.${i.note ? ` Decision: ${i.note}` : ""}${i.result ? ` Result: ${i.result.sentence} (estimate).` : ""}`,
  }));
  if (includeOpen) {
    blocks.push({
      kind: "table",
      id: bid("tb"),
      columns: [{ label: "Issue" }, { label: "Property" }, { label: "Status" }, { label: "Vs budget", align: "right" }],
      rows: open.map((i) => [i.headline, i.scope_label, i.status === "acting" ? "Acting" : "Open", formatCurrency(i.impact)]),
    });
  }
  return { id: "issues", title: "Issues and results", blocks };
}

async function leasingSection(): Promise<ReportSection> {
  const scores = await getManagerScores(ORG_ID, "t12");
  const units = scores.reduce((s, m) => s + m.context.units, 0);
  const renewal = scores.reduce((s, m) => s + m.measures.renewal_rate * m.context.units, 0) / units;
  const s = await getPortfolioSummary(ORG_ID, "mtd");
  const ltl = s.financials.byCategory.loss_to_lease;
  return {
    id: "leasing",
    title: "Leasing and revenue",
    blocks: [
      {
        kind: "metrics",
        id: bid("m"),
        items: [
          { label: "Renewal rate, T12", value: formatPercent(renewal), detail: "Leases expiring that renewed" },
          { label: `Loss to lease, ${formatMonth(LATEST_MONTH, "tiny")}`, value: formatCurrency(-ltl.actual), detail: `Budget ${formatCurrency(-ltl.budget)}` },
          { label: "Delinquency", value: formatPercent(s.occupancy.delinquency), detail: `${formatCurrency(s.occupancy.delinquent_balance)} past due` },
        ],
      },
    ],
  };
}

async function growthSection(): Promise<ReportSection> {
  const items = await listGrowth(ORG_ID);
  return { id: "growth", title: "Where NOI can grow", blocks: items.map((g) => ({ kind: "text" as const, id: bid("t"), text: `${g.property_name}: ${g.text}` })) };
}

async function debtSection(): Promise<ReportSection[]> {
  const loans = await listLoans(ORG_ID);
  const breached = loans.filter((l) => l.headroom < 0);
  const tightest = [...loans].sort((a, b) => a.headroom - b.headroom)[0];
  return [
    {
      id: "covenants",
      title: "Debt and covenants",
      blocks: [
        {
          kind: "text",
          id: bid("t"),
          text: `${loans.length - breached.length} of ${loans.length} loans meet their ${loans[0].covenant.toFixed(2)}x DSCR covenant on trailing-12 NOI.${breached.length ? ` ${joinList(breached.map((l) => `${l.property.name} is at ${l.dscr.toFixed(2)}x`))}.` : ` The tightest is ${tightest.property.name} at ${tightest.dscr.toFixed(2)}x.`}`,
        },
        {
          kind: "table",
          id: bid("tb"),
          columns: [
            { label: "Property" },
            { label: "Lender" },
            { label: "Balance", align: "right" },
            { label: "Rate", align: "right" },
            { label: "T12 NOI", align: "right" },
            { label: "Debt service", align: "right" },
            { label: "DSCR", align: "right" },
            { label: "Headroom", align: "right" },
            { label: "Debt yield", align: "right" },
          ],
          rows: loans.map((l) => [
            l.property.name,
            l.lender,
            formatCurrency(l.balance),
            formatPercent(l.rate, 2),
            formatCurrency(l.noi_t12),
            formatCurrency(l.annual_debt_service),
            `${l.dscr.toFixed(2)}x`,
            `${l.headroom >= 0 ? "+" : ""}${l.headroom.toFixed(2)}x`,
            formatPercent(l.debt_yield),
          ]),
        },
      ],
    },
  ];
}

async function build(kind: ReportKind): Promise<ReportDoc> {
  seq = 0;
  let sections: ReportSection[];
  if (kind === "owner_monthly") {
    sections = [...(await performanceSections("mtd")), await issuesSection(true), await growthSection(), await leasingSection()];
  } else if (kind === "lp_quarterly") {
    sections = [...(await performanceSections("qtd")), await issuesSection(false), await leasingSection(), ...(await debtSection())];
  } else {
    const lakeline = (await listIssues(ORG_ID)).find((i) => i.id === "iss_lakeline_vacancy");
    sections = [...(await debtSection()), ...(lakeline ? [{ id: "context", title: "Context on loans below covenant", blocks: [{ kind: "text" as const, id: bid("t"), text: `${lakeline.scope_label}: ${lakeline.driver}` }] }] : [])];
  }
  return { kind, sections, edited_at: null };
}

export async function getReport(kind: ReportKind): Promise<ReportDoc> {
  return readOverlay().reportDocs[kind] ?? (await build(kind));
}

export async function saveReport(doc: ReportDoc): Promise<void> {
  await delay(100);
  writeOverlay((d) => {
    d.reportDocs[doc.kind] = { ...doc, edited_at: `${TODAY}T${new Date().toISOString().slice(11, 19)}Z` };
  });
}

export async function resetReport(kind: ReportKind): Promise<void> {
  writeOverlay((d) => {
    delete d.reportDocs[kind];
  });
}

export function sharedReports(): Record<string, string> {
  return readOverlay().sharedReports;
}

export async function setReportShared(kind: ReportKind, shared: boolean): Promise<void> {
  await delay(100);
  writeOverlay((d) => {
    if (shared) d.sharedReports[kind] = `${TODAY}T${new Date().toISOString().slice(11, 19)}Z`;
    else delete d.sharedReports[kind];
  });
}

// ---- Owner view settings ------------------------------------------------------------------

export function getOwnerViewSettings() {
  return readOverlay().ownerView;
}

export async function setOwnerViewSettings(patch: Partial<ReturnType<typeof getOwnerViewSettings>>): Promise<void> {
  writeOverlay((d) => {
    d.ownerView = { ...d.ownerView, ...patch };
  });
}

