import { formatMonth, monthEnd, parseMonth } from "@/lib/dates";
import type { AccountMapping, FileFormat, GlCategory, Import, MappingTarget, MonthKey, PmsSystem, ReportType } from "@/lib/types";
import { ORG_ID, propertySeeds, type PropertySeed } from "./catalog";
import { createRng } from "./random";

/**
 * Seeded import history and the source-to-normalized mapping templates the
 * mock "parser" uses. Each PMS exports a T12 with its own chart of accounts;
 * the templates below imitate those exports closely enough to demo mapping.
 */

/** Mappings below this confidence are flagged for a person to confirm. */
export const REVIEW_THRESHOLD = 0.75;

type GlTemplateRow = { code: string; label: string; target: GlCategory; share: number; confidence: number };

const GL_TEMPLATES: Record<PmsSystem, GlTemplateRow[]> = {
  yardi: [
    { code: "4010-0000", label: "Gross Potential Rent", target: "gross_potential_rent", share: 1, confidence: 0.99 },
    { code: "4110-0000", label: "Loss/Gain to Lease", target: "loss_to_lease", share: 1, confidence: 0.98 },
    { code: "4210-0000", label: "Vacancy Loss", target: "vacancy_loss", share: 1, confidence: 0.99 },
    { code: "4310-0000", label: "Concessions - Move In", target: "concessions", share: 0.7, confidence: 0.97 },
    { code: "4320-0000", label: "Concessions - Renewal", target: "concessions", share: 0.3, confidence: 0.96 },
    { code: "4410-0000", label: "Bad Debt Expense", target: "bad_debt", share: 1, confidence: 0.97 },
    { code: "4810-0000", label: "Utility Reimbursement (RUBS)", target: "other_income", share: 0.46, confidence: 0.94 },
    { code: "4820-0000", label: "Late Fees", target: "other_income", share: 0.18, confidence: 0.95 },
    { code: "4850-0000", label: "Pet Rent & Fees", target: "other_income", share: 0.21, confidence: 0.93 },
    { code: "4890-0000", label: "Misc Income", target: "other_income", share: 0.15, confidence: 0.88 },
    { code: "6010-0000", label: "Salaries - Office", target: "payroll", share: 0.42, confidence: 0.98 },
    { code: "6020-0000", label: "Salaries - Maintenance", target: "payroll", share: 0.43, confidence: 0.98 },
    { code: "6090-0000", label: "Payroll Taxes & Benefits", target: "payroll", share: 0.15, confidence: 0.95 },
    { code: "6510-0000", label: "R&M - HVAC", target: "repairs_maintenance", share: 0.38, confidence: 0.97 },
    { code: "6520-0000", label: "R&M - Plumbing", target: "repairs_maintenance", share: 0.24, confidence: 0.97 },
    { code: "6590-0000", label: "R&M - General Supplies", target: "repairs_maintenance", share: 0.38, confidence: 0.92 },
    { code: "6610-0000", label: "Turnover - Paint & Clean", target: "turnover", share: 0.64, confidence: 0.95 },
    { code: "6620-0000", label: "Turnover - Flooring", target: "turnover", share: 0.36, confidence: 0.93 },
    { code: "6710-0000", label: "Electric - Common Area", target: "utilities", share: 0.36, confidence: 0.98 },
    { code: "6720-0000", label: "Water & Sewer", target: "utilities", share: 0.52, confidence: 0.98 },
    { code: "6730-0000", label: "Gas", target: "utilities", share: 0.12, confidence: 0.97 },
    { code: "6810-0000", label: "Landscaping Contract", target: "contract_services", share: 0.46, confidence: 0.96 },
    { code: "6820-0000", label: "Pest Control", target: "contract_services", share: 0.2, confidence: 0.97 },
    { code: "6830-0000", label: "Trash Removal", target: "contract_services", share: 0.34, confidence: 0.96 },
    { code: "7010-0000", label: "Advertising & ILS", target: "marketing", share: 1, confidence: 0.95 },
    { code: "7110-0000", label: "Office & Admin", target: "administrative", share: 0.7, confidence: 0.9 },
    { code: "7150-0000", label: "Software & Telecom", target: "administrative", share: 0.3, confidence: 0.86 },
    { code: "7210-0000", label: "Management Fees", target: "management_fees", share: 1, confidence: 0.99 },
    { code: "7310-0000", label: "Property Insurance", target: "insurance", share: 1, confidence: 0.98 },
    { code: "7410-0000", label: "Real Estate Taxes", target: "property_taxes", share: 1, confidence: 0.99 },
  ],
  entrata: [
    { code: "40000", label: "Market Rent", target: "gross_potential_rent", share: 1, confidence: 0.96 },
    { code: "40100", label: "Gain/Loss to Lease", target: "loss_to_lease", share: 1, confidence: 0.97 },
    { code: "40200", label: "Vacancy", target: "vacancy_loss", share: 1, confidence: 0.98 },
    { code: "40300", label: "Rent Concessions", target: "concessions", share: 1, confidence: 0.97 },
    { code: "40400", label: "Write-offs, Net of Recovery", target: "bad_debt", share: 1, confidence: 0.91 },
    { code: "43000", label: "Utility Income", target: "other_income", share: 0.5, confidence: 0.93 },
    { code: "43500", label: "Fee Income", target: "other_income", share: 0.3, confidence: 0.92 },
    { code: "43900", label: "Amenity & Parking Income", target: "other_income", share: 0.2, confidence: 0.9 },
    { code: "50000", label: "Payroll - On-site", target: "payroll", share: 0.86, confidence: 0.97 },
    { code: "50500", label: "Payroll Burden", target: "payroll", share: 0.14, confidence: 0.94 },
    { code: "52000", label: "Repairs - HVAC", target: "repairs_maintenance", share: 0.36, confidence: 0.96 },
    { code: "52100", label: "Repairs - Plumbing", target: "repairs_maintenance", share: 0.22, confidence: 0.96 },
    { code: "52900", label: "Repairs - Other", target: "repairs_maintenance", share: 0.42, confidence: 0.9 },
    { code: "53000", label: "Make Ready", target: "turnover", share: 1, confidence: 0.94 },
    { code: "54000", label: "Utilities - Electric", target: "utilities", share: 0.38, confidence: 0.98 },
    { code: "54100", label: "Utilities - Water/Sewer", target: "utilities", share: 0.62, confidence: 0.98 },
    { code: "55000", label: "Contract Services", target: "contract_services", share: 1, confidence: 0.93 },
    { code: "56000", label: "Marketing", target: "marketing", share: 1, confidence: 0.96 },
    { code: "57000", label: "General & Administrative", target: "administrative", share: 1, confidence: 0.92 },
    { code: "58000", label: "Management Fee", target: "management_fees", share: 1, confidence: 0.99 },
    { code: "59000", label: "Insurance", target: "insurance", share: 1, confidence: 0.98 },
    { code: "59500", label: "Property Taxes", target: "property_taxes", share: 1, confidence: 0.99 },
  ],
  appfolio: [
    { code: "4100", label: "Rent Income", target: "gross_potential_rent", share: 1, confidence: 0.84 },
    { code: "4105", label: "Loss to Lease", target: "loss_to_lease", share: 1, confidence: 0.96 },
    { code: "4110", label: "Vacancy", target: "vacancy_loss", share: 1, confidence: 0.97 },
    { code: "4120", label: "Concessions", target: "concessions", share: 1, confidence: 0.97 },
    { code: "4190", label: "Bad Debt", target: "bad_debt", share: 1, confidence: 0.95 },
    { code: "4400", label: "Late Fee Income", target: "other_income", share: 0.44, confidence: 0.94 },
    { code: "4410", label: "Laundry Income", target: "other_income", share: 0.31, confidence: 0.92 },
    { code: "4420", label: "Corporate Housing Revenue", target: "other_income", share: 0.25, confidence: 0.81 },
    { code: "6010", label: "Payroll", target: "payroll", share: 1, confidence: 0.97 },
    { code: "6210", label: "Repairs", target: "repairs_maintenance", share: 0.74, confidence: 0.93 },
    { code: "6215", label: "Misc Turn Exp", target: "turnover", share: 1, confidence: 0.61 },
    { code: "6220", label: "Supplies", target: "repairs_maintenance", share: 0.26, confidence: 0.88 },
    { code: "6310", label: "Electricity", target: "utilities", share: 0.4, confidence: 0.98 },
    { code: "6320", label: "Water/Sewer", target: "utilities", share: 0.6, confidence: 0.98 },
    { code: "6410", label: "Landscaping", target: "contract_services", share: 0.4, confidence: 0.96 },
    { code: "6420", label: "Resident Svcs - Pkg Lockers", target: "contract_services", share: 0.12, confidence: 0.54 },
    { code: "6430", label: "Pest & Trash", target: "contract_services", share: 0.48, confidence: 0.9 },
    { code: "6510", label: "Advertising", target: "marketing", share: 1, confidence: 0.95 },
    { code: "6610", label: "Admin Expenses", target: "administrative", share: 1, confidence: 0.91 },
    { code: "6710", label: "Management Fees", target: "management_fees", share: 1, confidence: 0.99 },
    { code: "6810", label: "Insurance", target: "insurance", share: 1, confidence: 0.98 },
    { code: "6910", label: "Property Tax", target: "property_taxes", share: 1, confidence: 0.99 },
  ],
  rent_manager: [
    { code: "40000", label: "Potential Rent", target: "gross_potential_rent", share: 1, confidence: 0.97 },
    { code: "40050", label: "Loss to Lease", target: "loss_to_lease", share: 1, confidence: 0.97 },
    { code: "40100", label: "Vacancy Loss", target: "vacancy_loss", share: 1, confidence: 0.99 },
    { code: "40150", label: "Concessions", target: "concessions", share: 1, confidence: 0.98 },
    { code: "40200", label: "Bad Debt Write Off", target: "bad_debt", share: 1, confidence: 0.96 },
    { code: "41000", label: "Other Tenant Charges", target: "other_income", share: 1, confidence: 0.89 },
    { code: "60000", label: "Salaries & Wages", target: "payroll", share: 1, confidence: 0.97 },
    { code: "62000", label: "Maintenance & Repairs", target: "repairs_maintenance", share: 1, confidence: 0.95 },
    { code: "62500", label: "Unit Turnover", target: "turnover", share: 1, confidence: 0.95 },
    { code: "63000", label: "Utilities", target: "utilities", share: 1, confidence: 0.98 },
    { code: "64000", label: "Contracted Services", target: "contract_services", share: 1, confidence: 0.94 },
    { code: "65000", label: "Marketing & Leasing", target: "marketing", share: 1, confidence: 0.95 },
    { code: "66000", label: "Administrative", target: "administrative", share: 1, confidence: 0.93 },
    { code: "67000", label: "Management Fees", target: "management_fees", share: 1, confidence: 0.99 },
    { code: "68000", label: "Insurance", target: "insurance", share: 1, confidence: 0.98 },
    { code: "69000", label: "Real Estate Taxes", target: "property_taxes", share: 1, confidence: 0.99 },
  ],
  resman: [
    { code: "4000", label: "Gross Market Rent", target: "gross_potential_rent", share: 1, confidence: 0.98 },
    { code: "4010", label: "Gain/Loss to Lease", target: "loss_to_lease", share: 1, confidence: 0.97 },
    { code: "4020", label: "Vacancy Loss", target: "vacancy_loss", share: 1, confidence: 0.99 },
    { code: "4030", label: "Concessions", target: "concessions", share: 1, confidence: 0.98 },
    { code: "4040", label: "Bad Debt", target: "bad_debt", share: 1, confidence: 0.97 },
    { code: "4500", label: "Ancillary Income", target: "other_income", share: 1, confidence: 0.92 },
    { code: "5000", label: "Payroll - Office", target: "payroll", share: 0.36, confidence: 0.97 },
    { code: "5010", label: "Payroll - Maintenance", target: "payroll", share: 0.44, confidence: 0.97 },
    { code: "5015", label: "Contract Labor", target: "payroll", share: 0.2, confidence: 0.74 },
    { code: "5100", label: "Repairs & Maintenance", target: "repairs_maintenance", share: 1, confidence: 0.96 },
    { code: "5200", label: "Make Ready", target: "turnover", share: 1, confidence: 0.95 },
    { code: "5300", label: "Utilities", target: "utilities", share: 1, confidence: 0.98 },
    { code: "5400", label: "Contract Services", target: "contract_services", share: 1, confidence: 0.95 },
    { code: "5500", label: "Marketing", target: "marketing", share: 1, confidence: 0.96 },
    { code: "5600", label: "General & Admin", target: "administrative", share: 1, confidence: 0.94 },
    { code: "5700", label: "Management Fee", target: "management_fees", share: 1, confidence: 0.99 },
    { code: "5800", label: "Insurance", target: "insurance", share: 1, confidence: 0.98 },
    { code: "5900", label: "Property Taxes", target: "property_taxes", share: 1, confidence: 0.99 },
  ],
};

