"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ChartLegend, TrendChart } from "@/components/charts/trend-chart";
import { EstimateTag } from "@/components/insights/evidence";
import { useApp } from "@/components/shell/app-context";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { SourceLink, useOpenSource } from "@/components/sources/source-drawer";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/empty-state";
import { Variance } from "@/components/ui/metric";
import { FadeIn } from "@/components/ui/motion";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { LATEST_MONTH, formatDate } from "@/lib/dates";
import { getIssue, getIssueTrend, type Issue } from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import { formatCurrencyShort, formatPercent } from "@/lib/format";
import { ISSUE_STATUS_LABELS, RESOLVE_REASON_LABELS } from "@/lib/labels";
import { IssueStatusBadge } from "./issue-list";
import { StatusControl } from "./status-control";

export function IssueView({ id }: { id: string }) {
  const { orgId } = useApp();
  const { data: issue, loading } = useData(() => getIssue(id), [id, orgId]);

  if (!issue) {
    return (
      <>
        <PageHeader title="Issue" />
        <PageBody>
          {loading ? <Skeleton className="h-40 w-full rounded-lg" /> : <Card><EmptyState title="Issue not found" description="It may belong to a property that isn't in this workspace." /></Card>}
        </PageBody>
      </>
    );
  }

  const stale = !issue.data_through.startsWith(LATEST_MONTH);
  return (
    <>
      <PageHeader
        title={issue.scope_label}
        subtitle={`${issue.manager_name} · data through ${formatDate(issue.data_through, true)}`}
        actions={
          <Link href="/app" className="flex items-center gap-1 text-[11px] text-fg-3 hover:text-fg">
            <ArrowLeft className="size-3" /> Overview
          </Link>
        }
      />
      <PageBody>
        <div className="flex flex-col gap-3">
          <FadeIn>
            <Card className="flex flex-wrap items-start justify-between gap-4 px-4 py-4">
              <div className="flex min-w-0 flex-col gap-3">
                <div className="flex items-center gap-2">
                  <IssueStatusBadge status={issue.status} />
                  <span className="num text-[11px] text-fg-3">{issue.window_label}</span>
                  {stale && <span className="text-[11px] text-warning">Through {formatDate(issue.data_through)}; latest reports not received</span>}
                </div>
                <h2 className="text-[15px] leading-5 font-semibold text-fg">{issue.headline}</h2>
                <StatusControl issue={issue} />
              </div>
              <div className="flex flex-col items-end">
                <Variance value={issue.impact} short className="text-xl leading-6 font-medium" />
                <span className="text-[11px] text-fg-3">NOI vs budget · {issue.window_label.toLowerCase()}</span>
              </div>
            </Card>
          </FadeIn>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-3">
              <FadeIn delay={0.05}>
                <Card>
                  <CardHeader eyebrow="Driver" title="What's causing it" />
                  <p className="px-4 pb-4 text-xs leading-5 text-fg-2">{issue.driver}</p>
                </Card>
              </FadeIn>
              <FadeIn delay={0.08}>
                <TrendCard issue={issue} />
              </FadeIn>
              <FadeIn delay={0.11}>
                <EvidenceCard issue={issue} />
              </FadeIn>
            </div>
            <div className="flex min-w-0 flex-col gap-3">
              {issue.result && (
                <FadeIn delay={0.05}>
                  <ResultCard issue={issue} />
                </FadeIn>
              )}
              <FadeIn delay={0.08}>
                <HistoryCard issue={issue} />
              </FadeIn>
            </div>
          </div>
        </div>
      </PageBody>
    </>
  );
}

function TrendCard({ issue }: { issue: Issue }) {
  const { data } = useData(() => getIssueTrend(issue), [issue.id]);
  const fmt = data?.format === "percent" ? (v: number) => formatPercent(v) : formatCurrencyShort;
  const months = data?.points.map((p) => p.month) ?? [];
  const from = months.includes(issue.window.from) ? issue.window.from : months[0];
  const to = months.includes(issue.window.to) ? issue.window.to : months.at(-1);
  return (
    <Card>
      <CardHeader
        eyebrow="Trend"
        title={data ? `${data.actual_label} by month` : " "}
        description="Trailing 12 months. Shaded: the months this issue covers."
        action={data && <ChartLegend series={[{ key: "a", label: data.actual_label, style: "data" }, { key: "r", label: data.reference_label, style: "reference" }]} />}
      />
      <div className="px-2 pb-3">
        {data ? (
          <TrendChart
            data={data.points}
            series={[
              { key: "actual", label: data.actual_label, style: "data" },
              { key: "reference", label: data.reference_label, style: "reference" },
            ]}
            format={fmt}
            height={220}
            highlight={from && to ? { from, to } : undefined}
          />
        ) : (
          <Skeleton className="mx-2 h-[220px]" />
        )}
      </div>
    </Card>
  );
}

