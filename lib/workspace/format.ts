/** Labels for workspace dates and sizes. Plain functions, usable on the server and in the browser. */

/** "October 2026" for a period stored as 2026-10-01. */
export const monthLabel = (period: string) => new Date(`${period.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

export const dateLabel = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const sizeLabel = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/**
 * The month being closed: last calendar month, as `period` (YYYY-MM-01). Monthly packages for a month
 * arrive in the first weeks of the next one. Server-side, at request time.
 */
export function closePeriod(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return d.toISOString().slice(0, 10);
}

export const ROLE_LABELS: Record<"owner" | "member", string> = { owner: "Owner", member: "Member" };
