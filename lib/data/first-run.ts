import { LATEST_MONTH, periodMonths } from "@/lib/dates";
import type { AccountMapping, GlCategory, MonthKey } from "@/lib/types";
import { ALL_CATEGORIES, delay, isRevenue } from "./core";
import type { UploadDraft } from "./imports";
import { t12Lines } from "./lineage";
import { ORG_ID } from "./mock/catalog";

/**
 * The first-run demo: whatever file someone picks is read as Northgate's
 * November T12 for Brookstone Park, so the first thing a new user sees is a
 * messy manager report turned into a clean, standard statement.
 */

export const FIRST_RUN = {
  property_id: "prop_brookstone",
  file_name: "Brookstone_T12_Nov2026.xlsx",
  period: LATEST_MONTH,
};

/** Lines RE-IQ is unsure about in this file, with the account it would pick. */
const UNSURE: Record<string, number> = { "4890-0000": 0.62, "7150-0000": 0.66 };

export const FIRST_RUN_STEPS = ["Reading", "Matching accounts", "Checking totals"] as const;

export async function readFirstReport(onStep: (step: number, detail: string) => void): Promise<UploadDraft> {
  const lines = t12Lines(FIRST_RUN.property_id, FIRST_RUN.period);
  const months = periodMonths("t12", FIRST_RUN.period).length;
  onStep(0, `Reading ${lines.length * months} amounts on ${lines.length} lines…`);
  await delay(1_100);
  onStep(1, `Matching ${lines.length} accounts to the standard chart…`);
  await delay(1_200);
  onStep(2, "Checking totals against the statement…");
  await delay(900);
  const id = `draft_first_${Date.now().toString(36)}`;
  const mappings: (AccountMapping & { alternatives: [] })[] = lines.map((l, i) => ({
    id: `${id}_m${i}`,
    org_id: ORG_ID,
    import_id: id,
    source_label: l.label,
    source_code: l.code,
    amount: l.total,
    target: l.category,
    confidence: UNSURE[l.code] ?? 0.9 + ((i * 7) % 9) / 100,
    confirmed_by_user: false,
    alternatives: [],
  }));
  return {
    id,
    file_name: FIRST_RUN.file_name,
    file_format: "xlsx",
    file_size: 142_000,
    report_type: "t12",
    property_id: FIRST_RUN.property_id,
    period: FIRST_RUN.period,
    detected_source_format: "yardi",
    needs_input: false,
    mappings,
    row_count: lines.length,
  };
}

export interface StandardRow {
  category: GlCategory;
  amounts: Record<MonthKey, number>;
  total: number;
  /** The manager's lines that make up this row. */
  sources: { code: string; label: string; total: number }[];
}

export interface StandardStatement {
  months: MonthKey[];
  revenue: StandardRow[];
  expenses: StandardRow[];
  totals: { revenue: Record<MonthKey, number>; expenses: Record<MonthKey, number>; noi: Record<MonthKey, number> };
}

/** A manager's T12 restated in the standard chart of accounts, each row traceable to the lines behind it. */
export async function getStandardStatement(propertyId: string, through: MonthKey = LATEST_MONTH, mappings?: AccountMapping[]): Promise<StandardStatement> {
  await delay();
  const months = periodMonths("t12", through);
  const lines = t12Lines(propertyId, through);
  const targetOf = (code: string, fallback: GlCategory) => (mappings?.find((m) => m.source_code === code)?.target as GlCategory | "ignore" | undefined) ?? fallback;
  const rows = ALL_CATEGORIES.map((category): StandardRow => {
    const mine = lines.filter((l) => targetOf(l.code, l.category) === category);
    const amounts = Object.fromEntries(months.map((m) => [m, mine.reduce((s, l) => s + (l.amounts[m] ?? 0), 0)]));
    return { category, amounts, total: mine.reduce((s, l) => s + l.total, 0), sources: mine.map((l) => ({ code: l.code, label: l.label, total: l.total })) };
  }).filter((r) => r.sources.length);
  const sum = (list: StandardRow[]) => Object.fromEntries(months.map((m) => [m, list.reduce((s, r) => s + r.amounts[m], 0)]));
  const revenue = rows.filter((r) => isRevenue(r.category));
  const expenses = rows.filter((r) => !isRevenue(r.category));
  const rev = sum(revenue);
  const exp = sum(expenses);
  return { months, revenue, expenses, totals: { revenue: rev, expenses: exp, noi: Object.fromEntries(months.map((m) => [m, rev[m] - exp[m]])) } };
}
