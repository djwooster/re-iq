"use client";

import { ArrowRight, Check, FileSpreadsheet, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/labels";
import type { GlCategory } from "@/lib/types";
import { Scene, rise } from "./scene";

/* September reports from the sample portfolio and the Magnolia Court T12's real mapping lines. */

const SOURCES = [
  { name: "Brookstone_T12_Sep2026.xlsx", kind: "T12" },
  { name: "Oakridge_RentRoll_09302026.xlsx", kind: "Rent roll" },
  { name: "TheVale_WorkOrders_Sep2026.csv", kind: "Work orders" },
  { name: "magnolia-court-twelve-month-income-statement-2026-09.xlsx", kind: "T12", review: true },
  { name: "ResMan · Harbor Property Group", kind: "Sync", connector: true },
];

const LINES: { code: string; label: string; amount: number; target: GlCategory; confidence: number }[] = [
  { code: "4100", label: "Rent Income", amount: 2_176_725, target: "gross_potential_rent", confidence: 0.84 },
  { code: "4110", label: "Vacancy", amount: -145_606, target: "vacancy_loss", confidence: 0.97 },
  { code: "4190", label: "Bad Debt", amount: -65_879, target: "bad_debt", confidence: 0.95 },
  { code: "6010", label: "Payroll", amount: 224_946, target: "payroll", confidence: 0.97 },
  { code: "6215", label: "Misc Turn Exp", amount: 60_077, target: "turnover", confidence: 0.61 },
  { code: "6320", label: "Water/Sewer", amount: 100_136, target: "utilities", confidence: 0.98 },
  { code: "6420", label: "Resident Svcs - Pkg Lockers", amount: 7_654, target: "contract_services", confidence: 0.54 },
];
const REVIEW_THRESHOLD = 0.75;

// Steps: 1 reports arrive, 2 they finish reading, 3 Magnolia's lines map, 4 you confirm the two flagged lines.
const SCHEDULE = [200, 1500, 2100, 4200] as const;

export function IngestVisual() {
  return (
    <Scene label="Data sources · September reports" schedule={SCHEDULE}>
      {(step) => (
        <div className="grid gap-2 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <ul className="flex flex-col gap-1.5">
            {SOURCES.map((s, i) => {
              const reading = step < 2;
              const needsReview = s.review && step < 4;
              return (
                <motion.li
                  key={s.name}
                  {...rise(step >= 1, i * 0.12)}
                  className={cn(
                    "rounded-lg border bg-bg px-2.5 py-2 transition-colors duration-300",
                    s.review && step >= 3 && step < 4 ? "border-warning/40" : "border-border",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {s.connector ? (
                      <RefreshCw className="size-3.5 shrink-0 text-fg-3" strokeWidth={1.75} aria-hidden />
                    ) : (
                      <FileSpreadsheet className="size-3.5 shrink-0 text-fg-3" strokeWidth={1.75} aria-hidden />
                    )}
                    <span className="num min-w-0 flex-1 truncate text-[11px] text-fg">{s.name}</span>
                  </div>
                  <div className="mt-1.5 flex h-[18px] items-center justify-between gap-2 pl-5.5">
                    <span className="text-[10px] text-fg-3">{s.kind}</span>
                    {reading ? (
                      <Progress indeterminate className="w-16" />
                    ) : needsReview ? (
                      <Badge tone="warning" dot>
                        2 lines to review
                      </Badge>
                    ) : (
                      <Badge tone="favorable" dot>
                        Processed
                      </Badge>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ul>

          <motion.div {...rise(step >= 3)} className="rounded-lg border border-border bg-bg">
            <div className="flex items-baseline justify-between gap-3 border-b border-border px-3 py-2">
              <span className="text-[12px] font-medium text-fg">Magnolia Court · T12 Sep 2026</span>
              <span className="num text-[10px] text-fg-3">22 lines</span>
            </div>
            <ul>
              {LINES.map((l, i) => {
                const flagged = l.confidence < REVIEW_THRESHOLD;
                const confirmed = flagged && step >= 4;
                return (
                  <motion.li
                    key={l.code}
                    {...rise(step >= 3, 0.1 + i * 0.06)}
                    className={cn(
                      "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_44px] items-center gap-2 border-b border-border px-3 py-1.5 transition-colors duration-300 last:border-b-0",
                      flagged && !confirmed && "bg-warning/[0.06]",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[11px] text-fg">
                        <span className="num text-fg-3">{l.code}</span> {l.label}
                      </div>
                      <div className="num text-[10px] text-fg-3">{formatCurrency(l.amount)}</div>
                    </div>
                    <ArrowRight className="size-3 text-fg-3" strokeWidth={1.75} aria-hidden />
                    <span className="truncate text-[11px] text-fg-2">{CATEGORY_LABELS[l.target]}</span>
                    <span className="flex justify-end">
                      {confirmed ? (
                        <motion.span {...rise(true)} className="inline-flex items-center gap-0.5 text-[10px] font-medium text-favorable">
                          <Check className="size-3" strokeWidth={2.25} aria-hidden /> You
                        </motion.span>
                      ) : (
                        <span className={cn("num text-[10px]", flagged ? "font-medium text-warning" : "text-fg-3")}>{Math.round(l.confidence * 100)}%</span>
                      )}
                    </span>
                  </motion.li>
                );
              })}
            </ul>
            <div className="flex h-8 items-center border-t border-border px-3 text-[10px] text-fg-3">
              {step >= 4 ? (
                <motion.span {...rise(true)}>All 22 lines mapped. Your two answers are remembered for October.</motion.span>
              ) : (
                <span>Lines under 75% confidence wait for you.</span>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </Scene>
  );
}
