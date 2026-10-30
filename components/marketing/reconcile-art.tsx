"use client";

import { Check, Equal, EqualNot } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { useCycle } from "./use-cycle";

/*
 * The manager's statement beside RE-IQ's numbers, compared line by line. Three
 * totals match; occupied units on the rent roll don't match the T-12, and that
 * break is flagged. Totals are the sample portfolio's Brookstone Park T-12.
 */

const ROWS = [
  { line: "Total revenue", manager: "$5,001,598", ours: "$5,001,598", match: true },
  { line: "Operating expenses", manager: "$2,147,069", ours: "$2,147,069", match: true },
  { line: "Net operating income", manager: "$2,854,529", ours: "$2,854,529", match: true },
  { line: "Occupied units", manager: "286", ours: "284", match: false },
];

// Steps: 0 nothing compared, 1–4 each line compared, 5 the summary, 6 hold.
const STEPS = 7;

export function ReconcileArt() {
  const { ref, step } = useCycle(STEPS, 850, STEPS - 1);

  return (
    <div ref={ref} className="flex flex-col items-center gap-4" aria-hidden>
      <div className="grid w-full max-w-[620px] grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)] items-stretch">
        <Column title="Manager's statement" values={ROWS.map((r) => r.manager)} step={step} />
        <ul className="flex flex-col pt-[37px] pb-1">
          {ROWS.map((row, i) => (
            <li key={row.line} className="relative grid h-[44px] place-items-center">
              <span className={cn("absolute inset-x-0 top-1/2 h-px transition-colors duration-300", step > i ? (row.match ? "bg-favorable/40" : "bg-warning/50") : "bg-border")} />
              <AnimatePresence initial={false}>
                {step > i && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className={cn("relative grid size-6 place-items-center rounded-full border bg-surface", row.match ? "border-favorable/30" : "border-warning/40")}
                  >
                    {row.match ? <Equal className="size-3 text-favorable" strokeWidth={2.5} /> : <EqualNot className="size-3 text-warning" strokeWidth={2.5} />}
                  </motion.span>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>
        <Column title="RE-IQ" values={ROWS.map((r) => r.ours)} step={step} flagged={ROWS.length - 1} elevated />
      </div>
      <div className="h-7">
        <AnimatePresence initial={false}>
          {step > ROWS.length && (
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px]"
            >
              <Check className="size-3 text-favorable" strokeWidth={2.5} />
              <span className="text-fg">Totals match</span>
              <span className="size-1 rounded-full bg-fg-3" />
              <span className="text-warning">1 break flagged</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Column({ title, values, step, flagged, elevated }: { title: string; values: string[]; step: number; flagged?: number; elevated?: boolean }) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface", elevated && "shadow-overlay")}>
      <div className="truncate border-b border-border px-3 py-2.5 text-[11px] font-medium text-fg">{title}</div>
      <ul className="pb-1">
        {values.map((value, i) => (
          <li key={i} className="flex h-[44px] flex-col justify-center px-3">
            <span className="truncate text-[10px] text-fg-3">{ROWS[i].line}</span>
            <span className={cn("num text-[12px] transition-colors duration-300", step > i && i === flagged ? "text-warning" : "text-fg")}>{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
