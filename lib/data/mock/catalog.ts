import type {
  CapexProject,
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
  { id: "mem_dana", org_id: ORG_ID, name: "Dana Whitfield", email: "dana@alderpeak.com", title: "Owner / GP", role: "viewer", status: "active", initials: "DW" },
];

export const CURRENT_MEMBER_ID = "mem_jordan";
/** The owner Jordan reports to. The owner view previews what this member sees. */
export const OWNER_MEMBER_ID = "mem_dana";

export const propertyManagers: PropertyManager[] = [
  { id: "pm_summit", org_id: ORG_ID, name: "Summit Living", system: "rent_manager", contact_name: "Kara Lindqvist", contact_email: "klindqvist@summitliving.com" },
  { id: "pm_harbor", org_id: ORG_ID, name: "Harbor Property Group", system: "resman", contact_name: "Luis Ortega", contact_email: "lortega@harborpg.com" },
  { id: "pm_northgate", org_id: ORG_ID, name: "Northgate Residential", system: "yardi", contact_name: "Andre Coleman", contact_email: "acoleman@northgateres.com" },
  { id: "pm_crestline", org_id: ORG_ID, name: "Crestline Management", system: "appfolio", contact_name: "Marisol Vega", contact_email: "mvega@crestlinemgmt.com" },
];

/** Generation parameters per property; the story knobs live here. */
export interface PropertySeed {
  property: Property;
  /** Average market rent per unit in the latest year. */
  rent: number;
  /** Budgeted physical occupancy. */
  budgetOccupancy: number;
  /** System the uploaded files come from. Every property is fed by uploads for now. */
  uploadSystem: "yardi" | "entrata" | "appfolio" | "rent_manager" | "resman" | null;
  /** Hot markets get summer utility spikes. */
  summerUtilityLift: number;
  /** Story knobs, applied by the generator. */
  story?:
    | "vacancy_concessions"
    | "hvac"
    | "below_market"
    | "bad_debt"
    | "utilities_leak"
    | "payroll_contract_labor"
    | "landscaping"
    | "economic_gap";
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
  // Summit Living · Rent Manager
  {
    property: p("prop_mesa", "Mesa Verde Apartments", "Mesa Verde", "Phoenix", "Mesa", "AZ", "C", 196, 1986, "pm_summit", ["src_upload"], 1_120_000),
    rent: 1_140, budgetOccupancy: 0.94, uploadSystem: "rent_manager", summerUtilityLift: 0.34, story: "hvac",
  },
  {
    property: p("prop_willow", "Willow Bend", "Willow Bend", "Phoenix", "Tempe", "AZ", "C", 260, 1984, "pm_summit", ["src_upload"], 1_390_000),
    rent: 1_160, budgetOccupancy: 0.94, uploadSystem: "rent_manager", summerUtilityLift: 0.32, story: "payroll_contract_labor",
  },
  {
    property: p("prop_gulch", "Gulch Terrace", "Gulch Terrace", "Atlanta", "Atlanta", "GA", "A", 256, 2020, "pm_summit", ["src_upload"], 3_340_000),
    rent: 2_045, budgetOccupancy: 0.945, uploadSystem: "rent_manager", summerUtilityLift: 0.14,
  },
  // Harbor Property Group · ResMan
  {
    property: p("prop_lakeline", "Lakeline Flats", "Lakeline", "Austin", "Cedar Park", "TX", "A", 336, 2021, "pm_harbor", ["src_upload"], 4_020_000),
    rent: 1_865, budgetOccupancy: 0.95, uploadSystem: "resman", summerUtilityLift: 0.24, story: "vacancy_concessions",
  },
  {
    property: p("prop_magnolia", "Magnolia Court", "Magnolia", "Atlanta", "Decatur", "GA", "C", 168, 1979, "pm_harbor", ["src_upload"], 860_000),
    rent: 1_095, budgetOccupancy: 0.935, uploadSystem: "resman", summerUtilityLift: 0.16, story: "bad_debt",
  },
  {
    property: p("prop_peachtree", "Peachtree Landing", "Peachtree", "Atlanta", "Atlanta", "GA", "A", 324, 2018, "pm_harbor", ["src_upload"], 3_640_000),
    rent: 1_790, budgetOccupancy: 0.945, uploadSystem: "resman", summerUtilityLift: 0.18, story: "utilities_leak",
  },
  // Northgate Residential · Yardi
  {
    property: p("prop_brookstone", "Brookstone Park", "Brookstone", "Charlotte", "Charlotte", "NC", "B", 304, 2008, "pm_northgate", ["src_upload"], 2_520_000),
    rent: 1_545, budgetOccupancy: 0.95, uploadSystem: "yardi", summerUtilityLift: 0.15, story: "below_market",
  },
  {
    property: p("prop_oakridge", "Oakridge", "Oakridge", "Austin", "Austin", "TX", "B", 288, 2004, "pm_northgate", ["src_upload"], 2_540_000),
    rent: 1_495, budgetOccupancy: 0.95, uploadSystem: "yardi", summerUtilityLift: 0.28, story: "economic_gap",
  },
  {
    property: p("prop_vale", "The Vale", "The Vale", "Charlotte", "Charlotte", "NC", "A", 296, 2019, "pm_northgate", ["src_upload"], 3_610_000),
    rent: 1_980, budgetOccupancy: 0.945, uploadSystem: "yardi", summerUtilityLift: 0.15,
  },
  // Crestline Management · AppFolio
  {
    property: p("prop_crestline_north", "Crestline North", "Crestline N.", "Tampa", "Tampa", "FL", "B", 240, 2001, "pm_crestline", ["src_upload"], 1_960_000),
    rent: 1_610, budgetOccupancy: 0.95, uploadSystem: "appfolio", summerUtilityLift: 0.2, story: "landscaping",
  },
  {
    property: p("prop_crestline_south", "Crestline South", "Crestline S.", "Tampa", "Tampa", "FL", "B", 212, 1998, "pm_crestline", ["src_upload"], 1_640_000),
    rent: 1_540, budgetOccupancy: 0.95, uploadSystem: "appfolio", summerUtilityLift: 0.2, story: "landscaping",
  },
  {
    property: p("prop_crestline_commons", "Crestline Commons", "Crestline Commons", "Tampa", "Brandon", "FL", "C", 184, 1989, "pm_crestline", ["src_upload"], 1_020_000),
    rent: 1_320, budgetOccupancy: 0.94, uploadSystem: "appfolio", summerUtilityLift: 0.21, story: "landscaping",
  },
];

