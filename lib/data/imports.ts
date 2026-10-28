import { LATEST_MONTH, TODAY, periodMonths } from "@/lib/dates";
import type { AccountMapping, FileFormat, Import, MappingTarget, MonthKey, PmsSystem, PropertyRecord, ReportType } from "@/lib/types";
import { allPropertyRecords, delay, effectiveImports, isNewWorkspace, ledgerRow, mappingsFor, propertyRecords } from "./core";
import { CURRENT_MEMBER_ID, ORG_ID } from "./mock/catalog";
import { UNUSUAL_LINES, detect, detectFormat } from "./mock/detect";
import { REVIEW_THRESHOLD, mappingTemplate } from "./mock/imports";
import { createRng } from "./mock/random";
import { readOverlay, writeOverlay } from "./store";

export { REVIEW_THRESHOLD };
export { ALL_CATEGORIES as ALL_GL_CATEGORIES } from "./core";
export { FIELD_LABELS, describePeriod } from "./mock/imports";

export async function listImports(orgId: string): Promise<Import[]> {
  await delay();
  return effectiveImports().filter((i) => i.org_id === orgId);
}

export interface ImportDetail {
  import: Import;
  property: PropertyRecord;
  mappings: AccountMapping[];
}

export async function getImport(id: string): Promise<ImportDetail | null> {
  await delay();
  const imp = effectiveImports().find((i) => i.id === id);
  if (!imp) return null;
  const property = allPropertyRecords().find((p) => p.id === imp.property_id)!;
  return { import: imp, property, mappings: imp.status === "failed" ? [] : mappingsFor(imp) };
}

export interface PropertyOption {
  property: PropertyRecord;
  /** False for a property a new workspace hasn't received a T12 for yet. */
  in_portfolio: boolean;
}

/** Properties an upload can be filed under, including ones not yet in the portfolio. */
export async function listPropertyOptions(orgId: string): Promise<PropertyOption[]> {
  await delay();
  const imports = effectiveImports();
  const inPortfolio = new Set(propertyRecords(imports).map((r) => r.id));
  return allPropertyRecords(imports)
    .filter((p) => p.org_id === orgId)
    .map((property) => ({ property, in_portfolio: inPortfolio.has(property.id) }));
}

/**
 * The files in public/test-files (see scripts/make-test-files.ts), so a usability-test
 * participant can upload them with one click instead of handling files.
 */
const EXAMPLE_REPORTS: { name: string; size: number }[] = [
  { name: "Oakridge_T12_Sep2026.csv", size: 3_150 },
  { name: "Brookstone_T12_Sep2026.csv", size: 3_134 },
  { name: "PeachtreeLanding_IncomeStatement_2026-09.csv", size: 2_300 },
  { name: "magnolia-court-twelve-month-income-statement-2026-09.csv", size: 2_083 },
  { name: "WillowBend_TwelveMonthIS_Sep26.csv", size: 1_858 },
  { name: "Hickory Station - 12 Month Income Statement - Sep 2026.csv", size: 1_751 },
  { name: "GulchTerrace_T12_Aug2026.csv", size: 3_141 },
  { name: "Brookstone_RentRoll_09302026.csv", size: 20_507 },
  { name: "Hickory Station - Budget 2026.csv", size: 1_752 },
];

/** Example reports not uploaded yet. Offered only in a new workspace. */
export async function listExampleReports(): Promise<{ name: string; size: number }[]> {
  await delay();
  if (!isNewWorkspace()) return [];
  const uploaded = new Set(effectiveImports().map((i) => i.file_name));
  return EXAMPLE_REPORTS.filter((r) => !uploaded.has(r.name));
}

// ---- Upload pipeline (mock) ---------------------------------------------

export type UploadStep = "reading" | "detecting" | "mapping";

export const UPLOAD_STEPS: { id: UploadStep; label: string }[] = [
  { id: "reading", label: "Reading file" },
  { id: "detecting", label: "Detecting report type" },
  { id: "mapping", label: "Mapping accounts" },
];

export interface UploadDraft {
  id: string;
  file_name: string;
  file_format: FileFormat;
  file_size: number;
  report_type: ReportType | null;
  property_id: string | null;
  period: MonthKey | null;
  detected_source_format: PmsSystem | null;
  /** True when detection could not settle property, type, or period on its own. */
  needs_input: boolean;
  mappings: DraftMapping[];
  row_count: number;
}

