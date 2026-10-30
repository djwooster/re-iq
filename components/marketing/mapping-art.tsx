"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/*
 * Five managers' names for the same expense. Each in turn connects to the one
 * standard line it maps to. Drawn on a 700×240 canvas: elements are placed by
 * percentage and the SVG shares the coordinates, so the connector meets them.
 */

const W = 700;
const H = 240;

const LABELS = [
  { label: "Repairs", system: "Yardi", y: 44 },
  { label: "R&M", system: "Entrata", y: 82 },
  { label: "Maintenance", system: "AppFolio", y: 120 },
  { label: "Repairs - General", system: "ResMan", y: 158 },
  { label: "Bldg Maint", system: "Rent Manager", y: 196 },
];
const LABEL_RIGHT = 214;
const ROW = { left: 300, right: 664, y: 120 };

const pct = (v: number, of: number) => `${(v / of) * 100}%`;
const connector = (y: number) => `M${LABEL_RIGHT + 8} ${y} C ${LABEL_RIGHT + 60} ${y}, ${ROW.left - 60} ${ROW.y}, ${ROW.left} ${ROW.y}`;

export function MappingArt() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduce = useReducedMotion();
  const [active, setActive] = useState(1);

  useEffect(() => {
    if (!inView || reduce) return;
    const timer = window.setInterval(() => setActive((a) => (a + 1) % LABELS.length), 1800);
    return () => window.clearInterval(timer);
  }, [inView, reduce]);

  const current = LABELS[active];

  return (
    <div ref={ref} className="absolute inset-0 grid place-items-center px-4" aria-hidden>
      <div className="relative aspect-[700/240] w-full max-w-[700px]">
        <svg className="absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${W} ${H}`}>
          <motion.path
            d={connector(current.y)}
            animate={{ d: connector(current.y) }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            fill="none"
            className="stroke-fg-3"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <circle cx={ROW.left} cy={ROW.y} r={2.5} className="fill-fg-3" />
        </svg>

        {LABELS.map((l, i) => (
          <span
            key={l.label}
            className={cn(
              "absolute -translate-x-full -translate-y-1/2 rounded-full border px-2.5 py-1 text-[11px] whitespace-nowrap transition-[color,border-color,background-color,opacity] duration-300 ease-out",
              i === active ? "border-solid border-fg/70 bg-surface font-medium text-fg" : "border-dashed border-border-strong bg-bg text-fg-3",
              i !== active && Math.abs(i - active) > 1 && "opacity-60",
            )}
            style={{ left: pct(LABEL_RIGHT, W), top: pct(l.y, H) }}
          >
            {l.label}
          </span>
        ))}

        {[ROW.y - 50, ROW.y + 50].map((y) => (
          <span
            key={y}
            className="absolute flex -translate-y-1/2 items-center gap-3 rounded-lg border border-border/60 px-4 py-3 opacity-50"
            style={{ left: pct(ROW.left + 12, W), width: pct(ROW.right - ROW.left - 24, W), top: pct(y, H) }}
          >
            <span className="h-1.5 w-[22%] rounded-full bg-fg/[0.07]" />
            <span className="h-1.5 w-[40%] rounded-full bg-fg/[0.07]" />
            <span className="ml-auto h-1.5 w-[16%] rounded-full bg-fg/[0.07]" />
          </span>
        ))}

        <div
          className="absolute flex -translate-y-1/2 items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 shadow-overlay"
          style={{ left: pct(ROW.left, W), width: pct(ROW.right - ROW.left, W), top: pct(ROW.y, H) }}
        >
          <span className="num rounded border border-border bg-bg px-1.5 py-0.5 text-[10px] text-fg-3">6500</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-medium text-fg">Repairs &amp; maintenance</span>
            <span className="relative block h-[15px] overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={current.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="block truncate text-[10.5px] text-fg-3"
                >
                  from “{current.label}” · {current.system}
                </motion.span>
              </AnimatePresence>
            </span>
          </span>
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-favorable/10">
            <Check className="size-3 text-favorable" strokeWidth={2.5} />
          </span>
        </div>
      </div>
    </div>
  );
}
