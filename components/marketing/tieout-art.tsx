"use client";

import { Check, TriangleAlert } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { useCycle } from "./use-cycle";

/*
 * A manager's T-12 checked line by line: two totals tie out, the rent roll
 * doesn't, and the summary says so. Totals are the sample portfolio's
 * Brookstone Park T-12; the rent roll break is illustrative.
 */

const ROWS = [
  { line: "Total revenue", value: "$5,001,598", ok: true },
  { line: "Operating expenses", value: "$2,147,069", ok: true },
  { line: "Rent roll vs. T-12", value: "$1,240 off", ok: false },
];

// Steps: 0 nothing checked, 1–3 each row checks in turn, 4–5 the summary holds.
const STEPS = 6;

export function TieOutArt() {
  const { ref, step } = useCycle(STEPS, 900, STEPS - 1);

  return (
    <div ref={ref} className="absolute inset-0 grid place-items-center px-6" aria-hidden>
      <div className="w-full max-w-[320px] rounded-xl border border-border bg-surface shadow-overlay">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
          <span className="text-[11.5px] font-medium text-fg">Manager&apos;s T-12</span>
          <span className="eyebrow">Sep 2026</span>
        </div>
        <ul>
          {ROWS.map((row, i) => {
            const checked = step > i;
            return (
              <li key={row.line} className={cn("flex items-center gap-3 px-3.5 py-2.5", i > 0 && "border-t border-border")}>
                <span className="min-w-0 flex-1 truncate text-[11.5px] text-fg-2">{row.line}</span>
                <span className={cn("num text-[11.5px] transition-colors duration-300", checked && !row.ok ? "text-warning" : "text-fg")}>{row.value}</span>
                <span className="grid size-5 shrink-0 place-items-center">
                  <AnimatePresence mode="wait" initial={false}>
                    {checked ? (
                      <motion.span
                        key="done"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className={cn("grid size-5 place-items-center rounded-full", row.ok ? "bg-favorable/10" : "bg-warning/10")}
                      >
                        {row.ok ? <Check className="size-3 text-favorable" strokeWidth={2.5} /> : <TriangleAlert className="size-3 text-warning" strokeWidth={2.25} />}
                      </motion.span>
                    ) : (
                      <motion.span key="wait" exit={{ opacity: 0 }} className="size-1.5 animate-pulse rounded-full bg-fg-3" />
                    )}
                  </AnimatePresence>
                </span>
              </li>
            );
          })}
        </ul>
        <div className="flex h-10 items-center justify-center border-t border-border px-3.5">
          <AnimatePresence initial={false}>
            {step >= ROWS.length + 1 && (
              <motion.span
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex items-center gap-2 text-[11px]"
              >
                <span className="text-favorable">2 tie out</span>
                <span className="size-1 rounded-full bg-fg-3" />
                <span className="text-warning">1 flagged for you</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
