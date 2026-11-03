"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { VarianceBars } from "@/components/charts/variance-bars";
import { useApp } from "@/components/shell/app-context";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/empty-state";
import { Variance } from "@/components/ui/metric";
import { FadeIn } from "@/components/ui/motion";
import { PeriodSelector } from "@/components/ui/period-selector";
import { Table, Td, Th, THead, Tr, useSort } from "@/components/ui/table";
import { LATEST_MONTH, formatDate, formatMonth } from "@/lib/dates";
import { getManagerScores, getPortfolioSummary, type ManagerCard } from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import { formatCurrency, formatCurrencyShort, formatPercent, formatSignedPercent } from "@/lib/format";
import { DRIVER_LABELS } from "@/lib/labels";
import type { Period, PortfolioSummary } from "@/lib/types";
import { ScoreCell } from "./score-cell";

type Tab = "portfolio" | "managers";

export function PerformanceView() {
  const { orgId } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = (params.get("tab") as Tab) ?? "portfolio";
  const [period, setPeriod] = useState<Period>("qtd");
  const { data: summary } = useData(() => getPortfolioSummary(orgId, period), [orgId, period]);
  const { data: scores } = useData(() => getManagerScores(orgId, period), [orgId, period]);

  return (
    <>
      <PageHeader title="Performance" subtitle={summary?.period_label ?? " "} actions={<PeriodSelector value={period} onChange={setPeriod} />} />
      <PageBody>
        <Tabs
          className="mb-4"
          value={tab}
          onChange={(t) => router.replace(t === "portfolio" ? pathname : `${pathname}?tab=${t}`, { scroll: false })}
          tabs={[
            { id: "portfolio", label: "Portfolio" },
            { id: "managers", label: "Managers" },
          ]}
        />
        <FadeIn key={tab}>
          {tab === "portfolio" ? (
            summary ? <Portfolio summary={summary} /> : <Skeleton className="h-96 rounded-lg" />
          ) : scores ? (
            <Scorecards scores={scores} />
          ) : (
            <Skeleton className="h-96 rounded-lg" />
          )}
        </FadeIn>
      </PageBody>
    </>
  );
}

