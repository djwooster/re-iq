"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Select } from "@/components/ui/controls";
import { ConfidenceIndicator } from "@/components/ui/metric";
import { cn } from "@/lib/cn";
import { ALL_GL_CATEGORIES, FIELD_LABELS, REVIEW_THRESHOLD } from "@/lib/data";
import { formatCurrency } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/labels";
import type { AccountMapping, GlCategory, MappingTarget, ReportType } from "@/lib/types";

export function targetLabel(target: MappingTarget) {
  if (target === "ignore") return "Not imported";
  if (target.startsWith("field:")) return FIELD_LABELS[target.slice(6)] ?? target.slice(6);
  return CATEGORY_LABELS[target as GlCategory];
}

function optionsFor(reportType: ReportType, mappings: AccountMapping[]): MappingTarget[] {
  if (reportType === "t12" || reportType === "budget") return [...ALL_GL_CATEGORIES, "ignore"];
  const fields = [...new Set(mappings.map((m) => m.target))];
  return [...fields.filter((f) => f !== "ignore"), "ignore"];
}

export function isFlagged(m: AccountMapping) {
  return m.confidence < REVIEW_THRESHOLD;
}

/**
 * Source line items mapped to normalized categories. Flagged rows (low
 * confidence) sort first and can be confirmed or changed; the rest are
 * collapsed behind "Show all" to keep the review short.
 */
export function MappingTable({
  mappings,
  reportType,
  editable,
  onChange,
  initialVisible = 6,
}: {
  mappings: AccountMapping[];
  reportType: ReportType;
  editable?: boolean;
  onChange?: (id: string, patch: Partial<AccountMapping>) => void;
  initialVisible?: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const isGl = reportType === "t12" || reportType === "budget";
  const ordered = [...mappings].sort((a, b) => Number(isFlagged(b)) - Number(isFlagged(a)));
  const flaggedCount = ordered.filter(isFlagged).length;
  const visible = showAll ? ordered : ordered.slice(0, Math.max(initialVisible, flaggedCount));
  const options = optionsFor(reportType, mappings);

  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b border-border pb-1.5 sm:grid-cols-[minmax(0,1.1fr)_5.5rem_minmax(0,1fr)_4.5rem]">
        <span className="eyebrow">{isGl ? "Their line item" : "Their column"}</span>
        <span className="eyebrow hidden text-right sm:block">{isGl ? "T12 amount" : ""}</span>
        <span className="eyebrow hidden sm:block">Maps to</span>
        <span className="eyebrow text-right">Confidence</span>
      </div>
      <ul>
        {visible.map((m) => {
          const flagged = isFlagged(m);
          const needsAction = flagged && !m.confirmed_by_user;
          return (
            <li
              key={m.id}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-border/70 py-1.5 last:border-b-0 sm:grid-cols-[minmax(0,1.1fr)_5.5rem_minmax(0,1fr)_4.5rem]",
                needsAction && "-mx-2 rounded-md border-b-0 bg-warning/[0.07] px-2",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-xs text-fg">
                  {m.source_code && <span className="num mr-1.5 text-[10px] text-fg-3">{m.source_code}</span>}
                  {m.source_label}
                </span>
                {m.target === "ignore" && m.source_label === "Resident" && <span className="block text-[10px] text-fg-3">Resident names are never stored</span>}
              </span>
              <span className="num hidden text-right text-[11px] text-fg-2 sm:block">{m.amount !== null ? formatCurrency(m.amount) : ""}</span>
              <span className="col-span-2 min-w-0 sm:col-span-1">
                {editable && flagged ? (
                  <span className="flex items-center gap-1.5">
                    <Select
                      dense
                      className="min-w-0 flex-1"
                      value={m.target}
                      aria-label={`Category for ${m.source_label}`}
                      onChange={(e) => onChange?.(m.id, { target: e.target.value as MappingTarget, confirmed_by_user: true })}
                    >
                      {options.map((o) => (
                        <option key={o} value={o}>
                          {targetLabel(o)}
                        </option>
                      ))}
                    </Select>
                    {m.confirmed_by_user ? (
                      <span className="inline-flex h-7 w-[62px] items-center justify-center gap-1 text-[11px] text-fg-2">
                        <Check className="size-3" /> Set
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onChange?.(m.id, { confirmed_by_user: true })}
                        className="h-7 w-[62px] shrink-0 cursor-pointer rounded-md border border-border bg-bg text-[11px] font-medium text-fg transition-colors hover:border-border-strong"
                      >
                        Confirm
                      </button>
                    )}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-fg-2">
                    <span className="text-fg-3">→</span>
                    <span className="truncate">{targetLabel(m.target)}</span>
                    {flagged && m.confirmed_by_user && <span className="text-[10px] text-fg-3">· confirmed</span>}
                  </span>
                )}
              </span>
              <span className="row-start-1 col-start-2 text-right sm:row-auto sm:col-auto">
                <ConfidenceIndicator value={m.confidence} threshold={REVIEW_THRESHOLD} />
              </span>
            </li>
          );
        })}
      </ul>
      {ordered.length > visible.length || showAll ? (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-2 cursor-pointer text-[11px] text-fg-3 hover:text-fg">
          {showAll ? "Show fewer" : `Show all ${ordered.length} ${isGl ? "line items" : "columns"}`}
        </button>
      ) : null}
    </div>
  );
}
