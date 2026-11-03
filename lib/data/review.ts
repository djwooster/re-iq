import { LATEST_MONTH, compareMonths, formatDate, formatMonth, monthEnd, monthOf, periodMonths } from "@/lib/dates";
import { formatCurrency } from "@/lib/format";
import { CATEGORY_LABELS, REPORT_TYPE_SHORT } from "@/lib/labels";
import type { AccountMapping, GlCategory, Import, MappingTarget, PropertyManager, PropertyRecord, ReportType } from "@/lib/types";
import { REQUIRED_REPORTS, closeDueDate, getCloseStatus } from "./close";
import { allPropertyRecords, delay, effectiveImports, isRevenue, ledgerRow, mappingsFor, occupancyRow, propertyRecords, sumFinancials } from "./core";
import { agingBuckets, latestImport, t12Lines } from "./lineage";
import { ORG_ID, organization, propertyManagers } from "./mock/catalog";
import { getGenerated } from "./mock/generate";
import { REVIEW_THRESHOLD, mappingTemplate } from "./mock/imports";
import { readOverlay, writeOverlay } from "./store";

/**
 * Stages 2–4 of the close: packages arrive through each manager's upload link,
 * line items map to one chart of accounts, and every file is checked against
 * the others before its numbers are trusted.
 */

// ---- Close tracker --------------------------------------------------------------

export type TrackerState = "received" | "late" | "missing";

export interface TrackerCell {
  report_type: ReportType;
  state: TrackerState;
  received_at: string | null;
}

export interface TrackerManager {
  manager: PropertyManager;
  upload_path: string;
  properties: { property: PropertyRecord; cells: TrackerCell[] }[];
  /** "Received Dec 9", "Late: nothing received", or "2 of 3 properties complete". */
  status: string;
  state: "complete" | "partial" | "late";
}

export interface CloseTracker {
  month: string;
  due_date: string;
  report_types: ReportType[];
  managers: TrackerManager[];
}

export async function getCloseTracker(orgId: string): Promise<CloseTracker> {
  const close = await getCloseStatus(orgId);
  const managers = close.managers.map((m): TrackerManager => {
    const mine = close.properties.filter((p) => m.property_ids.includes(p.property.id));
    const anyIn = mine.some((p) => p.reports.some((r) => r.state !== "missing"));
    const properties = mine.map((p) => ({
      property: p.property,
      cells: p.reports.map((r) => ({
        report_type: r.report_type,
        // Nothing from the manager means the package is late; a gap in a package that arrived is a missing report.
        state: (r.state === "missing" ? (anyIn ? "missing" : "late") : "received") as TrackerState,
        received_at: r.state === "missing" ? null : r.import!.uploaded_at,
      })),
    }));
    const complete = properties.filter((p) => p.cells.every((c) => c.state === "received")).length;
    const latest = properties.flatMap((p) => p.cells.map((c) => c.received_at)).filter(Boolean).sort().pop();
    return {
      manager: m.manager,
      upload_path: uploadPath(m.manager),
      properties,
      state: !anyIn ? "late" : complete === properties.length ? "complete" : "partial",
      status: !anyIn
        ? `Late · nothing received, due ${formatDate(close.due_date)}`
        : complete === properties.length
          ? `Received ${formatDate(latest!.slice(0, 10))}`
          : `Received ${formatDate(latest!.slice(0, 10))} · ${complete} of ${properties.length} properties complete`,
    };
  });
  return { month: close.month, due_date: close.due_date, report_types: REQUIRED_REPORTS, managers };
}

// ---- Manager upload link ------------------------------------------------------------

/** Each manager's no-login upload link. The token is stable per manager. */
const UPLOAD_TOKENS: Record<string, string> = {
  pm_summit: "summit-7f3k2q",
  pm_harbor: "harbor-m82xva",
  pm_northgate: "northgate-q4c9tw",
  pm_crestline: "crestline-h6p1rz",
};

