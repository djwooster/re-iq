"use client";

import { ChartColumn, Check, Inbox, ListOrdered, TrendingUp } from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

/**
 * The month-end chores RE-IQ takes over, as a band under the hero. Each item
 * ticks off in turn when scrolled into view and links to its section below.
 */

const TASKS = [
  { icon: Inbox, label: "Reports collected", detail: "34 files from 4 managers, any format", href: "#ingest" },
  { icon: ChartColumn, label: "Variance explained", detail: "By driver and by property", href: "#explain" },
  { icon: ListOrdered, label: "Issues ranked", detail: "By dollar impact, before anyone asks", href: "#prioritize" },
  { icon: TrendingUp, label: "Upside found", detail: "Renewals and vendor costs, with the math", href: "#grow" },
];

export function MonthEndChecklist() {
  const ref = useRef<HTMLUListElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const done = inView || reduce;

  return (
    <section className="border-t border-border">
      <ul ref={ref} className="mx-auto grid max-w-[1280px] grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 sm:px-6 lg:grid-cols-4">
        {TASKS.map(({ icon: Icon, label, detail, href }, i) => (
          <li key={label}>
            <a href={href} className="group flex items-start gap-3">
              <span className="relative grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface text-fg-2 transition-colors duration-150 group-hover:border-border-strong group-hover:text-fg">
                <Icon className="size-4" strokeWidth={1.75} aria-hidden />
                <motion.span
                  className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-favorable text-bg ring-2 ring-bg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: done ? 1 : 0 }}
                  transition={{ duration: 0.25, ease: "easeOut", delay: done && !reduce ? 0.2 + i * 0.35 : 0 }}
                  aria-hidden
                >
                  <Check className="size-2.5" strokeWidth={3.5} />
                </motion.span>
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium leading-5 text-fg">{label}</span>
                <span className="block text-[12px] leading-[1.45] text-fg-3 transition-colors duration-150 group-hover:text-fg-2">{detail}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
