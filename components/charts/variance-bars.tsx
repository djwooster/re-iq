"use client";

import { motion } from "motion/react";
import { Variance } from "@/components/ui/metric";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";

export interface VarianceRow {
  id: string;
  label: string;
  sublabel?: string;
  /** NOI impact; positive is favorable. */
  value: number;
}

/**
 * Diverging horizontal bars centered on zero. Unfavorable extends left in the
 * unfavorable color, favorable extends right. The signed value is always
 * printed, so color is never the only cue.
 */
export function VarianceBars({ rows, onSelect, selectedId, compact }: { rows: VarianceRow[]; onSelect?: (id: string) => void; selectedId?: string; compact?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  return (
    <ul className="flex flex-col">
      {rows.map((r, i) => {
        const width = (Math.abs(r.value) / max) * 50;
        const Comp = onSelect ? "button" : "div";
        return (
          <li key={r.id}>
            <Comp
              type={onSelect ? "button" : undefined}
              onClick={onSelect ? () => onSelect(r.id) : undefined}
              title={`${r.label}: ${formatCurrency(r.value)} ${r.value >= 0 ? "favorable" : "unfavorable"}`}
              className={cn(
                "grid w-full grid-cols-[minmax(0,9rem)_1fr_5.5rem] items-center gap-3 rounded px-1 text-left",
                compact ? "h-7" : "h-8",
                onSelect && "cursor-pointer transition-colors hover:bg-fg/[0.03]",
                selectedId === r.id && "bg-fg/[0.04]",
              )}
            >
              <span className="min-w-0 truncate text-xs text-fg-2">
                {r.label}
                {r.sublabel && <span className="ml-1.5 text-[10px] text-fg-3">{r.sublabel}</span>}
              </span>
              <span className="relative h-3">
                <span className="absolute inset-y-[-3px] left-1/2 w-px bg-border-strong" aria-hidden />
                <motion.span
                  className={cn("absolute inset-y-0 rounded-[3px]", r.value < 0 ? "right-1/2 bg-unfavorable/80" : "left-1/2 bg-favorable/80")}
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.03 }}
                />
              </span>
              <Variance value={r.value} short className="text-right text-xs" />
            </Comp>
          </li>
        );
      })}
    </ul>
  );
}
