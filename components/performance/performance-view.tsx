"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChartLegend, TrendChart, type SeriesDef } from "@/components/charts/trend-chart";
import { VarianceBars } from "@/components/charts/variance-bars";
import { useApp } from "@/components/shell/app-context";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { PeriodSelector } from "@/components/ui/period-selector";
import { Skeleton } from "@/components/ui/empty-state";
import { Metric, PointsDelta, Variance } from "@/components/ui/metric";
import { FadeIn } from "@/components/ui/motion";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { formatDate, formatMonth } from "@/lib/dates";
import { getPortfolioSummary, getPortfolioTrend } from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import { formatCurrency, formatCurrencyShort, formatPercent, formatSignedPercent, joinList } from "@/lib/format";
import { CATEGORY_LABELS, DRIVER_LABELS } from "@/lib/labels";
import type { GlCategory, Period, PortfolioSummary } from "@/lib/types";

const NOI_SERIES: SeriesDef[] = [
  { key: "noi", label: "NOI, actual", style: "data" },
  { key: "noi_budget", label: "NOI, budget", style: "reference" },
];

const OCC_SERIES: SeriesDef[] = [
  { key: "physical", label: "Physical", style: "data" },
  { key: "economic", label: "Economic", style: "data-secondary" },
  { key: "physical_budget", label: "Physical, budget", style: "reference" },
];

const REVENUE: GlCategory[] = ["gross_potential_rent", "loss_to_lease", "vacancy_loss", "concessions", "bad_debt", "other_income"];
const EXPENSES: GlCategory[] = [
  "payroll",
  "repairs_maintenance",
  "turnover",
  "utilities",
  "contract_services",
  "marketing",
  "administrative",
  "management_fees",
  "insurance",
  "property_taxes",
];

export function PerformanceView() {
  const { orgId } = useApp();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("qtd");
  const { data } = useData(async () => {
    const [summary, trend] = await Promise.all([getPortfolioSummary(orgId, period), getPortfolioTrend(orgId, 12)]);
    return { summary, trend };
  }, [orgId, period]);

  const s = data?.summary;
  const names = Object.fromEntries((s?.properties ?? []).map((p) => [p.property.id, p.property.name]));
  const lagging = s?.properties.filter((p) => s.lagging_property_ids.includes(p.property.id)) ?? [];

  return (
    <>
      <PageHeader
        title="Performance"
        subtitle={s ? `Budget vs. actual · ${s.period_label}` : "Budget vs. actual"}
        actions={<PeriodSelector value={period} onChange={setPeriod} />}
      />
      <PageBody>
        {!s || !data ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-[86px] w-full rounded-lg" />
            <Skeleton className="h-72 w-full rounded-lg" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {lagging.length > 0 && (
              <p className="text-[11px] text-fg-3">
                {joinList(lagging.map((p) => p.property.name))} {lagging.length === 1 ? "has" : "have"} data through {formatDate(lagging[0].property.data_through)}. Their actuals and
                budget both stop there, so variances compare like with like.
              </p>
            )}
            <FadeIn>
              <Card className="grid grid-cols-2 lg:grid-cols-4">
                <Metric
                  label="NOI"
                  value={s.financials.noi.actual}
                  format={formatCurrencyShort}
                  sub={
                    <>
                      <Variance value={s.financials.noi.actual - s.financials.noi.budget} short /> vs {formatCurrencyShort(s.financials.noi.budget)}
                    </>
                  }
                />
                <Metric
                  className="border-l border-border"
                  label="Revenue"
                  value={s.financials.revenue.actual}
                  format={formatCurrencyShort}
                  sub={
                    <>
                      <Variance value={s.financials.revenue.actual - s.financials.revenue.budget} short /> vs {formatCurrencyShort(s.financials.revenue.budget)}
                    </>
                  }
                />
                <Metric
                  className="border-t border-border lg:border-t-0 lg:border-l"
                  label="Operating expenses"
                  value={s.financials.expenses.actual}
                  format={formatCurrencyShort}
                  sub={
                    <>
                      <Variance value={s.financials.expenses.budget - s.financials.expenses.actual} short /> vs {formatCurrencyShort(s.financials.expenses.budget)}
                    </>
                  }
                />
                <Metric
                  className="border-t border-l border-border lg:border-t-0"
                  label="Economic occupancy"
                  value={s.occupancy.economic}
                  format={(v) => formatPercent(v)}
                  sub={
                    <>
                      <PointsDelta delta={s.occupancy.economic - s.occupancy.economic_budget} /> · physical {formatPercent(s.occupancy.physical)}
                    </>
                  }
                />
              </Card>
            </FadeIn>

            <FadeIn delay={0.05} className="grid gap-3 lg:grid-cols-2">
              <Card>
                <CardHeader
                  title="Variance by driver"
                  description={
                    <>
                      NOI impact against budget. Drivers sum to <Variance value={s.financials.noi.actual - s.financials.noi.budget} short />.
                    </>
                  }
                />
                <div className="px-3 pb-4">
                  <VarianceBars rows={s.drivers.map((d) => ({ id: d.driver, label: DRIVER_LABELS[d.driver], value: d.variance }))} />
                </div>
              </Card>
              <Card>
                <CardHeader title="Variance by property" description="NOI against budget. Select a property to open it." />
                <div className="px-3 pb-4">
                  <VarianceBars
                    compact
                    onSelect={(id) => router.push(`/app/properties/${id}`)}
                    rows={[...s.properties]
                      .map((p) => ({
                        id: p.property.id,
                        label: p.property.name,
                        sublabel: p.missing_months.length ? `thru ${formatMonth(p.property.data_through.slice(0, 7), "tiny")}` : undefined,
                        value: p.financials.noi.actual - p.financials.noi.budget,
                      }))
                      .sort((a, b) => a.value - b.value)}
                  />
                </div>
              </Card>
            </FadeIn>

            <FadeIn delay={0.1} className="grid gap-3 lg:grid-cols-2">
              <Card>
                <CardHeader eyebrow="Last 12 months" title="NOI" action={<ChartLegend series={NOI_SERIES} />} />
                <div className="px-2 pb-2">
                  <TrendChart
                    data={data.trend}
                    series={NOI_SERIES}
                    format={formatCurrency}
                    axisFormat={formatCurrencyShort}
                    footnote={(m) => {
                      const p = data.trend.find((t) => t.month === m);
                      return p?.missing_property_ids.length ? `Excludes ${joinList(p.missing_property_ids.map((id) => names[id]))} on both lines.` : null;
                    }}
                  />
                </div>
              </Card>
              <Card>
                <CardHeader eyebrow="Last 12 months" title="Occupancy" action={<ChartLegend series={OCC_SERIES} />} />
                <div className="px-2 pb-2">
                  <TrendChart data={data.trend} series={OCC_SERIES} format={(v) => formatPercent(v)} axisFormat={(v) => formatPercent(v, 0)} />
                </div>
                <CardFooter>Physical counts occupied units at month end. Economic is rent actually earned after vacancy, concessions, loss to lease, and bad debt, over gross potential rent.</CardFooter>
              </Card>
            </FadeIn>

            <FadeIn delay={0.14}>
              <IncomeStatement summary={s} />
            </FadeIn>
          </div>
        )}
      </PageBody>
    </>
  );
}

