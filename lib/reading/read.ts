import type Anthropic from "@anthropic-ai/sdk";
import { near, parseAmount } from "./amount";
import { cellAt, openWorkbook } from "./grid";
import { readLayout, type Layout } from "./layout";

/**
 * Reads one report: opens the file, asks Claude for its layout, then takes every amount from the
 * cells the layout points at and checks that the report agrees with itself.
 */

export interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

export interface Figures {
  totalIncome: number | null;
  totalExpenses: number | null;
  noi: number | null;
}

export interface Reading {
  layout: Layout;
  /** Amounts for the report's month (a T-12's latest month), in dollars. */
  figures: Figures;
  /** Every row with amounts, for the report's month: what the reviewer sees and can re-map. */
  lines: { row: number; label: string; kind: string; section: string; account: string; confidence: string; amount: number | null }[];
  /** Operating lines summed by owner account, for the report's month. */
  accounts: Record<string, number>;
  aging: { total: number | null; owed: number | null; buckets: { label: string; amount: number | null }[] } | null;
  checks: Check[];
  /** Labels Claude wasn't sure how to map. */
  unsure: { row: number; label: string; account: string }[];
  usage: Anthropic.Usage;
  ms: number;
}

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export async function readReport(client: Anthropic, fileName: string, bytes: Uint8Array): Promise<Reading> {
  const started = Date.now();
  const sheets = openWorkbook(bytes);
  const { layout, usage } = await readLayout(client, fileName, sheets);
  const sheet = sheets.find((s) => s.name === layout.sheet) ?? sheets[0];
  const scale = layout.scale === "thousands" ? 1000 : 1;
  const amount = (row: number, column: string) => {
    const cell = cellAt(sheet, row, column);
    const n = parseAmount(typeof cell?.value === "number" ? cell.value : cell?.text);
    return n === null ? null : n * scale;
  };

  const labelOf = (row: number) => (layout.label_column ? (cellAt(sheet, row, layout.label_column)?.text.trim() ?? "") : "") || `Row ${row}`;
  const checks: Check[] = [];
  const monthColumns = layout.columns.filter((c) => c.period && (c.meaning === "actual" || layout.report_type === "t12"));
  const current = monthColumns.find((c) => c.period === layout.period) ?? layout.columns.find((c) => c.meaning === "actual") ?? null;

  // Totals that are plain sums: check them in the report's month (and a T-12's total column).
  const tolerance = (n: number) => (scale === 1000 ? 50 * (n + 1) : 0.015);
  const sumColumns = [current, layout.report_type === "t12" ? layout.columns.find((c) => c.meaning === "total") : undefined].filter((c): c is NonNullable<typeof c> => Boolean(c));
  for (const col of sumColumns) {
    // A subtotal inside a total counts at what its own lines add to, so one broken subtotal is one flag.
    const lineOf = new Map(layout.lines.map((l) => [l.row, l]));
    // Returns the sum and how many lines went into it (each rounded line adds to the rounding allowance).
    const computed = (row: number, seen = new Set<number>()): { sum: number; lines: number } => {
      const line = lineOf.get(row);
      if (!line || line.kind === "line" || !line.children.length || seen.has(row)) return { sum: amount(row, col.column) ?? 0, lines: 1 };
      seen.add(row);
      return line.children.reduce((acc, r) => {
        const part = computed(Math.abs(r), seen);
        return { sum: acc.sum + part.sum * Math.sign(r), lines: acc.lines + part.lines };
      }, { sum: 0, lines: 0 });
    };
    for (const line of layout.lines) {
      if (line.kind === "line" || !line.children.length) continue;
      const shown = amount(line.row, col.column);
      if (shown === null) continue;
      const { sum, lines } = line.children.reduce((acc, r) => {
        const part = computed(Math.abs(r));
        return { sum: acc.sum + part.sum * Math.sign(r), lines: acc.lines + part.lines };
      }, { sum: 0, lines: 0 });
      const ok = near(shown, sum, tolerance(lines));
      if (!ok) checks.push({ name: `${labelOf(line.row)} adds up`, ok, detail: `Shows ${usd(shown)}, its lines add to ${usd(sum)} (${col.period ?? col.meaning}, row ${line.row})` });
    }
  }

  const byRole = (role: Layout["lines"][number]["role"]) => {
    const line = layout.lines.find((l) => l.role === role);
    return line && current ? amount(line.row, current.column) : null;
  };
  const figures: Figures = { totalIncome: byRole("total_income"), totalExpenses: byRole("total_expenses"), noi: byRole("noi") };
  if (figures.totalExpenses !== null) figures.totalExpenses = Math.abs(figures.totalExpenses);
  if (figures.totalIncome !== null && figures.totalExpenses !== null && figures.noi !== null) {
    const expected = figures.totalIncome - figures.totalExpenses;
    const ok = near(figures.noi, expected, tolerance(2));
    checks.push({ name: "NOI = income − expenses", ok, detail: ok ? usd(figures.noi) : `Report shows NOI ${usd(figures.noi)}; income − expenses is ${usd(expected)}` });
    // Trust the arithmetic over a broken NOI line.
    if (!ok) figures.noi = expected;
  }

  if (layout.report_type === "t12") {
    const months = [...new Set(monthColumns.map((c) => c.period!))].sort();
    const ok = months.length === 12 && consecutive(months) && months.at(-1) === layout.period;
    checks.push({ name: "Twelve consecutive months", ok, detail: `${months.length} months, ${months[0] ?? "?"} to ${months.at(-1) ?? "?"}` });
  }

  const accounts: Record<string, number> = {};
  if (current) {
    for (const line of layout.lines) {
      if (line.kind !== "line" || line.account === "none") continue;
      accounts[line.account] = (accounts[line.account] ?? 0) + (amount(line.row, current.column) ?? 0);
    }
  }

  return {
    layout,
    figures,
    lines: layout.lines.map((l) => ({ row: l.row, label: labelOf(l.row), kind: l.kind, section: l.section, account: l.account, confidence: l.confidence, amount: current ? amount(l.row, current.column) : null })),
    accounts,
    aging: layout.aging ? readAging(layout.aging, amount, checks) : null,
    checks,
    unsure: layout.lines.filter((l) => l.kind === "line" && l.confidence === "low").map((l) => ({ row: l.row, label: labelOf(l.row), account: l.account })),
    usage,
    ms: Date.now() - started,
  };
}

