import type { ISODate, MonthKey, Period } from "@/lib/types";

/**
 * The demo runs on a fixed clock so the seeded story stays coherent and
 * server and client renders agree. Swap for `new Date()` with real data.
 */
export const TODAY: ISODate = "2026-10-18";
export const LATEST_MONTH: MonthKey = "2026-09";
export const HISTORY_MONTHS = 24;

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function parseMonth(key: MonthKey): { year: number; month: number } {
  const [y, m] = key.split("-").map(Number);
  return { year: y, month: m };
}

export function monthKey(year: number, month: number): MonthKey {
  const d = new Date(Date.UTC(year, month - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function addMonths(key: MonthKey, delta: number): MonthKey {
  const { year, month } = parseMonth(key);
  return monthKey(year, month + delta);
}

export function compareMonths(a: MonthKey, b: MonthKey): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Inclusive list of months from `from` to `to`. */
export function monthRange(from: MonthKey, to: MonthKey): MonthKey[] {
  const out: MonthKey[] = [];
  for (let k = from; compareMonths(k, to) <= 0; k = addMonths(k, 1)) out.push(k);
  return out;
}

export const ALL_MONTHS: MonthKey[] = monthRange(addMonths(LATEST_MONTH, -(HISTORY_MONTHS - 1)), LATEST_MONTH);

export function monthEnd(key: MonthKey): ISODate {
  const { year, month } = parseMonth(key);
  const d = new Date(Date.UTC(year, month, 0));
  return d.toISOString().slice(0, 10);
}

export function monthOf(date: ISODate): MonthKey {
  return date.slice(0, 7);
}

export function formatMonth(key: MonthKey, style: "short" | "long" | "tiny" = "short"): string {
  const { year, month } = parseMonth(key);
  if (style === "tiny") return MONTH_SHORT[month - 1];
  if (style === "long") return `${MONTH_LONG[month - 1]} ${year}`;
  return `${MONTH_SHORT[month - 1]} ${year}`;
}

/** "Sep 30" or "Sep 30, 2026". */
export function formatDate(date: ISODate, withYear = false): string {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  const base = `${MONTH_SHORT[m - 1]} ${d}`;
  return withYear ? `${base}, ${y}` : base;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = formatDate(iso.slice(0, 10));
  const h = d.getUTCHours();
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${date}, ${h12}:${min}${suffix}`;
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

export function addDays(date: ISODate, days: number): ISODate {
  return new Date(Date.parse(date) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Relative wording against the demo clock: "today", "3 days ago", "Sep 30". */
export function formatRelative(iso: string): string {
  const days = daysBetween(iso.slice(0, 10), TODAY);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(iso.slice(0, 10), !iso.startsWith(TODAY.slice(0, 4)));
}

export const PERIODS: { id: Period; label: string; long: string }[] = [
  { id: "mtd", label: "MTD", long: "Month to date" },
  { id: "qtd", label: "QTD", long: "Quarter to date" },
  { id: "ytd", label: "YTD", long: "Year to date" },
  { id: "t12", label: "T12", long: "Trailing 12 months" },
];

/** Months covered by a period ending at `asOf`. */
export function periodMonths(period: Period, asOf: MonthKey = LATEST_MONTH): MonthKey[] {
  const { year, month } = parseMonth(asOf);
  switch (period) {
    case "mtd":
      return [asOf];
    case "qtd":
      return monthRange(monthKey(year, month - ((month - 1) % 3)), asOf);
    case "ytd":
      return monthRange(monthKey(year, 1), asOf);
    case "t12":
      return monthRange(addMonths(asOf, -11), asOf);
  }
}

export function periodLabel(period: Period, asOf: MonthKey = LATEST_MONTH): string {
  const { year, month } = parseMonth(asOf);
  switch (period) {
    case "mtd":
      return formatMonth(asOf, "long");
    case "qtd":
      return `Q${Math.ceil(month / 3)} ${year} to date`;
    case "ytd":
      return `${year} year to date`;
    case "t12": {
      const months = periodMonths("t12", asOf);
      return `${formatMonth(months[0])} – ${formatMonth(asOf)}`;
    }
  }
}

/** Phrase used inside sentences: "this quarter", "year to date". */
export function periodPhrase(period: Period): string {
  return { mtd: `in ${MONTH_LONG[parseMonth(LATEST_MONTH).month - 1]}`, qtd: "this quarter", ytd: "year to date", t12: "over the trailing 12 months" }[period];
}
