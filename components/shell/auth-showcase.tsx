"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { BridgeArt } from "@/components/marketing/bridge-art";
import { IngestArt } from "@/components/marketing/ingest-art";
import { ReconcileArt } from "@/components/marketing/reconcile-art";
import { ValueArt } from "@/components/marketing/value-art";
import { cn } from "@/lib/cn";

const SLIDES = [
  { tab: "Read", title: "Every manager's report, read for you.", art: <IngestArt /> },
  { tab: "Check", title: "Totals checked before you see them.", art: <ReconcileArt /> },
  { tab: "Explain", title: "See where the gap comes from.", art: <BridgeArt /> },
  { tab: "Grow", title: "Find the NOI you're leaving on the table.", art: <ValueArt /> },
];

const SECONDS = 6;

/** The sign-in pages' right-hand panel: what RE-IQ does, one job at a time, with a progress tab per job. */
export function AuthShowcase() {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), SECONDS * 1000);
    return () => window.clearTimeout(timer);
  }, [index, reduce]);

  const slide = SLIDES[index];
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="relative flex flex-1 items-center justify-center px-10 pt-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            className="w-full max-w-[520px]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {slide.art}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="px-10 pt-8 pb-8">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            className="max-w-[440px] text-[32px] font-semibold leading-[1.12] tracking-[-0.025em] text-balance text-fg"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {slide.title}
          </motion.p>
        </AnimatePresence>
        <div className="mt-8 grid grid-cols-4 gap-3" role="tablist" aria-label="What RE-IQ does">
          {SLIDES.map((s, i) => (
            <button
              key={s.tab}
              type="button"
              role="tab"
              aria-selected={i === index}
              onClick={() => setIndex(i)}
              className={cn("group text-left text-[11px] transition-colors duration-150", i === index ? "text-fg" : "text-fg-3 hover:text-fg-2")}
            >
              <span className="block h-0.5 overflow-hidden rounded-full bg-border">
                <span
                  key={i === index ? `on-${index}` : "off"}
                  className={cn("block h-full bg-fg", i < index && "w-full", i > index && "w-0")}
                  style={i === index ? { width: reduce ? "100%" : undefined, animation: reduce ? undefined : `auth-progress ${SECONDS}s linear forwards` } : undefined}
                />
              </span>
              <span className="mt-2 block">{s.tab}</span>
            </button>
          ))}
        </div>
      </div>
      <style>{"@keyframes auth-progress{from{width:0}to{width:100%}}"}</style>
    </div>
  );
}
