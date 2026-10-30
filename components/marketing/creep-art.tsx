"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCycle } from "./use-cycle";

/*
 * A slow problem: R&M creeping over budget at one property, May to September
 * ($57K by September, the sample portfolio's HVAC story). RE-IQ flags it in
 * June; a typical $50K variance threshold isn't crossed until September.
 * Drawn on a 500×240 canvas shared by the SVG and the positioned labels.
 */

const W = 500;
const H = 240;
const CHART = { left: 48, right: 452, top: 34, bottom: 188 };
const MAX = 64_000;
const THRESHOLD = 50_000;

const POINTS = [
  { month: "May", value: 6_000 },
  { month: "Jun", value: 15_000 },
  { month: "Jul", value: 27_000 },
  { month: "Aug", value: 41_000 },
  { month: "Sep", value: 57_000 },
];

const x = (i: number) => CHART.left + (i / (POINTS.length - 1)) * (CHART.right - CHART.left);
const y = (v: number) => CHART.bottom - (v / MAX) * (CHART.bottom - CHART.top);
const pct = (v: number, of: number) => `${(v / of) * 100}%`;
const LINE = POINTS.map((p, i) => `${i ? "L" : "M"}${x(i)} ${y(p.value)}`).join(" ");
const FLAG = 1;

// Steps: 0 empty, 1 the line draws, 2 RE-IQ flags June, 3 the threshold is crossed, 4 hold.
const STEPS = 5;

export function CreepArt() {
  const { ref, step } = useCycle(STEPS, 1300, STEPS - 1);

  return (
    <div ref={ref} className="absolute inset-0 grid place-items-center px-4" aria-hidden>
      <div className="relative aspect-[500/240] w-full max-w-[500px]">
        <svg className="absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${W} ${H}`}>
          {[0.25, 0.5, 0.75].map((f) => (
            <path key={f} d={`M${CHART.left} ${y(MAX * f)} H${CHART.right}`} className="stroke-border" strokeWidth={1} />
          ))}
          <path d={`M${CHART.left} ${CHART.bottom} H${CHART.right}`} className="stroke-border-strong" strokeWidth={1} />
          <path d={`M${CHART.left} ${y(THRESHOLD)} H${CHART.right}`} className="stroke-fg-3" strokeWidth={1} strokeDasharray="4 4" />
          <motion.path
            d={LINE}
            fill="none"
            className="stroke-unfavorable"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: step >= 1 ? 1 : 0 }}
            transition={{ duration: step >= 1 ? 1.1 : 0.2, ease: "easeOut" }}
          />
          {POINTS.map((p, i) => (
            <motion.circle
              key={p.month}
              cx={x(i)}
              cy={y(p.value)}
              r={i === FLAG ? 4.5 : 3}
              className={i === FLAG ? "fill-surface stroke-unfavorable" : "fill-unfavorable"}
              strokeWidth={2}
              initial={false}
              animate={{ opacity: step >= 1 ? 1 : 0 }}
              transition={{ duration: 0.2, delay: step >= 1 ? (i / POINTS.length) * 1.1 : 0 }}
            />
          ))}
          {POINTS.map((p, i) => (
            <text key={p.month} x={x(i)} y={CHART.bottom + 20} textAnchor="middle" className="num fill-fg-3 text-[11px]">
              {p.month}
            </text>
          ))}
        </svg>

        <span className="absolute -translate-y-full pb-1 text-[10.5px] text-fg-3" style={{ left: pct(CHART.left, W), top: pct(y(THRESHOLD), H) }}>
          Typical threshold
        </span>

        <AnimatePresence>
          {step >= 2 && (
            <motion.span
              key="flag"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-full bg-brand px-2.5 py-1 text-[10.5px] font-medium whitespace-nowrap text-brand-fg"
              style={{ left: pct(x(FLAG), W), top: pct(y(POINTS[FLAG].value), H) }}
            >
              RE-IQ flags it · Jun
            </motion.span>
          )}
          {step >= 3 && (
            <motion.span
              key="late"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute -translate-x-full -translate-y-1/2 pr-3 text-right text-[10.5px] whitespace-nowrap text-fg-3"
              style={{ left: pct(x(POINTS.length - 1), W), top: pct(y(POINTS[POINTS.length - 1].value), H) }}
            >
              <span className="num text-unfavorable">-$57K</span> before most would notice
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
