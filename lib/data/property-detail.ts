import { TODAY, addDays, daysBetween, monthEnd, monthOf } from "@/lib/dates";
import type { Lease, Unit, WorkOrder, WorkOrderCategory } from "@/lib/types";
import { allPropertyRecords, delay, occupancyRow } from "./core";
import { agingBuckets, latestImport, type AgingBucket } from "./lineage";
import { capexProjects, vendors } from "./mock/catalog";
import { getGenerated } from "./mock/generate";
import { createRng } from "./mock/random";

/** Property page tabs: rent roll, delinquency, maintenance and capex. Lease and unit level only; no resident names. */

// ---- Rent roll -------------------------------------------------------------------

export interface RentRollRow {
  unit: Unit;
  lease: Lease | null;
  /** Market minus lease rent. Positive means below market. */
  gap: number;
  days_to_expiry: number | null;
}

/** Leases at least this far below market count as below market. */
export const BELOW_MARKET = 0.05;
export const EXPIRY_WINDOW_DAYS = 90;

export async function getRentRoll(propertyId: string): Promise<RentRollRow[]> {
  await delay();
  const { units, leases } = getGenerated();
  const byUnit = new Map(leases.filter((l) => l.property_id === propertyId).map((l) => [l.unit_id, l]));
  return units
    .filter((u) => u.property_id === propertyId)
    .map((unit) => {
      const lease = byUnit.get(unit.id) ?? null;
      return { unit, lease, gap: lease ? unit.market_rent - lease.rent : 0, days_to_expiry: lease ? daysBetween(TODAY, lease.end_date) : null };
    });
}

export function isBelowMarketExpiring(r: RentRollRow) {
  return Boolean(r.lease) && r.gap / r.unit.market_rent >= BELOW_MARKET && (r.days_to_expiry ?? 999) <= EXPIRY_WINDOW_DAYS;
}

export function expiryWindowEnd() {
  return addDays(TODAY, EXPIRY_WINDOW_DAYS);
}

// ---- Delinquency ---------------------------------------------------------------------

export interface UnitBalance {
  unit_number: string;
  bucket: AgingBucket["label"];
  balance: number;
}

export interface Delinquency {
  as_of: string;
  buckets: AgingBucket[];
  total: number;
  billed: number;
  balances: UnitBalance[];
}

/** AR aging buckets and the units behind them, from the latest aging report. */
export async function getDelinquency(propertyId: string): Promise<Delinquency | null> {
  await delay();
  const property = allPropertyRecords().find((p) => p.id === propertyId);
  if (!property) return null;
  const month = monthOf(property.data_through);
  const o = occupancyRow(propertyId, month);
  if (!o) return null;
  const buckets = agingBuckets(propertyId, month);
  const occupied = getGenerated().units.filter((u) => u.property_id === propertyId && u.status === "occupied").map((u) => u.unit_number);
  const rng = createRng(`ar:${propertyId}:${month}`);
  const pool = [...occupied].sort(() => rng.next() - 0.5);
  const balances: UnitBalance[] = [];
  for (const b of buckets) {
    // Older balances sit with fewer units and run larger.
    const avg = { "0–30": 640, "31–60": 1_150, "61–90": 1_700, "90+": 2_600 }[b.label];
    const n = Math.max(1, Math.round(b.amount / avg));
    const weights = Array.from({ length: n }, () => 0.4 + rng.next());
    const total = weights.reduce((s, w) => s + w, 0);
    let assigned = 0;
    weights.forEach((w, i) => {
      const amount = i === n - 1 ? b.amount - assigned : Math.round((b.amount * w) / total);
      assigned += amount;
      balances.push({ unit_number: pool.pop() ?? "—", bucket: b.label, balance: amount });
    });
  }
  return { as_of: property.data_through, buckets, total: o.delinquent_balance, billed: o.billed_charges, balances: balances.sort((a, b) => b.balance - a.balance) };
}

// ---- Maintenance and capex -----------------------------------------------------------

export interface Maintenance {
  from: string;
  by_category: { category: WorkOrderCategory; count: number; cost: number }[];
  repeat_units: { unit_number: string; calls: number; cost: number; categories: string }[];
  vendors: { name: string; jobs: number; cost: number }[];
  open: number;
  capex: typeof capexProjects;
}

/** Calls to the same unit in 12 months at which it counts as a repeat. */
export const REPEAT_CALLS = 5;

export async function getMaintenance(propertyId: string): Promise<Maintenance> {
  await delay();
  const from = addDays(TODAY, -365);
  const orders = getGenerated().workOrders.filter((w) => w.property_id === propertyId && w.opened_at >= from);
  const cost = (list: WorkOrder[]) => list.reduce((s, w) => s + (w.cost ?? 0), 0);
  const group = <K extends string>(key: (w: WorkOrder) => K | null) => {
    const map = new Map<K, WorkOrder[]>();
    for (const w of orders) {
      const k = key(w);
      if (k) map.set(k, [...(map.get(k) ?? []), w]);
    }
    return map;
  };
  const byCategory = group((w) => w.category);
  const byUnit = group((w) => w.unit_number);
  const byVendor = group((w) => w.vendor_id);
  return {
    from,
    by_category: [...byCategory.entries()].map(([category, list]) => ({ category, count: list.length, cost: cost(list) })).sort((a, b) => b.count - a.count),
    repeat_units: [...byUnit.entries()]
      .filter(([, list]) => list.length >= REPEAT_CALLS)
      .map(([unit_number, list]) => ({ unit_number, calls: list.length, cost: cost(list), categories: [...new Set(list.map((w) => w.category))].join(", ") }))
      .sort((a, b) => b.calls - a.calls),
    vendors: [...byVendor.entries()]
      .map(([id, list]) => ({ name: vendors.find((v) => v.id === id)?.name ?? id, jobs: list.length, cost: cost(list) }))
      .sort((a, b) => b.cost - a.cost),
    open: orders.filter((w) => w.status !== "completed").length,
    capex: capexProjects.filter((c) => c.property_id === propertyId),
  };
}

// ---- Freshness ----------------------------------------------------------------------

export interface Freshness {
  t12_through: string;
  /** Month end of the latest AR aging received. */
  ar_through: string | null;
}

/** How current each property's numbers are, by report. */
export async function listFreshness(orgId: string): Promise<Record<string, Freshness>> {
  await delay();
  const records = allPropertyRecords().filter((p) => p.org_id === orgId);
  return Object.fromEntries(
    records.map((p) => {
      const ar = latestImport(p.id, "ar_aging");
      return [p.id, { t12_through: p.data_through, ar_through: ar ? monthEnd(ar.period) : null }];
    }),
  );
}