function Portfolio({ summary }: { summary: PortfolioSummary }) {
  const router = useRouter();
  const f = summary.financials;
  const rows = summary.properties;
  const { sorted, sort, onSort } = useSort(
    rows,
    {
      name: (r) => r.property.name,
      noi: (r) => r.financials.noi.actual,
      variance: (r) => r.financials.noi.actual - r.financials.noi.budget,
      pct: (r) => r.financials.noi.actual / r.financials.noi.budget - 1,
    },
    { key: "variance", dir: "asc" },
  );
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader title="NOI bridge, budget to actual" description="Each driver's effect on NOI against budget. They add up to the total." />
        <div className="grid gap-px border-t border-border bg-border sm:grid-cols-3">
          {[
            ["Budget NOI", formatCurrencyShort(f.noi.budget)],
            ["Drivers, net", formatCurrencyShort(f.noi.actual - f.noi.budget)],
            ["Actual NOI", formatCurrencyShort(f.noi.actual)],
          ].map(([k, v]) => (
            <div key={k} className="bg-surface px-4 py-3">
              <div className="eyebrow">{k}</div>
              <div className="num mt-1 text-[15px] text-fg">{v}</div>
            </div>
          ))}
        </div>
        <div className="px-3 py-3">
          <VarianceBars rows={summary.drivers.map((d) => ({ id: d.driver, label: DRIVER_LABELS[d.driver], value: d.variance }))} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Budget vs actual by property" description="Select a property for its statement, rent roll, delinquency, and maintenance." />
        <Table>
          <THead>
            <Th sortKey="name" sort={sort} onSort={onSort}>
              Property
            </Th>
            <Th>Manager</Th>
            <Th align="right" sortKey="noi" sort={sort} onSort={onSort}>
              NOI
            </Th>
            <Th align="right">Budget</Th>
            <Th align="right" sortKey="variance" sort={sort} onSort={onSort}>
              Vs budget
            </Th>
            <Th align="right" sortKey="pct" sort={sort} onSort={onSort}>
              %
            </Th>
            <Th align="right">Data through</Th>
          </THead>
          <tbody>
            {sorted.map((r) => (
              <Tr key={r.property.id} onClick={() => router.push(`/app/properties/${r.property.id}`)}>
                <Td className="text-fg">{r.property.name}</Td>
                <Td className="text-fg-3">{r.property.property_manager.name}</Td>
                <Td align="right" mono>
                  {formatCurrency(r.financials.noi.actual)}
                </Td>
                <Td align="right" mono className="text-fg-3">
                  {formatCurrency(r.financials.noi.budget)}
                </Td>
                <Td align="right">
                  <Variance value={r.financials.noi.actual - r.financials.noi.budget} />
                </Td>
                <Td align="right" mono className="text-fg-2">
                  {formatSignedPercent(r.financials.noi.actual / r.financials.noi.budget - 1)}
                </Td>
                <Td align="right" mono className={r.missing_months.length ? "text-warning" : "text-fg-3"}>
                  {formatDate(r.property.data_through)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

/** One column per manager. Measures against their own budgets first, raw numbers after, context last. */
function Scorecards({ scores }: { scores: ManagerCard[] }) {
  const pct = (v: number) => formatSignedPercent(v);
  const rows: { section: string; items: { label: string; hint?: string; cell: (s: ManagerCard) => React.ReactNode }[] }[] = [
    {
      section: "Against their own budgets",
      items: [
        { label: "NOI vs budget", cell: (s) => <ScoreCell value={s.measures.noi_vs_budget} text={pct(s.measures.noi_vs_budget)} sub={formatCurrencyShort(s.measures.noi_variance)} /> },
        { label: "Controllable expenses vs budget", hint: "Payroll, R&M, turnover, utilities, contract services, marketing, admin. Positive is under budget.", cell: (s) => <ScoreCell value={s.measures.controllable_vs_budget} text={pct(s.measures.controllable_vs_budget)} /> },
        { label: "6-month trend", hint: "NOI vs budget, last 6 months against the 6 before", cell: (s) => <ScoreCell value={s.measures.trend} text={s.measures.trend_label} sub={`${s.measures.trend > 0 ? "+" : ""}${(s.measures.trend * 100).toFixed(1)} pts`} /> },
      ],
    },
    {
      section: "Raw numbers",
      items: [
        { label: "Physical occupancy", cell: (s) => formatPercent(s.measures.physical) },
        { label: "Economic occupancy", cell: (s) => formatPercent(s.measures.economic) },
        { label: "Delinquency", cell: (s) => formatPercent(s.measures.delinquency) },
        { label: "Renewal rate, T12", cell: (s) => formatPercent(s.measures.renewal_rate) },
      ],
    },
    {
      section: "Context",
      items: [
        { label: "Properties · units", cell: (s) => `${s.property_ids.length} · ${s.context.units.toLocaleString("en-US")}` },
        { label: "Class", cell: (s) => s.context.classes },
        { label: "Average age", cell: (s) => `${s.context.avg_age} years` },
        { label: "Markets", cell: (s) => s.context.markets },
        { label: "Open issues", cell: (s) => s.open_issues },
      ],
    },
  ];
  const stale = scores.filter((s) => s.data_through < scores.map((x) => x.data_through).sort().at(-1)!);
  return (
    <Card>
      <CardHeader title="Manager scorecards" description="Fair comparisons first: each manager against the budgets for their own properties. Select a manager for property detail." />
      <Table>
        <THead>
          <Th className="w-[240px]"> </Th>
          {scores.map((s) => (
            <Th key={s.manager.id} align="right">
              <Link href={`/app/performance/managers/${s.manager.id}`} className="normal-case tracking-normal text-fg hover:underline">
                {s.manager.name}
              </Link>
            </Th>
          ))}
        </THead>
        <tbody>
          {rows.map((group) => (
            <Group key={group.section} label={group.section} span={scores.length + 1}>
              {group.items.map((item) => (
                <Tr key={item.label}>
                  <Td className="text-fg-2">
                    <span title={item.hint}>{item.label}</span>
                  </Td>
                  {scores.map((s) => (
                    <Td key={s.manager.id} align="right" mono className="text-fg">
                      {item.cell(s)}
                    </Td>
                  ))}
                </Tr>
              ))}
            </Group>
          ))}
        </tbody>
      </Table>
      {stale.length > 0 && (
        <p className="border-t border-border px-4 py-2.5 text-[11px] text-warning">
          {stale.map((s) => s.manager.name).join(", ")}: through {formatDate(stale[0].data_through)}, {formatMonth(LATEST_MONTH, "long").split(" ")[0]} reports not received.
        </p>
      )}
    </Card>
  );
}

function Group({ label, span, children }: { label: string; span: number; children: React.ReactNode }) {
  return (
    <>
      <tr className="border-b border-border/70">
        <td colSpan={span} className="eyebrow px-4 pt-4 pb-1.5">
          {label}
        </td>
      </tr>
      {children}
    </>
  );
}