export function uploadPath(manager: PropertyManager) {
  return `/upload/${UPLOAD_TOKENS[manager.id] ?? manager.id}`;
}

export interface UploadPage {
  organization_name: string;
  manager: PropertyManager;
  month: string;
  due_date: string;
  properties: { name: string; reports: { report_type: ReportType; label: string; received_at: string | null }[] }[];
}

/**
 * What a property manager sees at their link: what's due and what's in. File
 * problems are never shown here; the asset manager sees those in Data Sources.
 */
export async function getUploadPage(token: string): Promise<UploadPage | null> {
  await delay();
  const managerId = Object.entries(UPLOAD_TOKENS).find(([, t]) => t === token)?.[0];
  const manager = propertyManagers.find((m) => m.id === managerId);
  if (!manager) return null;
  const imports = effectiveImports();
  const properties = allPropertyRecords(imports).filter((p) => p.property_manager_id === manager.id);
  return {
    organization_name: readOverlay().organization.name ?? organization.name,
    manager,
    month: LATEST_MONTH,
    due_date: closeDueDate(LATEST_MONTH),
    properties: properties.map((p) => ({
      name: p.name,
      reports: REQUIRED_REPORTS.map((t) => {
        const imp = imports.find((i) => i.property_id === p.id && i.report_type === t && i.period === LATEST_MONTH);
        return { report_type: t, label: REPORT_TYPE_SHORT[t], received_at: imp?.uploaded_at ?? null };
      }),
    })),
  };
}

// ---- Mapping review ------------------------------------------------------------------

export interface ReviewFile {
  import: Import;
  property: PropertyRecord;
  /** Lines below the confidence threshold not yet confirmed. */
  pending: number;
  lines: number;
}

/** The latest T12 for each property, uncertain ones first. */
export async function listReviewFiles(orgId: string): Promise<ReviewFile[]> {
  await delay();
  const imports = effectiveImports();
  return propertyRecords(imports)
    .filter((p) => p.org_id === orgId)
    .map((property) => {
      const imp = latestImport(property.id, "t12", imports);
      if (!imp) return null;
      const mappings = mappingsFor(imp);
      return { import: imp, property, lines: mappings.length, pending: mappings.filter((m) => m.confidence < REVIEW_THRESHOLD && !m.confirmed_by_user).length };
    })
    .filter((f): f is ReviewFile => Boolean(f))
    .sort((a, b) => b.pending - a.pending || a.property.name.localeCompare(b.property.name));
}

export interface ReviewDetail {
  file: ReviewFile;
  mappings: AccountMapping[];
  /** Totals by standard account, after mapping. */
  statement_total: number;
  file_total: number;
}

export async function getReviewDetail(importId: string): Promise<ReviewDetail | null> {
  const files = await listReviewFiles(ORG_ID);
  const file = files.find((f) => f.import.id === importId);
  if (!file) return null;
  const mappings = mappingsFor(file.import);
  const total = mappings.filter((m) => m.target !== "ignore").reduce((s, m) => s + (m.amount ?? 0), 0);
  return { file, mappings, statement_total: total, file_total: mappings.reduce((s, m) => s + (m.amount ?? 0), 0) };
}

/** Sets a line's standard account and remembers it for every future file from the same manager. */
export async function saveMapping(mapping: AccountMapping, target: MappingTarget, managerId: string): Promise<void> {
  await delay(150);
  writeOverlay((d) => {
    d.mappingPatches[mapping.id] = { ...d.mappingPatches[mapping.id], target, confirmed_by_user: true };
    if (mapping.source_code) d.managerMappings[managerId] = { ...d.managerMappings[managerId], [mapping.source_code]: target };
  });
}

