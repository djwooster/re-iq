"use client";

import Link from "next/link";
import { ChartLegend, TrendChart, type SeriesDef } from "@/components/charts/trend-chart";
import { VarianceBars } from "@/components/charts/variance-bars";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { Variance } from "@/components/ui/metric";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { formatMonth } from "@/lib/dates";
import { formatCurrency, formatCurrencyShort, formatPercent, formatSignedPercent, joinList } from "@/lib/format";
import { DRIVER_LABELS } from "@/lib/labels";
import type { ManagerScore, MarketExposure, TrendPoint } from "@/lib/data";
import type { PortfolioSummary } from "@/lib/types";

/** Asset manager: where the gap to budget comes from, by driver and by property. */
export function VarianceBreakdownCard({ summary }: { summary: PortfolioSummary }) {
  const total = summary.financials.noi.actual - summary.financials.noi.budget;
  const drivers = summary.drivers.map((d) => ({ id: d.driver, label: DRIVER_LABELS[d.driver], value: d.variance }));
  const byProperty = summary.properties
    .map((p) => ({ id: p.property.id, label: p.property.name, value: p.financials.noi.actual - p.financials.noi.budget }))
    .sort((a, b) => a.value - b.value);
  const worst = byProperty.slice(0, 4);
  return (
    <Card>
      <CardHeader
        eyebrow={summary.period_label}
        title="Where the gap to budget comes from"
        description={
          <>
            NOI is <Variance value={total} short /> vs budget. Drivers below add up to that total.
          </>
        }
        action={
          <Link href="/app/performance" className="text-[11px] text-fg-3 hover:text-fg">
            Performance →
          </Link>
        }
      />
      <div className="grid gap-x-6 gap-y-4 px-3 pb-4 lg:grid-cols-2">
        <div>
          <div className="eyebrow mb-1 px-1">By driver</div>
          <VarianceBars rows={drivers} compact />
        </div>
        <div>
          <div className="eyebrow mb-1 px-1">Largest shortfalls by property</div>
          <VarianceBars rows={worst} compact />
          <p className="mt-2 px-1 text-[11px] text-fg-3">
            {byProperty.filter((p) => p.value < 0).length} of {byProperty.length} properties are behind budget; {joinList(byProperty.filter((p) => p.value > 0).slice(-3).reverse().map((p) => p.label))} lead.
          </p>
        </div>
      </div>
    </Card>
  );
}

/** Owner: is each property manager delivering? */
export function ManagerScorecardCard({ scores, periodLabel }: { scores: ManagerScore[]; periodLabel: string }) {
  return (
    <Card>
      <CardHeader eyebrow={periodLabel} title="Property manager performance" description="NOI against budget, occupancy, and how quickly monthly reports arrive." />
      <Table>
        <THead>
          <Th>Manager</Th>
          <Th align="right">Units</Th>
          <Th align="right">NOI vs budget</Th>
          <Th align="right">Physical occ.</Th>
          <Th align="right">Delinquency</Th>
          <Th align="right">Reports arrive</Th>
        </THead>
        <tbody>
          {scores.map((s) => (
            <Tr key={s.manager.id}>
              <Td>
                <div className="text-xs text-fg">{s.manager.name}</div>
                <div className="text-[11px] text-fg-3">{s.property_ids.length} properties</div>
              </Td>
              <Td align="right" mono>
                {s.units.toLocaleString("en-US")}
              </Td>
              <Td align="right">
                <Variance value={s.noi_actual - s.noi_budget} short />{" "}
                <span className="num text-[11px] text-fg-3">{formatSignedPercent(s.noi_actual / s.noi_budget - 1)}</span>
              </Td>
              <Td align="right" mono>
                {formatPercent(s.physical)}
              </Td>
              <Td align="right" mono>
                {formatPercent(s.delinquency)}
              </Td>
              <Td align="right" mono className="text-fg-2">
                {s.reporting_lag_days === null ? <span className="text-fg-3">Connector</span> : `Day ${s.reporting_lag_days}`}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      <CardFooter>&ldquo;Reports arrive&rdquo; is the average number of days after month end that T12s were uploaded.</CardFooter>
    </Card>
  );
}

const NOI_SERIES: SeriesDef[] = [
  { key: "noi", label: "NOI, actual", style: "data" },
  { key: "noi_budget", label: "NOI, budget", style: "reference" },
];

/** Executive: trailing NOI against budget. */
export function NoiTrendCard({ trend, names }: { trend: TrendPoint[]; names: Record<string, string> }) {
  const last = trend.at(-1);
  const footnote = (month: string) => {
    const p = trend.find((t) => t.month === month);
    if (!p?.missing_property_ids.length) return null;
    return `Excludes ${joinList(p.missing_property_ids.map((id) => names[id]))}, which have no ${formatMonth(month, "tiny")} actuals yet. Budget excludes them too.`;
  };
  return (
    <Card>
      <CardHeader eyebrow="Trailing 12 months" title="NOI against budget" action={<ChartLegend series={NOI_SERIES} />} />
      <div className="px-2 pb-2">
        <TrendChart data={trend} series={NOI_SERIES} format={formatCurrency} axisFormat={formatCurrencyShort} footnote={footnote} />
      </div>
      {last && last.missing_property_ids.length > 0 && (
        <CardFooter>
          {formatMonth(last.month)} excludes {last.missing_property_ids.length} properties without actuals yet, on both lines.
        </CardFooter>
      )}
    </Card>
  );
}

export function MarketExposureCard({ markets, totalUnits, periodLabel }: { markets: MarketExposure[]; totalUnits: number; periodLabel: string }) {
  const totalNoi = markets.reduce((s, m) => s + m.noi_actual, 0);
  return (
    <Card>
      <CardHeader eyebrow={periodLabel} title="Exposure by market" />
      <Table>
        <THead>
          <Th>Market</Th>
          <Th align="right">Share of units</Th>
          <Th align="right">Share of NOI</Th>
          <Th align="right">NOI vs budget</Th>
        </THead>
        <tbody>
          {markets.map((m) => (
            <Tr key={m.market}>
              <Td>
                <div className="text-xs text-fg">{m.market}</div>
                <div className="text-[11px] text-fg-3">{m.property_ids.length} properties</div>
              </Td>
              <Td align="right" mono>
                {formatPercent(m.units / totalUnits)}
              </Td>
              <Td align="right" mono>
                {formatPercent(m.noi_actual / totalNoi)}
              </Td>
              <Td align="right">
                <Variance value={m.noi_actual - m.noi_budget} short />
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
