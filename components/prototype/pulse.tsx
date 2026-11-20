import { fmt } from "./metrics";
import { kpis, profile } from "./numbers";
import { TODAY, fmtDate } from "./seed";

/**
 * Pulse: the operating numbers a buyer asked to see as close to live as possible (Brian's list: traffic,
 * delinquency 30/60/90, open work orders, non-ready units, occupancy), from the PMS's daily or weekly
 * reports. Occupancy and renewals come from the property model; the rest are fixed sample figures.
 */

const hash = (id: string) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 9973, 7);

function pulse(id: string) {
  const units = profile(id).units;
  const k = kpis(id);
  const h = hash(id);
  const open = Math.round(units * 0.07) + (h % 5);
  return [
    { label: "Traffic", source: "Leasing activity", rows: [["Leads", String(Math.round(units * 0.12) + (h % 9))], ["Follow-up within 24h", fmt.pct(0.84 + (h % 12) / 100, 0)], ["Conversion", fmt.pct(0.12 + (h % 9) / 100, 0)], ["Renewals", fmt.pct(k.retention, 0)]] },
    { label: "Delinquency", source: "AR aging", rows: [["30 days", fmt.usd(units * (38 + (h % 30)))], ["60 days", fmt.usd(units * (11 + (h % 10)))], ["90+ days", fmt.usd(units * (5 + (h % 8)))]] },
    { label: "Open work orders", source: "Work orders", rows: [["Open", String(open)], ["Over 7 days", String(Math.round(open * 0.25))]] },
    { label: "Non-ready units", source: "Make-ready", rows: [["Vacant not ready", String(1 + (h % 4))]] },
    { label: "Occupancy", source: "Box score", rows: [["Physical", fmt.pct(k.occupancy)], ["Economic", fmt.pct(k.economic)]] },
  ];
}

/** Daily and weekly reports land the morning after: as of yesterday on the demo clock. */
const AS_OF = fmtDate(new Date(new Date(`${TODAY}T12:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10));

export function Pulse({ id }: { id: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {pulse(id).map((tile) => (
        <div key={tile.label} className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-surface px-4 py-3.5">
          <span className="eyebrow truncate">{tile.label}</span>
          <dl className="flex flex-col gap-1.5">
            {tile.rows.map(([part, value]) => (
              <div key={part} className="flex items-baseline justify-between gap-2 text-xs">
                <dt className="truncate text-fg-2">{part}</dt>
                <dd className="num font-medium text-fg">{value}</dd>
              </div>
            ))}
          </dl>
          <span className="mt-auto truncate text-[11px] text-fg-3">
            {tile.source} · as of {AS_OF}
          </span>
        </div>
      ))}
    </div>
  );
}