type FieldTemplateRow = { label: string; target: MappingTarget; confidence: number };

const FIELD_TEMPLATES: Record<Exclude<ReportType, "t12" | "budget">, FieldTemplateRow[]> = {
  rent_roll: [
    { label: "Unit", target: "field:unit_number", confidence: 0.99 },
    { label: "Unit Type", target: "field:floorplan", confidence: 0.95 },
    { label: "Sq Ft", target: "field:sqft", confidence: 0.98 },
    { label: "Market Rent", target: "field:market_rent", confidence: 0.98 },
    { label: "Lease Rent", target: "field:lease_rent", confidence: 0.96 },
    { label: "Lease From", target: "field:lease_start", confidence: 0.97 },
    { label: "Lease To", target: "field:lease_end", confidence: 0.97 },
    { label: "Status", target: "field:unit_status", confidence: 0.94 },
    { label: "Resident", target: "ignore", confidence: 0.99 },
  ],
  ar_aging: [
    { label: "Unit", target: "field:unit_number", confidence: 0.99 },
    { label: "Resident", target: "ignore", confidence: 0.99 },
    { label: "0-30", target: "field:balance_0_30", confidence: 0.97 },
    { label: "31-60", target: "field:balance_31_60", confidence: 0.97 },
    { label: "61-90", target: "field:balance_61_90", confidence: 0.97 },
    { label: "Over 90", target: "field:balance_90_plus", confidence: 0.96 },
    { label: "Prepaid", target: "field:prepaid", confidence: 0.9 },
    { label: "Total", target: "field:balance_total", confidence: 0.99 },
  ],
  work_orders: [
    { label: "WO #", target: "field:wo_number", confidence: 0.98 },
    { label: "Unit", target: "field:unit_number", confidence: 0.98 },
    { label: "Category", target: "field:wo_category", confidence: 0.9 },
    { label: "Brief Desc", target: "field:wo_description", confidence: 0.93 },
    { label: "Priority", target: "field:wo_priority", confidence: 0.95 },
    { label: "Status", target: "field:wo_status", confidence: 0.96 },
    { label: "Call Date", target: "field:wo_opened", confidence: 0.92 },
    { label: "Complete Date", target: "field:wo_completed", confidence: 0.92 },
    { label: "Vendor", target: "field:vendor", confidence: 0.94 },
    { label: "Total Cost", target: "field:wo_cost", confidence: 0.95 },
  ],
};

