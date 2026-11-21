"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext } from "react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { Button as UiButton } from "@/components/ui/button";
import { Input as UiInput, Segmented as UiSegmented, Select as UiSelect, Tabs as UiTabs } from "@/components/ui/controls";
import { cn } from "@/lib/cn";

/** The app's page blocks (cards, tables, buttons, form controls), built on the design tokens and `components/ui`. */

/** Tables inside a card drop their own frame and line up with the card's edges. */
const InCard = createContext<"padded" | "flush" | null>(null);

export function Card({ title, action, className, flush, children }: { title?: React.ReactNode; action?: React.ReactNode; className?: string; flush?: boolean; children: React.ReactNode }) {
  return (
    <section className={cn("min-w-0 rounded-lg border border-border bg-surface", className)}>
      {(title || action) && (
        <header className="flex min-h-11 items-center justify-between gap-3 px-4 pt-3 pb-2.5">
          <h2 className="text-[13px] font-semibold text-fg">{title}</h2>
          {action}
        </header>
      )}
      <div className={cn(flush ? "border-t border-border" : "px-4 pb-4", !title && !action && !flush && "pt-4")}>
        <InCard.Provider value={flush ? "flush" : "padded"}>{children}</InCard.Provider>
      </div>
    </section>
  );
}

/** A column is a label, or a label that right-aligns (numbers). `sort: false` opts it out of a sortable table. */
export type Column = string | { label: string; num?: boolean; sort?: false };
const colLabel = (c: Column) => (typeof c === "string" ? c : c.label);

export type Sort = { col: number; dir: "asc" | "desc" } | null;

/** A table. Inside a flush Card it drops its own border. With `onSort`, headers sort. */
export function Table({ columns, children, className, bare, sort, onSort }: { columns: Column[]; children: React.ReactNode; className?: string; bare?: boolean; sort?: Sort; onSort?: (col: number) => void }) {
  const inCard = useContext(InCard);
  return (
    <div className={cn("overflow-x-auto", !bare && !inCard && "rounded-lg border border-border bg-surface", inCard === "padded" && "-mx-4 -mb-4 border-t border-border", className)}>
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-border">
            {columns.map((c, i) => {
              const num = typeof c !== "string" && c.num;
              const active = sort?.col === i;
              const Arrow = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
              return (
                <th key={`${colLabel(c)}-${i}`} scope="col" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined} className={cn("h-8 px-3 text-xs font-medium whitespace-nowrap text-fg-2 first:pl-4 last:pr-4", num && "text-right")}>
                  {onSort && !(typeof c !== "string" && c.sort === false) ? (
                    <button type="button" onClick={() => onSort(i)} className={cn("inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-fg", num && "flex-row-reverse", active && "text-fg")}>
                      {colLabel(c)}
                      <Arrow className={cn("size-3", !active && "text-fg-3")} />
                    </button>
                  ) : (
                    colLabel(c)
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ href, highlight, onClick, children }: { href?: string; highlight?: boolean; onClick?: () => void; children: React.ReactNode }) {
  const router = useRouter();
  const go = href ? () => router.push(href) : onClick;
  return (
    <tr
      onClick={go}
      onKeyDown={go ? (e) => (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget && (e.preventDefault(), go()) : undefined}
      tabIndex={go ? 0 : undefined}
      className={cn(
        "border-b border-border/70 transition-colors duration-100 last:border-b-0",
        go && "cursor-pointer hover:bg-fg/[0.025] focus-visible:bg-fg/[0.04] focus-visible:outline-none",
        highlight && "bg-warning/[0.06]",
      )}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className, num }: { children?: React.ReactNode; className?: string; num?: boolean }) {
  return <td className={cn("h-10 px-3 align-middle first:pl-4 last:pr-4", num && "num text-right whitespace-nowrap", className)}>{children}</td>;
}

export function Button({ onClick, href, variant = "primary", disabled, icon, children }: { onClick?: () => void; href?: string; variant?: "primary" | "secondary" | "ghost" | "danger-ghost"; disabled?: boolean; icon?: React.ReactNode; children: React.ReactNode }) {
  if (href) {
    const cls = cn(
      "inline-flex min-w-[100px] shrink-0 items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-[background-color,border-color,opacity] duration-150",
      variant === "primary" ? "border-transparent bg-inverted text-inverted-fg hover:opacity-90" : "border-border bg-surface text-fg hover:border-border-strong hover:bg-surface-2",
    );
    return (
      <Link href={href} className={cls}>
        {icon}
        {children}
      </Link>
    );
  }
  return (
    <UiButton variant={variant} onClick={onClick} disabled={disabled} icon={icon}>
      {children}
    </UiButton>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: readonly T[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-fg-3">{label}</span>}
      <UiSegmented label={label || "Options"} value={value} onChange={onChange} options={options.map((o) => ({ id: o, label: o }))} />
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (t: T) => void; tabs: readonly { id: T; label: string; count?: number }[] }) {
  return <UiTabs value={value} onChange={onChange} tabs={tabs.map((t) => ({ ...t, count: t.count || undefined }))} />;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-fg-2">{label}</span>
      {children}
    </label>
  );
}

export const Input = UiInput;

export function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: readonly string[]; label?: string }) {
  return (
    <UiSelect value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </UiSelect>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-xs text-fg-3">{children}</p>;
}

/** A small trend line. Null months break the line. */
export function Sparkline({ data, tone = "data", className }: { data: { value: number | null }[]; tone?: "data" | "unfavorable" | "muted"; className?: string }) {
  const stroke = { data: "var(--data)", unfavorable: "var(--unfavorable)", muted: "var(--text-muted)" }[tone];
  return (
    <div className={cn("h-6 w-full", className)} aria-hidden>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line type="monotone" dataKey="value" stroke={stroke} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** A KPI: label, value, the rule it's measured against, and whether it's inside it. */
export function Kpi({ label, value, target, status, trend, href, sub }: { label: string; value: React.ReactNode; target?: string; status?: "ok" | "watch" | "breach"; trend?: { value: number | null }[]; href?: string; sub?: React.ReactNode }) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-fg-2">{label}</span>
        <span className="flex items-center gap-1.5">
          {status && status !== "ok" && <span className={cn("size-1.5 rounded-full", status === "breach" ? "bg-unfavorable" : "bg-warning")} aria-label={status === "breach" ? "Outside target" : "Near target"} />}
          {href && <ChevronRight className="-mr-0.5 size-3.5 text-fg-3 transition-colors group-hover:text-fg" />}
        </span>
      </span>
      <span className="num text-[20px] leading-7 font-medium tracking-tight text-fg">{value}</span>
      {sub && <span className="-mt-1 text-xs">{sub}</span>}
      {trend && <Sparkline data={trend} tone={status === "breach" ? "unfavorable" : "data"} />}
      {target && <span className="text-[11px] leading-snug text-fg-3">{target}</span>}
    </>
  );
  const cls = "flex min-w-0 flex-col gap-1.5 rounded-lg border border-border bg-surface p-3";
  return href ? (
    <Link href={href} className={cn(cls, "group transition-colors hover:border-border-strong")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
