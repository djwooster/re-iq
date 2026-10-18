"use client";

import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

const FIELD =
  "w-full rounded-md border border-border bg-bg text-xs text-fg transition-colors duration-150 placeholder:text-fg-3 hover:border-border-strong focus:border-fg-3 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(FIELD, "h-8 px-2.5", className)} {...rest} />;
});

export function Select({
  className,
  children,
  dense,
  ...rest
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> & { dense?: boolean }) {
  return (
    <div className={cn("relative", className)}>
      <select className={cn(FIELD, "cursor-pointer appearance-none pr-7 pl-2.5", dense ? "h-7 text-[11px]" : "h-8")} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2 text-fg-3" />
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: (id: string) => React.ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[11px] font-medium text-fg-2">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-[11px] text-fg-3">{hint}</p>}
    </div>
  );
}

/** Compact segmented control, e.g. the MTD / QTD / YTD / T12 period selector. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; title?: string }[];
  label: string;
}) {
  const layoutId = useId();
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-border bg-surface p-0.5">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.title}
            onClick={() => onChange(o.id)}
            className={cn(
              "num relative cursor-pointer rounded-[5px] px-2.5 py-1 text-[11px] font-medium transition-colors duration-150",
              active ? "text-fg" : "text-fg-3 hover:text-fg-2",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-[5px] border border-border bg-bg"
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  tabs: { id: T; label: string; count?: number }[];
  className?: string;
}) {
  const layoutId = useId();
  return (
    <div role="tablist" className={cn("flex items-center gap-4 border-b border-border", className)}>
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn("relative -mb-px cursor-pointer pb-2 text-xs font-medium transition-colors", active ? "text-fg" : "text-fg-3 hover:text-fg-2")}
          >
            {t.label}
            {t.count !== undefined && <span className="num ml-1.5 text-[10px] text-fg-3">{t.count}</span>}
            {active && <motion.span layoutId={layoutId} className="absolute inset-x-0 -bottom-px h-px bg-fg" transition={{ duration: 0.2, ease: "easeOut" }} />}
          </button>
        );
      })}
    </div>
  );
}
