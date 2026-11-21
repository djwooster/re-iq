import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CHART_OF_ACCOUNTS } from "../workspace/kpis";
import { renderSheet, type Sheet } from "./grid";

/**
 * Claude reads a report's layout: what the report is, which month and property, which sheet and
 * columns hold what, and what each row is (a line, a subtotal, a total) with its owner account.
 * It never supplies amounts; our code reads every number from the cells it points at.
 */

export const MODEL = "claude-sonnet-5-5";

const Column = z.object({
  column: z.string().describe("Excel column letter"),
  meaning: z.enum(["actual", "budget", "variance", "ytd_actual", "ytd_budget", "total", "other"]),
  period: z.string().nullable().describe("YYYY-MM the column covers, for a single month; null otherwise"),
});

const Line = z.object({
  row: z.number().describe("Excel row number"),
  kind: z.enum(["line", "subtotal", "total"]),
  section: z.enum(["income", "expense", "other"]).describe("other = below NOI or not operating (capex, debt service, depreciation)"),
  account: z.enum(["none", ...CHART_OF_ACCOUNTS]).describe("Owner account for a line; none for subtotals, totals and lines outside operations"),
  confidence: z.enum(["high", "low"]).describe("low when the label could reasonably map to another account"),
  role: z.enum(["total_income", "total_expenses", "noi", "none"]),
  children: z.array(z.number()).describe("For a subtotal or total that is a plain sum: the rows it adds, negative row number where a row is subtracted. Empty when it isn't a plain sum of rows shown."),
});

const Aging = z.object({
  total_row: z.number().nullable().describe("Row of the report's grand total"),
  total_column: z.string().nullable().describe("Column of each resident's total balance"),
  buckets: z.array(z.object({ column: z.string(), label: z.string() })).describe("Only the columns that age amounts owed (0-30, 31-60, ...), oldest last. Never a prepaid, credit or total column."),
  prepaid_column: z.string().nullable().describe("Column of prepaid (credit) balances, if the report shows them separately"),
  first_detail_row: z.number().nullable(),
  last_detail_row: z.number().nullable(),
  skip_rows: z.array(z.number()).describe("Rows between first and last detail row that are subtotals, headings or blank, not a resident or unit"),
  prepaids_netted: z.boolean().describe("True if the grand total nets prepaid (credit) balances against amounts owed"),
});

export const Layout = z.object({
  report_type: z.enum(["income_statement", "t12", "ar_aging", "other"]),
  property_name: z.string().nullable().describe("Property name as written in the file"),
  period: z.string().nullable().describe("YYYY-MM: the month the report is for (a T-12's latest month)"),
  sheet: z.string().describe("The sheet holding the report's detail"),
  scale: z.enum(["units", "thousands"]),
  label_column: z.string().nullable().describe("Column holding each row's label (account name)"),
  columns: z.array(Column),
  lines: z.array(Line).describe("Every row with a label and amounts, in order. Empty for an AR aging."),
  aging: Aging.nullable(),
  notes: z.array(z.string()).describe("Anything a reviewer should know: missing months, a label that doesn't match the content, a property or month that disagrees with the file name"),
});

export type Layout = z.infer<typeof Layout>;

const SYSTEM = `You read monthly reports that multifamily property managers send to owners, exported from systems like Yardi, Entrata, RealPage, AppFolio and ResMan. You are given a report's cells and describe its layout so code can read the numbers. Never compute or restate amounts; point at rows and columns.

Report types: income_statement (one month's P&L or budget comparison), t12 (twelve monthly columns plus a total), ar_aging (balances owed by resident or unit, in aging buckets), other.

The owner's chart of accounts: ${CHART_OF_ACCOUNTS.join(", ")}. Gross potential rent is market rent for every unit. Vacancy, Loss to lease, Concessions and Bad debt reduce it; non-revenue units (model, office, employee, down) count as Vacancy. Other income is everything else collected (fees, utility reimbursements, pet rent, parking). Expenses are operating only; capex, debt service, depreciation and owner costs are section "other" with account none.

Rules:
- Rows and columns are Excel's (row 1, column A). Use the numbers and letters shown.
- List every row that has a label and amounts, lines and totals alike. Headings with no amounts are left out.
- children lists what a subtotal or total adds, as rows. Use a negative row number for a row it subtracts (for example a vacancy shown as a positive number under rental income). Leave children empty when the total isn't a plain sum of rows shown (NOI computed as income minus expenses, for example); role identifies those.
- role: total_income for total revenue/income (all operating income), total_expenses for total operating expenses, noi for net operating income. Each at most once.
- For a T-12, list every month column with its period, and the total column.
- scale is thousands only if the report says amounts are in thousands ($000s).
- Read the month and property from the report's contents, not the file name, and note any disagreement with the file name.
- Note anything unusual a reviewer should check. Don't note things that are normal for the report type.`;

export async function readLayout(client: Anthropic, fileName: string, sheets: Sheet[]): Promise<{ layout: Layout; usage: Anthropic.Usage }> {
  const body = sheets.map((s) => `### Sheet "${s.name}"${s.hidden ? " (hidden)" : ""}\n${renderSheet(s)}`).join("\n\n");
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(Layout) },
    system: SYSTEM,
    messages: [{ role: "user", content: `File name: ${fileName}\n\n${body}` }],
  });
  if (response.stop_reason === "refusal") throw new Error("refused");
  if (!response.parsed_output) throw new Error(`no layout (${response.stop_reason})`);
  return { layout: response.parsed_output, usage: response.usage };
}
