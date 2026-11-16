"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { fmt } from "./metrics";
import { EXPENSE_LINES, LAST, MONTHS, MONTH_LONG, REVENUE_LINES, month, periodTotal, portfolioTotal, reported, type Line, type Month } from "./numbers";
import { Ap, Ar, Balance, Cash, Gl, ModulePage, Reforecast, Variance } from "./portfolio";
import { PROPERTIES, property } from "./seed";
import { Page } from "./shell";
import { ConceptSwitch, Delta, Segmented, Select, Sparkline, Table, Tabs, type Column, type Sort } from "./ui";

/** Financials in two concepts. A is the original page; B leads with a collapsed statement and an all-properties view. */
export function Financials({ concept, property }: { concept: "a" | "b"; property?: string }) {
  const sw = <ConceptSwitch value={concept} options={["a", "b"] as const} base={BASE} />;
  return concept === "b" ? <FinancialsB switcher={sw} prop={property && IDS.includes(property) ? property : ALL} /> : <ModulePage id="financials" tabsEnd={sw} />;
}

// ---- Concept B ----

const TABS = [
  { id: "t12", label: "T-12" },
  { id: "budget", label: "Budget" },
  { id: "balance", label: "Balance sheet" },
  { id: "gl", label: "GL detail" },
  { id: "cash", label: "Cash reconciliation" },
  { id: "ar", label: "AR aging" },
  { id: "ap", label: "AP aging" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const BASE = "/prototype/financials";
const B_HREF = `${BASE}?concept=b`;
const ALL = "all";
const IDS = PROPERTIES.map((p) => p.id);
const MS = MONTHS.map((_, m) => m);

/** The selected property lives in the URL, so the breadcrumb and Back return to all properties. */
function FinancialsB({ switcher, prop }: { switcher: React.ReactNode; prop: string }) {
  const router = useRouter();
  const setProp = (id: string) => router.push(id === ALL ? B_HREF : `${B_HREF}&property=${id}`, { scroll: false });
  const [tab, setTab] = useState<TabId>("t12");
  const [view, setView] = useState<"Summary" | "Months">("Summary");
  const [budget, setBudget] = useState<"This month" | "Year end">("This month");
  const one = tab === "balance" || tab === "gl";
  const id = one && prop === ALL ? IDS[0] : prop;
  const picker = tab === "t12" || one || (tab === "budget" && budget === "This month");
  return (
    <Page
      title={id === ALL ? "Financials" : property(id)!.name}
      crumbs={id === ALL ? undefined : [{ label: "Financials", href: B_HREF }, { label: property(id)!.name }]}
      tabs={<Tabs value={tab} onChange={setTab} tabs={TABS} />}
      tabsEnd={switcher}
      actions={
        <>
          {tab === "t12" && <Segmented label="" value={view} onChange={setView} options={["Summary", "Months"] as const} />}
          {tab === "budget" && <Segmented label="" value={budget} onChange={setBudget} options={["This month", "Year end"] as const} />}
          {picker && <PropertySelect value={id} all={!one} onChange={setProp} />}
        </>
      }
    >
      {tab === "t12" && (id === ALL ? <PortfolioT12 key={view} months={view === "Months"} onPick={setProp} /> : <Statement id={id} months={view === "Months"} />)}
      {tab === "budget" && (budget === "Year end" ? <Reforecast /> : id === ALL ? <PortfolioVariance onPick={setProp} /> : <Variance id={id} />)}
      {tab === "balance" && <Balance id={id} />}
      {tab === "gl" && <Gl id={id} />}
      {tab === "cash" && <Cash />}
      {tab === "ar" && <Ar />}
      {tab === "ap" && <Ap />}
    </Page>
  );
}

function PropertySelect({ value, all, onChange }: { value: string; all: boolean; onChange: (id: string) => void }) {
  const names = PROPERTIES.map((p) => p.name);
  return (
    <div className="w-44">
      <Select label="Property" value={value === ALL ? "All properties" : property(value)!.name} onChange={(n) => onChange(PROPERTIES.find((p) => p.name === n)?.id ?? ALL)} options={all ? ["All properties", ...names] : names} />
    </div>
  );
}

const N = (label: string): Column => ({ label, num: true });
const columns = (first: string, months: boolean, extra: string[] = [], total = "T-12"): Column[] => (months ? [first, ...MONTHS.map(N), N(total), N("vs budget")] : [first, ...extra.map(N), N(total), { label: "Last 12 months", num: true, sort: false }, N("vs budget")]);

/** Click a header: text sorts A–Z and numbers high to low first; click again to flip. Empty values sort last. */
function useSort<T>(key: (row: T, col: number) => string | number | null) {
  const [sort, setSort] = useState<Sort>(null);
  const onSort = (col: number) => setSort((s) => (s?.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: col === 0 ? "asc" : "desc" }));
  const apply = (rows: T[]) => {
    if (!sort) return rows;
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = key(a, sort.col);
      const y = key(b, sort.col);
      if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
      return (typeof x === "string" ? x.localeCompare(String(y)) : x - (y as number)) * sign;
    });
  };
  return { sort, onSort, apply };
}

