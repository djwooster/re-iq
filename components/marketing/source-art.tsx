"use client";

import { FileSpreadsheet, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { useCycle } from "./use-cycle";

/*
 * An issue with its cause, linked to the line in the manager's report it came
 * from. The selection scans the T-12 and settles on that line. Figures are the
 * sample portfolio's HVAC story. Drawn on a 700×240 canvas shared by the SVG
 * connector and the positioned cards.
 */

const W = 700;
const H = 240;
const ISSUE = { left: 36, right: 300 };
const DOC = { left: 372, right: 664 };

const LINES = [
  { code: "6410", label: "Payroll - Maint", value: "$214,560" },
  { code: "6500", label: "R&M - General", value: "$53,510" },
  { code: "6510", label: "R&M - HVAC", value: "$65,371", source: true },
  { code: "6600", label: "Turnover", value: "$48,920" },
];
const SOURCE = LINES.findIndex((l) => l.source);

// Steps: the selection visits each line above the source, then holds on it.
const STEPS = SOURCE + 3;

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

export function SourceArt() {
  const { ref, step } = useCycle(STEPS, 700, STEPS - 1);
  const selected = Math.min(step, SOURCE);
  const settled = step >= SOURCE;

  return (
    <div ref={ref} className="absolute inset-0 grid place-items-center px-4" aria-hidden>
      <div className="relative aspect-[700/240] w-full max-w-[700px]">
        <svg className="absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${W} ${H}`}>
          <path
            d={`M${ISSUE.right + 6} 120 C ${ISSUE.right + 40} 120, ${DOC.left - 40} 120, ${DOC.left - 6} 120`}
            fill="none"
            className={cn("transition-colors duration-300", settled ? "stroke-fg-2" : "stroke-border-strong")}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <circle cx={ISSUE.right + 6} cy={120} r={2.5} className="fill-fg-3" />
          <circle cx={DOC.left - 6} cy={120} r={2.5} className={settled ? "fill-fg-2" : "fill-fg-3"} />
        </svg>

        {/* The issue, as it appears in Needs attention */}
        <div
          className="absolute top-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-3.5 shadow-overlay"
          style={{ left: pct(ISSUE.left, W), width: pct(ISSUE.right - ISSUE.left, W) }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] text-fg-3">Property #2</span>
            <span className="num text-[12px] text-unfavorable">-$57K</span>
          </div>
          <div className="mt-1 text-[12.5px] font-medium text-fg">R&amp;M over budget since May</div>
          <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-bg px-2.5 py-2">
            <Sparkles className="mt-px size-3 shrink-0 text-data" strokeWidth={1.75} />
            <span className="text-[11px] leading-[1.45] text-fg-2">26 repeat HVAC calls on the same 4 units</span>
          </div>
        </div>

        {/* The manager's report, with the source line selected */}
        <div className="absolute top-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface" style={{ left: pct(DOC.left, W), width: pct(DOC.right - DOC.left, W) }}>
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <FileSpreadsheet className="size-3.5 text-fg-3" strokeWidth={1.75} />
            <span className="text-[11px] text-fg-2">Manager&apos;s T-12 · Sep 2026</span>
          </div>
          <ul className="relative px-1.5 py-1.5">
            <motion.span
              className={cn(
                "absolute inset-x-1.5 h-[30px] rounded-md border transition-colors duration-300",
                settled ? "border-fg/60 bg-fg/[0.04]" : "border-dashed border-border-strong bg-transparent",
              )}
              initial={false}
              animate={{ top: 6 + selected * 30 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
            {LINES.map((l, i) => (
              <li key={l.code} className="relative flex h-[30px] items-center gap-2.5 px-2">
                <span className="num text-[10px] text-fg-3">{l.code}</span>
                <span className={cn("min-w-0 flex-1 truncate text-[11px]", settled && i === SOURCE ? "font-medium text-fg" : "text-fg-2")}>{l.label}</span>
                <span className={cn("num text-[11px]", settled && i === SOURCE ? "text-fg" : "text-fg-3")}>{l.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
