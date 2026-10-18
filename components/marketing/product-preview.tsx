import { ChevronRight, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

/*
 * A static picture of the Overview, using the sample portfolio's real numbers
 * (Q3 2026, data through Sep 30). If the seeded stories change, update these.
 */

const SUMMARY = [
  "Portfolio NOI is $9.32M this quarter, $391K (4.0%) below budget.",
  "Lakeline Flats accounts for most of the gap: vacancy and concessions cost $280K against budget this quarter.",
  "R&M at Mesa Verde is $57K over budget since May, driven by repeat HVAC calls to the same 4 units.",
  "Brookstone Park has 58 below-market leases expiring by Jan 16, worth an estimated $66K a year if renewed closer to market.",
];

const EVIDENCE = [
  { label: "Physical occupancy", value: "85.5%" },
  { label: "Vacant units", value: "54 of 372" },
  { label: "Vacancy loss, QTD", value: "$282,860" },
  { label: "Concessions, QTD", value: "$122,488" },
];

const METRICS = [
  { label: "NOI, QTD", value: "$9.32M", delta: "-$391K vs budget", tone: "unfavorable" },
  { label: "Economic occupancy", value: "89.0%", delta: "Physical 93.9%", tone: "muted" },
  { label: "Open opportunities", value: "+$177K", delta: "Estimated, annual", tone: "favorable" },
] as const;

export function ProductPreview() {
  return (
    <div aria-label="Example: the Overview for a 14-property sample portfolio" role="img" className="rounded-xl border border-border bg-bg p-2 shadow-overlay">
      <div className="flex items-center justify-between gap-3 px-2 pt-1 pb-2.5">
        <span className="eyebrow">Overview · Alder Peak Capital (sample)</span>
        <span className="num hidden text-[10px] text-fg-3 sm:inline">14 properties · 3,790 units</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {METRICS.map((m) => (
          <Card key={m.label} className="px-3 py-2.5">
            <div className="eyebrow">{m.label}</div>
            <div className="num mt-1 text-[18px] font-medium leading-6 text-fg">{m.value}</div>
            <div className={cn("num text-[10px]", m.tone === "unfavorable" && "text-unfavorable", m.tone === "favorable" && "text-favorable", m.tone === "muted" && "text-fg-3")}>
              {m.delta}
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-2">
        <div className="flex items-center justify-between gap-3 px-3.5 pt-3">
          <div className="eyebrow">
            Summary <span className="normal-case tracking-normal text-fg-3/80">· written by AI from your reports</span>
          </div>
          <span className="num hidden text-[10px] text-fg-3 md:inline">Data through Sep 30, 2026</span>
        </div>
        <ul className="flex flex-col gap-1 px-3.5 pt-2 pb-3">
          {SUMMARY.map((text, i) => (
            <li key={text}>
              <div className="flex items-start gap-1.5 text-[12px] leading-[1.7] text-fg-2 sm:text-[13px]">
                <ChevronRight className={cn("mt-[5px] size-3.5 shrink-0 text-fg-3", i === 1 && "rotate-90 text-fg")} strokeWidth={1.75} aria-hidden />
                <span className={cn(i === 1 && "text-fg")}>{text}</span>
              </div>
              {i === 1 && (
                <div className="mt-2 mb-2 ml-5 rounded-md border border-border bg-bg">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-3 py-2.5 sm:grid-cols-4">
                    {EVIDENCE.map((e) => (
                      <div key={e.label}>
                        <dt className="text-[10px] text-fg-3">{e.label}</dt>
                        <dd className="num text-[12px] text-fg">{e.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-3 py-2 text-[10px] text-fg-3">
                    <span className="num inline-flex items-center gap-1">
                      <RefreshCw className="size-3" aria-hidden /> ResMan · Harbor Property Group
                    </span>
                    <span>Synced Oct 18, 6:02am · ledger and rent roll</span>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
