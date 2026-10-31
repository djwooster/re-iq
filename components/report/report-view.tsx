"use client";

import { Check, Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { OutcomeLine } from "@/components/actions/outcome-line";
import { EstimateTag } from "@/components/insights/evidence";
import { useApp } from "@/components/shell/app-context";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/empty-state";
import { Metric, PointsDelta, Variance } from "@/components/ui/metric";
import { FadeIn } from "@/components/ui/motion";
import { Table, Td, Th, THead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { formatDate, formatMonth, monthEnd } from "@/lib/dates";
import { type OwnerReport, getOwnerReport, markReportShared } from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import { formatCurrency, formatCurrencyShort, formatPercent, joinList } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/labels";

export function ReportView() {
  const { orgId } = useApp();
  const { data: report } = useData(() => getOwnerReport(orgId), [orgId]);
  const monthLong = report ? formatMonth(report.month, "long") : "";

  return (
    <>
      <PageHeader
        title="Owner report"
        subtitle={report ? `${monthLong} · ${report.shared_at ? `shared ${formatDate(report.shared_at.slice(0, 10))}` : "draft"} · built from the same numbers as every other view` : " "}
        actions={
          <Button icon={<Printer className="size-3" />} onClick={() => window.print()}>
            Print
          </Button>
        }
      />
      <PageBody>
        {!report ? (
          <Skeleton className="h-[640px] w-full rounded-lg" />
        ) : (
          <div className="mx-auto flex max-w-[960px] flex-col gap-3">
            <FadeIn className="print:hidden">
              <Readiness report={report} />
            </FadeIn>
            <FadeIn delay={0.05}>
              <ReportDocument report={report} />
            </FadeIn>
          </div>
        )}
      </PageBody>
    </>
  );
}

/** What still stands between this draft and something the owners can read. */
function Readiness({ report }: { report: OwnerReport }) {
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const { close, questions } = report;
  const accepted = questions.filter((q) => q.status === "accepted").length;
  const toReview = questions.filter((q) => q.status === "answered").length;
  const awaiting = questions.filter((q) => q.status === "sent" || q.status === "draft").length;
  const items = [
    {
      done: close.ready_count === close.properties.length,
      text: `${close.ready_count} of ${close.properties.length} properties have every report in`,
      href: "/app/close",
      link: "Close",
    },
    {
      done: accepted === questions.length,
      text: `${accepted} of ${questions.length} variance explanations accepted${toReview ? ` · ${toReview} to review` : ""}${awaiting ? ` · ${awaiting} not answered yet` : ""}`,
      href: "/app/questions",
      link: "Questions",
    },
  ];

  const share = async (shared: boolean) => {
    setPending(true);
    await markReportShared(report.month, shared);
    setPending(false);
    toast(shared ? "Marked as shared" : "Back to draft", { detail: shared ? "Investor seats see this report. Print it for anyone without one." : undefined });
  };

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <ul className="flex flex-col gap-1.5">
        {items.map((it) => (
          <li key={it.href} className="flex items-center gap-2 text-xs text-fg-2">
            {it.done ? <Check className="size-3 text-favorable" strokeWidth={2} /> : <span className="size-1.5 rounded-full bg-warning" aria-hidden />}
            <span>{it.text}</span>
            {!it.done && (
              <Link href={it.href} className="text-fg-3 underline-offset-2 hover:text-fg hover:underline">
                {it.link}
              </Link>
            )}
          </li>
        ))}
      </ul>
      {report.shared_at ? (
        <Button size="xs" variant="ghost" loading={pending} onClick={() => share(false)}>
          Move back to draft
        </Button>
      ) : (
        <Button size="xs" variant="primary" loading={pending} onClick={() => share(true)}>
          Mark as shared with owners
        </Button>
      )}
    </Card>
  );
}

function ReportDocument({ report }: { report: OwnerReport }) {
  const m = report.month_summary;
  const q = report.quarter_summary;
  const f = m.financials;
  const variance = f.noi.actual - f.noi.budget;
  const qVariance = q.financials.noi.actual - q.financials.noi.budget;
  const posted = report.properties.filter((p) => p.posted);
  const notPosted = report.properties.filter((p) => !p.posted);
  const monthName = formatMonth(report.month, "long").split(" ")[0];
  const measured = report.outcomes.filter((o) => o.state === "measured");
  const recovered = measured.reduce((s, o) => s + o.recovered, 0);
  const actions = [...report.actions].sort((a, b) => b.estimated_impact - a.estimated_impact).slice(0, 5);

  return (
    <Card className="overflow-hidden print:border-0">
      <header className="border-b border-border px-6 py-5">
        <div className="eyebrow">Owner report · {formatMonth(report.month, "long")}</div>
        <h2 className="mt-1 text-base font-semibold text-fg">{report.organization_name}</h2>
        <p className="mt-0.5 text-[11px] text-fg-3">
          Prepared by {report.prepared_by} · data through <span className="num">{formatDate(monthEnd(report.month), true)}</span>
          {report.shared_at ? (
            <>
              {" "}
              · shared <span className="num">{formatDate(report.shared_at.slice(0, 10))}</span>
            </>
          ) : (
            " · draft"
          )}
        </p>
      </header>

      <section className="px-6 py-5">
        <p className="max-w-[72ch] text-[13px] leading-relaxed text-fg">
          {monthName} NOI was {formatCurrencyShort(f.noi.actual)} across {posted.length} properties, {formatCurrencyShort(Math.abs(variance))} ({formatPercent(Math.abs(variance / f.noi.budget))}){" "}
          {variance < 0 ? "below" : "above"} budget. Quarter to date, NOI is {formatCurrencyShort(Math.abs(qVariance))} {qVariance < 0 ? "below" : "above"} budget. Physical occupancy ended the month at{" "}
          {formatPercent(m.occupancy.physical)} against a {formatPercent(m.occupancy.physical_budget)} budget; economic occupancy was {formatPercent(m.occupancy.economic)}.
          {notPosted.length > 0 &&
            ` ${joinList(notPosted.map((p) => p.performance.property.name))} ${notPosted.length === 1 ? "is" : "are"} not included until ${notPosted.length === 1 ? "its" : "their"} ${monthName} reports are complete.`}
        </p>
      </section>

      <section className="grid grid-cols-2 border-y border-border md:grid-cols-4 md:divide-x md:divide-border">
        <Metric
          label={`NOI · ${formatMonth(report.month, "tiny")}`}
          value={f.noi.actual}
          format={formatCurrencyShort}
          sub={
            <>
              <Variance value={variance} short /> vs budget
            </>
          }
        />
        <Metric
          label="NOI · QTD"
          value={q.financials.noi.actual}
          format={formatCurrencyShort}
          sub={
            <>
              <Variance value={qVariance} short /> vs budget
            </>
          }
        />
        <Metric
          label="Physical occupancy"
          value={m.occupancy.physical}
          format={(v) => formatPercent(v)}
          sub={
            <>
              <PointsDelta delta={m.occupancy.physical - m.occupancy.physical_budget} /> vs budget
            </>
          }
        />
        <Metric
          label="Economic occupancy"
          value={m.occupancy.economic}
          format={(v) => formatPercent(v)}
          sub={
            <>
              <PointsDelta delta={m.occupancy.economic - m.occupancy.economic_budget} /> vs budget
            </>
          }
        />
      </section>

      <section className="py-5">
        <h3 className="px-6 pb-2 text-[13px] font-semibold text-fg">Properties</h3>
        <Table>
          <THead>
            <Th className="first:pl-6">Property</Th>
            <Th align="right">NOI</Th>
            <Th align="right">vs budget</Th>
            <Th align="right">Physical occ.</Th>
            <Th className="last:pr-6">Manager&apos;s explanation</Th>
          </THead>
          <tbody>
            {[...report.properties]
              .sort((a, b) => Number(b.posted) - Number(a.posted) || a.performance.financials.noi.actual - a.performance.financials.noi.budget - (b.performance.financials.noi.actual - b.performance.financials.noi.budget))
              .map((row) => {
                const p = row.performance;
                const v = p.financials.noi.actual - p.financials.noi.budget;
                return (
                  <tr key={p.property.id} className="border-b border-border/70 align-top last:border-b-0">
                    <Td className="py-2.5 first:pl-6">
                      <div className="text-fg">{p.property.name}</div>
                      <div className="text-[11px] text-fg-3">{p.property.property_manager.name}</div>
                    </Td>
                    {row.posted ? (
                      <>
                        <Td align="right" mono className="py-2.5">
                          {formatCurrency(p.financials.noi.actual)}
                        </Td>
                        <Td align="right" className="py-2.5">
                          <Variance value={v} />
                        </Td>
                        <Td align="right" mono className="py-2.5">
                          {formatPercent(p.occupancy.physical)}
                        </Td>
                      </>
                    ) : (
                      <td colSpan={3} className="num px-3 py-2.5 text-right text-xs text-fg-3">
                        Through {formatDate(p.property.data_through)}
                      </td>
                    )}
                    <Td className="py-2.5 whitespace-normal last:pr-6">
                      {!row.posted ? (
                        <span className="text-fg-3">{monthName} reports not complete</span>
                      ) : row.explanations.length === 0 && row.pending.length === 0 ? (
                        <span className="text-fg-3">Within threshold</span>
                      ) : (
                        <div className="flex max-w-[52ch] flex-col gap-1.5">
                          {row.explanations.map((e) => (
                            <p key={e.id} className="text-xs leading-relaxed text-fg-2">
                              <span className="font-medium text-fg">{CATEGORY_LABELS[e.category]}:</span> {e.answer}
                            </p>
                          ))}
                          {row.pending.length > 0 && (
                            <p className="text-[11px] text-fg-3 print:hidden">
                              Waiting on {joinList(row.pending.map((x) => CATEGORY_LABELS[x.category].toLowerCase()))}
                            </p>
                          )}
                        </div>
                      )}
                    </Td>
                  </tr>
                );
              })}
          </tbody>
        </Table>
      </section>

      <section className="grid gap-6 border-t border-border px-6 py-5 md:grid-cols-2">
        <div>
          <h3 className="text-[13px] font-semibold text-fg">What we&apos;re working on</h3>
          <ul className="mt-2 flex flex-col gap-2.5">
            {actions.map((a) => (
              <li key={a.id} className="text-xs">
                <div className="text-fg">{a.title}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-fg-3">
                  <Badge tone={a.status === "accepted" ? "neutral" : "muted"}>{a.status === "accepted" ? "In progress" : "Proposed"}</Badge>
                  {a.due_date && <span className="num">Due {formatDate(a.due_date)}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-[13px] font-semibold text-fg">Results from earlier actions</h3>
          {measured.length > 0 && (
            <p className="mt-1 text-[11px] text-fg-3">
              <span className={cn("num font-medium", recovered > 0 ? "text-favorable" : "text-unfavorable")}>{formatCurrencyShort(recovered)}</span> of NOI recovered so far
              <EstimateTag />
            </p>
          )}
          <ul className="mt-2 flex flex-col gap-2.5">
            {report.outcomes.map((o) => {
              const property = report.properties.find((p) => p.performance.property.id === o.property_id)?.performance.property;
              return (
                <li key={o.action_id} className="text-xs">
                  <div className="text-fg">{property?.name}</div>
                  <OutcomeLine outcome={o} className="mt-0.5" />
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {report.opportunities.length > 0 && (
        <section className="border-t border-border px-6 py-5">
          <h3 className="text-[13px] font-semibold text-fg">Where NOI can grow</h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {report.opportunities.map((o) => (
              <li key={o.id} className="flex flex-wrap items-baseline justify-between gap-x-4 text-xs text-fg-2">
                <span>{o.title}</span>
                <span className="num text-favorable">
                  +{formatCurrencyShort(o.impact)}/yr
                  {o.is_estimate && <EstimateTag />}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Card>
  );
}
