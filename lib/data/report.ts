import { LATEST_MONTH, TODAY, compareMonths, formatDate, monthOf } from "@/lib/dates";
import { formatCurrencyShort } from "@/lib/format";
import type { Action, Insight, MonthKey, PortfolioSummary, PropertyPerformance, VarianceQuestion } from "@/lib/types";
import { type ActionOutcome, listActions, listOutcomes } from "./actions";
import { type CloseStatus, getCloseStatus } from "./close";
import { delay } from "./core";
import { listInsights } from "./insights";
import { getPortfolioSummary } from "./portfolio";
import { listQuestions } from "./questions";
import { readOverlay, writeOverlay } from "./store";

/**
 * The monthly owner report: the month's numbers, the property managers'
 * explanations next to the lines they explain, what is being done, and what
 * earlier fixes returned. Assembled from the same data as every other view.
 */

export interface ReportPropertyRow {
  performance: PropertyPerformance;
  /** Explanations accepted for this property's variances this month. */
  explanations: VarianceQuestion[];
  /** Variances still waiting on an accepted explanation. */
  pending: VarianceQuestion[];
  posted: boolean;
}

export interface OwnerReport {
  month: MonthKey;
  organization_name: string;
  prepared_by: string;
  month_summary: PortfolioSummary;
  quarter_summary: PortfolioSummary;
  properties: ReportPropertyRow[];
  issues: Insight[];
  opportunities: Insight[];
  actions: Action[];
  outcomes: ActionOutcome[];
  close: CloseStatus;
  questions: VarianceQuestion[];
  shared_at: string | null;
}

export async function getOwnerReport(orgId: string, month: MonthKey = LATEST_MONTH): Promise<OwnerReport> {
  const [monthSummary, quarterSummary, questions, insights, actions, outcomes, close] = await Promise.all([
    getPortfolioSummary(orgId, "mtd"),
    getPortfolioSummary(orgId, "qtd"),
    listQuestions(orgId, month),
    listInsights(orgId),
    listActions(orgId),
    listOutcomes(orgId),
    getCloseStatus(orgId, month),
  ]);
  const properties = monthSummary.properties.map((performance) => {
    const mine = questions.filter((q) => q.property_id === performance.property.id);
    return {
      performance,
      explanations: mine.filter((q) => q.status === "accepted"),
      pending: mine.filter((q) => q.status !== "accepted"),
      posted: compareMonths(monthOf(performance.property.data_through), month) >= 0,
    };
  });
  return {
    month,
    organization_name: close.organization_name,
    prepared_by: close.sender_name,
    month_summary: monthSummary,
    quarter_summary: quarterSummary,
    properties,
    issues: insights.filter((i) => i.type === "issue"),
    opportunities: insights.filter((i) => i.type === "opportunity"),
    actions: actions.filter((a) => a.status === "accepted" || a.status === "new"),
    outcomes,
    close,
    questions,
    shared_at: readOverlay().reportsShared[month] ?? null,
  };
}

export async function markReportShared(month: MonthKey = LATEST_MONTH, shared = true): Promise<void> {
  await delay(200);
  writeOverlay((d) => {
    if (shared) d.reportsShared[month] = `${TODAY}T${new Date().toISOString().slice(11, 19)}Z`;
    else delete d.reportsShared[month];
  });
}

export interface CloseStep {
  id: "reports" | "review" | "questions" | "actions" | "report";
  label: string;
  href: string;
  state: "done" | "active" | "waiting";
  detail: string;
}

/** The month's close as five steps, for the Overview strip. */
export async function getCloseProgress(orgId: string, month: MonthKey = LATEST_MONTH): Promise<{ month: MonthKey; steps: CloseStep[]; recovered: number }> {
  const report = await getOwnerReport(orgId, month);
  const { close, questions, outcomes } = report;
  const f = report.month_summary.financials;
  const variance = f.noi.actual - f.noi.budget;
  const reportsDone = close.ready_count === close.properties.length;
  const count = (s: VarianceQuestion["status"]) => questions.filter((q) => q.status === s).length;
  const allActions = await listActions(orgId);
  const newActions = allActions.filter((a) => a.status === "new").length;
  const openActions = allActions.filter((a) => a.status === "new" || a.status === "accepted").length;
  const questionsDone = questions.length > 0 && count("accepted") === questions.length;

  const steps: CloseStep[] = [
    {
      id: "reports",
      label: "Reports in",
      href: "/app/close",
      state: reportsDone ? "done" : "active",
      detail: `${close.ready_count} of ${close.properties.length} properties ready`,
    },
    {
      id: "review",
      label: "Review the month",
      href: "/app/performance",
      state: close.ready_count > 0 ? "done" : "waiting",
      detail: `NOI ${variance < 0 ? "-" : "+"}${formatCurrencyShort(Math.abs(variance))} vs budget`,
    },
    {
      id: "questions",
      label: "Ask managers",
      href: "/app/questions",
      state: questionsDone ? "done" : "active",
      detail: [count("draft") && `${count("draft")} to send`, count("sent") && `${count("sent")} awaiting`, count("answered") && `${count("answered")} to review`]
        .filter(Boolean)
        .join(" · ") || `${count("accepted")} accepted`,
    },
    {
      id: "actions",
      label: "Decide",
      href: "/app/actions",
      state: newActions === 0 ? "done" : "active",
      detail: newActions ? `${newActions} new of ${openActions} open` : `${openActions} open`,
    },
    {
      id: "report",
      label: "Report to owners",
      href: "/app/report",
      state: report.shared_at ? "done" : reportsDone && questionsDone ? "active" : "waiting",
      detail: report.shared_at ? `Shared ${formatDate(report.shared_at.slice(0, 10))}` : "Draft",
    },
  ];
  const recovered = outcomes.filter((o) => o.state === "measured").reduce((s, o) => s + o.recovered, 0);
  return { month, steps, recovered };
}
