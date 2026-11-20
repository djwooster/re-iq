/**
 * Reading a dropped file's name: which property it's for and which report it is. The frozen
 * `/prototype` re-exports these from its seed.
 */

/** The monthly package, as setup's checklist columns, with the report type each is stored as. */
export const PACKAGE = ["P&L", "T-12", "Rent roll", "Box score", "AR aging", "Capex", "Renovation tracker", "GL"] as const;
export type ReportKind = (typeof PACKAGE)[number] | "Other";

export const REPORT_TYPE: Record<ReportKind, string> = {
  "P&L": "income_statement",
  "T-12": "t12",
  "Rent roll": "rent_roll",
  "Box score": "box_score",
  "AR aging": "ar_aging",
  Capex: "capex",
  "Renovation tracker": "renovation_tracker",
  GL: "general_ledger",
  Other: "other",
};

/** A file name as words: "PeachtreeLanding_RentRoll_Nov26.xlsx" → "Peachtree Landing Rent Roll Nov26". */
export const fileWords = (file: string) =>
  file
    .replace(/\.[^.]+$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/[_–]+|\s+-\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** A first guess at what a file is, from its name. The user can change it. */
export function detectKind(file: string): ReportKind {
  const f = fileWords(file).toLowerCase();
  if (/rent ?roll|\brr\b/.test(f)) return "Rent roll";
  if (/\bt ?-?12\b|twelve|trailing/.test(f)) return "T-12";
  if (/\bp ?& ?l\b|\bpl\b|pnl|income|profit|operating statement/.test(f)) return "P&L";
  if (/\bbox/.test(f)) return "Box score";
  if (/aging|delinq|receivable|\bar\b/.test(f)) return "AR aging";
  if (/reno|interior|unit upgrade/.test(f)) return "Renovation tracker";
  if (/capex|capital/.test(f)) return "Capex";
  if (/\bgl\b|ledger|general/.test(f)) return "GL";
  return "Other";
}

const NOT_A_NAME = /\b(rent ?roll|rr|t ?-?12|twelve|trailing|p ?& ?l|pl|pnl|income|profit|operating|box|aging|delinq\w*|receivables?|ar|reno\w*|interior|capex|capital|gl|ledger|general|budget|report|statement|package|scan|img|document|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*|\d+)\b/i;

/** The property a file is for, from the words before the report name or date. Empty when there are none. */
export function guessProperty(file: string) {
  const words = fileWords(file);
  const at = words.search(NOT_A_NAME);
  return (at < 0 ? words : words.slice(0, at)).trim();
}
