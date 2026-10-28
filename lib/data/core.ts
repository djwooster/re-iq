import { LATEST_MONTH, compareMonths, monthEnd, monthOf, periodMonths } from "@/lib/dates";
import type {
  AccountMapping,
  DataSource,
  DriverVariance,
  GlCategory,
  Import,
  MonthKey,
  OccupancyMetrics,
  OccupancySnapshot,
  Period,
  PeriodFinancials,
  PropertyPerformance,
  PropertyRecord,
  VarianceDriver,
} from "@/lib/types";
import { CURRENT_MEMBER_ID, dataSources, members, propertyManagers, properties } from "./mock/catalog";
import { getGenerated } from "./mock/generate";
import { getSeedImports, seedMappingsFor } from "./mock/imports";
import { readOverlay } from "./store";

/**
 * Internal helpers shared by the public data functions. Nothing here is
 * imported by UI code; pages go through the modules re-exported from
 * `lib/data/index.ts`.
 */

export const REVENUE_CATEGORIES: GlCategory[] = [
  "gross_potential_rent",
  "loss_to_lease",
  "vacancy_loss",
  "concessions",
  "bad_debt",
  "other_income",
];

export const EXPENSE_CATEGORIES: GlCategory[] = [
  "payroll",
  "repairs_maintenance",
  "turnover",
  "utilities",
  "contract_services",
  "marketing",
  "administrative",
  "management_fees",
  "insurance",
  "property_taxes",
];

export const ALL_CATEGORIES = [...REVENUE_CATEGORIES, ...EXPENSE_CATEGORIES];

export function isRevenue(category: GlCategory) {
  return REVENUE_CATEGORIES.includes(category);
}

const DRIVER_OF: Record<GlCategory, VarianceDriver> = {
  gross_potential_rent: "other",
  loss_to_lease: "loss_to_lease",
  vacancy_loss: "vacancy",
  concessions: "concessions",
  bad_debt: "bad_debt",
  other_income: "other",
  payroll: "payroll",
  repairs_maintenance: "repairs_maintenance",
  turnover: "repairs_maintenance",
  utilities: "utilities",
  contract_services: "contract_services",
  marketing: "other",
  administrative: "other",
  management_fees: "other",
  insurance: "other",
  property_taxes: "other",
};

export const DRIVER_ORDER: VarianceDriver[] = [
  "vacancy",
  "concessions",
  "bad_debt",
  "repairs_maintenance",
  "utilities",
  "payroll",
  "contract_services",
  "loss_to_lease",
  "other",
];

export function driverOf(category: GlCategory) {
  return DRIVER_OF[category];
}

// ---- Indexes ----------------------------------------------------------------

type Ledger = Map<string, Record<GlCategory, number>>;

let indexes: { budget: Ledger; actual: Ledger; occupancy: Map<string, OccupancySnapshot> } | null = null;

const key = (propertyId: string, month: MonthKey) => `${propertyId}|${month}`;

function getIndexes() {
  if (indexes) return indexes;
  const g = getGenerated();
  const build = (lines: typeof g.budget): Ledger => {
    const map: Ledger = new Map();
    for (const l of lines) {
      const k = key(l.property_id, l.month);
      let row = map.get(k);
      if (!row) {
        row = Object.fromEntries(ALL_CATEGORIES.map((c) => [c, 0])) as Record<GlCategory, number>;
        map.set(k, row);
      }
      row[l.category] += l.amount;
    }
    return map;
  };
  indexes = {
    budget: build(g.budget),
    actual: build(g.actual),
    occupancy: new Map(g.occupancy.map((o) => [key(o.property_id, o.month), o])),
  };
  return indexes;
}

export function ledgerRow(kind: "budget" | "actual", propertyId: string, month: MonthKey) {
  return getIndexes()[kind].get(key(propertyId, month));
}

export function occupancyRow(propertyId: string, month: MonthKey) {
  return getIndexes().occupancy.get(key(propertyId, month));
}

// ---- Workspace ----------------------------------------------------------------

/** A new workspace starts empty; properties appear as their first T12 is confirmed. */
export function isNewWorkspace() {
  return readOverlay().workspace === "new";
}

/** Display name for a member, using the signed-up profile in a new workspace. */
export function memberName(id: string) {
  const profile = readOverlay().profile;
  if (profile && id === CURRENT_MEMBER_ID) return profile.name;
  return members.find((m) => m.id === id)?.name ?? "A teammate";
}

// ---- Imports and freshness ----------------------------------------------------

