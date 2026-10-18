"use client";

import { Card } from "@/components/ui/card";
import { Metric, PointsDelta, Variance } from "@/components/ui/metric";
import { cn } from "@/lib/cn";
import { formatCurrencyShort, formatPercent } from "@/lib/format";
import type { PortfolioSummary, Role } from "@/lib/types";

interface Props {
  role: Role;
  qtd: PortfolioSummary;
  t12: PortfolioSummary;
  cashFlow: number;
  priorDelinquency: number;
  priorLabel: string;
}

/** Four headline numbers. Which four depends on the role being previewed. */
export function HeadlineMetrics({ role, qtd, t12, cashFlow, priorDelinquency, priorLabel }: Props) {
  const f = qtd.financials;
  const o = qtd.occupancy;
  const noi = (
    <Metric
      key="noi"
      label="NOI · QTD"
      value={f.noi.actual}
      format={formatCurrencyShort}
      sub={
        <>
          <Variance value={f.noi.actual - f.noi.budget} short /> vs {formatCurrencyShort(f.noi.budget)} budget
        </>
      }
    />
  );
  const physical = (
    <Metric
      key="physical"
      label="Physical occupancy"
      value={o.physical}
      format={(v) => formatPercent(v)}
      hint="Occupied units ÷ total units at month end"
      sub={
        <>
          <PointsDelta delta={o.physical - o.physical_budget} /> vs {formatPercent(o.physical_budget)} budget
        </>
      }
    />
  );
  const economic = (
    <Metric
      key="economic"
      label="Economic occupancy · QTD"
      value={o.economic}
      format={(v) => formatPercent(v)}
      hint="Rent collected after vacancy, concessions, loss to lease, and bad debt ÷ gross potential rent"
      sub={
        <>
          <PointsDelta delta={o.economic - o.economic_budget} /> vs {formatPercent(o.economic_budget)} budget
        </>
      }
    />
  );
  const delinquency = (
    <Metric
      key="delinquency"
      label="Delinquency"
      value={o.delinquency}
      format={(v) => formatPercent(v)}
      hint="Resident balances past due ÷ monthly billed charges"
      sub={
        <>
          <PointsDelta delta={o.delinquency - priorDelinquency} higherIsBetter={false} /> vs {priorLabel}
        </>
      }
    />
  );
  const cash = (
    <Metric
      key="cash"
      label="Cash flow after debt · QTD"
      value={cashFlow}
      format={formatCurrencyShort}
      hint="NOI minus scheduled debt service. Excludes capital expenditures and reserves."
      sub={<span>Estimate · before capex and reserves</span>}
    />
  );
  const noiT12 = (
    <Metric
      key="t12"
      label="NOI · T12"
      value={t12.financials.noi.actual}
      format={formatCurrencyShort}
      sub={
        <>
          <Variance value={t12.financials.noi.actual - t12.financials.noi.budget} short /> vs budget
        </>
      }
    />
  );

  const metrics = {
    asset_manager: [noi, physical, economic, delinquency],
    owner: [noi, cash, physical, economic],
    executive: [noiT12, noi, physical, delinquency],
  }[role];

  return (
    <Card className="grid grid-cols-2 lg:grid-cols-4">
      {metrics.map((m, i) => (
        <div key={i} className={cn("border-border", i % 2 === 1 && "border-l", i >= 2 && "border-t lg:border-t-0", i === 2 && "lg:border-l")}>
          {m}
        </div>
      ))}
    </Card>
  );
}