function EvidenceCard({ issue }: { issue: Issue }) {
  const open = useOpenSource();
  const table = issue.table;
  return (
    <Card>
      <CardHeader eyebrow="Evidence" title="The numbers behind it" description="Each figure links to the manager's report and line it came from." />
      <dl className="grid grid-cols-1 gap-px border-t border-border bg-border sm:grid-cols-2">
        {issue.stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-1 bg-surface px-4 py-3">
            <dt className="text-[11px] text-fg-3">{s.label}</dt>
            <dd className="num text-[15px] leading-5 text-fg">{s.value}</dd>
            {s.detail && <dd className="text-[11px] text-fg-3">{s.detail}</dd>}
            {s.source && s.source_label ? (
              <dd className="pt-1">
                <SourceLink source={s.source} label={s.source_label} />
              </dd>
            ) : (
              <dd className="pt-1 text-[11px] text-fg-3">Computed from each property&apos;s T12</dd>
            )}
          </div>
        ))}
        {issue.stats.length % 2 === 1 && <div className="hidden bg-surface sm:block" />}
      </dl>
      {table && (
        <div className="border-t border-border">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-3 pb-1">
            <h3 className="text-xs font-medium text-fg">{table.title}</h3>
            {table.source && table.source_label && <SourceLink source={table.source} label={table.source_label} />}
          </div>
          <Table>
            <THead>
              {table.columns.map((c) => (
                <Th key={c.label} align={c.align}>
                  {c.label}
                </Th>
              ))}
            </THead>
            <tbody>
              {table.rows.map((row, i) => {
                const src = table.row_sources?.[i];
                return (
                  <Tr key={row[0]} onClick={src ? () => open(src) : undefined}>
                    {row.map((cell, j) => (
                      <Td key={j} align={table.columns[j].align} mono={j > 0 || /^\d/.test(cell)} className={cn(j === 0 ? "text-fg" : "text-fg-2")}>
                        {cell}
                      </Td>
                    ))}
                  </Tr>
                );
              })}
            </tbody>
          </Table>
          {table.row_sources && <p className="px-4 py-2 text-[11px] text-fg-3">Select a row to open its source line.</p>}
        </div>
      )}
    </Card>
  );
}

function ResultCard({ issue }: { issue: Issue }) {
  const r = issue.result!;
  return (
    <Card>
      <CardHeader eyebrow="Result" title="What came of it" />
      <div className="grid grid-cols-2 gap-px border-y border-border bg-border">
        {[r.before, r.after].map((x, i) => (
          <div key={x.label} className="bg-surface px-4 py-3">
            <div className="text-[11px] text-fg-3">{x.label}</div>
            <div className={cn("num mt-1 text-[13px]", i === 0 ? "text-unfavorable" : "text-favorable")}>{x.value}</div>
          </div>
        ))}
      </div>
      <p className="px-4 py-3 text-xs leading-5 text-fg">
        {r.sentence}
        {r.is_estimate && <EstimateTag />}
      </p>
    </Card>
  );
}

function HistoryCard({ issue }: { issue: Issue }) {
  return (
    <Card>
      <CardHeader eyebrow="Decisions" title="Status history" />
      <ol className="flex flex-col gap-3 px-4 pb-4">
        {[...issue.history].reverse().map((e, i) => (
          <li key={`${e.at}-${i}`} className="flex gap-2.5">
            <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", i === 0 ? "bg-fg" : "bg-fg/25")} />
            <div className="min-w-0">
              <div className="text-xs text-fg">
                {e.by === "reiq" ? "Flagged" : ISSUE_STATUS_LABELS[e.status]}
                {e.reason && <span className="text-fg-3"> · {RESOLVE_REASON_LABELS[e.reason]}</span>}
              </div>
              <div className="num text-[11px] text-fg-3">
                {formatDate(e.at, true)} · {e.by_name}
              </div>
              {e.note && <p className="mt-1 text-xs text-fg-2">&ldquo;{e.note}&rdquo;</p>}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
