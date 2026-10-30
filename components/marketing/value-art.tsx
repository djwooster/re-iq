"use client";

import { ArrowDown, TrendingUp } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { AnimatedNumber } from "@/components/ui/motion";
import { formatCurrencyShort } from "@/lib/format";
import { useCycle } from "./use-cycle";

/*
 * NOI found, then what it's worth: the sample portfolio's three open
 * opportunities add up to +$177K a year, about $3.5M of value at a 5% cap rate.
 */

const OPPORTUNITIES = [
  { what: "Below-market renewals", where: "Brookstone Park", value: 65_736 },
  { what: "More renewals under market", where: "Across the portfolio", value: 58_104 },
  { what: "Landscaping rebid", where: "4 Crestline properties", value: 53_099 },
];
const TOTAL = OPPORTUNITIES.reduce((s, o) => s + o.value, 0);
const MAX = OPPORTUNITIES[0].value;
const CAP_RATE = 0.05;

// Steps: 0 empty, 1–3 each opportunity, 4 the annual total, 5 its value, 6–7 hold.
const STEPS = 8;

export function ValueArt() {
  const { ref, step } = useCycle(STEPS, 800, STEPS - 1);
  const totaled = step > OPPORTUNITIES.length;
  const valued = step > OPPORTUNITIES.length + 1;

  return (
    <div ref={ref} className="mx-auto flex w-full max-w-[460px] flex-col items-center gap-3" aria-hidden>
      <div className="w-full rounded-xl border border-border bg-surface shadow-overlay">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-[11.5px] font-medium text-fg">Where NOI can grow</span>
          <span className="eyebrow">Estimates</span>
        </div>
        <ul className="px-4 py-1.5">
          {OPPORTUNITIES.map((o, i) => (
            <motion.li
              key={o.what}
              className="py-2"
              initial={false}
              animate={{ opacity: step > i ? 1 : 0.25 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[11.5px]">
                  <span className="font-medium text-fg">{o.what}</span>
                  <span className="text-fg-3"> · {o.where}</span>
                </span>
                <span className="num shrink-0 text-[11.5px] text-favorable">+{formatCurrencyShort(o.value)}</span>
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-fg/[0.06]">
                <motion.span
                  className="block h-full rounded-full bg-favorable/70"
                  style={{ width: `${(o.value / MAX) * 100}%`, originX: 0 }}
                  initial={false}
                  animate={{ scaleX: step > i ? 1 : 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            </motion.li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between border-t border-border px-4 py-3">
          <span className="text-[11px] text-fg-3">NOI a year</span>
          <AnimatedNumber value={totaled ? TOTAL : 0} format={(v) => `+${formatCurrencyShort(v)}`} className="num text-[15px] font-medium text-favorable" />
        </div>
      </div>

      <ArrowDown className="size-4 text-fg-3" strokeWidth={1.75} />

      <div className="flex h-[58px] w-full items-center justify-between rounded-xl border border-border bg-surface px-4">
        <span className="text-[11px] text-fg-3">
          Value at a <span className="num text-fg">5%</span> cap rate
        </span>
        <AnimatePresence initial={false}>
          {valued && (
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex items-center gap-2"
            >
              <TrendingUp className="size-4 text-favorable" strokeWidth={1.75} />
              <span className="num text-[20px] font-medium text-favorable">≈ {formatCurrencyShort(TOTAL / CAP_RATE)}</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
