"use client";

import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Steps through `count` states every `ms` while the element is on screen, for
 * the looping marketing illustrations. Under reduced motion it holds `still`.
 */
export function useCycle(count: number, ms: number, still: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduce = useReducedMotion();
  const [step, setStep] = useState(still);

  useEffect(() => {
    if (!inView || reduce) return;
    const timer = window.setInterval(() => setStep((s) => (s + 1) % count), ms);
    return () => window.clearInterval(timer);
  }, [inView, reduce, count, ms]);

  return { ref, step: reduce ? still : step };
}
