"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { useCycle } from "./use-cycle";

/*
 * Four property managers on one scale, cycling through three metrics. Values
 * come from the sample portfolio (Q3 2026); tone says whether each is on
 * track, worth watching, or worth a call.
 */

type Tone = "good" | "watch" | "bad";

const MANAGERS = [
  { name: "Crestline", system: "Yardi" },
  { name: "Harbor", system: "ResMan" },
  { name: "Summit", system: "Rent Manager" },
  { name: "Meridian", system: "Entrata" },
];

const METRICS: { label: string; values: [number, Tone][]; format: (v: number) => string; max: number }[] = [
  { label: "NOI vs. budget", values: [[-0.9, "good"], [-13.0, "bad"], [-2.5, "watch"], [-1.3, "good"]], format: (v) => `${v.toFixed(1)}%`, max: 14 },
  { label: "Economic occupancy", values: [[89.8, "good"], [84.5, "bad"], [91.1, "good"], [90.4, "good"]], format: (v) => `${v.toFixed(1)}%`, max: 92 },
  { label: "Delinquency", values: [[1.6, "good"], [2.0, "good"], [2.6, "bad"], [2.4, "watch"]], format: (v) => `${v.toFixed(1)}%`, max: 2.8 },
];

const BAR: Record<Tone, string> = { good: "bg-favorable/70", watch: "bg-warning/70", bad: "bg-unfavorable/70" };
const TEXT: Record<Tone, string> = { good: "text-favorable", watch: "text-warning", bad: "text-unfavorable" };

export function CompareArt() {
  const { ref, step } = useCycle(METRICS.length, 2200, 0);
  const metric = METRICS[step];

  return (
    <div ref={ref} className="w-full rounded-xl border border-border bg-surface shadow-overlay" aria-hidden>
      <div className="flex gap-1 border-b border-border p-1.5">
        {METRICS.map((m, i) => (
          <span key={m.label} className="relative flex-1 rounded-md px-2 py-1.5 text-center text-[11px]">
            {i === step && <motion.span layoutId="compare-tab" className="absolute inset-0 rounded-md bg-surface-2 ring-1 ring-border" transition={{ duration: 0.3, ease: "easeOut" }} />}
            <span className={cn("relative truncate transition-colors duration-300", i === step ? "font-medium text-fg" : "text-fg-3")}>{m.label}</span>
          </span>
        ))}
      </div>
      <ul className="flex flex-col gap-3.5 px-4 py-4">
        {MANAGERS.map((m, i) => {
          const [value, tone] = metric.values[i];
          return (
            <li key={m.name} className="grid grid-cols-[96px_minmax(0,1fr)_52px] items-center gap-3">
              <span className="min-w-0">
                <span className="block truncate text-[11.5px] font-medium text-fg">{m.name}</span>
                <span className="block truncate text-[10px] text-fg-3">{m.system}</span>
              </span>
              <span className="h-2 rounded-full bg-fg/[0.06]">
                <motion.span
                  className={cn("block h-full rounded-full transition-colors duration-300", BAR[tone])}
                  initial={false}
                  animate={{ width: `${Math.max(4, (Math.abs(value) / metric.max) * 100)}%` }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                />
              </span>
              <span className={cn("num text-right text-[11.5px] transition-colors duration-300", TEXT[tone])}>{metric.format(value)}</span>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-border px-4 py-2.5 text-[10.5px] text-fg-3">Same definitions for every manager, whatever system they run</div>
    </div>
  );
}