/** Labels for normalized fields, used in mapping previews. */
export const FIELD_LABELS: Record<string, string> = {
  unit_number: "Unit number",
  floorplan: "Floorplan",
  sqft: "Square feet",
  market_rent: "Market rent",
  lease_rent: "Lease rent",
  lease_start: "Lease start",
  lease_end: "Lease end",
  unit_status: "Unit status",
  balance_0_30: "Balance 0–30 days",
  balance_31_60: "Balance 31–60 days",
  balance_61_90: "Balance 61–90 days",
  balance_90_plus: "Balance 90+ days",
  prepaid: "Prepaid balance",
  balance_total: "Total balance",
  wo_number: "Work order number",
  wo_category: "Category",
  wo_description: "Description",
  wo_priority: "Priority",
  wo_status: "Status",
  wo_opened: "Opened date",
  wo_completed: "Completed date",
  vendor: "Vendor",
  wo_cost: "Cost",
};

export function mappingTemplate(reportType: ReportType, system: PmsSystem) {
  if (reportType === "t12" || reportType === "budget") {
    return GL_TEMPLATES[system].map((r) => ({ source_code: r.code, source_label: r.label, target: r.target as MappingTarget, share: r.share, confidence: r.confidence }));
  }
  return FIELD_TEMPLATES[reportType].map((r) => ({ source_code: null, source_label: r.label, target: r.target, share: 0, confidence: r.confidence }));
}

