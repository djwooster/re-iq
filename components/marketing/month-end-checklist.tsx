"use client";

import { ArrowRightLeft, Check, ChartColumn, Inbox, ListOrdered } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

/** The month-end chores RE-IQ takes over, ticking off one by one under the hero headline. */

const TASKS = [
  { icon: Inbox, label: "Reports collected", detail: "34 files from 4 managers, any format" },
  { icon: ArrowRightLeft, label: "Accounts mapped", detail: "No re-keying charts of accounts" },
  { icon: ChartColumn, label: "Variance explained", detail: "By driver and by property" },
  { icon: ListOrdered, label: "Issues ranked", detail: "By dollar impact, before anyone asks" },
];

export function MonthEndChecklist({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  return (
    <ul className={className}>
      {TASKS.map(({ icon: Icon, label, detail }, i) => {
        const delay = reduce ? 0 : 0.5 + i * 0.4;
        return (
          <motion.li
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut", delay: reduce ? 0 : 0.15 + i * 0.05 }}
            className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-surface text-fg-2">
              <Icon className="size-4" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium leading-5 text-fg">{label}</span>
              <span className="block truncate text-[12px] leading-4 text-fg-3">{detail}</span>
            </span>
            <span className="relative grid size-5 shrink-0 place-items-center" aria-hidden>
              <span className="absolute inset-0 rounded-full border border-border-strong" />
              <motion.span
                className="absolute inset-0 grid place-items-center rounded-full bg-favorable text-bg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, ease: "easeOut", delay }}
              >
                <Check className="size-3" strokeWidth={3} />
              </motion.span>
            </span>
          </motion.li>
        );
      })}
    </ul>
  );
}