const TD = "h-9 px-3 align-middle first:pl-4 last:pr-4";
const NUM = "num text-right whitespace-nowrap";

/** One statement row. Subtotals get a rule above; months stay muted so totals carry the weight. */
function Tr({ label, kind = "line", depth = 0, striped, open, onToggle, onClick, vals, extra = [], total, plan, good = "up", months }: { label: string; kind?: "line" | "subtotal" | "total"; depth?: number; striped?: boolean; open?: boolean; onToggle?: () => void; onClick?: () => void; vals: (number | null)[]; extra?: number[]; total: number; plan: number; good?: "up" | "down"; months: boolean }) {
  const strong = kind !== "line";
  const go = onClick ?? onToggle;
  return (
    <tr
      onClick={go}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn("group", strong && "border-t border-border", striped && "bg-fg/[0.02]", go && "cursor-pointer transition-colors duration-100 hover:bg-fg/[0.045] focus-visible:bg-fg/[0.04] focus-visible:outline-none")}
    >
      <td className={cn(TD, "whitespace-nowrap", depth ? "text-fg-2" : "text-fg", kind === "subtotal" && "font-medium", kind === "total" && "font-semibold")}>
        <span className={cn("flex items-center gap-1.5", depth > 0 && "pl-5")}>
          {onToggle ? (
            <button
              type="button"
              aria-expanded={open}
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className="flex cursor-pointer items-center gap-1.5"
            >
              <ChevronRight className={cn("size-3.5 text-fg-3 transition-transform duration-150", open && "rotate-90")} />
              {label}
            </button>
          ) : (
            <>
              <span className="w-3.5 shrink-0" />
              {onClick ? <span className="font-medium text-property underline decoration-property/50 decoration-dashed underline-offset-[3px] group-hover:decoration-property">{label}</span> : label}
            </>
          )}
        </span>
      </td>
      {months
        ? vals.map((v, i) => (
            <td key={i} className={cn(TD, NUM, "text-fg-2")}>
              {v === null ? <span className="text-fg-3">–</span> : fmt.usd(v)}
            </td>
          ))
        : extra.map((v, i) => (
            <td key={i} className={cn(TD, NUM, "text-fg-2")}>
              {fmt.usd(v)}
            </td>
          ))}
      <td className={cn(TD, NUM, depth ? "text-fg-2" : "text-fg", strong && "font-medium")}>{fmt.usd(total)}</td>
      {!months && (
        <td className={TD}>
          <div className="ml-auto w-24">
            <Sparkline data={vals.map((value) => ({ value }))} />
          </div>
        </td>
      )}
      <td className={cn(TD, NUM)}>
        <Delta value={total - plan} format={fmt.delta} good={good} />
      </td>
    </tr>
  );
}

type Key = Line | "Net rental income" | "Effective gross income" | "Operating expenses" | "Net operating income";
const RENT = REVENUE_LINES.filter((l) => l !== "Other income");
const STATEMENT: { key: Key; kind: "line" | "subtotal" | "total"; children?: readonly Line[] }[] = [
  { key: "Net rental income", kind: "line", children: RENT },
  { key: "Other income", kind: "line" },
  { key: "Effective gross income", kind: "subtotal" },
  { key: "Operating expenses", kind: "line", children: EXPENSE_LINES },
  { key: "Net operating income", kind: "total" },
];
const pick = (m: Month, k: Key) => (k === "Net rental income" ? RENT.reduce((s, l) => s + m.lines[l], 0) : k === "Effective gross income" ? m.egi : k === "Operating expenses" ? m.opex : k === "Net operating income" ? m.noi : m.lines[k]);
const isExpense = (k: Key) => k === "Operating expenses" || (EXPENSE_LINES as readonly string[]).includes(k);

/** One property's T-12, collapsed to five rows; the two sections open to their lines. */
function Statement({ id, months }: { id: string; months: boolean }) {
  const [open, setOpen] = useState<Key[]>([]);
  const actual = periodTotal(id, "T-12")!;
  const plan = periodTotal(id, "T-12", "Budget")!;
  const row = (k: Key, kind: "line" | "subtotal" | "total", depth: number, toggle: boolean) => (
    <Tr
      key={k}
      label={k}
      kind={kind}
      depth={depth}
      open={toggle ? open.includes(k) : undefined}
      onToggle={toggle ? () => setOpen((o) => (o.includes(k) ? o.filter((x) => x !== k) : [...o, k])) : undefined}
      vals={MS.map((m) => (reported(id, m) ? pick(month(id, m), k) : null))}
      total={pick(actual, k)}
      plan={pick(plan, k)}
      good={isExpense(k) ? "down" : "up"}
      months={months}
    />
  );
  return <Table columns={columns("Line", months)}>{STATEMENT.flatMap((s) => [row(s.key, s.kind, 0, !!s.children), ...(s.children && open.includes(s.key) ? s.children.map((c) => row(c, "line", 1, false)) : [])])}</Table>;
}

