"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Dot } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/empty-state";
import { formatMonth } from "@/lib/dates";
import type { CloseSummary } from "@/lib/data";
import { REPORT_TYPE_SHORT } from "@/lib/labels";

/** "November close · 3 of 4 managers in · Crestline late · The Vale missing AR aging" */
export function CloseLine({ close }: { close?: CloseSummary }) {
  if (!close) return <Skeleton className="h-10 w-full rounded-lg" />;
  const complete = close.managers_in === close.managers_total && close.missing.length === 0;
  const parts = [
    `${close.managers_in} of ${close.managers_total} managers in`,
    ...close.late.map((m) => `${m.name.split(" ")[0]} late`),
    ...close.missing.map((m) => `${m.property.name} missing ${REPORT_TYPE_SHORT[m.report_type]}`),
  ];
  return (
    <Link
      href="/app/data-sources"
      className="group flex items-center gap-2.5 rounded-lg border border-border bg-surface px-4 py-2.5 transition-colors hover:border-border-strong"
    >
      <Dot tone={complete ? "favorable" : "warning"} />
      <span className="min-w-0 flex-1 truncate text-xs text-fg-2">
        <span className="font-medium text-fg">{formatMonth(close.month, "long").split(" ")[0]} close</span>
        {parts.map((p) => (
          <span key={p}>
            <span className="px-1.5 text-fg-3">·</span>
            {p}
          </span>
        ))}
      </span>
      <span className="hidden text-[11px] text-fg-3 group-hover:text-fg-2 sm:inline">Data Sources</span>
      <ChevronRight className="size-3.5 text-fg-3" />
    </Link>
  );
}
