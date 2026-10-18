"use client";

import { ChevronRight } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { formatCurrencyShort } from "@/lib/format";
import { DRIVER_LABELS } from "@/lib/labels";
import type { Insight, PropertyRecord } from "@/lib/types";
import { EstimateTag } from "./evidence";

export function InsightList({
  insights,
  properties,
  onSelect,
  loading,
  limit,
}: {
  insights?: Insight[];
  properties?: PropertyRecord[];
  onSelect: (insight: Insight) => void;
  loading?: boolean;
  limit?: number;
}) {
  if (loading || !insights) {
    return (
      <div className="flex flex-col gap-3 px-4 pb-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }
  const shown = limit ? insights.slice(0, limit) : insights;
  return (
    <Stagger as="ul" className="flex flex-col">
      {shown.map((insight, i) => {
        const property = properties?.find((p) => p.id === insight.property_id);
        const issue = insight.type === "issue";
        return (
          <StaggerItem as="li" key={insight.id}>
            <button
              type="button"
              onClick={() => onSelect(insight)}
              className={cn(
                "group flex w-full cursor-pointer items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-fg/[0.025]",
                i > 0 && "border-t border-border/70",
              )}
            >
              <span className="num mt-px w-4 shrink-0 text-[10px] text-fg-3">{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs leading-[18px] text-fg">{insight.title}</span>
                <span className="mt-0.5 block truncate text-[11px] text-fg-3">
                  {property ? property.name : "Portfolio"} · {insight.drivers.map((d) => DRIVER_LABELS[d]).join(", ")}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <span className={cn("num text-xs", issue ? "text-unfavorable" : "text-favorable")}>
                  {issue ? "-" : "+"}
                  {formatCurrencyShort(insight.impact)}
                  {!issue && <span className="text-[10px] opacity-80">/yr</span>}
                </span>
                <span className="mt-0.5 text-[10px] text-fg-3">
                  {insight.is_estimate ? <EstimateTag /> : insight.impact_label.replace("vs budget ", "")}
                </span>
              </span>
              <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-fg-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
