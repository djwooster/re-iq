"use client";

import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/ui/motion";
import { formatCurrencyShort } from "@/lib/format";
import { Scene, rise } from "./scene";

/*
 * What September's reports turned up in the sample portfolio: its three open
 * opportunities, which sum to the +$177K shown on the demo's Overview.
 */

const OPPORTUNITIES = [
  { where: "Brookstone Park", what: "58 below-market leases expiring by Jan 16", value: 65_736 },
  { where: "Across the portfolio", what: "85 more below-market renewals in the next 90 days", value: 58_104 },
  { where: "4 Crestline properties", what: "Landscaping at $213 a unit against a $168 benchmark", value: 53_099 },
];
const TOTAL = OPPORTUNITIES.reduce((sum, o) => sum + o.value, 0);
const MAX = Math.max(...OPPORTUNITIES.map((o) => o.value));

// Steps: 1 opportunities list in, 2 their values grow, 3 the total adds up, 4 the estimate note.
const SCHEDULE = [200, 900, 1800, 2600] as const;

export function HeroVisual() {
  return (
    <Scene label="September close · Alder Peak Capital (sample)" meta="34 reports read" schedule={SCHEDULE}>
      {(step) => (
        <div className="rounded-lg border border-border bg-bg">
          <div className="border-b border-border px-4 py-2.5">
            <div className="text-[12px] font-medium text-fg">Where NOI can grow</div>
            <div className="text-[10px] text-fg-3">From the rent rolls, T12s, and vendor spend your managers sent</div>
          </div>
          <ul>
            {OPPORTUNITIES.map((o, i) => (
              <motion.li key={o.where} {...rise(step >= 1, i * 0.1)} className="border-b border-border px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[12px] font-medium text-fg">{o.where}</span>
                  <motion.span {...rise(step >= 2, 0.25 + i * 0.08)} className="num shrink-0 text-[12px] text-favorable">
                    +{formatCurrencyShort(o.value)}/yr
                  </motion.span>
                </div>
                <div className="mt-0.5 truncate text-[11px] text-fg-3">{o.what}</div>
                <div className="mt-2 h-2 rounded-[2px] bg-fg/[0.05]">
                  <motion.div
                    className="h-full rounded-[2px] bg-data/70"
                    style={{ width: `${(o.value / MAX) * 100}%`, originX: 0 }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: step >= 2 ? 1 : 0 }}
                    transition={{ duration: 0.5, ease: "easeOut", delay: step >= 2 ? i * 0.08 : 0 }}
                  />
                </div>
              </motion.li>
            ))}
          </ul>
          <div className="flex items-end justify-between gap-4 px-4 py-4">
            <div>
              <div className="eyebrow">Estimated NOI, annual</div>
              <AnimatedNumber
                value={step >= 3 ? TOTAL : 0}
                format={(v) => `+${formatCurrencyShort(v)}`}
                className="num mt-1 block text-[28px] font-medium leading-none text-favorable"
              />
            </div>
            <motion.div {...rise(step >= 4)} className="flex flex-col items-end gap-1 text-right text-[10px] text-fg-3">
              <Badge tone="muted">Estimate</Badge>
              <span>Each one shows its assumption</span>
            </motion.div>
          </div>
        </div>
      )}
    </Scene>
  );
}
