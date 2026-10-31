"use client";

import { TrendingUp } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { formatCurrencyShort } from "@/lib/format";
import { useCycle } from "./use-cycle";

/*
 * Hero diagram, in the same motion language as the bento's mapping card: one
 * report at a time is read. The file straightens and lifts, a dashed line
 * re-routes to it, its property's row lights up and its bar fills, and the NOI
 * it surfaced lands on the result. Amounts are the sample portfolio's top
 * issues and its open opportunities (+$177K total).
 *
 * Desktop draws on a 1000×320 canvas: elements are positioned by percentage and
 * the SVG shares the coordinates, so lines meet them at any width. Phones get a
 * stacked version with the same cycle.
 */

const W = 1000;
const H = 320;

const FILES = [
  { kind: "XLS", x: 118, y: 78, tilt: -7 },
  { kind: "PDF", x: 196, y: 162, tilt: 5 },
  { kind: "CSV", x: 106, y: 246, tilt: -4 },
] as const;

/** One row per report: the property it covers, the issue, and the opportunity it surfaced. */
const ROWS = [
  { property: "Property #1", issue: 280_430, found: 65_736 },
  { property: "Property #2", issue: 57_153, found: 58_104 },
  { property: "Property #3", issue: 28_547, found: 53_099 },
];
const MAX = ROWS[0].issue;
const FOUND = ROWS.reduce((s, r) => s + r.found, 0);

const CARD = { left: 330, right: 670, y: 160 };
const RESULT = { left: 752 };
const FILE_EDGE = 30;

const EASE = [0.22, 1, 0.36, 1] as const;

/** Each format in the color people already associate with it (spreadsheet green, PDF red, CSV blue). */
const FILE_COLOR: Record<string, string> = { XLS: "bg-file-xls", PDF: "bg-file-pdf", CSV: "bg-file-csv" };
const pct = (v: number, of: number) => `${(v / of) * 100}%`;
const inbound = (f: (typeof FILES)[number]) => `M${f.x + FILE_EDGE} ${f.y} C ${f.x + 110} ${f.y}, ${CARD.left - 90} ${CARD.y}, ${CARD.left} ${CARD.y}`;
const OUTBOUND = `M${CARD.right} ${CARD.y} L${RESULT.left} ${CARD.y}`;

export function HeroFlow() {
  const { ref, step: active } = useCycle(FILES.length, 2400, 1);
  const reduce = useReducedMotion();

  return (
    <div ref={ref}>
      <figure aria-label={`Each manager's report read in turn, ranked by dollars, +${formatCurrencyShort(FOUND)} of NOI found (sample)`} className="mx-auto w-full max-w-[960px]">
        <div className="relative hidden aspect-[1000/320] lg:block" aria-hidden>
          <svg className="absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${W} ${H}`}>
            {/* Faint guides from every file, so the unread ones still read as inputs */}
            {FILES.map((f) => (
              <path key={f.kind} d={inbound(f)} fill="none" className="stroke-border" strokeWidth={1} strokeDasharray="2 4" />
            ))}
            <FlowingPath d={inbound(FILES[active])} animateD reduce={reduce} />
            <FlowingPath d={OUTBOUND} reduce={reduce} />
            <circle cx={CARD.left} cy={CARD.y} r={2.5} className="fill-fg-3" />
            <circle cx={RESULT.left} cy={CARD.y} r={2.5} className="fill-fg-3" />
          </svg>

          {FILES.map((f, i) => (
            <div key={f.kind} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: pct(f.x, W), top: pct(f.y, H) }}>
              <FileGlyph kind={f.kind} tilt={f.tilt} active={i === active} />
            </div>
          ))}

          <div className="absolute -translate-y-1/2" style={{ left: pct(CARD.left, W), width: pct(CARD.right - CARD.left, W), top: pct(CARD.y, H) }}>
            <RankedCard active={active} layoutKey="desktop" />
          </div>

          <div className="absolute -translate-y-1/2" style={{ left: pct(RESULT.left, W), top: pct(CARD.y, H) }}>
            <ResultTile active={active} />
          </div>
        </div>

        {/* Phones and tablets: the same cycle, stacked */}
        <div className="flex flex-col items-center lg:hidden" aria-hidden>
          <div className="flex items-end justify-center gap-5">
            {FILES.map((f, i) => (
              <FileGlyph key={f.kind} kind={f.kind} tilt={f.tilt} active={i === active} />
            ))}
          </div>
          <span className="my-2 h-6 border-l border-dashed border-fg-3" />
          <div className="w-full max-w-[380px]">
            <RankedCard active={active} layoutKey="stacked" />
          </div>
          <span className="my-2 h-6 border-l border-dashed border-fg-3" />
          <ResultTile active={active} />
        </div>
      </figure>
    </div>
  );
}

/** A dashed line whose dashes drift toward where the data is going. */
function FlowingPath({ d, animateD, reduce }: { d: string; animateD?: boolean; reduce: boolean | null }) {
  return (
    <motion.path
      d={d}
      fill="none"
      className="stroke-fg-3"
      strokeWidth={1}
      strokeDasharray="3 3"
      initial={false}
      animate={{ d, strokeDashoffset: reduce ? 0 : [0, -12] }}
      transition={{
        d: animateD ? { duration: 0.55, ease: EASE } : { duration: 0 },
        strokeDashoffset: { duration: 1.1, ease: "linear", repeat: Infinity },
      }}
    />
  );
}

