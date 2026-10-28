/**
 * Writes the report files usability-test participants upload into an empty
 * workspace, to public/test-files/ (plus a zip of them). The mock parser reads
 * file names, so each name follows its property manager's export convention;
 * the contents come from the same generated ledger the app shows.
 *
 *   npx tsx scripts/make-test-files.ts
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LATEST_MONTH, addMonths, compareMonths, formatMonth, monthRange, periodMonths } from "@/lib/dates";
import { seedFor } from "@/lib/data/mock/catalog";
import { getGenerated } from "@/lib/data/mock/generate";
import { buildFileName, mappingTemplate } from "@/lib/data/mock/imports";
import type { GlCategory, MonthKey, PmsSystem, ReportType } from "@/lib/types";

const OUT = join(process.cwd(), "public", "test-files");

const FILES: { propertyId: string; type: ReportType; period: MonthKey }[] = [
  { propertyId: "prop_oakridge", type: "t12", period: LATEST_MONTH },
  { propertyId: "prop_brookstone", type: "t12", period: LATEST_MONTH },
  { propertyId: "prop_brookstone", type: "rent_roll", period: LATEST_MONTH },
  { propertyId: "prop_peachtree", type: "t12", period: LATEST_MONTH },
  { propertyId: "prop_magnolia", type: "t12", period: LATEST_MONTH },
  { propertyId: "prop_willow", type: "t12", period: LATEST_MONTH },
  { propertyId: "prop_hickory", type: "t12", period: LATEST_MONTH },
  { propertyId: "prop_hickory", type: "budget", period: "2026-12" },
  // A month behind, so the portfolio has a property missing its latest T12.
  { propertyId: "prop_gulch", type: "t12", period: addMonths(LATEST_MONTH, -1) },
];

const g = getGenerated();

function ledger(kind: "actual" | "budget", propertyId: string, month: MonthKey, category: GlCategory) {
  // Generated budgets stop at the latest month; later budget months repeat the prior year's.
  if (compareMonths(month, LATEST_MONTH) > 0) return ledger(kind, propertyId, addMonths(month, -12), category);
  return g[kind].filter((l) => l.property_id === propertyId && l.month === month && l.category === category).reduce((s, l) => s + l.amount, 0);
}

const csv = (rows: (string | number)[][]) => rows.map((r) => r.map((c) => (typeof c === "string" && /[",]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n") + "\n";

function glReport(propertyId: string, system: PmsSystem, kind: "actual" | "budget", months: MonthKey[]) {
  const rows = mappingTemplate("t12", system).map((row) => {
    const values = months.map((m) => Math.round(ledger(kind, propertyId, m, row.target as GlCategory) * row.share));
    return [row.source_code ?? "", row.source_label, ...values, values.reduce((s, v) => s + v, 0)];
  });
  return csv([["Account", "Description", ...months.map((m) => formatMonth(m)), "Total"], ...rows]);
}

function rentRoll(propertyId: string) {
  const leases = new Map(g.leases.filter((l) => l.property_id === propertyId).map((l) => [l.unit_id, l]));
  const rows = g.units
    .filter((u) => u.property_id === propertyId)
    .map((u) => {
      const lease = leases.get(u.id);
      return [u.unit_number, u.floorplan, u.sqft, u.market_rent, lease?.rent ?? "", lease?.start_date ?? "", lease?.end_date ?? "", lease ? "Occupied" : "Vacant"];
    });
  return csv([["Unit", "Unit Type", "Sq Ft", "Market Rent", "Lease Rent", "Lease From", "Lease To", "Status"], ...rows]);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const f of FILES) {
  const seed = seedFor(f.propertyId);
  const system = seed.uploadSystem ?? "yardi";
  const name = buildFileName(seed, f.type, f.period, "csv");
  const body =
    f.type === "rent_roll"
      ? rentRoll(f.propertyId)
      : f.type === "budget"
        ? glReport(f.propertyId, system, "budget", monthRange(`${f.period.slice(0, 4)}-01`, f.period))
        : glReport(f.propertyId, system, "actual", periodMonths("t12", f.period));
  writeFileSync(join(OUT, name), body);
  console.log(name);
}

execFileSync("zip", ["-qj", join(OUT, "re-iq-test-files.zip"), ...FILES.map((f) => join(OUT, buildFileName(seedFor(f.propertyId), f.type, f.period, "csv")))]);
console.log("re-iq-test-files.zip");
