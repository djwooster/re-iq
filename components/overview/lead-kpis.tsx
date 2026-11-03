"use client";

import { Card } from "@/components/ui/card";
import { Metric, PointsDelta } from "@/components/ui/metric";
import { PERIODS } from "@/lib/dates";
import { formatCurrencyShort, formatPercent, formatSignedPercent } from "@/lib/format";
import type { PortfolioSummary } from "@/lib/types";

/** The three numbers an asset manager leads with. Physical and economic sit side by side so the gap shows. */
export function LeadKpis({ summary }: { summary: PortfolioSummary }) {
  const f = summary.financials;
  const o = summary.occupancy;
  const period = PERIODS.find((p) => p.id === summary.period)!.label;
  const variance = f.noi.actual - f.noi.budget;
  return (
    <Card className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr_1fr]">
      <Metric
        label={`NOI vs budget · ${period}`}
        value={variance}
        format={(v) => (v > 0 ? `+${formatCurrencyShort(v)}` : formatCurrencyShort(v))}
        sub={
          <>
            <span className={variance < 0 ? "num text-unfavorable" : "num text-favorable"}>{formatSignedPercent(variance / f.noi.budget)}</span> ·{" "}
            {formatCurrencyShort(f.noi.actual)} actual vs {formatCurrencyShort(f.noi.budget)} budget
          </>
        }
      />
      <Metric
        className="border-t border-border sm:border-t-0 sm:border-l"
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
      <Metric
        className="border-t border-border sm:border-t-0 sm:border-l"
        label={`Economic occupancy · ${period}`}
        value={o.economic}
        format={(v) => formatPercent(v)}
        hint="Rent collected after vacancy, loss to lease, concessions, and bad debt ÷ gross potential rent"
        sub={
          <>
            <PointsDelta delta={o.economic - o.economic_budget} /> vs {formatPercent(o.economic_budget)} budget ·{" "}
            <span className="num">{((o.physical - o.economic) * 100).toFixed(1)} pts</span> below physical
          </>
        }
      />
    </Card>
  );
}
