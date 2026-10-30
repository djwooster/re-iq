import { ArrowRight, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";

/* Static visuals for the marketing page. Numbers come from the sample portfolio (Q3 2026). */

/** Three managers' labels for the same expense, mapped to one standard line. */
export function LabelMerge() {
  const labels = [
    { label: "Repairs", system: "Yardi" },
    { label: "R&M", system: "Entrata" },
    { label: "Maintenance", system: "AppFolio" },
  ];
  return (
    <div className="flex items-center gap-3" aria-label="Repairs, R&M, and Maintenance all map to Repairs and maintenance">
      <ul className="flex flex-col gap-1.5">
        {labels.map((l) => (
          <li key={l.label} className="flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1 text-[11px]">
            <span className="text-fg">{l.label}</span>
            <span className="text-[10px] text-fg-3">{l.system}</span>
          </li>
        ))}
      </ul>
      <ArrowRight className="size-4 shrink-0 text-fg-3" strokeWidth={1.75} aria-hidden />
      <span className="rounded-md border border-border-strong bg-surface-2 px-2.5 py-1.5 text-[11px] font-medium text-fg">Repairs &amp; maintenance</span>
    </div>
  );
}

const TIE_OUT = [
  { line: "Total revenue", value: 5_001_598 },
  { line: "Total operating expenses", value: 2_147_069 },
  { line: "Net operating income", value: 2_854_529 },
];

/** RE-IQ's normalized totals beside the manager's own T-12. */
export function TieOutVisual() {
  return (
    <figure className="rounded-xl border border-border bg-surface p-2 sm:p-2.5" aria-label="Brookstone Park T-12 tie-out (sample)">
      <figcaption className="flex h-7 items-center justify-between gap-3 px-1.5">
        <span className="eyebrow truncate">Brookstone Park · T-12 through Sep 30 (sample)</span>
        <Badge tone="favorable" dot>
          Ties out
        </Badge>
      </figcaption>
      <div className="mt-1.5 overflow-hidden rounded-lg border border-border bg-bg">
        <table className="w-full text-[11.5px]">
          <thead>
            <tr className="border-b border-border text-left text-[10px] text-fg-3">
              <th className="px-3 py-2 font-normal">Line</th>
              <th className="px-3 py-2 text-right font-normal">RE-IQ</th>
              <th className="px-3 py-2 text-right font-normal">Manager&apos;s T-12</th>
              <th className="w-8 px-3 py-2" aria-label="Match" />
            </tr>
          </thead>
          <tbody>
            {TIE_OUT.map((r, i) => (
              <tr key={r.line} className={cn(i > 0 && "border-t border-border", i === TIE_OUT.length - 1 && "font-medium")}>
                <td className="px-3 py-2 text-fg">{r.line}</td>
                <td className="num px-3 py-2 text-right text-fg">{formatCurrency(r.value)}</td>
                <td className="num px-3 py-2 text-right text-fg-2">{formatCurrency(r.value)}</td>
                <td className="px-3 py-2">
                  <Check className="size-3.5 text-favorable" strokeWidth={2} aria-label="Matches" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between border-t border-border px-3 py-2 text-[10.5px] text-fg-3">
          <span>Difference</span>
          <span className="num text-fg">$0.00</span>
        </div>
      </div>
    </figure>
  );
}

type Tone = "good" | "watch" | "bad";

const MANAGERS = ["Crestline · Yardi", "Harbor · ResMan", "Summit · Rent Manager", "Meridian · Entrata"];

/** Each row: label, then one value and tone per manager, in MANAGERS order. */
const SCORECARD: { metric: string; cells: [string, Tone][] }[] = [
  { metric: "NOI vs. budget, QTD", cells: [["-0.9%", "good"], ["-13.0%", "bad"], ["-2.5%", "watch"], ["-1.3%", "good"]] },
  { metric: "Physical occupancy", cells: [["94.7%", "good"], ["90.9%", "bad"], ["95.0%", "good"], ["94.8%", "good"]] },
  { metric: "Economic occupancy", cells: [["89.8%", "good"], ["84.5%", "bad"], ["91.1%", "good"], ["90.4%", "good"]] },
  { metric: "Delinquency", cells: [["1.6%", "good"], ["2.0%", "good"], ["2.6%", "bad"], ["2.4%", "watch"]] },
  { metric: "R&M and turnover per unit, T-12", cells: [["$815", "good"], ["$867", "good"], ["$932", "bad"], ["$810", "good"]] },
];

const TONE: Record<Tone, string> = {
  good: "bg-favorable/10 text-favorable",
  watch: "bg-warning/10 text-warning",
  bad: "bg-unfavorable/10 text-unfavorable",
};

/** Property managers compared on the same normalized metrics. */
export function ScorecardVisual() {
  return (
    <figure className="rounded-xl border border-border bg-surface p-2 sm:p-2.5" aria-label="Manager scorecard (sample)">
      <figcaption className="flex h-7 items-center justify-between gap-3 px-1.5">
        <span className="eyebrow truncate">Manager scorecard · Q3 2026 (sample)</span>
        <span className="num hidden text-[10px] text-fg-3 sm:inline">14 properties · 4 managers</span>
      </figcaption>
      <div className="mt-1.5 overflow-x-auto rounded-lg border border-border bg-bg">
        <table className="w-full min-w-[560px] text-[11.5px]">
          <thead>
            <tr className="border-b border-border text-left text-[10px] text-fg-3">
              <th className="px-3 py-2 font-normal">Metric</th>
              {MANAGERS.map((m) => (
                <th key={m} className="px-2 py-2 text-right font-normal">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SCORECARD.map((row, i) => (
              <tr key={row.metric} className={cn(i > 0 && "border-t border-border")}>
                <td className="px-3 py-2 text-fg">{row.metric}</td>
                {row.cells.map(([value, tone], j) => (
                  <td key={j} className="px-2 py-1.5 text-right">
                    <span className={cn("num inline-block rounded px-1.5 py-0.5", TONE[tone])}>{value}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 px-1.5 text-[10.5px] text-fg-3">Green on or near budget · amber worth watching · red worth a call with the manager</p>
    </figure>
  );
}