function consecutive(months: string[]) {
  return months.every((m, i) => {
    if (!i) return true;
    const [y, mo] = months[i - 1].split("-").map(Number);
    const next = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
    return m === next;
  });
}

/** The AR total, what's actually owed (positive balances, prepaids not netted), and the buckets. */
function readAging(aging: NonNullable<Layout["aging"]>, amount: (row: number, column: string) => number | null, checks: Check[]) {
  const total = aging.total_row && aging.total_column ? amount(aging.total_row, aging.total_column) : null;
  let owed: number | null = null;
  if (aging.first_detail_row && aging.last_detail_row && aging.total_column) {
    owed = 0;
    for (let r = aging.first_detail_row; r <= aging.last_detail_row; r++) {
      if (aging.skip_rows.includes(r)) continue;
      const n = amount(r, aging.total_column);
      if (n !== null && n > 0) owed += n;
    }
  }
  const buckets = aging.buckets.map((b) => ({ label: b.label, amount: aging.total_row ? amount(aging.total_row, b.column) : null }));
  if (total !== null && buckets.length && buckets.every((b) => b.amount !== null)) {
    const sum = buckets.reduce((s, b) => s + (b.amount ?? 0), 0);
    const ok = near(total, sum, 0.015);
    checks.push({ name: "Aging buckets add up", ok, detail: ok ? usd(total) : `Total ${usd(total)}, buckets add to ${usd(sum)}` });
  }
  if (total !== null && owed !== null && !aging.prepaids_netted) {
    const ok = near(total, owed, 0.015);
    if (!ok) checks.push({ name: "Total matches the balances listed", ok, detail: `Total ${usd(total)}, positive balances add to ${usd(owed)}` });
  }
  return { total, owed, buckets };
}
