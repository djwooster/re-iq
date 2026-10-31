"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { EstimateTag } from "@/components/insights/evidence";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatMonth } from "@/lib/dates";
import type { CloseStep } from "@/lib/data";
import { formatCurrencyShort } from "@/lib/format";

/** The month's close as five steps, so the asset manager always knows where they are. */
export function CloseProgress({ month, steps, recovered }: { month: string; steps: CloseStep[]; recovered: number }) {
  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-3">
        <h2 className="text-[13px] font-semibold text-fg">{formatMonth(month, "long").split(" ")[0]} close</h2>
        {recovered > 0 && (
          <span className="text-[11px] text-fg-3">
            <span className="num text-favorable">{formatCurrencyShort(recovered)}</span> NOI recovered by completed actions
            <EstimateTag />
          </span>
        )}
      </div>
      <ol className="grid grid-cols-1 gap-px px-2 pt-2 pb-2 sm:grid-cols-5">
        {steps.map((s, i) => (
          <li key={s.id}>
            <Link href={s.href} className="group flex h-full flex-col gap-1 rounded-md px-2 py-2 transition-colors hover:bg-fg/[0.03]">
              <span className="flex items-center gap-1.5">
                <StepMark state={s.state} index={i + 1} />
                <span className={cn("text-xs font-medium", s.state === "waiting" ? "text-fg-3" : "text-fg")}>{s.label}</span>
              </span>
              <span className={cn("pl-[22px] text-[11px]", s.state === "active" ? "text-fg-2" : "text-fg-3")}>{s.detail}</span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function StepMark({ state, index }: { state: CloseStep["state"]; index: number }) {
  if (state === "done") {
    return (
      <span className="flex size-4 items-center justify-center rounded-full bg-favorable/15 text-favorable">
        <Check className="size-2.5" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "num flex size-4 items-center justify-center rounded-full border text-[9px]",
        state === "active" ? "border-fg-3 text-fg" : "border-border text-fg-3",
      )}
    >
      {index}
    </span>
  );
}