/** Confirms every line at or above the confidence threshold in one step. */
export async function approveConfident(mappings: AccountMapping[]): Promise<number> {
  await delay(200);
  const confident = mappings.filter((m) => m.confidence >= REVIEW_THRESHOLD && !m.confirmed_by_user);
  writeOverlay((d) => {
    for (const m of confident) d.mappingPatches[m.id] = { ...d.mappingPatches[m.id], confirmed_by_user: true };
  });
  return confident.length;
}

export interface Crosswalk {
  category: GlCategory;
  label: string;
  managers: { manager: PropertyManager; lines: { code: string; label: string }[] }[];
}

/** How each manager's chart of accounts lands on one standard account. */
export async function getCrosswalk(orgId: string, category: GlCategory = "repairs_maintenance"): Promise<Crosswalk> {
  await delay();
  return {
    category,
    label: CATEGORY_LABELS[category],
    managers: propertyManagers
      .filter((m) => m.org_id === orgId)
      .map((manager) => ({
        manager,
        lines: mappingTemplate("t12", manager.system)
          .filter((r) => r.target === category)
          .map((r) => ({ code: r.source_code ?? "", label: r.source_label })),
      })),
  };
}

// ---- Reconciliation ----------------------------------------------------------------

export type CheckState = "pass" | "break" | "waiting";

export interface ReconCheck {
  id: string;
  label: string;
  state: CheckState;
  left: { label: string; value: string };
  right: { label: string; value: string };
  note: string | null;
}

export interface PropertyRecon {
  property: PropertyRecord;
  checks: ReconCheck[];
}

export const RECON_CHECKS: { id: string; label: string }[] = [
  { id: "statement", label: "T12 totals match the manager's statement" },
  { id: "rent_roll", label: "Rent roll potential rent ≈ T12 gross potential rent" },
  { id: "ar", label: "Delinquency = AR aging total" },
  { id: "budget", label: "Budget file = approved budget" },
  { id: "payroll", label: "T12 payroll = payroll register" },
  { id: "continuity", label: "No missing months" },
];

/** Rent roll and T12 are prepared on different days; within this share they tie. */
const RENT_ROLL_TOLERANCE = 0.02;

const REVENUE: GlCategory[] = ["gross_potential_rent", "loss_to_lease", "vacancy_loss", "concessions", "bad_debt", "other_income"];

