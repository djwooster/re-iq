"use client";

import { ChevronRight, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { AnimatedNumber } from "@/components/ui/motion";
import { cn } from "@/lib/cn";
import { formatCurrencyShort, formatPercent } from "@/lib/format";
import { rise } from "./scene";

/*
 * The Overview for the sample portfolio (Q3 2026, data through Sep 30), using
 * its real numbers. If the seeded stories change, update these.
 */

const SUMMARY = [
  "Portfolio NOI is $9.32M this quarter, $391K (4.0%) below budget.",
  "Lakeline Flats accounts for most of the gap: vacancy and concessions cost $280K against budget this quarter.",
  "R&M at Mesa Verde is $57K over budget since May, driven by repeat HVAC calls to the same 4 units.",
  "Brookstone Park has 58 below-market leases expiring by Jan 16, worth an estimated $66K a year if renewed closer to market.",
];
const OPEN = 1;

const EVIDENCE = [
  { label: "Physical occupancy", value: "85.5%" },
  { label: "Vacant units", value: "54 of 372" },
  { label: "Vacancy loss, QTD", value: "$282,860" },
  { label: "Concessions, QTD", value: "$122,488" },
];

const METRICS = [
  { label: "NOI, QTD", value: 9_317_563, format: formatCurrencyShort, note: "-$391K vs budget", tone: "text-unfavorable" },
  { label: "Economic occupancy", value: 0.8896, format: (v: number) => formatPercent(v), note: "Physical 93.9%", tone: "text-fg-3" },
  { label: "Open opportunities", value: 176_939, format: (v: number) => `+${formatCurrencyShort(v)}`, note: "Estimated, annual", tone: "text-favorable" },
];

/** Steps: 1 metrics count up, 2 summary writes in, 3 one sentence opens to its evidence. */
export function OverviewPanel({ step }: { step: number }) {
  return (
    <>
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {METRICS.map((m) => (
          <div key={m.label} className="rounded-lg border border-border bg-bg px-2.5 py-2 sm:px-3 sm:py-2.5">
            <div className="eyebrow truncate">{m.label}</div>
            <AnimatedNumber
              value={step >= 1 ? m.value : 0}
              format={m.format}
              className="num mt-1 block text-[15px] font-medium leading-6 text-fg sm:text-[20px]"
            />
            <motion.div {...rise(step >= 1, 0.4)} className={cn("num truncate text-[10px]", m.tone)}>
              {m.note}
            </motion.div>
          </div>
        ))}
      </div>

      <div className="mt-2 rounded-lg border border-border bg-bg">
        <div className="flex items-center justify-between gap-3 px-3.5 pt-3">
          <div className="eyebrow">
            Summary <span className="normal-case tracking-normal text-fg-3/80">· written by AI from your reports</span>
          </div>
          <span className="num hidden text-[10px] text-fg-3 md:inline">Data through Sep 30, 2026</span>
        </div>
        <ul className="flex min-h-[188px] flex-col gap-1 px-3.5 pt-2 pb-3">
          {SUMMARY.map((text, i) => {
            const open = i === OPEN && step >= 3;
            return (
              <motion.li key={text} {...rise(step >= 2, i * 0.18)}>
                <div className={cn("flex items-start gap-1.5 text-[12px] leading-[1.7] transition-colors duration-300 sm:text-[13px]", open ? "text-fg" : "text-fg-2")}>
                  <ChevronRight
                    className={cn("mt-[5px] size-3.5 shrink-0 text-fg-3 transition-transform duration-200 ease-out", open && "rotate-90 text-fg")}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span>{text}</span>
                </div>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 mb-2 ml-5 rounded-md border border-border bg-surface">
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-3 py-2.5 sm:grid-cols-4">
                          {EVIDENCE.map((e, j) => (
                            <motion.div key={e.label} {...rise(true, 0.15 + j * 0.05)}>
                              <dt className="text-[10px] text-fg-3">{e.label}</dt>
                              <dd className="num text-[12px] text-fg">{e.value}</dd>
                            </motion.div>
                          ))}
                        </dl>
                        <motion.div {...rise(true, 0.4)} className="flex flex-wrap gap-x-3 gap-y-1 border-t border-border px-3 py-2 text-[10px] text-fg-3">
                          <span className="num inline-flex items-center gap-1 text-fg-2">
                            <RefreshCw className="size-3" aria-hidden /> ResMan · Harbor Property Group
                          </span>
                          <span>Synced Oct 18, 6:02am · ledger and rent roll</span>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
