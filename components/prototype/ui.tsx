"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext } from "react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { Badge, type Tone as BadgeTone } from "@/components/ui/badge";
import { Button as UiButton } from "@/components/ui/button";
import { Input as UiInput, Segmented as UiSegmented, Select as UiSelect, Tabs as UiTabs, Textarea } from "@/components/ui/controls";
import { cn } from "@/lib/cn";
import { STAGE_LABEL, fmtDate, type Exception } from "./seed";
import { isOverdue } from "./store";

/** Prototype blocks, built on the app's design tokens and primitives. */

export type Tone = "red" | "amber" | "green" | "blue" | "neutral";

const BADGE: Record<Tone, BadgeTone> = { red: "unfavorable", amber: "warning", green: "favorable", blue: "data", neutral: "neutral" };

export function Chip({ tone = "neutral", dot, children }: { tone?: Tone; dot?: boolean; children: React.ReactNode }) {
  return (
    <Badge tone={BADGE[tone]} dot={dot}>
      {children}
    </Badge>
  );
}

/** Off plan: the property has an open exception. */
export function PlanChip({ off }: { off: boolean }) {
  return (
    <Chip tone={off ? "red" : "green"} dot>
      {off ? "Off plan" : "On plan"}
    </Chip>
  );
}

const STAGE_TONE = { new: "blue", diagnosing: "neutral", waiting: "amber", assigned: "neutral", closed: "green" } as const;
export function StageChip({ e }: { e: Exception }) {
  return (
    <span className="inline-flex gap-1">
      <Chip tone={STAGE_TONE[e.stage]}>{STAGE_LABEL[e.stage]}</Chip>
      {isOverdue(e) && <Chip tone="red">Overdue</Chip>}
      {e.stage === "waiting" && e.question?.reply && <Chip tone="green">Replied</Chip>}
    </span>
  );
}

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

export function A({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} onClick={(ev) => ev.stopPropagation()} className={cn("font-medium text-fg underline decoration-fg/20 underline-offset-[3px] transition-colors hover:decoration-fg/60", className)}>
      {children}
    </Link>
  );
}

/** A column is a label, or a label that right-aligns (numbers). */
export type Column = string | { label: string; num?: boolean };
const colLabel = (c: Column) => (typeof c === "string" ? c : c.label);

/** A table. Inside a flush Card it drops its own border. */
export function Table({ columns, children, className, bare }: { columns: Column[]; children: React.ReactNode; className?: string; bare?: boolean }) {
  const inCard = useContext(InCard);
  return (
    <div className={cn("overflow-x-auto", !bare && !inCard && "rounded-lg border border-border bg-surface", inCard === "padded" && "-mx-4 -mb-4 border-t border-border", className)}>
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-border">
            {columns.map((c, i) => (
              <th key={`${colLabel(c)}-${i}`} scope="col" className={cn("text-xs font-medium text-fg-2 h-8 px-3 whitespace-nowrap first:pl-4 last:pr-4", typeof c !== "string" && c.num && "text-right")}>
                {colLabel(c)}
              </th>
            ))}
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

/** Signed variance, colored by favorability. `good` says which sign is favorable. */
export function Delta({ value, format, good = "up", className }: { value: number | null; format: (v: number) => string; good?: "up" | "down"; className?: string }) {
  if (value === null) return <span className="text-fg-3">–</span>;
  const s = format(value);
  const zero = /^[+-]?\$?0(\.0)?(%| pts|x)?$/.test(s.replace("+", ""));
  const fav = good === "up" ? value > 0 : value < 0;
  return <span className={cn("num", zero ? "text-fg-3" : fav ? "text-favorable" : "text-unfavorable", className)}>{s}</span>;
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

/** Label-value pairs for summary panels. */
export function Dl({ items, className }: { items: { label: string; value: React.ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("flex flex-col text-xs", className)}>
      {items.map((it) => (
        <div key={it.label} className="flex items-center justify-between gap-3 border-b border-border/70 py-2 last:border-b-0">
          <dt className="text-fg-2">{it.label}</dt>
          <dd className="num text-right">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
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

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <Textarea rows={3} {...props} className={cn("min-h-0", props.className)} />;
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

export function Log({ entries }: { entries: { date: string; who: string; text: string }[] }) {
  return (
    <ol className="flex flex-col">
      {[...entries].reverse().map((l, i) => (
        <li key={i} className="grid grid-cols-[56px_88px_1fr] gap-3 border-b border-border/70 py-2 text-xs last:border-b-0">
          <span className="num text-xs text-fg-3">{fmtDate(l.date)}</span>
          <span className="text-fg-2">{l.who}</span>
          <span>{l.text}</span>
        </li>
      ))}
    </ol>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-xs text-fg-3">{children}</p>;
}

/** A thin progress meter with a label above it. */
export function Meter({ value, total, label }: { value: number; total: number; label: React.ReactNode }) {
  return (
    <span className="flex flex-col gap-1.5">
      <span className="text-xs">{label}</span>
      <span className="h-1 overflow-hidden rounded-full bg-fg/10">
        <span className="block h-full rounded-full bg-fg/70 transition-[width] duration-500 ease-out" style={{ width: `${(value / total) * 100}%` }} />
      </span>
    </span>
  );
}

/** Section heading inside a page. */
export function H2({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-[13px] font-semibold text-fg">{children}</h2>
      {action}
    </div>
  );
}
