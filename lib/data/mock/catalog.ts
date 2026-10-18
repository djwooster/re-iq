import type {
  DataSource,
  Member,
  Organization,
  Property,
  PropertyClass,
  PropertyManager,
  Vendor,
} from "@/lib/types";

/**
 * Static mock catalog: the organization, its team, property managers,
 * properties, vendors, and data sources. Monthly numbers are generated from
 * these definitions in `generate.ts`.
 */

export const ORG_ID = "org_alder_peak";

export const organization: Organization = {
  id: ORG_ID,
  name: "Alder Peak Capital",
  slug: "alder-peak",
  created_at: "2024-08-12T16:00:00Z",
};

export const members: Member[] = [
  { id: "mem_jordan", org_id: ORG_ID, name: "Jordan Reyes", email: "jordan@alderpeak.com", title: "Asset Manager", role: "admin", status: "active", initials: "JR" },
  { id: "mem_priya", org_id: ORG_ID, name: "Priya Natarajan", email: "priya@alderpeak.com", title: "VP, Asset Management", role: "admin", status: "active", initials: "PN" },
  { id: "mem_marcus", org_id: ORG_ID, name: "Marcus Bell", email: "marcus@alderpeak.com", title: "Chief Financial Officer", role: "member", status: "active", initials: "MB" },
  { id: "mem_elena", org_id: ORG_ID, name: "Elena Ortiz", email: "elena@alderpeak.com", title: "Asset Analyst", role: "member", status: "active", initials: "EO" },
  { id: "mem_sam", org_id: ORG_ID, name: "Sam Kowalski", email: "sam@alderpeak.com", title: "Asset Manager", role: "member", status: "active", initials: "SK" },
  { id: "mem_tess", org_id: ORG_ID, name: "Tess Hadley", email: "tess@hadleyfamilyoffice.com", title: "Investor, Hadley Family Office", role: "viewer", status: "active", initials: "TH" },
];

export const CURRENT_MEMBER_ID = "mem_jordan";

export const propertyManagers: PropertyManager[] = [
  { id: "pm_crestline", org_id: ORG_ID, name: "Crestline Residential", system: "yardi" },
  { id: "pm_harbor", org_id: ORG_ID, name: "Harbor Property Group", system: "resman" },
  { id: "pm_summit", org_id: ORG_ID, name: "Summit Living Management", system: "rent_manager" },
  { id: "pm_meridian", org_id: ORG_ID, name: "Meridian Residential", system: "entrata" },
];

/** Generation parameters per property; the story knobs live here. */
export interface PropertySeed {
  property: Property;
  /** Average market rent per unit in the latest year. */
  rent: number;
  /** Budgeted physical occupancy. */
  budgetOccupancy: number;
  /** Systems the files come from, when the property is fed by uploads. */
  uploadSystem: "yardi" | "entrata" | "appfolio" | "rent_manager" | "resman" | null;
  /** Hot markets get summer utility spikes. */
  summerUtilityLift: number;
  /** Story knobs, applied by the generator. */
  story?: "vacancy_concessions" | "hvac" | "below_market" | "bad_debt" | "utilities_leak" | "payroll_contract_labor";
}

function p(
  id: string,
  name: string,
  short_name: string,
  market: string,
  city: string,
  state: string,
  cls: PropertyClass,
  units: number,
  year_built: number,
  pm: string,
  sources: string[],
  debtService: number,
): Property {
  return {
    id,
    org_id: ORG_ID,
    name,
    short_name,
    market,
    city,
    state,
    class: cls,
    units,
    year_built,
    property_manager_id: pm,
    data_source_ids: sources,
    annual_debt_service: debtService,
  };
}