export async function getReconciliation(orgId: string): Promise<PropertyRecon[]> {
  await delay();
  const imports = effectiveImports();
  const { units } = getGenerated();
  return propertyRecords(imports)
    .filter((p) => p.org_id === orgId)
    .map((property) => {
      const through = monthOf(property.data_through);
      const months = periodMonths("t12", through);
      const f = sumFinancials(property.id, months, "t12");
      const lines = t12Lines(property.id, through);
      const sum = (pred: (c: GlCategory) => boolean) => lines.filter((l) => pred(l.category)).reduce((s, l) => s + l.total, 0);
      const checks: ReconCheck[] = [];

      checks.push({
        id: "statement",
        label: RECON_CHECKS[0].label,
        state: "pass",
        left: { label: "RE-IQ revenue / expenses", value: `${formatCurrency(f.revenue.actual)} / ${formatCurrency(f.expenses.actual)}` },
        right: { label: "Manager's statement", value: `${formatCurrency(sum(isRevenue))} / ${formatCurrency(sum((c) => !isRevenue(c)))}` },
        note: null,
      });

      const rr = latestImport(property.id, "rent_roll", imports);
      const rrMonth = rr?.period ?? through;
      const potential = units.filter((u) => u.property_id === property.id).reduce((s, u) => s + u.market_rent, 0);
      const gpr = ledgerRow("actual", property.id, rrMonth)?.gross_potential_rent ?? 0;
      const gap = Math.abs(potential - gpr) / gpr;
      checks.push({
        id: "rent_roll",
        label: RECON_CHECKS[1].label,
        state: gap <= RENT_ROLL_TOLERANCE ? "pass" : "break",
        left: { label: `Rent roll, ${formatDate(monthEnd(rrMonth))}`, value: formatCurrency(potential) },
        right: { label: `T12 GPR, ${formatMonth(rrMonth, "tiny")}`, value: formatCurrency(gpr) },
        note: gap <= RENT_ROLL_TOLERANCE ? `Within ${(gap * 100).toFixed(1)}%` : `Off by ${(gap * 100).toFixed(1)}%`,
      });

      // Properties whose package hasn't arrived are checked against the last month they sent.
      const sentPackage = imports.some((i) => i.property_id === property.id && i.period === LATEST_MONTH);
      const arMonth = sentPackage ? LATEST_MONTH : through;
      const ar = imports.find((i) => i.property_id === property.id && i.report_type === "ar_aging" && i.period === arMonth);
      const delinquent = occupancyRow(property.id, arMonth)?.delinquent_balance ?? 0;
      checks.push({
        id: "ar",
        label: RECON_CHECKS[2].label,
        state: ar ? "pass" : "break",
        left: { label: `Delinquency, ${formatDate(monthEnd(arMonth))}`, value: formatCurrency(delinquent) },
        right: { label: "AR aging total", value: ar ? formatCurrency(agingBuckets(property.id, arMonth).reduce((s, b) => s + b.amount, 0)) : "Not received" },
        note: ar ? null : `${formatMonth(arMonth, "long").split(" ")[0]} package arrived without the AR aging`,
      });

      const budget = imports.find((i) => i.property_id === property.id && i.report_type === "budget");
      const approved = periodMonths("ytd", "2026-12").reduce((s, m) => {
        const b = ledgerRow("budget", property.id, m);
        return s + (b ? REVENUE.reduce((x, c) => x + b[c], 0) : 0);
      }, 0);
      checks.push({
        id: "budget",
        label: RECON_CHECKS[3].label,
        state: budget ? "pass" : "break",
        left: { label: "Budget file, 2026 revenue", value: budget ? formatCurrency(approved) : "Not received" },
        right: { label: "Approved budget", value: formatCurrency(approved) },
        note: null,
      });

      const payroll = lines.filter((l) => l.category === "payroll");
      const t12Payroll = payroll.reduce((s, l) => s + l.total, 0);
      // The register covers staff on the manager's payroll; contract labor is billed by an agency.
      const register = payroll.filter((l) => !/contract labor/i.test(l.label)).reduce((s, l) => s + l.total, 0);
      const contract = t12Payroll - register;
      checks.push({
        id: "payroll",
        label: RECON_CHECKS[4].label,
        state: contract > 0 ? "break" : "pass",
        left: { label: "T12 payroll", value: formatCurrency(t12Payroll) },
        right: { label: "Payroll register", value: formatCurrency(register) },
        note: contract > 0 ? `${formatCurrency(contract)} of agency contract labor is booked to payroll` : null,
      });

      const behind = compareMonths(through, LATEST_MONTH) < 0;
      checks.push({
        id: "continuity",
        label: RECON_CHECKS[5].label,
        state: behind ? "waiting" : "pass",
        left: { label: "Latest month received", value: formatMonth(through) },
        right: { label: "Expected", value: formatMonth(LATEST_MONTH) },
        note: behind ? `${formatMonth(LATEST_MONTH, "long").split(" ")[0]} not received yet` : null,
      });

      return { property, checks };
    });
}

export interface SavedMapping {
  manager: PropertyManager;
  code: string;
  label: string;
  target: MappingTarget;
}

/** Mappings a person changed, remembered per manager. */
export async function listSavedMappings(orgId: string): Promise<SavedMapping[]> {
  await delay();
  const saved = readOverlay().managerMappings;
  return propertyManagers
    .filter((m) => m.org_id === orgId)
    .flatMap((manager) =>
      Object.entries(saved[manager.id] ?? {}).map(([code, target]) => ({
        manager,
        code,
        label: mappingTemplate("t12", manager.system).find((r) => r.source_code === code)?.source_label ?? code,
        target,
      })),
    );
}
