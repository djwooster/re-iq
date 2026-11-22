"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronDown, ChevronRight, MoreHorizontal, Search, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
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

export interface FilterOption {
  value: string;
  label: string;
}

/**
 * A compact dropdown in the app's style. As a filter (with `allLabel`): names the filter ("Property"),
 * and once set shows its value on a filled button ("Property  Lofts"); the first option clears it.
 * Without `allLabel` it's a picker that always has a value ("Period  Month"), so it stays unfilled.
 * The menu checks the current option. Long lists (over 8) get a search box. Arrow keys move, Enter
 * picks, Escape closes.
 */
export function FilterMenu({
  label,
  allLabel,
  value,
  options,
  onChange,
  hideLabel,
  placeholder,
  invalid,
}: {
  label: string;
  allLabel?: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  /** In a table cell, where the column already names it: show only the value. */
  hideLabel?: boolean;
  /** Shown (with `hideLabel`) while nothing is picked. */
  placeholder?: string;
  /** Nothing picked yet and something must be: amber. */
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = options.find((o) => o.value === value);
  const searchable = options.length > 8;
  const all: FilterOption[] = allLabel ? [{ value: "", label: allLabel }, ...options] : options;
  const filled = !!current && !!allLabel;
  const items = query ? all.filter((o) => o.value && o.label.toLowerCase().includes(query.toLowerCase())) : all;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const show = () => {
    setQuery("");
    setActive(Math.max(0, all.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key !== "ArrowDown" && e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      show();
      return;
    }
    const keys: Record<string, () => void> = {
      Escape: () => setOpen(false),
      ArrowDown: () => setActive((i) => Math.min(items.length - 1, i + 1)),
      ArrowUp: () => setActive((i) => Math.max(0, i - 1)),
      Enter: () => items[active] && pick(items[active].value),
    };
    if (!keys[e.key]) return;
    e.preventDefault();
    // Inside a modal, Escape closes only this menu, not the modal.
    e.stopPropagation();
    keys[e.key]();
  };

  return (
    <div ref={ref} className="relative" onKeyDown={onKeyDown}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-label={hideLabel ? `${label}: ${current?.label ?? placeholder ?? "none"}` : undefined}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs whitespace-nowrap transition-colors duration-100",
          invalid && !current ? "border-warning/50 bg-warning/[0.06] text-warning hover:border-warning" : filled ? "border-border-strong bg-surface-2 text-fg" : "border-border bg-bg text-fg-2 hover:border-border-strong hover:text-fg",
        )}
      >
        {hideLabel ? (
          <span className={cn("max-w-44 truncate", current && "text-fg")}>{current?.label ?? placeholder ?? label}</span>
        ) : (
          <>
            <span className={cn(current && "text-fg-3")}>{label}</span>
            {current && <span className="max-w-40 truncate font-medium text-fg">{current.label}</span>}
          </>
        )}
        <ChevronDown className="size-3 text-fg-3" />
      </button>
      {open && (
        <div className="absolute top-full right-0 z-20 mt-1 w-56 rounded-lg border border-border bg-bg p-1 shadow-overlay">
          {searchable && (
            <div className="mb-1 flex items-center gap-1.5 border-b border-border px-2 pb-1.5">
              <Search className="size-3.5 shrink-0 text-fg-3" />
              <input
                autoFocus
                aria-label={`Search ${label.toLowerCase()}`}
                placeholder="Search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                className="h-6 w-full bg-transparent text-xs text-fg outline-none placeholder:text-fg-3"
              />
            </div>
          )}
          <ul id={listId} role="listbox" aria-label={label} className="max-h-64 overflow-y-auto">
            {items.map((o, i) => (
              <li
                key={o.value || "all"}
                role="option"
                aria-selected={o.value === value}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(o.value)}
                className={cn("flex h-7 cursor-pointer items-center gap-2 rounded-md px-2 text-xs", i === active ? "bg-fg/[0.05] text-fg" : "text-fg-2")}
              >
                <span className="flex-1 truncate">{o.label}</span>
                {o.value === value && <Check className="size-3.5 shrink-0 text-fg" />}
              </li>
            ))}
            {!items.length && <li className="px-2 py-1.5 text-xs text-fg-3">No matches</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

/** A row checkbox. Clicks don't reach the row, so checking a row doesn't open it. */
export function Checkbox({ checked, indeterminate, onChange, label }: { checked: boolean; indeterminate?: boolean; onChange: () => void; label: string }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      ref={(el) => void (el && (el.indeterminate = !!indeterminate && !checked))}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className="size-3.5 cursor-pointer align-middle accent-[var(--brand)]"
    />
  );
}

/** Selectable tables: the header's select-all checkbox. Rows then start with a `<SelectTd>`. */
export interface TableSelect {
  all: boolean;
  some: boolean;
  onToggleAll: () => void;
}

/** A table. Inside a flush Card it drops its own border. With `onSort`, headers sort. With `select`, rows have checkboxes. */
export function Table({ columns, children, className, bare, sort, onSort, select }: { columns: Column[]; children: React.ReactNode; className?: string; bare?: boolean; sort?: Sort; onSort?: (col: number) => void; select?: TableSelect }) {
  const inCard = useContext(InCard);
  return (
    <div className={cn("overflow-x-auto", !bare && !inCard && "rounded-lg border border-border bg-surface", inCard === "padded" && "-mx-4 -mb-4 border-t border-border", className)}>
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-border">
            {select && (
              <th scope="col" className="w-8 pr-0 pl-4">
                <Checkbox label="Select all" checked={select.all} indeterminate={select.some} onChange={select.onToggleAll} />
              </th>
            )}
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

export function Row({ href, highlight, selected, onClick, children }: { href?: string; highlight?: boolean; selected?: boolean; onClick?: () => void; children: React.ReactNode }) {
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
        selected && "bg-fg/[0.035]",
      )}
    >
      {children}
    </tr>
  );
}

/**
 * Row selection for a table. Only rows still shown count as selected, so a filter or a delete never
 * acts on hidden rows. Spread `select` into `<Table>`, and give each row a `<SelectTd>`.
 */
export function useSelection<T extends { id: string }>(shown: T[]) {
  const [picked, setPicked] = useState<string[]>([]);
  const selected = shown.filter((r) => picked.includes(r.id));
  const all = shown.length > 0 && selected.length === shown.length;
  return {
    selected,
    isSelected: (id: string) => picked.includes(id),
    toggle: (id: string) => setPicked((x) => (x.includes(id) ? x.filter((q) => q !== id) : [...x, id])),
    clear: () => setPicked([]),
    select: { all, some: selected.length > 0, onToggleAll: () => setPicked(all ? [] : shown.map((r) => r.id)) } satisfies TableSelect,
  };
}

/** Takes the toolbar's place while rows are checked: "N selected", a clear button, and the actions for them. */
export function SelectionBar({ count, onClear, children }: { count: number; onClear: () => void; children: React.ReactNode }) {
  return (
    <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Clear selection" onClick={onClear} className="rounded-md p-1 text-fg-3 transition-colors hover:bg-fg/[0.06] hover:text-fg">
          <X className="size-3.5" />
        </button>
        <span className="num text-xs font-medium text-fg">{count} selected</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export interface RowAction {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
}

/** The ⋯ menu at the end of a table row. Clicks stay inside it, so using it never opens the row. */
export function RowMenu({ label, actions, disabled }: { label: string; actions: RowAction[]; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <button type="button" aria-label={`Actions for ${label}`} aria-haspopup="menu" aria-expanded={open} disabled={disabled} onClick={() => setOpen((v) => !v)} className="rounded-md p-1.5 text-fg-3 transition-colors hover:bg-fg/[0.06] hover:text-fg disabled:opacity-50">
        <MoreHorizontal className="size-3.5" />
      </button>
      {open && (
        <div role="menu" className="absolute top-full right-0 z-20 mt-1 w-44 rounded-lg border border-border bg-bg p-1 text-left shadow-overlay">
          {actions.map(({ label: text, icon: Icon, onSelect, danger }) => (
            <button
              key={text}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSelect();
              }}
              className={cn("flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-xs", danger ? "text-unfavorable hover:bg-unfavorable/10" : "text-fg-2 hover:bg-fg/[0.04] hover:text-fg")}
            >
              <Icon className="size-3.5" /> {text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** The checkbox cell that starts each row of a selectable table. */
export function SelectTd({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <td className="w-8 pr-0 pl-4" onClick={(e) => e.stopPropagation()}>
      <Checkbox label={label} checked={checked} onChange={onChange} />
    </td>
  );
}

/**
 * An empty state: three fanned icon tiles in the illustration colors (the story in three steps), a
 * heading that says what's empty, one plain line on how to fill it, and the action.
 */
/**
 * Icons are passed drawn (`<FileText />`), so server pages can use this too. `fill` makes it take
 * the rest of the screen, for a page that has nothing else on it.
 */
export function SpotEmpty({ icons, title, children, action, fill, className }: { icons: [React.ReactNode, React.ReactNode, React.ReactNode]; title: string; children: React.ReactNode; action?: React.ReactNode; fill?: boolean; className?: string }) {
  const [A, B, C] = icons;
  const tile = "flex size-11 items-center justify-center rounded-xl border border-border bg-bg [&>svg]:size-5 [&>svg]:stroke-[1.5]";
  return (
    <div className={cn("flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface px-6 py-10 text-center", fill && "min-h-[calc(100dvh-8.5rem)]", className)}>
      <div className="flex items-end" aria-hidden>
        <span className={cn(tile, "translate-y-1 -rotate-6 text-spot-coral")}>{A}</span>
        <span className={cn(tile, "z-10 -mx-1.5 -translate-y-1 text-spot-sun")}>{B}</span>
        <span className={cn(tile, "translate-y-1 rotate-6 text-spot-violet")}>{C}</span>
      </div>
      <h3 className="mt-5 text-[16px] font-semibold text-fg">{title}</h3>
      <p className="mt-1 max-w-md text-[13px] text-balance text-fg-3">{children}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** A property's name in a table row that opens it: brand blue, the same in every table. */
export function PropertyTd({ children }: { children: React.ReactNode }) {
  return <Td className="font-medium whitespace-nowrap text-brand">{children}</Td>;
}

/**
 * A text link that navigates ("All properties"): brand blue. The underline is a 1px background that
 * grows from the left on hover or keyboard focus (a text-decoration can't animate its width).
 */
export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-0.5 text-xs font-medium text-brand transition-[background-size] duration-200 ease-out hover:bg-[length:100%_1px] focus-visible:bg-[length:100%_1px] motion-reduce:transition-none"
    >
      {children}
    </Link>
  );
}

export function Td({ children, className, num }: { children?: React.ReactNode; className?: string; num?: boolean }) {
  return <td className={cn("h-10 px-3 align-middle first:pl-4 last:pr-4", num && "num text-right whitespace-nowrap", className)}>{children}</td>;
}

export function Button({ onClick, href, variant = "primary", disabled, icon, children }: { onClick?: () => void; href?: string; variant?: "primary" | "secondary" | "ghost" | "danger-ghost"; disabled?: boolean; icon?: React.ReactNode; children: React.ReactNode }) {
  if (href) {
    const cls = cn(
      "inline-flex min-w-[100px] shrink-0 items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-[background-color,border-color,opacity] duration-150",
      variant === "primary" ? "border-transparent bg-brand text-brand-fg hover:opacity-90" : "border-border bg-surface text-fg hover:border-border-strong hover:bg-surface-2",
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
          {href && <ChevronRight className="-mr-0.5 size-3.5 text-brand" />}
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
