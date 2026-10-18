import { ALL_MONTHS, TODAY, addDays, compareMonths, daysBetween, monthOf, periodMonths } from "@/lib/dates";
import type { Import, Lease, MonthKey, Period, PropertyPerformance, PropertyRecord, Unit, VendorSpend, WorkOrder } from "@/lib/types";
import { delay, effectiveImports, ledgerRow, occupancyRow, propertyPerformance, propertyRecords } from "./core";
import { vendors } from "./mock/catalog";
import { getGenerated } from "./mock/generate";

export async function listProperties(orgId: string, period: Period = "qtd"): Promise<PropertyPerformance[]> {
  await delay();
  return propertyRecords()
    .filter((p) => p.org_id === orgId)
    .map((r) => propertyPerformance(r, period));
}

export async function getProperty(id: string): Promise<PropertyRecord | null> {
  await delay();
  return propertyRecords().find((p) => p.id === id) ?? null;
}

export async function getPropertyPerformance(id: string, period: Period): Promise<PropertyPerformance | null> {
  const property = await getProperty(id);
  return property ? propertyPerformance(property, period) : null;
}

export interface PropertyTrendPoint {
  month: MonthKey;
  noi: number | null;
  noi_budget: number;
  physical: number | null;
  physical_budget: number;
  economic: number | null;
  repairs: number | null;
  repairs_budget: number;
}

export async function getPropertyTrend(id: string, months = 12): Promise<PropertyTrendPoint[]> {
  const property = await getProperty(id);
  if (!property) return [];
  const through = monthOf(property.data_through);
  return ALL_MONTHS.slice(-months).map((month) => {
    const has = compareMonths(month, through) <= 0;
    const a = ledgerRow("actual", id, month)!;
    const b = ledgerRow("budget", id, month)!;
    const o = occupancyRow(id, month)!;
    const rev = (r: typeof a) => r.gross_potential_rent + r.loss_to_lease + r.vacancy_loss + r.concessions + r.bad_debt + r.other_income;
    const exp = (r: typeof a) =>
      r.payroll + r.repairs_maintenance + r.turnover + r.utilities + r.contract_services + r.marketing + r.administrative + r.management_fees + r.insurance + r.property_taxes;
    return {
      month,
      noi: has ? rev(a) - exp(a) : null,
      noi_budget: rev(b) - exp(b),
      physical: has ? o.occupied_units / property.units : null,
      physical_budget: o.budget_occupied_units / property.units,
      economic: has ? (rev(a) - a.other_income) / a.gross_potential_rent : null,
      repairs: has ? a.repairs_maintenance + a.turnover : null,
      repairs_budget: b.repairs_maintenance + b.turnover,
    };
  });
}

export interface RentRollUnit {
  unit: Unit;
  lease: Lease | null;
  /** Market rent minus lease rent; positive means below market. */
  gap: number;
  gap_pct: number;
  days_to_expiry: number | null;
}

function rentRoll(propertyId: string): RentRollUnit[] {
  const { units, leases } = getGenerated();
  const byUnit = new Map(leases.filter((l) => l.property_id === propertyId).map((l) => [l.unit_id, l]));
  return units
    .filter((u) => u.property_id === propertyId)
    .map((unit) => {
      const lease = byUnit.get(unit.id) ?? null;
      const gap = lease ? unit.market_rent - lease.rent : 0;
      return {
        unit,
        lease,
        gap,
        gap_pct: lease ? gap / unit.market_rent : 0,
        days_to_expiry: lease ? daysBetween(TODAY, lease.end_date) : null,
      };
    });
}

export const BELOW_MARKET_THRESHOLD = 0.05;
export const RENEWAL_WINDOW_DAYS = 90;
/** Share of the gap we assume is recovered at renewal when estimating impact. */
export const RENEWAL_CAPTURE = 0.6;

export async function getBelowMarketUnits(propertyId: string): Promise<RentRollUnit[]> {
  await delay();
  return rentRoll(propertyId)
    .filter((r) => r.lease && r.gap_pct >= BELOW_MARKET_THRESHOLD)
    .sort((a, b) => b.gap - a.gap);
}

export async function getUpcomingRenewals(propertyId: string, days = RENEWAL_WINDOW_DAYS): Promise<RentRollUnit[]> {
  await delay();
  return rentRoll(propertyId)
    .filter((r) => r.days_to_expiry !== null && r.days_to_expiry <= days)
    .sort((a, b) => (a.days_to_expiry ?? 0) - (b.days_to_expiry ?? 0));
}

export function renewalWindowEnd(days = RENEWAL_WINDOW_DAYS) {
  return addDays(TODAY, days);
}

/** Rent roll rows for every property, used by portfolio-level estimates. */
export function portfolioRentRoll(propertyIds: string[]): RentRollUnit[] {
  return propertyIds.flatMap((id) => rentRoll(id));
}

/** T12 vendor spend, allocated from GL actuals by each vendor's share. */
export function vendorSpend(propertyId: string, asOf: MonthKey): VendorSpend[] {
  const property = propertyRecords().find((p) => p.id === propertyId);
  if (!property) return [];
  const months = periodMonths("t12", asOf);
  return vendors
    .filter((v) => v.property_ids.includes(propertyId))
    .map((vendor) => {
      const c = vendor.gl_category;
      // Contract labor is billed on top of staffed payroll, so it equals the overrun.
      const adjusted = Math.round(
        vendor.id === "ven_staffbridge"
          ? months.reduce((s, m) => s + Math.max(0, (ledgerRow("actual", propertyId, m)?.[c] ?? 0) - (ledgerRow("budget", propertyId, m)?.[c] ?? 0)), 0)
          : months.reduce((s, m) => s + (ledgerRow("actual", propertyId, m)?.[c] ?? 0), 0) * vendor.share,
      );
      return {
        vendor,
        property_id: propertyId,
        spend_t12: adjusted,
        per_unit: adjusted / property.units,
        benchmark_per_unit: vendor.benchmark_per_unit,
      };
    })
    .sort((a, b) => b.spend_t12 - a.spend_t12);
}

export async function getTopVendors(propertyId: string, limit = 6): Promise<VendorSpend[]> {
  const property = await getProperty(propertyId);
  if (!property) return [];
  return vendorSpend(propertyId, monthOf(property.data_through)).slice(0, limit);
}

export async function getWorkOrders(propertyId: string, filter: "open" | "all" = "open"): Promise<WorkOrder[]> {
  await delay();
  return getGenerated().workOrders.filter((w) => w.property_id === propertyId && (filter === "all" || w.status !== "completed"));
}

export interface PropertySources {
  property: PropertyRecord;
  imports: Import[];
}

export async function getPropertySources(propertyId: string): Promise<PropertySources | null> {
  const property = await getProperty(propertyId);
  if (!property) return null;
  return { property, imports: effectiveImports().filter((i) => i.property_id === propertyId) };
}
