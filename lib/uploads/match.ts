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
  if (/\bp ?& ?l\b|\bpl\b|pnl|\bis\b|income|profit|operating statement/.test(f)) return "P&L";
  if (/\bbox|occupancy/.test(f)) return "Box score";
  if (/aging|delinq|receivable|\bar\b/.test(f)) return "AR aging";
  if (/reno|interior|unit upgrade/.test(f)) return "Renovation tracker";
  if (/capex|capital/.test(f)) return "Capex";
  if (/\bgl\b|ledger|general/.test(f)) return "GL";
  return "Other";
}

const NOT_A_NAME = /\b(rent ?roll|rr|t ?-?12|twelve|trailing|p ?& ?l|pl|pnl|is|income|profit|operating|box|occupancy|aging|aged|delinq\w*|receivables?|ar|reno\w*|interior|capex|capital|gl|ledger|general|budget|report|statement|package|scan|img|document|make ?ready|leasing|activity|traffic|renewals?|balance|sheet|work ?orders?|copy|revised|final|draft|detail|summary|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*|\d+)\b/i;

/** The property a file is for, from the words before the report name or date. Empty when there are none. */
export function guessProperty(file: string) {
  const words = fileWords(file);
  const at = words.search(NOT_A_NAME);
  return (at < 0 ? words : words.slice(0, at)).trim();
}

const FILLER = new Set(["the", "at", "of", "apartments", "apartment", "apts", "apt"]);
const words = (name: string) => name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w && !FILLER.has(w));

/** "PTL" for Peachtree Landing: the abbreviation starts with the words' initials, or its letters run through the name in order from its first letter and include every word's first letter. */
function abbreviates(abbr: string, name: string) {
  const a = abbr.toLowerCase();
  const ws = words(name);
  if (!/^[a-z]{2,5}$/.test(a) || ws.length < 2) return false;
  // The name may stop short of the abbreviation (WCC, "Willow Creek" for Willow Creek Commons).
  if (a.startsWith(ws.map((w) => w[0]).join(""))) return true;
  const letters = ws.join("");
  if (letters[0] !== a[0]) return false;
  let i = 0;
  for (const ch of letters) if (ch === a[i]) i++;
  return i === a.length && ws.every((w) => a.includes(w[0]));
}

/**
 * Whether two property names from file names are the same property: equal, one an abbreviation of
 * the other (CR, Cedar Ridge), or one's words all within the other's (Lofts, The Lofts at Millbrook).
 */
export function sameProperty(a: string, b: string) {
  const x = words(a);
  const y = words(b);
  if (!x.length || !y.length) return false;
  if (x.join(" ") === y.join(" ")) return true;
  if (x.length === 1 && abbreviates(x[0], b)) return true;
  if (y.length === 1 && abbreviates(y[0], a)) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.every((w) => long.includes(w));
}

/** The fuller of two names for the same property (more words wins; an abbreviation never does). */
export const fullerName = (a: string, b: string) => (words(b).length > words(a).length ? b : a);
