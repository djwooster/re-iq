"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { useCycle } from "./use-cycle";

/*
 * Three managers' reports, each laid out differently, feed one chart of
 * accounts. Rows tick as each report is read; one unusual line waits for a
 * person (under 75% confidence) and ticks once confirmed. Drawn on a 700×320
 * canvas shared by the SVG connector and the positioned cards.
 */

const W = 700;
const H = 320;

const DOCS = [
  { system: "Yardi", format: "XLS", y: 70, layout: "table" as const },
  { system: "Entrata", format: "CSV", y: 160, layout: "columns" as const },
  { system: "AppFolio", format: "PDF", y: 250, layout: "dense" as const },
];
const DOC = { left: 32, right: 236 };
const CHART = { left: 340, right: 668, y: 160 };

/** Which report fills each row; the last row is the one a person confirms. */
const ROWS = [
  { label: "Gross potential rent", doc: 0 },
  { label: "Vacancy loss", doc: 0 },
  { label: "Payroll", doc: 1 },
  { label: "Repairs & maintenance", doc: 1 },
  { label: "Utilities", doc: 2 },
  { label: "Resident events", doc: 2, review: true },
];

// Steps: 0–2 each report is read in turn, 3 the flagged line waits, 4 it's confirmed, 5 hold.
const STEPS = 6;
const REVIEW_WAITS = 3;
const CONFIRMED = 4;

const pct = (v: number, of: number) => `${(v / of) * 100}%`;
const connector = (y: number) => `M${DOC.right + 6} ${y} C ${DOC.right + 50} ${y}, ${CHART.left - 50} ${CHART.y}, ${CHART.left - 6} ${CHART.y}`;

export function IngestArt() {
  const { ref, step } = useCycle(STEPS, 1100, STEPS - 1);
  const reading = Math.min(step, DOCS.length - 1);

  return (
    <div ref={ref} aria-hidden>
      <div className="relative hidden aspect-[700/320] w-full sm:block">
        <svg className="absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${W} ${H}`}>
          {DOCS.map((d, i) => (
            <path key={d.system} d={connector(d.y)} fill="none" className={cn("transition-colors duration-300", i === reading && step < DOCS.length ? "stroke-fg-3" : "stroke-border")} strokeWidth={1} strokeDasharray="3 3" />
          ))}
          <circle cx={CHART.left - 6} cy={CHART.y} r={2.5} className="fill-fg-3" />
        </svg>
  
        {DOCS.map((d, i) => {
          const active = i === reading && step < DOCS.length;
          return (
            <div
              key={d.system}
              className={cn(
                "absolute -translate-y-1/2 rounded-xl border bg-surface px-3 py-2.5 transition-[border-color,opacity] duration-300",
                active ? "border-fg/50" : "border-border",
                step > i || active ? "opacity-100" : "opacity-60",
              )}
              style={{ left: pct(DOC.left, W), width: pct(DOC.right - DOC.left, W), top: pct(d.y, H) }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-fg">{d.system}</span>
                <span className="num rounded-[4px] bg-inverted px-1 py-px text-[8.5px] font-semibold tracking-[0.04em] text-inverted-fg">{d.format}</span>
              </div>
              <DocSkeleton layout={d.layout} />
            </div>
          );
        })}
  
        <div className="absolute -translate-y-1/2" style={{ left: pct(CHART.left, W), width: pct(CHART.right - CHART.left, W), top: pct(CHART.y, H) }}>
          <ChartCard step={step} />
        </div>
      </div>

      {/* Phones: the three reports as tags above the chart */}
      <div className="flex flex-col gap-3 sm:hidden">
        <div className="flex justify-center gap-2">
          {DOCS.map((d, i) => (
            <span
              key={d.system}
              className={cn(
                "flex items-center gap-1.5 rounded-full border bg-surface px-2.5 py-1 text-[11px] text-fg transition-colors duration-300",
                i === reading && step < DOCS.length ? "border-fg/50" : "border-border",
              )}
            >
              {d.system}
              <span className="num rounded-[4px] bg-inverted px-1 py-px text-[8.5px] font-semibold text-inverted-fg">{d.format}</span>
            </span>
          ))}
        </div>
        <ChartCard step={step} />
      </div>
    </div>
  );
}

/** The standard chart every report lands in. */
function ChartCard({ step }: { step: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface shadow-overlay">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
        <span className="text-[11.5px] font-medium text-fg">One chart of accounts</span>
        <span className="eyebrow">Every manager</span>
      </div>
      <ul className="py-1">
        {ROWS.map((row) => {
          const read = step >= row.doc;
          const waiting = row.review && step === REVIEW_WAITS;
          const done = row.review ? step >= CONFIRMED : read;
          return (
            <li key={row.label} className={cn("flex h-[30px] items-center gap-2.5 px-3.5 transition-colors duration-300", waiting && "bg-warning/[0.06]")}>
              <span className={cn("min-w-0 flex-1 truncate text-[11.5px] transition-colors duration-300", done || waiting ? "text-fg" : "text-fg-3")}>{row.label}</span>
              <AnimatePresence initial={false}>
                {waiting && (
                  <motion.span
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="num text-[10.5px] text-warning"
                  >
                    Needs you · 56%
                  </motion.span>
                )}
              </AnimatePresence>
              <span className="grid size-4 shrink-0 place-items-center">
                {done ? (
                  <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.25, ease: "easeOut" }} className="grid size-4 place-items-center rounded-full bg-favorable/10">
                    <Check className="size-2.5 text-favorable" strokeWidth={3} />
                  </motion.span>
                ) : (
                  <span className={cn("size-1.5 rounded-full", waiting ? "animate-pulse bg-warning" : "bg-fg/15")} />
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Each system lays its report out differently. */
function DocSkeleton({ layout }: { layout: "table" | "columns" | "dense" }) {
  const bar = "h-1 rounded-full bg-fg/[0.09]";
  if (layout === "table") {
    return (
      <div className="mt-2 flex flex-col gap-1.5">
        {[70, 55, 62].map((w) => (
          <div key={w} className="flex items-center gap-2">
            <span className={bar} style={{ width: `${w}%` }} />
            <span className={cn(bar, "ml-auto w-[18%]")} />
          </div>
        ))}
      </div>
    );
  }
  if (layout === "columns") {
    return (
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {[80, 60, 70, 45].map((w, i) => (
          <span key={i} className={bar} style={{ width: `${w}%` }} />
        ))}
      </div>
    );
  }
  return (
    <div className="mt-2 grid grid-cols-4 gap-1">
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} className={cn(bar, "w-full")} />
      ))}
    </div>
  );
}
