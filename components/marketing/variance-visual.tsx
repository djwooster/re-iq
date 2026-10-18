"use client";

import { motion } from "motion/react";
import { AnimatedNumber } from "@/components/ui/motion";
import { cn } from "@/lib/cn";
import { formatCurrencyShort, formatVarianceShort } from "@/lib/format";
import { Scene, rise } from "./scene";

/*
 * Sample portfolio, Q3 2026: budget NOI to actual NOI by driver. The drivers
 * sum exactly to the NOI variance (-$391,150), as they do in the product.
 */

const BUDGET = 9_708_713;
const ACTUAL = 9_317_563;

const DRIVERS = [
  { label: "Vacancy", value: -150_054 },
  { label: "Concessions", value: -101_385 },
  { label: "Repairs & maintenance", value: -37_347 },
  { label: "Utilities", value: -32_238 },
  { label: "Loss to lease", value: -31_040 },
  { label: "Contract services", value: -24_859 },
  { label: "Payroll", value: -15_461 },
  { label: "Bad debt", value: -8_558 },
  { label: "Other", value: 9_792 },
];

const PROPERTIES = [
  { label: "Lakeline Flats", value: -273_699 },
  { label: "Brookstone Park", value: -46_716 },
  { label: "Mesa Verde", value: -33_916 },
  { label: "Gulch Terrace", value: 32_777 },
];

// Running total after each driver, and the scale: 0 (budget) at the right edge.
const BARS = DRIVERS.reduce<{ label: string; value: number; from: number; to: number }[]>((acc, d) => {
  const from = acc.length ? acc[acc.length - 1].to : 0;
  return [...acc, { ...d, from, to: from + d.value }];
}, []);
const MIN = Math.min(...BARS.map((b) => b.to)) * 1.06;
const x = (v: number) => `${((v - MIN) / -MIN) * 100}%`;
const width = (a: number, b: number) => `${(Math.abs(a - b) / -MIN) * 100}%`;
const TOTAL = ACTUAL - BUDGET;

// Steps: 1 budget line, 2 drivers step down one by one, 3 actual NOI, 4 largest properties.
const SCHEDULE = [200, 600, 600 + DRIVERS.length * 220 + 200, 600 + DRIVERS.length * 220 + 900] as const;

function Row({ label, value, children, strong }: { label: string; value: React.ReactNode; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className="grid h-6 grid-cols-[92px_minmax(0,1fr)_56px] items-center gap-2.5 sm:grid-cols-[132px_minmax(0,1fr)_64px]">
      <span className={cn("truncate text-[11px]", strong ? "font-medium text-fg" : "text-fg-2")}>{label}</span>
      <div className="relative h-full">{children}</div>
      <span className={cn("num text-right text-[11px]", strong ? "font-medium text-fg" : "text-fg-2")}>{value}</span>
    </div>
  );
}

export function VarianceVisual() {
  return (
    <Scene label="Performance · NOI vs budget, Q3 2026" meta="Data through Sep 30" schedule={SCHEDULE}>
      {(step) => (
        <div className="grid gap-2">
          <div className="rounded-lg border border-border bg-bg px-3 pt-3 pb-2.5">
            <div className="relative">
              {/* Budget reference line, full height */}
              <div className="pointer-events-none absolute inset-y-0 right-[66px] left-[102px] sm:right-[74px] sm:left-[142px]">
                <motion.div
                  className="absolute inset-y-0 border-l border-dashed border-fg/25"
                  style={{ left: x(0) }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: step >= 1 ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              <Row label="Budget NOI" strong value={<motion.span {...rise(step >= 1)}>{formatCurrencyShort(BUDGET)}</motion.span>}>
                <span />
              </Row>

              {BARS.map((b, i) => (
                <Row key={b.label} label={b.label} value={<motion.span {...rise(step >= 2, i * 0.22 + 0.2)}>{formatVarianceShort(b.value)}</motion.span>}>
                  <motion.div
                    className={cn("absolute top-1/2 h-3 -translate-y-1/2 rounded-[2px]", b.value < 0 ? "bg-unfavorable/80" : "bg-favorable/80")}
                    style={{ left: x(Math.min(b.from, b.to)), width: width(b.from, b.to), originX: b.value < 0 ? 1 : 0 }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: step >= 2 ? 1 : 0 }}
                    transition={{ duration: 0.5, ease: "easeOut", delay: step >= 2 ? i * 0.22 : 0 }}
                  />
                </Row>
              ))}

              <div className="mt-1 border-t border-border pt-1">
                <Row
                  label="Actual NOI"
                  strong
                  value={<AnimatedNumber value={step >= 3 ? ACTUAL : BUDGET} format={formatCurrencyShort} />}
                >
                  <motion.div
                    className="absolute top-1/2 h-3 -translate-y-1/2 rounded-[2px] bg-fg/80"
                    style={{ left: x(TOTAL), width: width(TOTAL, 0), originX: 1 }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: step >= 3 ? 1 : 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </Row>
              </div>
            </div>
            <motion.p {...rise(step >= 3, 0.3)} className="mt-2 text-[11px] text-fg-3">
              <span className="num font-medium text-unfavorable">{formatVarianceShort(TOTAL)}</span> (4.0%) below budget. Drivers add up to the
              total.
            </motion.p>
          </div>

          <motion.div {...rise(step >= 4)} className="rounded-lg border border-border bg-bg px-3 py-2.5">
            <div className="eyebrow mb-1.5">Largest by property</div>
            <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {PROPERTIES.map((p, i) => (
                <motion.li key={p.label} {...rise(step >= 4, 0.1 + i * 0.05)} className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-fg-2">{p.label}</span>
                  <span className={cn("num", p.value < 0 ? "text-unfavorable" : "text-favorable")}>{formatVarianceShort(p.value)}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      )}
    </Scene>
  );
}