export const properties: Property[] = propertySeeds.map((s) => s.property);

const uploadIds = properties.filter((x) => x.data_source_ids.includes("src_upload")).map((x) => x.id);

export const dataSources: DataSource[] = [
  { id: "src_upload", org_id: ORG_ID, type: "upload", name: "Report uploads", status: "active", last_sync_at: null, records_synced: null, property_ids: uploadIds },
  // Connectors are on hold: RE-IQ is upload-only until PMS API costs make sense.
  // Restore these (and set the four properties' sources back) to demo connector-fed properties.
  // { id: "src_resman", org_id: ORG_ID, type: "resman", name: "ResMan · Harbor Property Group", status: "connected", last_sync_at: "2026-10-18T06:02:00Z", records_synced: 48_214, property_ids: ["prop_lakeline"] },
  // { id: "src_rentmanager", org_id: ORG_ID, type: "rent_manager", name: "Rent Manager · Summit Living", status: "connected", last_sync_at: "2026-10-18T05:41:00Z", records_synced: 31_877, property_ids: ["prop_mesa"] },
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

/** Capital projects by property: planned budget against spend to date. */
export const capexProjects: CapexProject[] = [
  { id: "cap_mesa_condensers", org_id: ORG_ID, property_id: "prop_mesa", name: "Condenser replacement, units 1203, 1104, 3102, 2205", planned: 31_000, spent: 30_640, status: "complete", completed_at: "2026-10-24" },
  { id: "cap_mesa_roofs", org_id: ORG_ID, property_id: "prop_mesa", name: "Roof replacement, buildings 4–6", planned: 186_000, spent: 0, status: "planned", completed_at: null },
  { id: "cap_willow_paving", org_id: ORG_ID, property_id: "prop_willow", name: "Parking lot resurfacing", planned: 94_000, spent: 88_200, status: "complete", completed_at: "2026-04-18" },
  { id: "cap_gulch_amenity", org_id: ORG_ID, property_id: "prop_gulch", name: "Package room expansion", planned: 42_000, spent: 18_500, status: "in_progress", completed_at: null },
  { id: "cap_lakeline_signage", org_id: ORG_ID, property_id: "prop_lakeline", name: "Monument signage and leasing office refresh", planned: 68_000, spent: 71_300, status: "complete", completed_at: "2026-08-30" },
  { id: "cap_magnolia_units", org_id: ORG_ID, property_id: "prop_magnolia", name: "Interior upgrades, 24 units", planned: 216_000, spent: 129_400, status: "in_progress", completed_at: null },
  { id: "cap_peachtree_pool", org_id: ORG_ID, property_id: "prop_peachtree", name: "Pool deck resurfacing", planned: 58_000, spent: 0, status: "planned", completed_at: null },
  { id: "cap_brookstone_units", org_id: ORG_ID, property_id: "prop_brookstone", name: "Interior upgrades, 40 units", planned: 320_000, spent: 236_000, status: "in_progress", completed_at: null },
  { id: "cap_oakridge_hvac", org_id: ORG_ID, property_id: "prop_oakridge", name: "Rooftop HVAC units, clubhouse", planned: 46_000, spent: 44_900, status: "complete", completed_at: "2026-06-12" },
  { id: "cap_vale_ev", org_id: ORG_ID, property_id: "prop_vale", name: "EV charging, 12 stalls", planned: 54_000, spent: 12_600, status: "in_progress", completed_at: null },
  { id: "cap_crestline_n_roof", org_id: ORG_ID, property_id: "prop_crestline_north", name: "Roof repairs, buildings 2 and 3", planned: 72_000, spent: 69_800, status: "complete", completed_at: "2026-05-22" },
  { id: "cap_crestline_c_siding", org_id: ORG_ID, property_id: "prop_crestline_commons", name: "Siding and paint", planned: 148_000, spent: 40_200, status: "in_progress", completed_at: null },
];

export function seedFor(propertyId: string): PropertySeed {
  const seed = propertySeeds.find((s) => s.property.id === propertyId);
  if (!seed) throw new Error(`Unknown property ${propertyId}`);
  return seed;
}