// ---- File names ---------------------------------------------------------

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function compact(name: string) {
  return name.replace(/^The /, "The").replace(/[^A-Za-z]/g, "");
}

export function buildFileName(seed: PropertySeed, type: ReportType, period: MonthKey, format?: FileFormat): string {
  const { property } = seed;
  const { year, month } = parseMonth(period);
  const mon = MONTH_ABBR[month - 1];
  const mm = String(month).padStart(2, "0");
  const dd = monthEnd(period).slice(8);
  const yy = String(year).slice(2);
  switch (seed.uploadSystem) {
    case "yardi": {
      const short = compact(property.short_name);
      const ext = format ?? (type === "work_orders" ? "csv" : "xlsx");
      return {
        t12: `${short}_T12_${mon}${year}.${ext}`,
        rent_roll: `${short}_RentRoll_${mm}${dd}${year}.${ext}`,
        ar_aging: `${short}_AgedReceivables_${mon}${year}.${ext}`,
        work_orders: `${short}_WorkOrders_${mon}${year}.${ext}`,
        budget: `${short}_Budget_FY${year}.${ext}`,
      }[type];
    }
    case "entrata": {
      const short = compact(property.name);
      const ext = format ?? "csv";
      return {
        t12: `${short}_IncomeStatement_${year}-${mm}.${ext}`,
        rent_roll: `${short}_RentRoll_${year}-${mm}-${dd}.${ext}`,
        ar_aging: `${short}_AgedReceivables_${year}-${mm}.${ext}`,
        work_orders: `${short}_WorkOrders_${year}-${mm}.${ext}`,
        budget: `${short}_Budget_${year}.xlsx`,
      }[type];
    }
    case "appfolio": {
      const slug = property.name.toLowerCase().replace(/[^a-z]+/g, "-");
      const ext = format ?? (type === "ar_aging" ? "pdf" : "xlsx");
      return {
        t12: `${slug}-twelve-month-income-statement-${year}-${mm}.${ext}`,
        rent_roll: `${slug}-rent-roll-${year}-${mm}-${dd}.${ext}`,
        ar_aging: `${slug}-aged-receivables-${year}-${mm}.${ext}`,
        work_orders: `${slug}-work-orders-${year}-${mm}.${ext}`,
        budget: `${slug}-budget-${year}.${ext}`,
      }[type];
    }
    case "rent_manager": {
      const ext = format ?? "xlsx";
      return {
        t12: `${property.name} - 12 Month Income Statement - ${mon} ${year}.${ext}`,
        rent_roll: `${property.name} - Rent Roll - ${mm}.${dd}.${year}.${ext}`,
        ar_aging: `${property.name} - Aging Detail - ${mon} ${year}.${ext}`,
        work_orders: `${property.name} - Service Issues - ${mon} ${year}.${ext}`,
        budget: `${property.name} - Budget ${year}.${ext}`,
      }[type];
    }
    case "resman":
    default: {
      const short = compact(property.name);
      const ext = format ?? "xlsx";
      return {
        t12: `${short}_TwelveMonthIS_${mon}${yy}.${ext}`,
        rent_roll: `${short}_RentRoll_${mm}${dd}${yy}.${ext}`,
        ar_aging: `${short}_Delinquency_${mon}${yy}.${ext}`,
        work_orders: `${short}_WorkOrders_${mon}${yy}.${ext}`,
        budget: `${short}_Budget_${year}.${ext}`,
      }[type];
    }
  }
}