/** A document with a folded corner and a format tag. The one being read straightens, lifts, and solidifies. */
function FileGlyph({ kind, tilt, active }: { kind: string; tilt: number; active: boolean }) {
  return (
    <motion.span
      className="relative block h-[58px] w-[48px]"
      initial={false}
      animate={{ rotate: active ? 0 : tilt, y: active ? -3 : 0, scale: active ? 1.04 : 1, opacity: active ? 1 : 0.55 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <svg viewBox="0 0 48 58" className="absolute inset-0 size-full overflow-visible">
        <path
          d="M8 0.5 H32 L47.5 16 V50 A7.5 7.5 0 0 1 40 57.5 H8 A7.5 7.5 0 0 1 0.5 50 V8 A7.5 7.5 0 0 1 8 0.5 Z"
          className={cn("fill-surface transition-[stroke] duration-300", active ? "stroke-fg/60" : "stroke-border-strong")}
          strokeWidth={1}
          strokeDasharray={active ? undefined : "3 3"}
        />
        <path d="M32 0.5 V10 A6 6 0 0 0 38 16 H47.5" className={cn("fill-surface-2", active ? "stroke-fg/60" : "stroke-border-strong")} strokeWidth={1} />
        <g className="stroke-fg/15" strokeWidth={2} strokeLinecap="round">
          <path d="M10 24 H34" />
          <path d="M10 30 H38" />
          <path d="M10 36 H28" />
        </g>
      </svg>
      <span
        className={cn(
          "num absolute bottom-[7px] left-[7px] rounded-[4px] px-1 py-px text-[8.5px] font-semibold tracking-[0.04em] text-file-ink transition-opacity duration-300",
          FILE_COLOR[kind],
          !active && "opacity-60",
        )}
      >
        {kind}
      </span>
    </motion.span>
  );
}

/** `layoutKey` keeps the desktop and stacked copies' row highlights from animating into each other. */
function RankedCard({ active, layoutKey }: { active: number; layoutKey: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface shadow-overlay">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-[12px] font-medium text-fg">Needs attention</span>
        <span className="eyebrow">Ranked by dollars</span>
      </div>
      <ol className="p-1.5">
        {ROWS.map((row, i) => {
          const on = i === active;
          const width = `${Math.max(6, (row.issue / MAX) * 100)}%`;
          return (
            <li key={row.property} className="relative rounded-lg px-2.5 py-2">
              {on && (
                <motion.span layoutId={`hero-row-${layoutKey}`} className="absolute inset-0 rounded-lg bg-bg ring-1 ring-border" transition={{ duration: 0.45, ease: EASE }} />
              )}
              <div className="relative grid grid-cols-[18px_76px_minmax(0,1fr)_48px] items-center gap-2">
                <span className="num text-[10px] text-fg-3">{i + 1}</span>
                <span className={cn("text-[11.5px] transition-colors duration-300", on ? "font-medium text-fg" : "text-fg-3")}>{row.property}</span>
                <span className="h-1.5 rounded-full bg-fg/[0.06]">
                  <motion.span
                    key={on ? `on-${active}` : `off-${i}`}
                    className="block h-full rounded-full bg-unfavorable"
                    initial={on ? { width: 0, opacity: 0.7 } : false}
                    animate={{ width, opacity: on ? 0.75 : 0.3 }}
                    transition={{ width: { duration: 0.7, ease: EASE, delay: 0.25 }, opacity: { duration: 0.3 } }}
                  />
                </span>
                <span className={cn("num text-right text-[11.5px] transition-opacity duration-300", on ? "text-unfavorable" : "text-unfavorable/50")}>
                  -{formatCurrencyShort(row.issue)}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="relative h-[34px] overflow-hidden border-t border-border px-4">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={active}
            className="absolute inset-x-4 top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-[10.5px] text-fg-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            Read from {ROWS[active].property}&apos;s {FILES[active].kind}
            <span className="size-1 rounded-full bg-fg-3" />
            <span className="num text-favorable">+{formatCurrencyShort(ROWS[active].found)} found</span>
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** The running result. Each read sends its find up into the total: a delta rises off the tile and the icon nudges. */
function ResultTile({ active }: { active: number }) {
  return (
    <div className="relative flex items-center gap-3 rounded-2xl border border-border bg-surface p-2.5 pr-4">
      <motion.span
        key={`icon-${active}`}
        className="grid size-9 place-items-center rounded-xl bg-favorable/10"
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.9 }}
      >
        <TrendingUp className="size-[18px] text-favorable" strokeWidth={1.75} />
      </motion.span>
      <span className="text-left">
        <span className="num block text-[18px] leading-none font-medium text-favorable">+{formatCurrencyShort(FOUND)}</span>
        <span className="mt-1 block text-[10.5px] text-fg-3">NOI found</span>
      </span>
      <AnimatePresence>
        <motion.span
          key={`delta-${active}`}
          className="num pointer-events-none absolute -top-1 right-3 text-[10.5px] font-medium text-favorable"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: [0, 1, 1, 0], y: [6, 0, -6, -14] }}
          transition={{ duration: 1.6, times: [0, 0.2, 0.65, 1], ease: "easeOut", delay: 0.8 }}
        >
          +{formatCurrencyShort(ROWS[active].found)}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
