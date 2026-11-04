"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { STAGE_LABEL, fmtDate, type Exception } from "./seed";
import { isOverdue } from "./store";

/** Wireframe v2 blocks: real labels, gray bars where numbers would go. */

/** Stands in for a value. Widths vary so a column doesn't read as one shape. */
export function Bar({ w = 12, className }: { w?: number; className?: string }) {
  return <span aria-label="value" className={cn("inline-block h-2 rounded-sm bg-fg/[0.12] align-middle", className)} style={{ width: `${w * 4}px` }} />;
}

/** Deterministic widths for rows of bars. */
export const barW = (seed: number, min = 8, span = 10) => min + ((seed * 7 + 3) % span);

export type Tone = "red" | "amber" | "green" | "blue" | "neutral";

const TONE: Record<Tone, string> = {
  red: "bg-unfavorable/10 text-unfavorable",
  amber: "bg-warning/15 text-warning",
  green: "bg-favorable/10 text-favorable",
  blue: "bg-[var(--wf-accent)]/10 text-[var(--wf-accent)]",
  neutral: "bg-fg/[0.06] text-fg-2",
};

export function Chip({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={cn("inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap", TONE[tone])}>{children}</span>;
}

/** Off plan: the property has an open exception. */
export function PlanChip({ off }: { off: boolean }) {
  return (
    <Chip tone={off ? "red" : "green"}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
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

export function Card({ title, action, className, children }: { title?: React.ReactNode; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-md border border-fg/15 bg-bg", className)}>
      {(title || action) && (
        <header className="flex min-h-10 items-center justify-between gap-3 border-b border-fg/10 px-4 py-2">
          <h2 className="text-xs font-semibold">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function A({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} onClick={(ev) => ev.stopPropagation()} className={cn("font-medium text-[var(--wf-accent)] hover:underline", className)}>
      {children}
    </Link>
  );
}

/** A real table: real column names, rows of text, chips and bars. */
export function Table({ columns, children, className }: { columns: string[]; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-md border border-fg/15", className)}>
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-fg/15 bg-fg/[0.025]">
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 text-[11px] font-medium whitespace-nowrap text-fg-3">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ href, highlight, children }: { href?: string; highlight?: boolean; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <tr
      onClick={href ? () => router.push(href) : undefined}
      className={cn("border-b border-fg/10 last:border-b-0", href && "cursor-pointer transition-colors hover:bg-fg/[0.04]", highlight && "bg-warning/[0.07]")}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2.5 align-middle", className)}>{children}</td>;
}

/** Rows of bars under real column names, for module pages. */
export function StubTable({ label, columns, rows, highlight = [], note }: { label?: string; columns: string[]; rows: string[]; highlight?: number[]; note?: string }) {
  return (
    <div className="flex flex-col gap-2">
      {(label || note) && (
        <div className="flex items-baseline justify-between gap-3">
          {label && <h3 className="text-xs font-medium text-fg-2">{label}</h3>}
          {note && <span className="text-[11px] text-fg-3">{note}</span>}
        </div>
      )}
      <Table columns={columns}>
        {rows.map((r, i) => (
          <Row key={r} highlight={highlight.includes(i)}>
            <Td className="whitespace-nowrap text-fg-2">{r}</Td>
            {columns.slice(1).map((c, j) => (
              <Td key={c}>
                <Bar w={barW(i + j)} />
              </Td>
            ))}
          </Row>
        ))}
      </Table>
    </div>
  );
}

/** A chart: a labeled box with a diagonal cross. */
export function Chart({ label, className }: { label: string; className?: string }) {
  return (
    <div className={cn("relative min-h-40 overflow-hidden rounded-md border border-fg/15 bg-fg/[0.025]", className)}>
      <svg className="absolute inset-0 h-full w-full text-fg/15" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
        <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
        <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="relative m-3 inline-block rounded bg-bg px-1.5 py-0.5 text-[11px] font-medium text-fg-2">{label}</span>
    </div>
  );
}

export function Sparkline() {
  return (
    <svg viewBox="0 0 60 16" className="h-4 w-16 text-fg/25" aria-label="Trend placeholder">
      <polyline points="0,11 10,9 20,10 30,6 40,8 50,5 60,6" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** A labeled value: name, gray bar, and the rule it's measured against. */
export function Stat({ label, target, href }: { label: string; target?: string; href?: string }) {
  const body = (
    <>
      <span className="text-[11px] font-medium text-fg-2">{label}</span>
      <Bar w={16} className="h-3" />
      {target && <span className="text-[11px] text-fg-3">{target}</span>}
    </>
  );
  const cls = "flex flex-col gap-2 rounded-md border border-fg/15 p-3";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:border-fg/40")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Button({ onClick, href, variant = "primary", disabled, children }: { onClick?: () => void; href?: string; variant?: "primary" | "secondary"; disabled?: boolean; children: React.ReactNode }) {
  const cls = cn(
    "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-opacity disabled:cursor-not-allowed disabled:opacity-40",
    variant === "primary" ? "bg-[var(--wf-accent)] text-white hover:opacity-85" : "border border-fg/20 text-fg hover:bg-fg/[0.05]",
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: readonly T[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {label && <span className="text-[11px] text-fg-3">{label}</span>}
      <div className="flex rounded-md border border-fg/15 p-0.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={cn("cursor-pointer rounded px-2 py-1 text-[11px] transition-colors", value === o ? "bg-fg/[0.08] font-medium text-fg" : "text-fg-3 hover:text-fg")}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Tabs that switch local state. */
export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (t: T) => void; tabs: readonly { id: T; label: string; count?: number }[] }) {
  return (
    <div role="tablist" className="flex flex-wrap gap-1 border-b border-fg/15">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn("-mb-px cursor-pointer border-b-2 px-3 py-2 text-xs transition-colors", value === t.id ? "border-[var(--wf-accent)] font-medium text-fg" : "border-transparent text-fg-3 hover:text-fg-2")}
        >
          {t.label}
          {t.count ? <span className="ml-1.5 text-[11px] text-fg-3">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

const fieldCls = "w-full rounded-md border border-fg/20 bg-bg px-2.5 py-1.5 text-xs text-fg outline-none focus:border-[var(--wf-accent)]";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-fg-2">{label}</span>
      {children}
    </label>
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={cn(fieldCls, "resize-y", props.className)} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldCls, props.className)} />;
}

export function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(fieldCls, "cursor-pointer")}>
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}

export function Log({ entries }: { entries: { date: string; who: string; text: string }[] }) {
  return (
    <ol className="flex flex-col">
      {[...entries].reverse().map((l, i) => (
        <li key={i} className="grid grid-cols-[56px_88px_1fr] gap-3 border-b border-fg/10 py-2 text-xs last:border-b-0">
          <span className="text-fg-3">{fmtDate(l.date)}</span>
          <span className="text-fg-2">{l.who}</span>
          <span>{l.text}</span>
        </li>
      ))}
    </ol>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-dashed border-fg/20 px-4 py-6 text-center text-xs text-fg-3">{children}</p>;
}
