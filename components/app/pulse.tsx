import { reportTypeLabel } from "@/lib/uploads/report-types";
import { dateLabel } from "@/lib/workspace/format";
import { PULSE } from "@/lib/workspace/pulse";
import type { Upload } from "@/lib/workspace/queries";

/** Short names for the reports Pulse reads, for the line under each tile. */
const SHORT: Record<string, string> = {
  leasing_activity: "leasing activity",
  renewals: "renewal",
  ar_aging: "AR aging",
  work_orders: "work order",
  make_ready: "make-ready",
  box_score: "box score",
};

/**
 * Brian's five numbers. `latest` is the newest upload of each feeding report type (per property).
 * `properties` is how many active properties are in scope (1 on a property page). Values show once
 * reports are read; until then each tile says what arrived and when, or what it's waiting for.
 */
export function Pulse({ latest, properties }: { latest: Upload[]; properties: number }) {
  return (
    <section aria-label="Pulse" className="flex flex-col gap-2">
      <h2 className="text-[13px] font-semibold text-fg">Pulse</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {PULSE.map((tile) => {
          const arrived = latest.filter((u) => (tile.reports as readonly string[]).includes(u.report_type));
          const newest = arrived[0];
          const covered = new Set(arrived.map((u) => u.property_id)).size;
          const name = SHORT[tile.reports[0]] ?? reportTypeLabel(tile.reports[0]);
          const status = !newest
            ? `Waiting for ${/^[aeiou]/i.test(name) ? "an" : "a"} ${name} report`
            : properties > 1
              ? `${covered} of ${properties} properties · latest ${dateLabel(newest.created_at)}`
              : `${SHORT[newest.report_type] ?? reportTypeLabel(newest.report_type)} received ${dateLabel(newest.created_at)}`;
          return (
            <div key={tile.id} className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-surface px-4 py-3.5">
              <span className="eyebrow truncate">{tile.label}</span>
              <dl className="flex flex-col gap-1.5">
                {tile.parts.map((part) => (
                  <div key={part} className="flex items-baseline justify-between gap-2 text-xs">
                    <dt className="truncate text-fg-2">{part}</dt>
                    <dd className="num text-fg-3">—</dd>
                  </div>
                ))}
              </dl>
              <span className="mt-auto truncate text-[11px] text-fg-3" title={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
