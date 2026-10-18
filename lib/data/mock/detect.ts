import { LATEST_MONTH, monthKey } from "@/lib/dates";
import type { FileFormat, MappingTarget, MonthKey, PmsSystem, ReportType } from "@/lib/types";
import { propertySeeds } from "./catalog";

/**
 * Mock report detection. A real pipeline reads the file contents; this one
 * reads the file name, which is how most property-manager exports are named
 * anyway, and is enough to demo the review flow.
 */

export interface Detection {
  format: FileFormat | null;
  reportType: ReportType | null;
  propertyId: string | null;
  period: MonthKey | null;
  system: PmsSystem | null;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export function detectFormat(name: string): FileFormat | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "xlsx" || ext === "xls" || ext === "xlsm") return "xlsx";
  if (ext === "csv") return "csv";
  if (ext === "pdf") return "pdf";
  return null;
}

function detectReportType(name: string): ReportType | null {
  const n = name.toLowerCase().replace(/[_\-.]+/g, " ");
  if (/rent ?roll/.test(n)) return "rent_roll";
  if (/budget|\bfy ?\d{2,4}\b/.test(n)) return "budget";
  if (/aging|aged|receivable|delinquen|\bar\b/.test(n)) return "ar_aging";
  if (/work ?orders?|service ?issues?|\bwo\b|maintenance/.test(n)) return "work_orders";
  if (/t12|t 12|income ?statement|twelve|12 ?month|trailing|operating|\bis\b|p ?& ?l|pnl|financial/.test(n)) return "t12";
  return null;
}

function detectProperty(name: string): string | null {
  const n = name.toLowerCase().replace(/[^a-z]/g, "");
  let best: { id: string; len: number } | null = null;
  for (const { property } of propertySeeds) {
    const keys = [property.name, property.short_name, property.name.replace(/^The /, "")]
      .map((k) => k.toLowerCase().replace(/[^a-z]/g, ""))
      .filter((k) => k.length >= 5);
    for (const k of keys) {
      if (n.includes(k) && (!best || k.length > best.len)) best = { id: property.id, len: k.length };
    }
  }
  return best?.id ?? null;
}

function detectPeriod(name: string): MonthKey | null {
  const n = name.toLowerCase();
  // Sep2026, Sep 2026, september-2026, Sep26
  const named = n.match(/(?<![a-z])(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s_\-.]*(20\d{2}|\d{2})(?!\d)/);
  if (named) {
    const year = named[2].length === 2 ? 2000 + Number(named[2]) : Number(named[2]);
    return monthKey(year, MONTHS.indexOf(named[1]) + 1);
  }
  const iso = n.match(/(20\d{2})[\-_.](\d{2})(?:[\-_.]\d{2})?/);
  if (iso && Number(iso[2]) >= 1 && Number(iso[2]) <= 12) return monthKey(Number(iso[1]), Number(iso[2]));
  const us = n.match(/(?<!\d)(\d{2})[\-_.]?(\d{2})?[\-_.]?(20\d{2})(?!\d)/);
  if (us && Number(us[1]) >= 1 && Number(us[1]) <= 12) return monthKey(Number(us[3]), Number(us[1]));
  const short = n.match(/(?<!\d)(\d{2})(\d{2})(\d{2})(?!\d)/);
  if (short && Number(short[1]) >= 1 && Number(short[1]) <= 12) return monthKey(2000 + Number(short[3]), Number(short[1]));
  const fy = n.match(/fy ?(20\d{2})/);
  if (fy) return monthKey(Number(fy[1]), 12);
  return null;
}

function detectSystem(name: string, propertyId: string | null): PmsSystem | null {
  if (/twelvemonthis|_delinquency_/i.test(name)) return "resman";
  if (/ - 12 month income statement - | - aging detail - | - service issues - /i.test(name)) return "rent_manager";
  if (/^[a-z0-9]+(-[a-z0-9]+){3,}\.(xlsx|pdf|csv)$/.test(name)) return "appfolio";
  if (/_incomestatement_\d{4}-\d{2}/i.test(name)) return "entrata";
  if (/_t12_|_rentroll_|_agedreceivables_/i.test(name)) return "yardi";
  const seed = propertySeeds.find((s) => s.property.id === propertyId);
  if (seed?.uploadSystem) return seed.uploadSystem;
  if (propertyId === "prop_cedar" || propertyId === "prop_lakeline") return "resman";
  if (propertyId === "prop_mesa" || propertyId === "prop_saguaro") return "rent_manager";
  return null;
}

export function detect(name: string): Detection {
  const propertyId = detectProperty(name);
  const reportType = detectReportType(name);
  const period = detectPeriod(name);
  return {
    format: detectFormat(name),
    reportType,
    propertyId,
    // Budgets cover a future fiscal year; everything else must be a closed month.
    period: period && (reportType === "budget" || period <= LATEST_MONTH) ? period : null,
    system: detectSystem(name, propertyId),
  };
}

/**
 * Line items that rarely appear in a standard chart of accounts. The mock
 * parser adds two of these to new uploads so the review step has something
 * to review, the way real exports almost always do.
 */
export const UNUSUAL_LINES: { code: string; label: string; target: MappingTarget; confidence: number; alternatives: MappingTarget[] }[] = [
  { code: "6595", label: "R&M - Pool Service", target: "contract_services", confidence: 0.63, alternatives: ["repairs_maintenance"] },
  { code: "4895", label: "Corp Unit Revenue", target: "other_income", confidence: 0.58, alternatives: ["gross_potential_rent"] },
  { code: "6215", label: "Misc Turn Exp", target: "turnover", confidence: 0.61, alternatives: ["repairs_maintenance"] },
  { code: "7190", label: "Resident Events", target: "marketing", confidence: 0.56, alternatives: ["administrative"] },
  { code: "6420", label: "Resident Svcs - Pkg Lockers", target: "contract_services", confidence: 0.54, alternatives: ["administrative"] },
  { code: "4415", label: "Bad Debt Recovery", target: "bad_debt", confidence: 0.69, alternatives: ["other_income"] },
];