/** NOI by property. A month reads blank for the portfolio until every property has reported it. */
function PortfolioT12({ months, onPick }: { months: boolean; onPick: (id: string) => void }) {
  const rows = IDS.map((id) => ({ id, vals: MS.map((m) => (reported(id, m) ? month(id, m).noi : null)), a: periodTotal(id, "T-12")!, b: periodTotal(id, "T-12", "Budget")! }));
  const a = portfolioTotal(IDS, "T-12");
  const b = portfolioTotal(IDS, "T-12", "Budget");
  const vals = MS.map((m) => (rows.every((r) => r.vals[m] !== null) ? rows.reduce((s, r) => s + r.vals[m]!, 0) : null));
  const { sort, onSort, apply } = useSort<(typeof rows)[number]>((r, c) => {
    if (c === 0) return property(r.id)!.name;
    const cols = months ? [...r.vals, r.a.noi, r.a.noi - r.b.noi] : [r.a.egi, r.a.opex, r.a.noi, null, r.a.noi - r.b.noi];
    return cols[c - 1];
  });
  return (
    <Table columns={columns("Property", months, ["EGI", "Operating expenses"], "NOI")} sort={sort} onSort={onSort}>
      {apply(rows).map((r, i) => (
        <Tr key={r.id} striped={i % 2 === 1} label={property(r.id)!.name} onClick={() => onPick(r.id)} vals={r.vals} extra={[r.a.egi, r.a.opex]} total={r.a.noi} plan={r.b.noi} months={months} />
      ))}
      <Tr label="Portfolio" kind="total" vals={vals} extra={[a.egi, a.opex]} total={a.noi} plan={b.noi} months={months} />
    </Table>
  );
}

/** November NOI against budget by property; open one for its line-by-line variance. */
function PortfolioVariance({ onPick }: { onPick: (id: string) => void }) {
  const rows = IDS.map((id) => ({ id, a: reported(id, LAST) ? month(id, LAST).noi : null, b: month(id, LAST, "Budget").noi }));
  const got = rows.filter((r) => r.a !== null);
  const a = got.reduce((s, r) => s + r.a!, 0);
  const b = got.reduce((s, r) => s + r.b, 0);
  const { sort, onSort, apply } = useSort<(typeof rows)[number]>((r, c) => (c === 0 ? property(r.id)!.name : r.a === null ? null : [r.a, r.b, r.a - r.b, r.a / r.b - 1][c - 1]));
  const cells = (actual: number, plan: number) => (
    <>
      <td className={cn(TD, NUM, "text-fg")}>{fmt.usd(actual)}</td>
      <td className={cn(TD, NUM, "text-fg-2")}>{fmt.usd(plan)}</td>
      <td className={cn(TD, NUM)}>
        <Delta value={actual - plan} format={fmt.delta} />
      </td>
      <td className={cn(TD, NUM)}>
        <Delta value={actual / plan - 1} format={fmt.signedPct} />
      </td>
    </>
  );
  return (
    <Table columns={[`Property · ${MONTH_LONG[LAST]} NOI`, N("Actual"), N("Budget"), N("$ variance"), N("% variance")]} sort={sort} onSort={onSort}>
      {apply(rows).map((r, i) => (
        <tr key={r.id} onClick={() => onPick(r.id)} onKeyDown={(e) => e.key === "Enter" && onPick(r.id)} tabIndex={0} className={cn("group cursor-pointer transition-colors duration-100 hover:bg-fg/[0.045] focus-visible:bg-fg/[0.04] focus-visible:outline-none", i % 2 === 1 && "bg-fg/[0.02]")}>
          <td className={cn(TD, "font-medium text-property underline decoration-property/50 decoration-dashed underline-offset-[3px] group-hover:decoration-property")}>{property(r.id)!.name}</td>
          {r.a === null ? (
            <td colSpan={4} className={cn(TD, "text-right text-fg-3")}>
              Not received
            </td>
          ) : (
            cells(r.a, r.b)
          )}
        </tr>
      ))}
      <tr className="border-t border-border font-semibold">
        <td className={cn(TD, "text-fg")}>Portfolio</td>
        {cells(a, b)}
      </tr>
    </Table>
  );
}