export function effectiveImports(): Import[] {
  const overlay = readOverlay();
  const deleted = new Set(overlay.deletedImportIds);
  const seeded = (overlay.workspace === "new" ? [] : getSeedImports())
    .filter((i) => !deleted.has(i.id))
    .map((i) => ({ ...i, ...overlay.importPatches[i.id] }));
  const added = overlay.imports.filter((i) => !deleted.has(i.id)).map((i) => ({ ...i, ...overlay.importPatches[i.id] }));
  return [...added, ...seeded].sort((a, b) => (a.uploaded_at < b.uploaded_at ? 1 : -1));
}

/** Months before the earliest seeded upload came from the onboarding backfill. */
const BACKFILL_THROUGH: MonthKey = "2026-06";

function latestT12(propertyId: string, imports: Import[]): MonthKey | null {
  return (
    imports
      .filter((i) => i.property_id === propertyId && i.report_type === "t12" && i.status === "processed")
      .map((i) => i.period)
      .sort(compareMonths)
      .pop() ?? null
  );
}

/** Latest month with actuals for a property, derived from its sources. */
export function dataThroughMonth(propertyId: string, imports = effectiveImports()): MonthKey {
  const property = properties.find((p) => p.id === propertyId);
  if (!property) return LATEST_MONTH;
  const latest = latestT12(propertyId, imports);
  let month: MonthKey;
  if (isNewWorkspace()) month = latest ?? LATEST_MONTH;
  else if (!property.data_source_ids.includes("src_upload")) return LATEST_MONTH;
  else month = latest && compareMonths(latest, BACKFILL_THROUGH) > 0 ? latest : BACKFILL_THROUGH;
  return compareMonths(month, LATEST_MONTH) > 0 ? LATEST_MONTH : month;
}

export function sourceById(id: string): DataSource {
  const source = dataSources.find((s) => s.id === id);
  if (!source) throw new Error(`Unknown source ${id}`);
  return source;
}

/**
 * Every catalog property, whether or not the workspace has data for it. Uploads
 * can name any of them, and insights compute over all of them before filtering.
 * In a new workspace nothing is connected, so every property is fed by uploads.
 */
export function allPropertyRecords(imports = effectiveImports()): PropertyRecord[] {
  const fresh = isNewWorkspace();
  return properties.map((p) => ({
    ...p,
    data_source_ids: fresh ? ["src_upload"] : p.data_source_ids,
    property_manager: propertyManagers.find((m) => m.id === p.property_manager_id)!,
    primary_source: sourceById(fresh ? "src_upload" : p.data_source_ids[0]),
    data_through: monthEnd(dataThroughMonth(p.id, imports)),
  }));
}

/** Properties in the portfolio: all of them in the sample, those with a confirmed T12 in a new workspace. */
export function propertyRecords(imports = effectiveImports()): PropertyRecord[] {
  const all = allPropertyRecords(imports);
  if (!isNewWorkspace()) return all;
  return all.filter((r) => latestT12(r.id, imports));
}

export function mappingsFor(imp: Import): AccountMapping[] {
  const overlay = readOverlay();
  const added = overlay.mappings.filter((m) => m.import_id === imp.id);
  const base = added.length
    ? added
    : seedMappingsFor(imp, (category) => {
        if (imp.report_type === "budget") {
          // Generated budgets run through the latest month; annualize what exists.
          const rows = periodMonths("ytd", imp.period).map((m) => ledgerRow("budget", imp.property_id, m)).filter(Boolean);
          return (rows.reduce((s, r) => s + r![category], 0) * 12) / Math.max(1, rows.length);
        }
        return periodMonths("t12", imp.period).reduce((s, m) => s + (ledgerRow("actual", imp.property_id, m)?.[category] ?? 0), 0);
      });
  return base.map((m) => ({ ...m, ...overlay.mappingPatches[m.id] }));
}

// ---- Aggregation ----------------------------------------------------------------

function emptyFinancials(period: Period, months: MonthKey[]): PeriodFinancials {
  return {
    period,
    months,
    revenue: { actual: 0, budget: 0 },
    expenses: { actual: 0, budget: 0 },
    noi: { actual: 0, budget: 0 },
    gpr: { actual: 0, budget: 0 },
    byCategory: Object.fromEntries(ALL_CATEGORIES.map((c) => [c, { actual: 0, budget: 0 }])) as PeriodFinancials["byCategory"],
  };
}

