"use client";

import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/ui/motion";
import { formatCurrency, formatCurrencyShort } from "@/lib/format";
import { Scene, rise } from "./scene";

/* Brookstone Park's first below-market renewals from the sample rent roll (as of Oct 18). */

const LEASES = [
  { unit: "7203", plan: "C1 · 3 bd", days: 7, rent: 1785, market: 1940 },
  { unit: "10104", plan: "C1 · 3 bd", days: 7, rent: 1730, market: 1985 },
  { unit: "3102", plan: "A1 · 1 bd", days: 11, rent: 1270, market: 1355 },
  { unit: "6302", plan: "B1 · 2 bd", days: 13, rent: 1470, market: 1665 },
  { unit: "6105", plan: "C1 · 3 bd", days: 14, rent: 1870, market: 2105 },
  { unit: "3302", plan: "C1 · 3 bd", days: 15, rent: 1865, market: 2020 },
];
const TOTAL_LEASES = 58;
const MONTHLY_GAP = 9_130;
const CAPTURE = 0.6;
const ANNUAL = MONTHLY_GAP * 12 * CAPTURE;
const MAX_GAP = Math.max(...LEASES.map((l) => l.market - l.rent));

// Steps: 1 leases list in, 2 gaps to market grow, 3 totals add up, 4 the estimate and its assumption.
const SCHEDULE = [200, 900, 1800, 2700] as const;

export function RenewalsVisual() {
  return (
    <Scene label="Brookstone Park · Renewals & rents" meta="Expiring in the next 90 days" schedule={SCHEDULE}>
      {(step) => (
        <div className="rounded-lg border border-border bg-bg">
          <div className="grid grid-cols-[52px_minmax(0,1fr)_minmax(0,1.4fr)_52px] gap-3 border-b border-border px-3 py-1.5 text-[10px] text-fg-3">
            <span>Unit</span>
            <span>Rent → market</span>
            <span>Gap to market</span>
            <span className="text-right">Expires</span>
          </div>
          <ul>
            {LEASES.map((l, i) => {
              const gap = l.market - l.rent;
              return (
                <motion.li
                  key={l.unit}
                  {...rise(step >= 1, i * 0.07)}
                  className="grid grid-cols-[52px_minmax(0,1fr)_minmax(0,1.4fr)_52px] items-center gap-3 border-b border-border px-3 py-1.5"
                >
                  <div>
                    <div className="num text-[11px] text-fg">{l.unit}</div>
                    <div className="truncate text-[10px] text-fg-3">{l.plan}</div>
                  </div>
                  <span className="num truncate text-[11px] text-fg-2">
                    {formatCurrency(l.rent)} → {formatCurrency(l.market)}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-[2px] bg-fg/[0.05]">
                      <motion.div
                        className="h-full rounded-[2px] bg-data/70"
                        style={{ width: `${(gap / MAX_GAP) * 100}%`, originX: 0 }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: step >= 2 ? 1 : 0 }}
                        transition={{ duration: 0.5, ease: "easeOut", delay: step >= 2 ? i * 0.06 : 0 }}
                      />
                    </div>
                    <motion.span {...rise(step >= 2, 0.2 + i * 0.06)} className="num w-9 text-right text-[11px] text-fg">
                      +${gap}
                    </motion.span>
                  </div>
                  <span className="num text-right text-[11px] text-fg-2">{l.days} days</span>
                </motion.li>
              );
            })}
          </ul>
          <motion.div {...rise(step >= 1, 0.5)} className="border-b border-border px-3 py-1.5 text-[10px] text-fg-3">
            +{TOTAL_LEASES - LEASES.length} more at least 5% below market, expiring by Jan 16
          </motion.div>

          <div className="grid grid-cols-3 gap-3 px-3 py-3">
            <div>
              <div className="eyebrow">Leases</div>
              <AnimatedNumber value={step >= 3 ? TOTAL_LEASES : 0} format={(v) => String(Math.round(v))} className="num mt-0.5 block text-[16px] font-medium text-fg" />
            </div>
            <div>
              <div className="eyebrow">Gap per month</div>
              <AnimatedNumber value={step >= 3 ? MONTHLY_GAP : 0} format={formatCurrency} className="num mt-0.5 block text-[16px] font-medium text-fg" />
            </div>
            <div>
              <div className="eyebrow">If renewed</div>
              <AnimatedNumber
                value={step >= 4 ? ANNUAL : 0}
                format={(v) => `+${formatCurrencyShort(v)}/yr`}
                className="num mt-0.5 block text-[16px] font-medium text-favorable"
              />
            </div>
          </div>
          <motion.div {...rise(step >= 4, 0.3)} className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2 text-[10px] text-fg-3">
            <Badge tone="muted">Estimate</Badge>
            Assumes renewals close 60% of the gap to market.
          </motion.div>
        </div>
      )}
    </Scene>
  );
}