export interface DraftMapping extends AccountMapping {
  alternatives: MappingTarget[];
}

export class UploadError extends Error {}

export const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv", ".pdf"];

/**
 * Simulates parsing a report: reads the file, detects what it is, and maps
 * its line items to normalized categories. Resolves after 2–4 seconds.
 */
export async function uploadReport(
  file: { name: string; size: number },
  onStep?: (step: UploadStep) => void,
): Promise<UploadDraft> {
  const rng = createRng(`upload:${file.name}:${file.size}`);
  const format = detectFormat(file.name);
  onStep?.("reading");
  await delay(rng.int(700, 1_100));
  if (!format) throw new UploadError("This file type is not supported. Upload an Excel, CSV, or PDF export.");
  if (file.size > 25_000_000) throw new UploadError("Files up to 25 MB are supported. Split larger exports by property.");

  onStep?.("detecting");
  await delay(rng.int(800, 1_300));
  const d = detect(file.name);

  onStep?.("mapping");
  await delay(rng.int(700, 1_200));
  const draftId = `draft_${Date.now().toString(36)}`;
  const mappings = buildDraftMappings(draftId, d.reportType ?? "t12", d.system, d.propertyId, d.period, rng);
  const rowCount = d.reportType === "rent_roll" ? (allPropertyRecords().find((p) => p.id === d.propertyId)?.units ?? 240) : mappings.length;

  return {
    id: draftId,
    file_name: file.name,
    file_format: format,
    file_size: file.size,
    report_type: d.reportType,
    property_id: d.propertyId,
    period: d.period,
    detected_source_format: d.system,
    needs_input: !d.reportType || !d.propertyId || !d.period,
    mappings,
    row_count: rowCount,
  };
}

function buildDraftMappings(
  draftId: string,
  reportType: ReportType,
  system: PmsSystem | null,
  propertyId: string | null,
  period: MonthKey | null,
  rng: ReturnType<typeof createRng>,
): DraftMapping[] {
  const template = mappingTemplate(reportType, system ?? "yardi");
  const months = period ? periodMonths("t12", period > LATEST_MONTH ? LATEST_MONTH : period) : [];
  const amountFor = (target: MappingTarget, share: number) => {
    if (!propertyId || target.startsWith("field:") || target === "ignore") return null;
    const kind = reportType === "budget" ? "budget" : "actual";
    return Math.round(months.reduce((s, m) => s + (ledgerRow(kind, propertyId, m)?.[target as keyof NonNullable<ReturnType<typeof ledgerRow>>] ?? 0), 0) * share);
  };
  const rows: DraftMapping[] = template.map((row, idx) => ({
    id: `${draftId}_m${idx}`,
    org_id: ORG_ID,
    import_id: draftId,
    source_label: row.source_label,
    source_code: row.source_code,
    amount: amountFor(row.target, row.share),
    // Unknown export formats get less certain mappings across the board.
    target: row.target,
    confidence: system ? row.confidence : Math.max(0.5, row.confidence - rng.range(0.04, 0.12)),
    confirmed_by_user: false,
    alternatives: [],
  }));
  if (reportType === "t12" || reportType === "budget") {
    const picks = [...UNUSUAL_LINES].sort(() => rng.next() - 0.5).slice(0, 2);
    const revenue = propertyId ? months.reduce((s, m) => s + (ledgerRow("actual", propertyId, m)?.other_income ?? 0), 0) : 0;
    picks.forEach((line, n) => {
      rows.push({
        id: `${draftId}_x${n}`,
        org_id: ORG_ID,
        import_id: draftId,
        source_label: line.label,
        source_code: line.code,
        amount: propertyId ? Math.round(revenue * rng.range(0.01, 0.04)) : null,
        target: line.target,
        confidence: line.confidence,
        confirmed_by_user: false,
        alternatives: line.alternatives,
      });
    });
  }
  return rows;
}

export interface ConfirmUploadInput {
  draft: UploadDraft;
  property_id: string;
  period: MonthKey;
  report_type: ReportType;
  mappings: AccountMapping[];
  /** Save without confirming flagged rows; the import lands in Needs review. */
  saveForReview?: boolean;
}

export interface ConfirmUploadResult {
  import: Import;
  property: PropertyRecord;
  previous_data_through: string;
  data_through: string;
  /** True when this upload brought the property into a new workspace's portfolio. */
  added_to_portfolio: boolean;
}

