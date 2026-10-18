"use client";

import { ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import type { SummarySentence } from "@/lib/types";
import { EstimateTag, EvidenceList, SourceList } from "./evidence";

/**
 * AI-written summary, one sentence per row. Each sentence expands in place to
 * show the numbers and the reports or connector syncs it is based on.
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

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5">
        <div className="eyebrow flex items-center gap-2">
          {title}
          <span className="text-fg-3/80 normal-case tracking-normal">· written by AI from your reports</span>
        </div>
        {dataThrough && <span className="num text-[10px] text-fg-3">Based on data through {formatDate(dataThrough)}</span>}
      </div>
      <div className="px-4 pt-2 pb-3">
        {loading || !sentences ? (
          <div className="flex flex-col gap-2 py-1">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-[92%]" />
            <Skeleton className="h-3.5 w-[70%]" />
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {sentences.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                  className="group flex w-full cursor-pointer items-start gap-1.5 rounded-sm text-left text-[13px] leading-[1.7]"
                >
                  <ChevronRight
                    className={cn("mt-[5px] size-3.5 shrink-0 text-fg-3 transition-transform duration-200 ease-out group-hover:text-fg", open === i && "rotate-90 text-fg")}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span>
                    <span
                      className={cn(
                        "underline decoration-fg/30 decoration-dotted underline-offset-[3px] transition-colors group-hover:text-fg group-hover:decoration-fg/60",
                        open === i ? "bg-data-soft text-fg" : i === 0 ? "text-fg" : "text-fg-2",
                      )}
                    >
                      {s.text}
                    </span>
                    {s.is_estimate && <EstimateTag />}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="grid gap-4 pt-2 pb-3 pl-5 md:grid-cols-[1fr_minmax(0,280px)]">
                        <div>
                          <div className="eyebrow mb-2">Numbers behind this sentence</div>
                          <EvidenceList items={s.evidence} />
                        </div>
                        <div>
                          <div className="eyebrow mb-2">Sources</div>
                          {s.sources.length ? <SourceList sources={s.sources} /> : <p className="text-[11px] text-fg-3">Computed from the insights listed below.</p>}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            ))}
          </ul>
        )}
      </div>
      {freshnessNote && <div className="border-t border-border px-4 py-2 text-[11px] text-fg-3">{freshnessNote}</div>}
    </Card>
  );
}