export const propertySeeds: PropertySeed[] = [
  {
    property: p("prop_oakridge", "Oakridge Commons", "Oakridge", "Austin", "Austin", "TX", "B", 336, 2004, "pm_crestline", ["src_upload"], 2_960_000),
    rent: 1_495, budgetOccupancy: 0.95, uploadSystem: "yardi", summerUtilityLift: 0.28,
  },
  {
    property: p("prop_vale", "The Vale at Riverside", "The Vale", "Austin", "Austin", "TX", "A", 296, 2019, "pm_crestline", ["src_upload"], 3_610_000),
    rent: 1_980, budgetOccupancy: 0.945, uploadSystem: "yardi", summerUtilityLift: 0.25,
  },
  {
    property: p("prop_cedar", "Cedar Hollow", "Cedar Hollow", "Dallas–Fort Worth", "Irving", "TX", "B", 248, 1998, "pm_harbor", ["src_resman"], 1_980_000),
    rent: 1_385, budgetOccupancy: 0.95, uploadSystem: null, summerUtilityLift: 0.26,
  },
  {
    property: p("prop_lakeline", "Lakeline Flats", "Lakeline", "Dallas–Fort Worth", "Frisco", "TX", "A", 372, 2021, "pm_harbor", ["src_resman"], 4_420_000),
    rent: 1_865, budgetOccupancy: 0.95, uploadSystem: null, summerUtilityLift: 0.24, story: "vacancy_concessions",
  },
  {
    property: p("prop_mesa", "Mesa Verde Apartments", "Mesa Verde", "Phoenix", "Mesa", "AZ", "C", 196, 1986, "pm_summit", ["src_rentmanager"], 1_120_000),
    rent: 1_140, budgetOccupancy: 0.94, uploadSystem: null, summerUtilityLift: 0.34, story: "hvac",
  },
  {
    property: p("prop_saguaro", "Saguaro Ridge", "Saguaro Ridge", "Phoenix", "Chandler", "AZ", "B", 276, 2006, "pm_summit", ["src_rentmanager"], 2_240_000),
    rent: 1_520, budgetOccupancy: 0.95, uploadSystem: null, summerUtilityLift: 0.32,
  },
  {
    property: p("prop_peachtree", "Peachtree Landing", "Peachtree", "Atlanta", "Atlanta", "GA", "A", 348, 2018, "pm_meridian", ["src_upload"], 3_890_000),
    rent: 1_790, budgetOccupancy: 0.945, uploadSystem: "entrata", summerUtilityLift: 0.18, story: "utilities_leak",
  },
  {
    property: p("prop_magnolia", "Magnolia Court", "Magnolia", "Atlanta", "Decatur", "GA", "C", 168, 1979, "pm_meridian", ["src_upload"], 860_000),
    rent: 1_095, budgetOccupancy: 0.935, uploadSystem: "appfolio", summerUtilityLift: 0.16, story: "bad_debt",
  },
  {
    property: p("prop_brookstone", "Brookstone Park", "Brookstone", "Charlotte", "Charlotte", "NC", "B", 304, 2008, "pm_crestline", ["src_upload"], 2_520_000),
    rent: 1_545, budgetOccupancy: 0.95, uploadSystem: "yardi", summerUtilityLift: 0.15, story: "below_market",
  },
  {
    property: p("prop_foundry", "The Foundry Lofts", "Foundry Lofts", "Charlotte", "Charlotte", "NC", "A", 214, 2016, "pm_meridian", ["src_upload"], 2_480_000),
    rent: 1_895, budgetOccupancy: 0.945, uploadSystem: "entrata", summerUtilityLift: 0.14,
  },
  {
    property: p("prop_hickory", "Hickory Station", "Hickory", "Nashville", "Nashville", "TN", "B", 300, 2009, "pm_summit", ["src_upload"], 2_410_000),
    rent: 1_560, budgetOccupancy: 0.95, uploadSystem: "rent_manager", summerUtilityLift: 0.15,
  },
  {
    property: p("prop_gulch", "Gulch Terrace", "Gulch Terrace", "Nashville", "Nashville", "TN", "A", 256, 2020, "pm_crestline", ["src_upload"], 3_340_000),
    rent: 2_045, budgetOccupancy: 0.945, uploadSystem: "yardi", summerUtilityLift: 0.14,
  },
  {
    property: p("prop_willow", "Willow Bend", "Willow Bend", "Dallas–Fort Worth", "Garland", "TX", "C", 260, 1984, "pm_harbor", ["src_upload"], 1_390_000),
    rent: 1_160, budgetOccupancy: 0.94, uploadSystem: "resman", summerUtilityLift: 0.27, story: "payroll_contract_labor",
  },
  {
    property: p("prop_camelback", "Camelback Vista", "Camelback", "Phoenix", "Phoenix", "AZ", "B", 216, 2002, "pm_summit", ["src_upload"], 1_710_000),
    rent: 1_430, budgetOccupancy: 0.95, uploadSystem: "rent_manager", summerUtilityLift: 0.33,
  },
];

