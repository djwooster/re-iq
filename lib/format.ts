/** Abbreviated currency for summaries: $8.42M, -$290K, $4.8K, $640. */
export function formatCurrencyShort(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${Math.round(abs)}`;
}

/** Full currency for tables: $1,284,310 or -$12,040. */
export function formatCurrency(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.round(Math.abs(value)).toLocaleString("en-US")}`;
}

/** Signed variance in abbreviated form: +$120K, -$290K. */
export function formatVarianceShort(value: number): string {
  if (Math.round(value) === 0) return "$0";
  return value > 0 ? `+${formatCurrencyShort(value)}` : formatCurrencyShort(value);
}

export function formatVariance(value: number): string {
  if (Math.round(value) === 0) return "$0";
  return value > 0 ? `+${formatCurrency(value)}` : formatCurrency(value);
}

/** Ratio (0.934) as a percentage with one decimal: 93.4%. */
export function formatPercent(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** Signed percentage-point change: +1.2 pts. */
export function formatPoints(delta: number): string {
  const pts = delta * 100;
  const s = Math.abs(pts).toFixed(1);
  if (s === "0.0") return "0.0 pts";
  return `${pts > 0 ? "+" : "-"}${s} pts`;
}

export function formatSignedPercent(ratio: number): string {
  const s = Math.abs(ratio * 100).toFixed(1);
  if (s === "0.0") return "0.0%";
  return `${ratio > 0 ? "+" : "-"}${s}%`;
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1_000))} KB`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