export function sumFinancials(propertyId: string, months: MonthKey[], period: Period): PeriodFinancials {
  const f = emptyFinancials(period, months);
  for (const month of months) {
    const a = ledgerRow("actual", propertyId, month);
    const b = ledgerRow("budget", propertyId, month);
    if (!a || !b) continue;
    for (const c of ALL_CATEGORIES) {
      f.byCategory[c].actual += a[c];
      f.byCategory[c].budget += b[c];
    }
  }
  return finalize(f);
}

function finalize(f: PeriodFinancials): PeriodFinancials {
  f.revenue = { actual: 0, budget: 0 };
  f.expenses = { actual: 0, budget: 0 };
  for (const c of ALL_CATEGORIES) {
    const target = isRevenue(c) ? f.revenue : f.expenses;
    target.actual += f.byCategory[c].actual;
    target.budget += f.byCategory[c].budget;
  }
  f.noi = { actual: f.revenue.actual - f.expenses.actual, budget: f.revenue.budget - f.expenses.budget };
  f.gpr = { ...f.byCategory.gross_potential_rent };
  return f;
}

export function combineFinancials(list: PeriodFinancials[], period: Period, months: MonthKey[]): PeriodFinancials {
  const f = emptyFinancials(period, months);
  for (const item of list) {
    for (const c of ALL_CATEGORIES) {
      f.byCategory[c].actual += item.byCategory[c].actual;
      f.byCategory[c].budget += item.byCategory[c].budget;
    }
  }
  return finalize(f);
}

/** NOI variance split by driver. Positive is favorable; the parts sum to the total. */
export function driverVariances(f: PeriodFinancials): DriverVariance[] {
  const totals = new Map<VarianceDriver, number>(DRIVER_ORDER.map((d) => [d, 0]));
  for (const c of ALL_CATEGORIES) {
    const { actual, budget } = f.byCategory[c];
    const variance = isRevenue(c) ? actual - budget : budget - actual;
    totals.set(DRIVER_OF[c], (totals.get(DRIVER_OF[c]) ?? 0) + variance);
  }
  return DRIVER_ORDER.map((driver) => ({ driver, variance: totals.get(driver) ?? 0 }));
}

export function categoryVariance(f: PeriodFinancials, c: GlCategory) {
  const { actual, budget } = f.byCategory[c];
  return isRevenue(c) ? actual - budget : budget - actual;
}

interface OccupancyParts {
  occupied: number;
  budgetOccupied: number;
  units: number;
  delinquent: number;
  billed: number;
}

export function occupancyParts(propertyId: string, units: number, month: MonthKey | null): OccupancyParts {
  const row = month ? occupancyRow(propertyId, month) : undefined;
  return {
    occupied: row?.occupied_units ?? 0,
    budgetOccupied: row?.budget_occupied_units ?? 0,
    units: row ? units : 0,
    delinquent: row?.delinquent_balance ?? 0,
    billed: row?.billed_charges ?? 0,
  };
}

export function occupancyMetrics(parts: OccupancyParts[], f: PeriodFinancials): OccupancyMetrics {
  const sum = (k: keyof OccupancyParts) => parts.reduce((s, p) => s + p[k], 0);
  const units = sum("units") || 1;
  const net = (kind: "actual" | "budget") =>
    (["gross_potential_rent", "loss_to_lease", "vacancy_loss", "concessions", "bad_debt"] as GlCategory[]).reduce(
      (s, c) => s + f.byCategory[c][kind],
      0,
    );
  const billed = sum("billed") || 1;
  return {
    physical: sum("occupied") / units,
    physical_budget: sum("budgetOccupied") / units,
    economic: f.gpr.actual ? net("actual") / f.gpr.actual : 0,
    economic_budget: f.gpr.budget ? net("budget") / f.gpr.budget : 0,
    delinquency: sum("delinquent") / billed,
    delinquent_balance: sum("delinquent"),
  };
}

/** Performance for one property over a period, honoring its data-through date. */
export function propertyPerformance(property: PropertyRecord, period: Period): PropertyPerformance {
  const months = periodMonths(period);
  const through = monthOf(property.data_through);
  const included = months.filter((m) => compareMonths(m, through) <= 0);
  const missing = months.filter((m) => compareMonths(m, through) > 0);
  const financials = sumFinancials(property.id, included, period);
  const latest = included.at(-1) ?? null;
  return {
    property,
    financials,
    occupancy: occupancyMetrics([occupancyParts(property.id, property.units, latest ?? through)], financials),
    drivers: driverVariances(financials),
    missing_months: missing,
  };
}

export function delay(ms = 0) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
