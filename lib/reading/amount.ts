/**
 * An amount as property management systems write it: 1234.5, "1,234.50", "$1,234", "(1,234.56)",
 * "-1,234.56", "1,234.56-", "($1,234)". Null when the cell isn't an amount (blank, text, a percent).
 */
export function parseAmount(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  let s = value.trim();
  if (!s || s.includes("%")) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1).trim();
  }
  if (s.endsWith("-")) {
    negative = !negative;
    s = s.slice(0, -1).trim();
  }
  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1).trim();
  }
  s = s.replace(/^\$\s*/, "").replace(/,/g, "");
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(s)) return null;
  const n = Number(s);
  return negative ? -n : n;
}

/** Cents-level equality, with room for rounding (a T-12 in $000s rounds each cell on its own). */
export const near = (a: number, b: number, tolerance = 0.01) => Math.abs(a - b) <= tolerance;
