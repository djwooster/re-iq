"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

/**
 * A fact's icon (an SVG rendered on the server) that draws its strokes once when it scrolls into
 * view, a beat after the one before it. Under reduced motion it simply shows.
 */
export function FactIcon({ index, children }: { index: number; children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const reduce = useReducedMotion();

  useEffect(() => {
    const strokes = ref.current?.querySelectorAll<SVGGeometryElement>("path, line, rect, circle, polyline");
    if (!strokes?.length || reduce) return;
    strokes.forEach((s) => {
      s.setAttribute("pathLength", "1");
      s.style.strokeDasharray = "1";
      s.style.strokeDashoffset = "1";
    });
    if (!inView) return;
    const controls = [...strokes].map((s) => animate(s, { strokeDashoffset: [1, 0] }, { duration: 0.7, ease: "easeOut", delay: 0.15 + index * 0.12 }));
    return () => controls.forEach((c) => c.stop());
  }, [inView, reduce, index]);

  return (
    <span ref={ref} className="inline-flex">
      {children}
    </span>
  );
}
