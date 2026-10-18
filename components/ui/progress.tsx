"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * A thin, calm progress line. Indeterminate mode sweeps once per 1.4s with
 * ease-out instead of a spinner.
 */
export function Progress({ value, indeterminate, className }: { value?: number; indeterminate?: boolean; className?: string }) {
  return (
    <div className={cn("relative h-0.5 w-full overflow-hidden rounded-full bg-fg/10", className)}>
      {indeterminate ? (
        <motion.span
          className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-fg/70"
          initial={{ x: "-100%" }}
          animate={{ x: "300%" }}
          transition={{ duration: 1.4, ease: "easeOut", repeat: Infinity }}
        />
      ) : (
        <motion.span
          className="absolute inset-y-0 left-0 rounded-full bg-fg/80"
          initial={false}
          animate={{ width: `${Math.round((value ?? 0) * 100)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      )}
    </div>
  );
}