function IncomeStatement({ summary }: { summary: PortfolioSummary }) {
  const f = summary.financials;
  const row = (c: GlCategory, revenue: boolean) => {
    const { actual, budget } = f.byCategory[c];
    const variance = revenue ? actual - budget : budget - actual;
    return (
      <Tr key={c}>
        <Td className="pl-8 text-fg-2">{CATEGORY_LABELS[c]}</Td>
        <Td align="right" mono>
          {formatCurrency(actual)}
        </Td>
        <Td align="right" mono className="text-fg-3">
          {formatCurrency(budget)}
        </Td>
        <Td align="right">
          <Variance value={variance} />
        </Td>
        <Td align="right" mono className="text-[11px] text-fg-3">
          {budget ? formatSignedPercent(variance / Math.abs(budget)) : ""}
        </Td>
      </Tr>
    );
  };
  const total = (label: string, actual: number, budget: number, favorable: number, strong?: boolean) => (
    <Tr>
      <Td className={cn("font-medium text-fg", strong && "font-semibold")}>{label}</Td>
      <Td align="right" mono className="font-medium text-fg">
        {formatCurrency(actual)}
      </Td>
      <Td align="right" mono className="text-fg-3">
        {formatCurrency(budget)}
      </Td>
      <Td align="right">
        <Variance value={favorable} className="font-medium" />
      </Td>
      <Td align="right" mono className="text-[11px] text-fg-3">
        {formatSignedPercent(favorable / Math.abs(budget))}
      </Td>
    </Tr>
  );
  return (
    <Card>
      <CardHeader title="Income statement" description={`Normalized across every source · ${summary.period_label}`} />
      <Table>
        <THead>
          <Th>Line</Th>
          <Th align="right">Actual</Th>
          <Th align="right">Budget</Th>
          <Th align="right">Variance</Th>
          <Th align="right">%</Th>
        </THead>
        <tbody>
          {REVENUE.map((c) => row(c, true))}
          {total("Total revenue", f.revenue.actual, f.revenue.budget, f.revenue.actual - f.revenue.budget)}
          {EXPENSES.map((c) => row(c, false))}
          {total("Total operating expenses", f.expenses.actual, f.expenses.budget, f.expenses.budget - f.expenses.actual)}
          {total("Net operating income", f.noi.actual, f.noi.budget, f.noi.actual - f.noi.budget, true)}
        </tbody>
      </Table>
      <CardFooter>Variance is shown as NOI impact: positive is favorable for both revenue and expense lines.</CardFooter>
    </Card>
  );
}
