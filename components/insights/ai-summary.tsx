"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import type { SummarySentence } from "@/lib/types";
import { EstimateTag, EvidenceList, SourceList } from "./evidence";

/**
 * AI-written summary. Each sentence is clickable and reveals the numbers and
 * the reports or connector syncs it is based on.
 */
export function AiSummary({
  sentences,
  dataThrough,
  freshnessNote,
  loading,
  title = "Summary",
}: {
  sentences?: SummarySentence[];
  dataThrough?: string;
  freshnessNote?: string;
  loading?: boolean;
  title?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const active = open !== null ? sentences?.[open] : undefined;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5">
        <div className="eyebrow flex items-center gap-2">
          {title}
          <span className="text-fg-3/80 normal-case tracking-normal">· written by AI from your reports</span>
        </div>
        {dataThrough && <span className="num text-[10px] text-fg-3">Based on data through {formatDate(dataThrough)}</span>}
      </div>
      <div className="px-4 pt-2 pb-3.5">
        {loading || !sentences ? (
          <div className="flex flex-col gap-2 py-1">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-[92%]" />
            <Skeleton className="h-3.5 w-[70%]" />
          </div>
        ) : (
          <p className="text-[13px] leading-[1.7] text-fg-2">
            {sentences.map((s, i) => (
              <span key={i}>
                <button
                  type="button"
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                  className={cn(
                    "inline cursor-pointer rounded-sm text-left decoration-fg/25 decoration-dotted underline-offset-[3px] transition-colors hover:text-fg hover:underline",
                    open === i && "bg-data-soft text-fg",
                    i === 0 && "text-fg",
                  )}
                >
                  {s.text}
                </button>
                {s.is_estimate && <EstimateTag />}{" "}
              </span>
            ))}
          </p>
        )}
      </div>
      <AnimatePresence initial={false}>
        {active && (
          <motion.div
            key={open}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden border-t border-border"
          >
            <div className="grid gap-4 px-4 py-3.5 md:grid-cols-[1fr_minmax(0,280px)]">
              <div>
                <div className="eyebrow mb-2">Numbers behind this sentence</div>
                <EvidenceList items={active.evidence} />
              </div>
              <div>
                <div className="eyebrow mb-2">Sources</div>
                {active.sources.length ? <SourceList sources={active.sources} /> : <p className="text-[11px] text-fg-3">Computed from the insights listed below.</p>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2 text-[11px] text-fg-3">
        <span>{freshnessNote ?? "Click any sentence to see the numbers behind it."}</span>
        {freshnessNote && <span className="hidden sm:inline">Click any sentence to see its numbers.</span>}
      </div>
    </Card>
  );
}