export async function confirmUpload(input: ConfirmUploadInput): Promise<ConfirmUploadResult> {
  await delay(500);
  const before = allPropertyRecords().find((p) => p.id === input.property_id)!;
  const wasInPortfolio = propertyRecords().some((p) => p.id === input.property_id);
  const now = `${TODAY}T${new Date().toISOString().slice(11, 19)}Z`;
  const unresolved = input.mappings.filter((m) => m.confidence < REVIEW_THRESHOLD && !m.confirmed_by_user).length;
  const status = input.saveForReview && unresolved ? "needs_review" : "processed";
  const imp: Import = {
    id: `imp_${Date.now().toString(36)}`,
    org_id: ORG_ID,
    data_source_id: "src_upload",
    file_name: input.draft.file_name,
    file_format: input.draft.file_format,
    file_size: input.draft.file_size,
    report_type: input.report_type,
    detected_source_format: input.draft.detected_source_format,
    property_id: input.property_id,
    period: input.period,
    status,
    status_detail: status === "needs_review" ? `${unresolved} line ${unresolved === 1 ? "item needs" : "items need"} confirmation` : null,
    uploaded_by: CURRENT_MEMBER_ID,
    uploaded_at: now,
    processed_at: status === "processed" ? now : null,
    row_count: input.draft.row_count,
  };
  writeOverlay((d) => {
    d.imports.unshift(imp);
    d.mappings.push(...input.mappings.map((m) => ({ ...stripDraft(m), import_id: imp.id })));
  });
  const after = allPropertyRecords().find((p) => p.id === input.property_id)!;
  const added = !wasInPortfolio && propertyRecords().some((p) => p.id === input.property_id);
  return { import: imp, property: after, previous_data_through: before.data_through, data_through: after.data_through, added_to_portfolio: added };
}

function stripDraft(m: AccountMapping): AccountMapping {
  const { id, org_id, import_id, source_label, source_code, amount, target, confidence, confirmed_by_user } = m as DraftMapping;
  return { id, org_id, import_id, source_label, source_code, amount, target, confidence, confirmed_by_user };
}

/** Resolve flagged rows on an import in Needs review and post it. */
export async function confirmImportReview(importId: string, targets: Record<string, MappingTarget>): Promise<ConfirmUploadResult> {
  await delay(500);
  const imp = effectiveImports().find((i) => i.id === importId);
  if (!imp) throw new Error("Import not found");
  const before = allPropertyRecords().find((p) => p.id === imp.property_id)!;
  const wasInPortfolio = propertyRecords().some((p) => p.id === imp.property_id);
  const now = `${TODAY}T${new Date().toISOString().slice(11, 19)}Z`;
  writeOverlay((d) => {
    for (const [mappingId, target] of Object.entries(targets)) {
      d.mappingPatches[mappingId] = { ...d.mappingPatches[mappingId], target, confirmed_by_user: true };
    }
    d.importPatches[importId] = { ...d.importPatches[importId], status: "processed", status_detail: null, processed_at: now };
  });
  const after = allPropertyRecords().find((p) => p.id === imp.property_id)!;
  const added = !wasInPortfolio && propertyRecords().some((p) => p.id === imp.property_id);
  return { import: { ...imp, status: "processed" }, property: after, previous_data_through: before.data_through, data_through: after.data_through, added_to_portfolio: added };
}

export async function deleteImport(importId: string): Promise<{ property: PropertyRecord }> {
  await delay(400);
  const imp = effectiveImports().find((i) => i.id === importId);
  if (!imp) throw new Error("Import not found");
  const isLocal = readOverlay().imports.some((i) => i.id === importId);
  writeOverlay((d) => {
    if (isLocal) {
      d.imports = d.imports.filter((i) => i.id !== importId);
      d.mappings = d.mappings.filter((m) => m.import_id !== importId);
    } else {
      d.deletedImportIds.push(importId);
    }
  });
  return { property: allPropertyRecords().find((p) => p.id === imp.property_id)! };
}

/** Imports for the same property, type, and period that a new upload would replace. */
export function findSupersededImport(propertyId: string, reportType: ReportType, period: MonthKey): Import | null {
  return effectiveImports().find((i) => i.property_id === propertyId && i.report_type === reportType && i.period === period && i.status === "processed") ?? null;
}
