"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const QUESTIONS = [
  "Why is NOI under budget this quarter?",
  "Which property needs me this week?",
  "What changed at Property #2 since May?",
  "Which manager is furthest off budget?",
];

/** An AI prompt that types a question, holds it, clears it, and moves to the next. */
export function TypingPrompt() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const text = QUESTIONS[index];

  useEffect(() => {
    if (reduce) return;
    const full = length === text.length;
    const delay = deleting ? 22 : full ? 2200 : length === 0 ? 500 : 48;
    const timer = window.setTimeout(() => {
      if (!deleting && full) setDeleting(true);
      else if (deleting && length === 0) {
        setDeleting(false);
        setIndex((i) => (i + 1) % QUESTIONS.length);
      } else setLength((l) => l + (deleting ? -1 : 1));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [reduce, length, deleting, text]);

  return (
    <span className="flex min-w-0 items-center text-[11.5px] text-fg" aria-label={QUESTIONS[0]}>
      <span className="truncate" aria-hidden>
        {reduce ? QUESTIONS[0] : text.slice(0, length)}
      </span>
      <span className="ml-px h-3.5 w-px shrink-0 animate-pulse bg-data" aria-hidden />
    </span>
  );
}
