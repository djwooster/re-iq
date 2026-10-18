"use client";

import { Check, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatCurrencyShort } from "@/lib/format";
import { Scene, rise } from "./scene";

/* The sample portfolio's open issues by dollar impact, and the Mesa Verde diagnosis. */

const ISSUES = [
  { property: "Lakeline Flats", title: "Vacancy and concessions behind budget", impact: 280_430, when: "this quarter" },
  { property: "Mesa Verde", title: "Repeat HVAC failures in R&M", impact: 57_153, when: "since May" },
  { property: "Willow Bend", title: "Contract labor in payroll", impact: 28_547, when: "since April" },
  { property: "Peachtree Landing", title: "Utilities 25.9% over budget", impact: 24_715, when: "since June" },
  { property: "Magnolia Court", title: "Delinquency doubled since March", impact: 14_627, when: "this quarter" },
];
const SELECTED = 1;
const MAX = Math.max(...ISSUES.map((i) => i.impact));

const EVIDENCE = [
  { label: "R&M, May–Sep", value: "$118,881", detail: "Budget $61,728" },
  { label: "HVAC work orders", value: "45", detail: "Since May 1" },
  { label: "Repeat calls", value: "26", detail: "Units 1203, 1104, 3102, 2205" },
  { label: "Coolflow Mechanical", value: "$65,371", detail: "HVAC vendor, T12" },
];

// Steps: 1 issues rank in, 2 Mesa Verde is selected, 3 its diagnosis opens, 4 the action is accepted.
const SCHEDULE = [200, 1500, 1900, 3900] as const;

export function PrioritizeVisual() {
  return (
    <Scene label="Overview · Needs attention" meta="Ranked by dollar impact" schedule={SCHEDULE}>
      {(step) => (
        <div className="grid gap-2 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <ul className="flex flex-col gap-1.5">
            {ISSUES.map((issue, i) => {
              const selected = i === SELECTED && step >= 2;
              return (
                <motion.li
                  key={issue.property}
                  {...rise(step >= 1, i * 0.08)}
                  className={cn(
                    "rounded-lg border bg-bg px-2.5 py-2 transition-colors duration-300",
                    selected ? "border-border-strong bg-surface-2" : "border-border",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[11px] font-medium text-fg">{issue.property}</span>
                    <span className="num shrink-0 text-[11px] text-unfavorable">-{formatCurrencyShort(issue.impact)}</span>
                  </div>
                  <div className="mt-0.5 flex items-baseline justify-between gap-2 text-[10px] text-fg-3">
                    <span className="truncate">{issue.title}</span>
                    <span className="shrink-0">{issue.when}</span>
                  </div>
                  <div className="mt-1.5 h-0.5 rounded-full bg-fg/[0.06]">
                    <motion.div
                      className="h-full rounded-full bg-unfavorable/70"
                      style={{ width: `${(issue.impact / MAX) * 100}%`, originX: 0 }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: step >= 1 ? 1 : 0 }}
                      transition={{ duration: 0.5, ease: "easeOut", delay: step >= 1 ? 0.2 + i * 0.08 : 0 }}
                    />
                  </div>
                </motion.li>
              );
            })}
          </ul>

          <motion.div {...rise(step >= 3)} className="flex flex-col rounded-lg border border-border bg-bg">
            <div className="border-b border-border px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <Badge tone="unfavorable">Issue</Badge>
                <span className="text-[10px] text-fg-3">Mesa Verde · High confidence</span>
              </div>
              <p className="mt-1.5 text-[12px] font-medium leading-[1.45] text-fg">Repeat HVAC failures put R&M $57K over budget</p>
              <p className="mt-1 text-[11px] leading-[1.55] text-fg-2">
                26 of 45 HVAC calls since May went to the same 4 units. That points to failing original condensers, not one-off repairs.
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 px-3 py-2.5">
              {EVIDENCE.map((e, i) => (
                <motion.div key={e.label} {...rise(step >= 3, 0.15 + i * 0.05)}>
                  <dt className="text-[10px] text-fg-3">{e.label}</dt>
                  <dd className="num text-[12px] text-fg">{e.value}</dd>
                  <dd className="truncate text-[10px] text-fg-3">{e.detail}</dd>
                </motion.div>
              ))}
            </dl>
            <div className="flex items-center gap-1 border-t border-border px-3 py-1.5 text-[10px] text-fg-3">
              <RefreshCw className="size-3" aria-hidden />
              <span className="num">Rent Manager · Summit Living</span> · synced Oct 18, 5:41am
            </div>
            <div className="mt-auto border-t border-border px-3 py-2.5">
              <div className="eyebrow">Recommended action</div>
              <p className="mt-1 text-[11px] leading-[1.5] text-fg">
                Get condenser replacement bids for units 1203, 1104, 3102, 2205 and compare them with the current repair run-rate.
              </p>
              <div className="mt-2 flex h-6 items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[10px] text-fg-3">
                  <span className="num grid size-5 place-items-center rounded-full bg-surface-2 text-[9px] text-fg-2">SK</span>
                  Sam Kowalski
                </span>
                <AnimatePresence mode="wait" initial={false}>
                  {step >= 4 ? (
                    <motion.span key="accepted" {...rise(true)}>
                      <Badge tone="favorable">
                        <Check className="size-2.5" strokeWidth={2.5} aria-hidden /> Accepted · on this week&apos;s list
                      </Badge>
                    </motion.span>
                  ) : (
                    <motion.span
                      key="accept"
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="rounded-md bg-inverted px-2 py-1 text-[10px] font-medium text-inverted-fg"
                    >
                      Accept
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </Scene>
  );
}
