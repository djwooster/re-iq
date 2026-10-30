"use client";

import { Sparkles, UserRound } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { formatCurrencyShort } from "@/lib/format";
import { useCycle } from "./use-cycle";

/*
 * The month's issues arrive in no particular order, sort by dollars, and the
 * slow one (Mesa Verde's HVAC problem) opens to its cause and a next step.
 * Amounts are the sample portfolio's open issues.
 */

const ISSUES = [
  { property: "Magnolia Court", title: "Delinquency doubled", impact: 14_627 },
  { property: "Lakeline Flats", title: "Vacancy and concessions", impact: 280_430 },
  { property: "Peachtree Landing", title: "Utilities over budget", impact: 24_715 },
  { property: "Mesa Verde", title: "R&M over budget since May", impact: 57_153, focus: true },
  { property: "Willow Bend", title: "Contract labor in payroll", impact: 28_547 },
];
const SORTED = [...ISSUES].sort((a, b) => b.impact - a.impact);
const MAX = SORTED[0].impact;

// Steps: 0 as they arrived, 1 ranked by dollars, 2 Mesa Verde opens, 3 a next step is assigned, 4 hold.
const STEPS = 5;

export function RankArt() {
  const { ref, step } = useCycle(STEPS, 1300, STEPS - 1);
  const ranked = step >= 1;
  const list = ranked ? SORTED : ISSUES;

  return (
    <div ref={ref} className="h-[380px] w-full" aria-hidden>
      <div className="rounded-xl border border-border bg-surface shadow-overlay">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-[11.5px] font-medium text-fg">Needs attention</span>
          <span className="eyebrow transition-opacity duration-300">{ranked ? "Ranked by dollars" : "As reported"}</span>
        </div>
        <ul className="p-1.5">
          {list.map((issue, i) => {
            const open = issue.focus && step >= 2;
            return (
              <motion.li
                key={issue.property}
                layout
                transition={{ duration: 0.45, ease: "easeOut" }}
                className={cn("rounded-lg px-2.5 py-2 transition-colors duration-300", open && "bg-bg ring-1 ring-border")}
              >
                <div className="flex items-baseline gap-2.5">
                  <span className="num w-4 shrink-0 text-[10px] text-fg-3">{ranked ? i + 1 : "·"}</span>
                  <span className="min-w-0 flex-1 truncate text-[11.5px]">
                    <span className="font-medium text-fg">{issue.property}</span>
                    <span className="text-fg-3"> · {issue.title}</span>
                  </span>
                  <span className={cn("num shrink-0 text-[11.5px] transition-colors duration-300", ranked ? "text-unfavorable" : "text-fg-2")}>
                    -{formatCurrencyShort(issue.impact)}
                  </span>
                </div>
                <div className="mt-1.5 ml-[26px] h-1 rounded-full bg-fg/[0.06]">
                  <span
                    className={cn("block h-full rounded-full transition-colors duration-300", ranked ? "bg-unfavorable/70" : "bg-fg/20")}
                    style={{ width: `${Math.max(4, (issue.impact / MAX) * 100)}%` }}
                  />
                </div>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="ml-[26px] overflow-hidden"
                    >
                      <div className="flex items-start gap-2 pt-2.5 text-[11px] text-fg-2">
                        <Sparkles className="mt-px size-3 shrink-0 text-data" strokeWidth={1.75} />
                        26 repeat HVAC calls on the same 4 units
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5">
                        <span className="truncate text-[11px] text-fg">Get condenser replacement bids</span>
                        <span
                          className={cn(
                            "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] transition-colors duration-300",
                            step >= 3 ? "bg-favorable/10 text-favorable" : "bg-fg/[0.06] text-fg-3",
                          )}
                        >
                          <UserRound className="size-2.5" strokeWidth={2} />
                          {step >= 3 ? "Assigned" : "Assign"}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