export const properties: Property[] = propertySeeds.map((s) => s.property);

const uploadIds = properties.filter((x) => x.data_source_ids.includes("src_upload")).map((x) => x.id);

export const dataSources: DataSource[] = [
  { id: "src_upload", org_id: ORG_ID, type: "upload", name: "Report uploads", status: "active", last_sync_at: null, records_synced: null, property_ids: uploadIds },
  { id: "src_resman", org_id: ORG_ID, type: "resman", name: "ResMan · Harbor Property Group", status: "connected", last_sync_at: "2026-10-18T06:02:00Z", records_synced: 48_214, property_ids: ["prop_cedar", "prop_lakeline"] },
  { id: "src_rentmanager", org_id: ORG_ID, type: "rent_manager", name: "Rent Manager · Summit Living", status: "connected", last_sync_at: "2026-10-18T05:41:00Z", records_synced: 31_877, property_ids: ["prop_mesa", "prop_saguaro"] },
];

const crestline = properties.filter((x) => x.property_manager_id === "pm_crestline").map((x) => x.id);
const allIds = properties.map((x) => x.id);
const phoenix = properties.filter((x) => x.market === "Phoenix").map((x) => x.id);
const notPhoenix = allIds.filter((id) => !phoenix.includes(id));

/**
 * Vendors and the share of a GL category each one represents at the
 * properties it serves. Shares within a category stay below 1; the remainder
 * is in-house labor and materials.
 */
export const vendors: Vendor[] = [
  { id: "ven_greenscape", org_id: ORG_ID, name: "GreenScape Grounds Co.", category: "Landscaping", gl_category: "contract_services", share: 0.46, property_ids: crestline, benchmark_per_unit: 168 },
  { id: "ven_terra", org_id: ORG_ID, name: "Terra Verde Landscapes", category: "Landscaping", gl_category: "contract_services", share: 0.4, property_ids: allIds.filter((id) => !crestline.includes(id)), benchmark_per_unit: 168 },
  { id: "ven_apex", org_id: ORG_ID, name: "Apex Pest Solutions", category: "Pest control", gl_category: "contract_services", share: 0.2, property_ids: allIds, benchmark_per_unit: 84 },
  { id: "ven_metro", org_id: ORG_ID, name: "Metro Waste Partners", category: "Waste removal", gl_category: "contract_services", share: 0.26, property_ids: allIds, benchmark_per_unit: null },
  { id: "ven_coolflow", org_id: ORG_ID, name: "Coolflow Mechanical", category: "HVAC", gl_category: "repairs_maintenance", share: 0.34, property_ids: phoenix, benchmark_per_unit: null },
  { id: "ven_allseason", org_id: ORG_ID, name: "All Season Air", category: "HVAC", gl_category: "repairs_maintenance", share: 0.22, property_ids: notPhoenix, benchmark_per_unit: null },
  { id: "ven_clearpath", org_id: ORG_ID, name: "ClearPath Plumbing", category: "Plumbing", gl_category: "repairs_maintenance", share: 0.16, property_ids: allIds, benchmark_per_unit: null },
  { id: "ven_brightturn", org_id: ORG_ID, name: "BrightTurn Make-Ready", category: "Turnover", gl_category: "turnover", share: 0.62, property_ids: allIds, benchmark_per_unit: null },
  { id: "ven_staffbridge", org_id: ORG_ID, name: "StaffBridge Maintenance", category: "Contract labor", gl_category: "payroll", share: 0.14, property_ids: ["prop_willow"], benchmark_per_unit: null },
];

export function seedFor(propertyId: string): PropertySeed {
  const seed = propertySeeds.find((s) => s.property.id === propertyId);
  if (!seed) throw new Error(`Unknown property ${propertyId}`);
  return seed;
}
