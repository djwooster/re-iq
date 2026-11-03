import { LATEST_MONTH, compareMonths, formatDate, formatMonth, monthEnd, monthOf, periodMonths } from "@/lib/dates";
import { CATEGORY_LABELS, REPORT_TYPE_SHORT, SYSTEM_LABELS } from "@/lib/labels";
import type { GlCategory, ISODate, Import, MonthKey, PmsSystem, ReportType, WorkOrder, WorkOrderCategory } from "@/lib/types";
import { allPropertyRecords, delay, effectiveImports, ledgerRow, memberName, occupancyRow } from "./core";
import { vendors } from "./mock/catalog";
import { getGenerated } from "./mock/generate";
import { mappingTemplate } from "./mock/imports";
import { createRng } from "./mock/random";

/**
 * Lineage: every number shown as evidence points back to the manager's own
 * report and line. T12 lines are rebuilt from the normalized ledger with each
 * system's chart of accounts, so a line always sums to the category it maps to.
 */

/** Where a number came from. Resolved to a file and line by `describeSource`. */
export type SourceRef =
  | { kind: "t12"; property_id: string; category: GlCategory; code?: string }
  | { kind: "rent_roll"; property_id: string }
  | { kind: "ar_aging"; property_id: string }
  | { kind: "work_orders"; property_id: string; category?: WorkOrderCategory; from?: ISODate; to?: ISODate; units?: string[] };

/**
 * Where a property's overage on a category lands in its manager's report, from
 * the month it started. The other lines on that category track budget; this
 * one carries the difference.
 */
const OVERAGE_LINE: Record<string, { code: string; from: MonthKey }> = {
  "prop_mesa|repairs_maintenance": { code: "62100", from: "2026-05" },
  "prop_willow|payroll": { code: "60500", from: "2026-04" },
  "prop_peachtree|utilities": { code: "5320", from: "2026-06" },
  "prop_crestline_north|contract_services": { code: "6410", from: "2026-01" },
  "prop_crestline_south|contract_services": { code: "6410", from: "2026-01" },
  "prop_crestline_commons|contract_services": { code: "6410", from: "2026-01" },
};

export interface T12Line {
  code: string;
  label: string;
  category: GlCategory;
  /** Monthly amounts as the manager reports them. Contra-revenue is negative. */
  amounts: Record<MonthKey, number>;
  total: number;
}

function systemFor(propertyId: string): PmsSystem {
  return allPropertyRecords().find((p) => p.id === propertyId)?.property_manager.system ?? "yardi";
}

/** A property's T12 in its manager's chart of accounts, for the 12 months ending `through`. */
export function t12Lines(propertyId: string, through: MonthKey = LATEST_MONTH): T12Line[] {
  const months = periodMonths("t12", through);
  const rows = mappingTemplate("t12", systemFor(propertyId));
  const lines: T12Line[] = rows.map((r) => ({ code: r.source_code ?? "", label: r.source_label, category: r.target as GlCategory, amounts: {}, total: 0 }));
  for (const month of months) {
    const actual = ledgerRow("actual", propertyId, month);
    const budget = ledgerRow("budget", propertyId, month);
    if (!actual || !budget) continue;
    for (const category of new Set(lines.map((l) => l.category))) {
      const idx = rows.map((r, i) => (r.target === category ? i : -1)).filter((i) => i >= 0);
      const overage = OVERAGE_LINE[`${propertyId}|${category}`];
      const designated = overage && compareMonths(month, overage.from) >= 0 ? overage.code : null;
      const a = actual[category];
      // While an overage runs, the other lines stay near budget and the designated line takes the rest.
      const base = designated ? budget[category] * (1 + createRng(`line:${propertyId}:${category}:${month}`).normal(0.006)) : a;
      const carrier = designated
        ? idx.find((i) => rows[i].source_code === designated)!
        : idx.reduce((best, i) => (rows[i].share > rows[best].share ? i : best));
      let assigned = 0;
      for (const i of idx) {
        if (i === carrier) continue;
        const v = Math.round(base * rows[i].share);
        lines[i].amounts[month] = v;
        assigned += v;
      }
      lines[carrier].amounts[month] = a - assigned;
    }
  }
  for (const l of lines) l.total = Object.values(l.amounts).reduce((s, v) => s + v, 0);
  return lines;
}

export function t12Line(propertyId: string, category: GlCategory, code?: string, through?: MonthKey): T12Line | undefined {
  const lines = t12Lines(propertyId, through);
  return code ? lines.find((l) => l.code === code) : lines.find((l) => l.category === category);
}

/** The latest processed file of a type for a property, at or before `month`. */
export function latestImport(propertyId: string, type: ReportType, imports: Import[] = effectiveImports()): Import | null {
  return (
    imports
      .filter((i) => i.property_id === propertyId && i.report_type === type && i.status === "processed")
      .sort((a, b) => compareMonths(b.period, a.period))[0] ?? null
  );
}

export interface SourceDescription {
  /** "Rent Manager · Summit Living · T12 Nov 2026 · line 62100 HVAC Repairs" */
  label: string;
  import: Import | null;
  system: string;
  manager: string;
  report: string;
  line: string | null;
  /** "Received Dec 9 from Kara Lindqvist, Summit Living" */
  received: string | null;
}

const REPORT_FOR: Record<SourceRef["kind"], ReportType> = { t12: "t12", rent_roll: "rent_roll", ar_aging: "ar_aging", work_orders: "work_orders" };