// ---- Seeded history -----------------------------------------------------

const UPLOADERS = ["mem_elena", "mem_elena", "mem_jordan", "mem_sam"];

function uploadedAt(period: MonthKey, rng: ReturnType<typeof createRng>, dayRange: [number, number]) {
  const { year, month } = parseMonth(period);
  const next = new Date(Date.UTC(year, month, rng.int(dayRange[0], dayRange[1]), rng.int(13, 22), rng.int(0, 59)));
  return next.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function seedImports(): Import[] {
  const out: Import[] = [];
  const uploadSeeds = propertySeeds.filter((s) => s.uploadSystem);
  const months: MonthKey[] = ["2026-07", "2026-08", "2026-09"];

  for (const seed of uploadSeeds) {
    const rng = createRng(`imports:${seed.property.id}`);
    const id = (suffix: string) => `imp_${seed.property.id.slice(5)}_${suffix}`;
    const system = seed.uploadSystem as PmsSystem;
    const base = {
      org_id: ORG_ID,
      data_source_id: "src_upload",
      property_id: seed.property.id,
      detected_source_format: system,
      status_detail: null,
    };

    const budgetAt = uploadedAt("2025-12", rng, [8, 20]);
    out.push({
      ...base,
      id: id("budget_2026"),
      file_name: buildFileName(seed, "budget", "2026-12"),
      file_format: "xlsx",
      file_size: rng.int(90, 180) * 1_000,
      report_type: "budget",
      period: "2026-12",
      status: "processed",
      uploaded_by: "mem_priya",
      uploaded_at: budgetAt,
      processed_at: budgetAt,
      row_count: GL_TEMPLATES[system].length * 12,
    });

    for (const period of months) {
      const types: ReportType[] = ["t12", "rent_roll", "ar_aging"];
      if (system === "yardi") types.push("work_orders");
      for (const type of types) {
        const at = uploadedAt(period, rng, [5, 13]);
        const fileName = buildFileName(seed, type, period);
        const format = fileName.split(".").pop() as FileFormat;
        const record: Import = {
          ...base,
          id: id(`${type}_${period.replace("-", "")}`),
          file_name: fileName,
          file_format: format,
          file_size: (type === "rent_roll" ? rng.int(140, 320) : rng.int(40, 120)) * 1_000,
          report_type: type,
          period,
          status: "processed",
          uploaded_by: rng.pick(UPLOADERS),
          uploaded_at: at,
          processed_at: at,
          row_count:
            type === "rent_roll" ? seed.property.units : type === "t12" ? GL_TEMPLATES[system].length : type === "ar_aging" ? rng.int(18, 60) : rng.int(120, 340),
        };

        if (period === "2026-09" && type === "t12" && seed.property.id === "prop_magnolia") {
          record.status = "needs_review";
          record.status_detail = "2 line items need confirmation before September posts";
          record.processed_at = null;
        }
        if (period === "2026-09" && type === "t12" && seed.property.id === "prop_hickory") {
          record.file_name = `${seed.property.name} - Financial Package - Sep 2026.pdf`;
          record.file_format = "pdf";
          record.file_size = 4_812_000;
          record.status = "failed";
          record.status_detail = "Scanned PDF with no text layer. Export the 12 Month Income Statement from Rent Manager as Excel and re-upload.";
          record.processed_at = null;
          record.row_count = 0;
        }
        out.push(record);
      }
    }
  }
  return out.sort((a, b) => (a.uploaded_at < b.uploaded_at ? 1 : -1));
}

let importCache: Import[] | null = null;
export function getSeedImports(): Import[] {
  if (!importCache) importCache = seedImports();
  return importCache;
}

/** Seed mappings, built on demand per import from the PMS template. */
export function seedMappingsFor(imp: Import, amountFor: (target: GlCategory) => number): AccountMapping[] {
  const system = imp.detected_source_format ?? "yardi";
  const template = mappingTemplate(imp.report_type, system);
  const needsReview = imp.status === "needs_review";
  return template.map((row, idx) => {
    const isGl = !row.target.startsWith("field:") && row.target !== "ignore";
    const lowConfidence = row.confidence < REVIEW_THRESHOLD;
    return {
      id: `${imp.id}_m${idx}`,
      org_id: ORG_ID,
      import_id: imp.id,
      source_label: row.source_label,
      source_code: row.source_code,
      amount: isGl ? Math.round(amountFor(row.target as GlCategory) * row.share) : null,
      target: row.target,
      confidence: row.confidence,
      // Low-confidence rows on processed imports were confirmed by someone earlier.
      confirmed_by_user: lowConfidence && !needsReview,
    };
  });
}

export function describePeriod(type: ReportType, period: MonthKey): string {
  if (type === "budget") return `FY${period.slice(0, 4)}`;
  if (type === "t12") return `12 months ending ${formatMonth(period)}`;
  if (type === "rent_roll" || type === "ar_aging") return `As of ${formatMonth(period, "tiny")} ${monthEnd(period).slice(8)}, ${period.slice(0, 4)}`;
  return formatMonth(period);
}
