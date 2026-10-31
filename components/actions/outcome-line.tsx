import { EstimateTag } from "@/components/insights/evidence";
import { cn } from "@/lib/cn";
import { formatMonth } from "@/lib/dates";
import type { ActionOutcome } from "@/lib/data";
import { formatCurrencyShort, formatVarianceShort } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/labels";

/** One line answering "did it work?" for a completed action. */
export function OutcomeLine({ outcome, className }: { outcome: ActionOutcome; className?: string }) {
  const label = CATEGORY_LABELS[outcome.category];
  if (outcome.state === "measuring") {
    return (
      <p className={cn("text-[11px] text-fg-3", className)}>
        Measuring: {label.toLowerCase()} should move from {formatMonth(outcome.from, "long")}. Before the fix it ran{" "}
        <span className="num">{formatVarianceShort(outcome.baseline_monthly)}</span> a month against budget.
      </p>
    );
  }
  const worked = outcome.recovered > 0;
  return (
    <p className={cn("text-[11px] text-fg-2", className)}>
      {label}: <span className="num">{formatVarianceShort(outcome.baseline_monthly)}</span>/mo against budget before,{" "}
      <span className="num">{formatVarianceShort(outcome.after_monthly ?? 0)}</span>/mo since {formatMonth(outcome.from, "tiny")}.{" "}
      <span className={cn("num font-medium", worked ? "text-favorable" : "text-unfavorable")}>
        {worked ? `${formatCurrencyShort(outcome.recovered)} recovered` : `${formatCurrencyShort(-outcome.recovered)} worse`}
      </span>{" "}
      so far
      <EstimateTag />
    </p>
  );
}
