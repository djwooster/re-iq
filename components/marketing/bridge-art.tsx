"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { formatCurrencyShort } from "@/lib/format";
import { useCycle } from "./use-cycle";

/*
 * Budget NOI stepping down to actual NOI, one driver at a time, for the sample
 * portfolio's Q3 2026. The drivers sum exactly to the -$391K variance, as they
 * do in the product; the smaller ones are grouped as Other.
 */

const BUDGET = 9_708_713;
const ACTUAL = 9_317_563;
const DRIVERS = [
  { label: "Vacancy", value: -150_054 },
  { label: "Concessions", value: -101_385 },
  { label: "R&M", value: -37_347 },
  { label: "Utilities", value: -32_238 },
  { label: "Other", value: -70_126 },
];
const TOTAL = DRIVERS.reduce((s, d) => s + d.value, 0);
const SCALE = 450_000;

const BARS = DRIVERS.reduce<{ label: string; value: number; from: number; to: number }[]>((acc, d) => {
  const from = acc.length ? acc[acc.length - 1].to : 0;
  return [...acc, { ...d, from, to: from + d.value }];
}, []);

const top = (v: number) => `${(-v / SCALE) * 100}%`;

// Steps: 0 just the budget line, 1–5 each driver steps down, 6 they add up, 7 hold.
const STEPS = 8;

export function BridgeArt() {
  const { ref, step } = useCycle(STEPS, 750, STEPS - 1);
  const done = step > DRIVERS.length;

  return (
    <div ref={ref} className="mx-auto w-full max-w-[620px] rounded-xl border border-border bg-surface p-4 shadow-overlay sm:p-5" aria-hidden>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] text-fg-3">
          Budget NOI <span className="num text-fg">{formatCurrencyShort(BUDGET)}</span>
        </span>
        <span className="eyebrow">Q3 2026 (sample)</span>
      </div>

      <div className="relative mt-4 mb-8 h-[180px]">
        <span className="absolute inset-x-0 top-0 border-t border-dashed border-border-strong" />
        <motion.span
          className="absolute inset-x-0 border-t border-dashed border-fg-3"
          style={{ top: top(TOTAL) }}
          initial={false}
          animate={{ opacity: done ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
        <div className="absolute inset-0 grid grid-cols-5 gap-3 px-2 sm:gap-5">
          {BARS.map((bar, i) => {
            const shown = step > i;
            return (
              <div key={bar.label} className="relative">
                <motion.span
                  className="absolute inset-x-0 rounded-[3px] bg-unfavorable/70"
                  style={{ top: top(bar.from), height: top(bar.value), originY: 0 }}
                  initial={false}
                  animate={{ scaleY: shown ? 1 : 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                />
                <motion.span
                  className="num absolute inset-x-0 pt-1 text-center text-[10.5px] text-unfavorable"
                  style={{ top: top(bar.to) }}
                  initial={false}
                  animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : -4 }}
                  transition={{ duration: 0.25, ease: "easeOut", delay: shown ? 0.2 : 0 }}
                >
                  {formatCurrencyShort(bar.value)}
                </motion.span>
                <span className="absolute inset-x-0 top-[calc(100%+12px)] truncate text-center text-[10.5px] text-fg-3">{bar.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="text-[11px] text-fg-3">
          Actual NOI <span className="num text-fg">{formatCurrencyShort(ACTUAL)}</span>
        </span>
        <span className="h-6">
          <AnimatePresence initial={false}>
            {done && (
              <motion.span
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex items-center gap-1.5 rounded-full bg-favorable/10 px-2.5 py-1 text-[11px] text-favorable"
              >
                <Check className="size-3" strokeWidth={2.5} />
                Drivers add up to <span className="num">{formatCurrencyShort(TOTAL)}</span>
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </div>
    </div>
  );
}
