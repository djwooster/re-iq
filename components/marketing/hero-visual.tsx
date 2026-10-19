"use client";

import { FileSpreadsheet } from "lucide-react";
import { motion } from "motion/react";
import { OverviewPanel } from "./overview-panel";
import { Scene, rise } from "./scene";

/*
 * September close for the sample portfolio: the reports the managers sent
 * (34 attachments, Oct 5–13) and the overview RE-IQ writes from them.
 */

const FILES = ["WillowBend_TwelveMonthIS_Sep26.xlsx", "Oakridge_T12_Sep2026.xlsx", "TheVale_T12_Sep2026.xlsx", "PeachtreeLanding_IncomeStatement_2026-09.csv"];
const TOTAL_FILES = 34;

// Steps: 1 source reports, 2–4 the overview plays (metrics, summary, evidence).
const SCHEDULE = [200, 700, 1100, 2400] as const;

export function HeroVisual() {
  return (
    <Scene label="September close · Alder Peak Capital (sample)" meta="14 properties · 3,790 units" schedule={SCHEDULE}>
      {(step) => (
        <div className="lg:min-h-[500px]">
          <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-2">
            <motion.span {...rise(step >= 1)} className="mr-1 text-[10px] text-fg-3">
              Read from
            </motion.span>
            {FILES.map((name, i) => (
              <motion.span
                key={name}
                {...rise(step >= 1, 0.05 + i * 0.05)}
                className="num inline-flex max-w-[180px] min-w-0 items-center gap-1 rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] text-fg-2"
              >
                <FileSpreadsheet className="size-3 shrink-0" strokeWidth={1.75} aria-hidden />
                <span className="truncate">{name}</span>
              </motion.span>
            ))}
            <motion.span {...rise(step >= 1, 0.3)} className="num text-[10px] text-fg-3">
              + {TOTAL_FILES - FILES.length} more
            </motion.span>
          </div>
          <OverviewPanel step={step - 1} />
        </div>
      )}
    </Scene>
  );
}
