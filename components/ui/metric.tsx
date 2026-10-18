"use client";

import { cn } from "@/lib/cn";
import { formatPercent, formatVariance, formatVarianceShort } from "@/lib/format";
import { AnimatedNumber } from "./motion";

export function toneFor(favorableAmount: number, epsilon = 0.5) {
  if (favorableAmount > epsilon) return "text-favorable";
  if (favorableAmount < -epsilon) return "text-unfavorable";
  return "text-fg-3";
}

/**
 * A variance expressed as NOI impact: positive is favorable. The sign carries
 * the meaning and the color follows favorability.
 */
export function Variance({
  value,
  short,
  className,
  label,
}: {
  value: number;
  short?: boolean;
  className?: string;
  /** Adds a visible "fav" / "unfav" word, for places color alone would carry it. */
  label?: boolean;
}) {
  return (
    <span className={cn("num", toneFor(value), className)}>
      {short ? formatVarianceShort(value) : formatVariance(value)}
      {label && Math.abs(value) >= 0.5 && <span className="ml-1 text-[10px] opacity-80">{value > 0 ? "fav" : "unfav"}</span>}
    </span>
  );
}

/** Percentage-point gap where higher is better (occupancy) or worse (delinquency). */
export function PointsDelta({ delta, higherIsBetter = true, className }: { delta: number; higherIsBetter?: boolean; className?: string }) {
  const favorable = higherIsBetter ? delta : -delta;
  const pts = (delta * 100).toFixed(1);
  const text = pts === "0.0" || pts === "-0.0" ? "0.0 pts" : `${delta > 0 ? "+" : "-"}${Math.abs(delta * 100).toFixed(1)} pts`;
  return <span className={cn("num", toneFor(favorable, 0.0005), className)}>{text}</span>;
}

export function Metric({
  label,
  value,
  format,
  sub,
  className,
  hint,
}: {
  label: string;
  value: number;
  format: (v: number) => string;
  sub?: React.ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5 px-4 py-3.5", className)} title={hint}>
      <div className="eyebrow truncate">{label}</div>
      <AnimatedNumber value={value} format={format} className="num text-xl leading-6 font-medium tracking-tight text-fg" />
      {sub && <div className="truncate text-[11px] text-fg-3">{sub}</div>}
    </div>
  );
}

export function ConfidenceIndicator({ value, threshold = 0.75, showValue = true }: { value: number; threshold?: number; showValue?: boolean }) {
  const review = value < threshold;
  return (
    <span className="inline-flex items-center gap-1.5" title={`${Math.round(value * 100)}% confidence${review ? " · review suggested" : ""}`}>
      <span className="relative h-1 w-6 overflow-hidden rounded-full bg-fg/10" aria-hidden>
        <span className={cn("absolute inset-y-0 left-0 rounded-full", review ? "bg-warning" : "bg-fg-3")} style={{ width: `${Math.round(value * 100)}%` }} />
      </span>
      {showValue && <span className={cn("num text-[10px]", review ? "text-warning" : "text-fg-3")}>{formatPercent(value, 0)}</span>}
    </span>
  );
}
