/**
 * Report-reading test bench. Reads a handful of the fictional sample reports and scores the result
 * against the sample set's answer key (figures from its README and answer-key.csv).
 *
 *   npx tsx --env-file=.env.local scripts/read-bench.ts <sample folder> [--out results.json]
 *
 * Calls the Anthropic API once per file (all files at once).
 */
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { readReport, type Reading } from "../lib/reading/read";

interface Expected {
  type: string;
  period: string;
  income?: number;
  expenses?: number;
  noi?: number;
  owed?: number;
  /** Checks that should fail (a planted problem), by name prefix. */
  flags?: string[];
  /** Allowed difference in dollars (a T-12 in $000s rounds each cell). */
  tolerance?: number;
}

const CASES: Record<string, Expected> = {
  "Cedar Ridge Income Statement - 10.2026.xlsx": { type: "income_statement", period: "2026-10", income: 280041.88, expenses: 115389.3, noi: 164652.58 },
  "PTL_IncomeStatement_Oct26_REVISED.xlsx": { type: "income_statement", period: "2026-10", income: 350438.12, expenses: 149132.67, noi: 201305.45 },
  "BV_Income_Statement_Oct26.xlsx": { type: "income_statement", period: "2026-10", income: 425038.46, expenses: 202133.15, noi: 222905.31, flags: ["NOI"] },
  "PTL_T12_Oct26.xlsx": { type: "t12", period: "2026-10", income: 350438.12, expenses: 149132.67, noi: 201305.45, tolerance: 100 },
  "Lofts_T12_Oct2026.xlsx": { type: "t12", period: "2026-10", income: 181113.49, expenses: 75988.26, noi: 105125.23, flags: ["Twelve"] },
  "WCC_T12_Oct2026.xlsx": { type: "t12", period: "2026-10", income: 185171.16, expenses: 93516.8, noi: 91654.36, flags: ["Total Utilities"] },
  "CedarRidge_Aging_Oct26.csv": { type: "ar_aging", period: "2026-10", owed: 25069.33 },
};

const folder = process.argv[2];
const outAt = process.argv.indexOf("--out");
if (!folder) throw new Error("Pass the sample folder.");
const client = new Anthropic();

const fmt = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: 2 }));
const mark = (ok: boolean) => (ok ? "✓" : "✗");

async function main() {
const results = await Promise.all(
  Object.entries(CASES).map(async ([file, want]) => {
    try {
      return { file, want, reading: await readReport(client, file, new Uint8Array(fs.readFileSync(path.join(folder, file)))) };
    } catch (e) {
      return { file, want, error: String(e) };
    }
  }),
);

let passed = 0;
let inputTokens = 0;
let outputTokens = 0;
for (const r of results) {
  console.log(`\n${r.file}`);
  if ("error" in r) {
    console.log(`  ✗ failed: ${r.error}`);
    continue;
  }
  const { layout, figures, aging, checks, unsure, usage, ms } = r.reading as Reading;
  const want = r.want;
  inputTokens += usage.input_tokens;
  outputTokens += usage.output_tokens;
  const tol = want.tolerance ?? 0.015;
  const results: boolean[] = [];
  const compare = (label: string, got: number | null | undefined, expected: number | undefined) => {
    if (expected === undefined) return;
    const ok = got != null && Math.abs(got - expected) <= tol;
    results.push(ok);
    console.log(`  ${mark(ok)} ${label}: ${fmt(got)}${ok ? "" : ` (expected ${fmt(expected)})`}`);
  };
  const typeOk = layout.report_type === want.type && layout.period === want.period;
  results.push(typeOk);
  console.log(`  ${mark(typeOk)} ${layout.report_type}, ${layout.period}, "${layout.property_name}", sheet "${layout.sheet}", ${layout.scale}  ·  ${(ms / 1000).toFixed(1)}s, ${usage.input_tokens}→${usage.output_tokens} tokens`);
  compare("Total income", figures.totalIncome, want.income);
  compare("Total expenses", figures.totalExpenses, want.expenses);
  compare("NOI", figures.noi, want.noi);
  compare("Owed (AR)", aging?.owed ?? aging?.total, want.owed);
  const failing = checks.filter((c) => !c.ok);
  for (const flag of want.flags ?? []) {
    const ok = failing.some((c) => c.name.startsWith(flag));
    results.push(ok);
    console.log(`  ${mark(ok)} flags "${flag}…"`);
  }
  const unexpected = failing.filter((c) => !(want.flags ?? []).some((f) => c.name.startsWith(f)));
  if (unexpected.length) results.push(false);
  for (const c of unexpected) console.log(`  ✗ unexpected flag: ${c.name}: ${c.detail}`);
  for (const c of failing.filter((c) => !unexpected.includes(c))) console.log(`      ${c.detail}`);
  if (unsure.length) console.log(`  ? ${unsure.length} labels to confirm: ${unsure.map((u) => `${u.label} → ${u.account}`).join("; ")}`);
  for (const n of layout.notes) console.log(`  · ${n}`);
  if (results.every(Boolean)) passed++;
}

// Sonnet 5.5: $2 per million input tokens, $10 per million output tokens.
const cost = (inputTokens * 2 + outputTokens * 10) / 1_000_000;
console.log(`\n${passed} of ${results.length} files fully right · ${inputTokens} input + ${outputTokens} output tokens ≈ $${cost.toFixed(2)}`);
if (outAt > 0) fs.writeFileSync(process.argv[outAt + 1], JSON.stringify(results, null, 2));
}

void main();
