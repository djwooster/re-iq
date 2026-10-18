"use client";

import { RotateCcw } from "lucide-react";
import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Frame for an animated product vignette. Once a third of it is on screen it
 * plays a timeline: `schedule` lists the ms at which each step starts, and
 * children render for the current step (0 = before anything plays). Replay
 * remounts the children so their entrance animations run again. Under
 * prefers-reduced-motion it shows the final step straight away.
 */
export function Scene({
  label,
  meta,
  schedule,
  className,
  children,
}: {
  label: string;
  meta?: React.ReactNode;
  schedule: readonly number[];
  className?: string;
  children: (step: number) => React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const reduce = useReducedMotion();
  const [run, setRun] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    const timers = schedule.map((ms, i) => window.setTimeout(() => setStep(i + 1), ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [inView, reduce, run, schedule]);

  const replay = () => {
    setStep(0);
    setRun((r) => r + 1);
  };

  return (
    <figure ref={ref} aria-label={label} className={cn("rounded-xl border border-border bg-surface p-2 sm:p-2.5", className)}>
      <figcaption className="flex h-7 items-center justify-between gap-3 pr-0.5 pl-1.5">
        <span className="eyebrow truncate">{label}</span>
        <span className="flex shrink-0 items-center gap-2">
          {meta && <span className="num hidden text-[10px] text-fg-3 sm:inline">{meta}</span>}
          {!reduce && (
            <button
              type="button"
              onClick={replay}
              aria-label="Replay animation"
              className="grid size-6 place-items-center rounded-md text-fg-3 transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
            >
              <RotateCcw className="size-3" strokeWidth={1.75} />
            </button>
          )}
        </span>
      </figcaption>
      <div key={run} className="mt-1.5">
        {children(reduce ? schedule.length : step)}
      </div>
    </figure>
  );
}

/** Entrance used inside scenes: fade and an 8px rise once `show` is true. */
export const rise = (show: boolean, delay = 0) => ({
  initial: { opacity: 0, y: 8 },
  animate: show ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 },
  transition: { duration: 0.3, ease: "easeOut" as const, delay: show ? delay : 0 },
});