export function describeSource(ref: SourceRef): SourceDescription {
  const property = allPropertyRecords().find((p) => p.id === ref.property_id)!;
  const type = REPORT_FOR[ref.kind];
  const imp = latestImport(ref.property_id, type);
  const system = SYSTEM_LABELS[property.property_manager.system];
  const manager = property.property_manager.name;
  const asOf = imp ? (type === "t12" || type === "work_orders" ? formatMonth(imp.period) : formatDate(monthEnd(imp.period), true)) : "not received";
  const report = `${REPORT_TYPE_SHORT[type]} ${asOf}`;
  let line: string | null = null;
  if (ref.kind === "t12") {
    const lines = t12Lines(ref.property_id, imp?.period).filter((l) => (ref.code ? l.code === ref.code : l.category === ref.category) && (ref.code || l.total !== 0));
    if (lines.length === 1) line = `line ${lines[0].code} ${lines[0].label}`;
    else if (lines.length > 1) line = `lines ${lines.map((l) => l.code).join(", ")} (${CATEGORY_LABELS[ref.category]})`;
  }
  return { label: [system, manager, report, line].filter(Boolean).join(" · "), import: imp, system, manager, report, line, received: imp ? sentBy(imp) : null };
}

// ---- Source detail (what opens when a number is clicked) ---------------------------

export type SourceDetail =
  | { kind: "t12"; source: SourceDescription; property_name: string; months: MonthKey[]; lines: T12Line[]; highlight: string[] }
  | { kind: "rent_roll"; source: SourceDescription; property_name: string; units: number; occupied: number; vacant: number; as_of: ISODate }
  | { kind: "ar_aging"; source: SourceDescription; property_name: string; buckets: AgingBucket[]; as_of: ISODate }
  | { kind: "work_orders"; source: SourceDescription; property_name: string; rows: (WorkOrder & { vendor_name: string | null })[]; filter: string };

export async function getSourceDetail(ref: SourceRef): Promise<SourceDetail> {
  await delay();
  const property = allPropertyRecords().find((p) => p.id === ref.property_id)!;
  const source = describeSource(ref);
  const through = source.import?.period ?? monthOf(property.data_through);
  const base = { source, property_name: property.name };
  switch (ref.kind) {
    case "t12": {
      const lines = t12Lines(ref.property_id, through);
      const highlight = lines.filter((l) => (ref.code ? l.code === ref.code : l.category === ref.category && l.total !== 0)).map((l) => l.code);
      return { kind: "t12", ...base, months: periodMonths("t12", through), lines, highlight };
    }
    case "rent_roll": {
      const o = occupancyRow(ref.property_id, through)!;
      return { kind: "rent_roll", ...base, units: property.units, occupied: o.occupied_units, vacant: property.units - o.occupied_units, as_of: monthEnd(through) };
    }
    case "ar_aging":
      return { kind: "ar_aging", ...base, buckets: agingBuckets(ref.property_id, through), as_of: monthEnd(through) };
    case "work_orders": {
      const rows = getGenerated().workOrders.filter(
        (w) =>
          w.property_id === ref.property_id &&
          (!ref.category || w.category === ref.category) &&
          (!ref.from || w.opened_at >= ref.from) &&
          (!ref.to || w.opened_at <= ref.to) &&
          (!ref.units || (w.unit_number && ref.units.includes(w.unit_number))),
      );
      const parts = [ref.category?.toUpperCase(), ref.from && ref.to ? `${formatDate(ref.from)}–${formatDate(ref.to)}` : null, ref.units ? `units ${ref.units.join(", ")}` : null];
      const named = rows.map((w) => ({ ...w, vendor_name: vendors.find((v) => v.id === w.vendor_id)?.name ?? null }));
      return { kind: "work_orders", ...base, rows: named.sort((a, b) => (a.opened_at < b.opened_at ? -1 : 1)), filter: parts.filter(Boolean).join(" · ") };
    }
  }
}

// ---- AR aging ------------------------------------------------------------------

export interface AgingBucket {
  label: "0–30" | "31–60" | "61–90" | "90+";
  amount: number;
}

/**
 * Splits a month's delinquent balance into aging buckets. Balances at
 * properties where delinquency is climbing skew older.
 */
export function agingBuckets(propertyId: string, month: MonthKey): AgingBucket[] {
  const o = occupancyRow(propertyId, month);
  if (!o) return [];
  const prior = occupancyRow(propertyId, periodMonths("t12", month)[0]);
  const rising = prior ? o.delinquent_balance / o.billed_charges > (prior.delinquent_balance / prior.billed_charges) * 1.5 : false;
  const shares = rising ? [0.34, 0.21, 0.17, 0.28] : [0.52, 0.22, 0.12, 0.14];
  const labels: AgingBucket["label"][] = ["0–30", "31–60", "61–90", "90+"];
  const amounts = shares.map((s) => Math.round(o.delinquent_balance * s));
  amounts[3] += o.delinquent_balance - amounts.reduce((s, v) => s + v, 0);
  return labels.map((label, i) => ({ label, amount: amounts[i] }));
}

/** Who sent a file and when. */
function sentBy(imp: Import) {
  return `Received ${formatDate(imp.uploaded_at.slice(0, 10))} from ${memberName(imp.uploaded_by)}`;
}
