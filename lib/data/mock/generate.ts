import { ALL_MONTHS, TODAY, addDays, parseMonth } from "@/lib/dates";
import type {
  BudgetLine,
  ExpenseCategory,
  GlCategory,
  Lease,
  LedgerLine,
  OccupancySnapshot,
  PropertyClass,
  Unit,
  WorkOrder,
  WorkOrderCategory,
} from "@/lib/types";
import { ORG_ID, propertySeeds, type PropertySeed } from "./catalog";
import { createRng } from "./random";

/**
 * Generates 24 months of budget and actual GL lines, month-end occupancy,
 * a current rent roll, and open work orders for every property. Pure and
 * deterministic: the same catalog always yields the same portfolio. Every
 * amount is rounded to whole dollars so totals add up exactly across views.
 */

interface ClassProfile {
  ltl: number;
  concessions: number;
  badDebt: number;
  otherIncome: number; // per unit per month
  delinquency: number;
  opex: Record<Exclude<ExpenseCategory, "management_fees">, number>; // per unit per month
}

const PROFILES: Record<PropertyClass, ClassProfile> = {
  A: {
    ltl: 0.022, concessions: 0.01, badDebt: 0.005, otherIncome: 96, delinquency: 0.013,
    opex: { payroll: 128, repairs_maintenance: 38, turnover: 26, utilities: 58, contract_services: 34, marketing: 22, administrative: 26, insurance: 44, property_taxes: 236 },
  },
  B: {
    ltl: 0.025, concessions: 0.006, badDebt: 0.008, otherIncome: 68, delinquency: 0.022,
    opex: { payroll: 122, repairs_maintenance: 44, turnover: 28, utilities: 66, contract_services: 34, marketing: 13, administrative: 24, insurance: 38, property_taxes: 176 },
  },
  C: {
    ltl: 0.02, concessions: 0.004, badDebt: 0.012, otherIncome: 44, delinquency: 0.036,
    opex: { payroll: 112, repairs_maintenance: 58, turnover: 30, utilities: 78, contract_services: 32, marketing: 8, administrative: 22, insurance: 40, property_taxes: 118 },
  },
};

const MANAGEMENT_FEE = 0.03;
const REVENUE = new Set<GlCategory>(["gross_potential_rent", "loss_to_lease", "vacancy_loss", "concessions", "bad_debt", "other_income"]);
const RENT_GROWTH = 0.031;
const EXPENSE_INFLATION = 0.035;

/** Per-property bias on occupancy and expenses, so the portfolio is not uniform. */
const BIAS: Record<string, { occ: number; opex: number; rent: number }> = {
  prop_gulch: { occ: 0.009, opex: -0.02, rent: 0.006 },
  prop_foundry: { occ: 0.006, opex: -0.015, rent: 0.004 },
  prop_cedar: { occ: 0.004, opex: -0.01, rent: 0 },
  prop_saguaro: { occ: -0.004, opex: 0.01, rent: 0 },
  prop_oakridge: { occ: -0.006, opex: 0.012, rent: -0.002 },
  prop_camelback: { occ: -0.003, opex: 0.006, rent: 0 },
  prop_vale: { occ: 0.002, opex: 0.004, rent: 0 },
};

const FLOORPLANS = [
  { name: "S1", label: "Studio", bedrooms: 0, sqft: 540, factor: 0.8 },
  { name: "A1", label: "1 bd / 1 ba", bedrooms: 1, sqft: 735, factor: 0.92 },
  { name: "B1", label: "2 bd / 2 ba", bedrooms: 2, sqft: 1_080, factor: 1.12 },
  { name: "C1", label: "3 bd / 2 ba", bedrooms: 3, sqft: 1_320, factor: 1.36 },
];

const MIX: Record<PropertyClass, number[]> = {
  A: [0.12, 0.46, 0.36, 0.06],
  B: [0.05, 0.44, 0.42, 0.09],
  C: [0, 0.48, 0.42, 0.1],
};

function isSummer(month: number) {
  return month >= 6 && month <= 9;
}

function isWinter(month: number) {
  return month === 12 || month <= 2;
}

/** Years elapsed relative to the latest month (negative for history). */
function yearsFromLatest(i: number) {
  return (i - (ALL_MONTHS.length - 1)) / 12;
}

function budgetYearFactor(month: string, rate: number) {
  // Budgets step once per fiscal year; actuals drift continuously.
  const { year } = parseMonth(month);
  return Math.pow(1 + rate, year - 2026);
}

function ramp(i: number, start: number, end: number, from: number, to: number) {
  if (i <= start) return from;
  if (i >= end) return to;
  return from + ((to - from) * (i - start)) / (end - start);
}

// Month indexes for the story timeline. 0 = Oct 2024, 23 = Sep 2026.
const JAN_26 = 15;
const MAR_26 = 17;
const APR_26 = 18;
const MAY_26 = 19;
const JUN_26 = 20;

/** Physical occupancy actual for a property-month. */
function occupancyActual(seed: PropertySeed, i: number, noise: number): number {
  const base = seed.budgetOccupancy + (BIAS[seed.property.id]?.occ ?? 0) + noise;
  const { month } = parseMonth(ALL_MONTHS[i]);
  const seasonal = isWinter(month) ? -0.004 : isSummer(month) ? 0.002 : 0;
  if (seed.story === "vacancy_concessions") {
    // New deliveries in Frisco pulled occupancy down through 2026.
    const decline = ramp(i, JAN_26 - 1, 21, 0, 0.083) + (i >= 23 ? 0.004 : 0);
    return Math.min(0.985, base + seasonal - decline);
  }
  return Math.min(0.985, base + seasonal);
}

export interface GeneratedPortfolio {
  budget: BudgetLine[];
  actual: LedgerLine[];
  occupancy: OccupancySnapshot[];
  units: Unit[];
  leases: Lease[];
  workOrders: WorkOrder[];
}

function generateRentRoll(seed: PropertySeed, occupiedUnits: number) {
  const { property } = seed;
  const rng = createRng(`units:${property.id}`);
  const mix = MIX[property.class];
  const units: Unit[] = [];
  const leases: Lease[] = [];

  // Normalize so the average market rent lands on the seed rent.
  const avgFactor = mix.reduce((s, w, idx) => s + w * FLOORPLANS[idx].factor, 0);
  for (let n = 0; n < property.units; n++) {
    const r = rng.next();
    let acc = 0;
    let fp = FLOORPLANS[1];
    for (let k = 0; k < mix.length; k++) {
      acc += mix[k];
      if (r <= acc) {
        fp = FLOORPLANS[k];
        break;
      }
    }
    const building = Math.floor(n / 24) + 1;
    const floor = Math.floor((n % 24) / 8) + 1;
    const unitNumber = `${building}${floor}${String((n % 8) + 1).padStart(2, "0")}`;
    const market = Math.round((seed.rent * (fp.factor / avgFactor) * (1 + rng.normal(0.025))) / 5) * 5;
    units.push({
      id: `${property.id}_u${unitNumber}`,
      org_id: ORG_ID,
      property_id: property.id,
      unit_number: unitNumber,
      floorplan: `${fp.name} · ${fp.label}`,
      bedrooms: fp.bedrooms,
      sqft: Math.round(fp.sqft * (1 + rng.normal(0.03))),
      market_rent: market,
      status: "occupied",
    });
  }

  // Mark vacancies deterministically.
  const vacancyRng = createRng(`vacancy:${property.id}`);
  const order = units.map((u) => ({ u, k: vacancyRng.next() })).sort((a, b) => a.k - b.k);
  order.slice(0, property.units - occupiedUnits).forEach(({ u }) => (u.status = "vacant"));

  const gapMean = seed.story === "below_market" ? 0.088 : PROFILES[property.class].ltl;
  const leaseRng = createRng(`leases:${property.id}`);
  for (const unit of units) {
    if (unit.status === "vacant") continue;
    // Brookstone has a heavy renewal season ahead; elsewhere expirations are spread out.
    const soon = seed.story === "below_market" && leaseRng.chance(0.07);
    const daysOut = soon ? leaseRng.int(4, 90) : leaseRng.int(4, 365);
    const end = addDays(TODAY, daysOut);
    const start = addDays(end, -364);
    const gap = Math.max(-0.03, Math.min(0.19, gapMean + leaseRng.normal(gapMean > 0.05 ? 0.035 : 0.02)));
    leases.push({
      id: `${unit.id}_l`,
      org_id: ORG_ID,
      property_id: property.id,
      unit_id: unit.id,
      start_date: start,
      end_date: end,
      rent: Math.round((unit.market_rent * (1 - gap)) / 5) * 5,
      status: daysOut <= 45 && leaseRng.chance(0.18) ? "notice" : "current",
    });
  }
  return { units, leases };
}

const WO_TEMPLATES: Record<WorkOrderCategory, string[]> = {
  hvac: ["AC not cooling", "AC blowing warm air", "Thermostat unresponsive", "Condensate line clogged", "Compressor short cycling", "Refrigerant leak suspected"],
  plumbing: ["Kitchen sink draining slowly", "Toilet running constantly", "Water heater not heating", "Leak under bathroom vanity", "Low water pressure in shower"],
  electrical: ["Outlet not working in bedroom", "Breaker tripping repeatedly", "Light fixture flickering"],
  appliance: ["Dishwasher not draining", "Refrigerator not cooling", "Dryer not heating", "Range burner not igniting"],
  make_ready: ["Make-ready: paint and clean", "Make-ready: carpet replacement", "Make-ready: full turn"],
  grounds: ["Irrigation head broken near building", "Tree limb over walkway", "Pool gate latch broken"],
  pest: ["Ant activity in kitchen", "Roach treatment requested", "Rodent activity reported"],
  general: ["Door lock sticking", "Blinds broken", "Smoke detector chirping", "Cabinet hinge loose"],
};

function generateWorkOrders(seed: PropertySeed, units: Unit[]): WorkOrder[] {
  const { property } = seed;
  const rng = createRng(`wo:${property.id}`);
  const out: WorkOrder[] = [];
  const categories: WorkOrderCategory[] = ["plumbing", "hvac", "electrical", "appliance", "make_ready", "grounds", "pest", "general"];
  const weights = [0.22, 0.14, 0.08, 0.16, 0.12, 0.06, 0.06, 0.16];
  const pickCategory = () => {
    const r = rng.next();
    let acc = 0;
    for (let k = 0; k < categories.length; k++) {
      acc += weights[k];
      if (r <= acc) return categories[k];
    }
    return "general";
  };
  let seq = 4100 + rng.int(0, 800);
  const push = (wo: Omit<WorkOrder, "id" | "number" | "org_id" | "property_id">) => {
    out.push({ id: `${property.id}_wo${seq}`, number: `WO-${seq}`, org_id: ORG_ID, property_id: property.id, ...wo });
    seq++;
  };

  const openCount = Math.round(property.units * 0.05);
  for (let n = 0; n < openCount; n++) {
    const category = pickCategory();
    const unit = category === "grounds" ? null : rng.pick(units).unit_number;
    const age = rng.int(0, 21);
    push({
      unit_number: unit,
      category,
      description: rng.pick(WO_TEMPLATES[category]),
      priority: rng.chance(0.08) ? "high" : rng.chance(0.15) ? "low" : "normal",
      status: age > 10 && rng.chance(0.3) ? "on_hold" : rng.chance(0.45) ? "in_progress" : "open",
      opened_at: addDays(TODAY, -age),
      completed_at: null,
      vendor_id: null,
      cost: null,
      repeat: false,
    });
  }

  if (seed.story === "hvac") {
    // Recurring HVAC failures concentrated in the 1986 buildings' original condensers.
    const problemUnits = ["1104", "1203", "2101", "2205", "3102", "3207"];
    let day = 170;
    for (let n = 0; n < 44; n++) {
      day -= rng.int(2, 5);
      if (day < 0) break;
      const repeatUnit = n % 3 !== 2;
      const unit = repeatUnit ? problemUnits[n % problemUnits.length] : rng.pick(units).unit_number;
      const open = day <= 18;
      push({
        unit_number: unit,
        category: "hvac",
        description: rng.pick(WO_TEMPLATES.hvac),
        priority: rng.chance(0.4) ? "emergency" : "high",
        status: open ? (rng.chance(0.5) ? "in_progress" : "open") : "completed",
        opened_at: addDays(TODAY, -day),
        completed_at: open ? null : addDays(TODAY, -day + rng.int(1, 3)),
        vendor_id: "ven_coolflow",
        cost: open ? null : Math.round(rng.range(380, 2_400) / 10) * 10,
        repeat: repeatUnit && n >= problemUnits.length,
      });
    }
  }
  return out.sort((a, b) => (a.opened_at < b.opened_at ? 1 : -1));
}

function generate(): GeneratedPortfolio {
  const budget: BudgetLine[] = [];
  const actual: LedgerLine[] = [];
  const occupancy: OccupancySnapshot[] = [];
  const units: Unit[] = [];
  const leases: Lease[] = [];
  const workOrders: WorkOrder[] = [];

  for (const seed of propertySeeds) {
    const { property } = seed;
    const profile = PROFILES[property.class];
    const rng = createRng(`ledger:${property.id}`);
    const bias = BIAS[property.id] ?? { occ: 0, opex: 0, rent: 0 };
    const occNoise = ALL_MONTHS.map(() => rng.normal(0.006));
    const latestOcc = occupancyActual(seed, ALL_MONTHS.length - 1, occNoise[ALL_MONTHS.length - 1]);
    const roll = generateRentRoll(seed, Math.round(property.units * latestOcc));
    units.push(...roll.units);
    leases.push(...roll.leases);
    workOrders.push(...generateWorkOrders(seed, roll.units));

    const marketTotal = roll.units.reduce((s, u) => s + u.market_rent, 0);

    ALL_MONTHS.forEach((month, i) => {
      const { month: m } = parseMonth(month);
      let revenueBudget = 0;
      let revenueActual = 0;
      const line = (list: LedgerLine[], category: GlCategory, amount: number) => {
        const rounded = Math.round(amount);
        list.push({ org_id: ORG_ID, property_id: property.id, month, category, amount: rounded });
        if (REVENUE.has(category)) {
          if (list === budget) revenueBudget += rounded;
          else revenueActual += rounded;
        }
      };

      // ---- Revenue -------------------------------------------------------
      const gprBudget = marketTotal * Math.pow(1 + RENT_GROWTH, yearsFromLatest(i)) * 1.001;
      const gprActual = marketTotal * Math.pow(1 + RENT_GROWTH, yearsFromLatest(i)) * (1 + bias.rent + rng.normal(0.002));

      const occBudget = seed.budgetOccupancy;
      const occActual = occupancyActual(seed, i, occNoise[i]);

      const ltlBudgetRate = seed.story === "below_market" ? 0.062 : profile.ltl;
      const ltlActualRate =
        seed.story === "below_market" ? 0.084 + rng.normal(0.003) : profile.ltl + rng.normal(0.003);

      let concessionsRate = profile.concessions * (1 + rng.normal(0.18));
      if (seed.story === "vacancy_concessions") concessionsRate = ramp(i, JAN_26, MAR_26 + 1, 0.011, 0.059) + rng.normal(0.002);

      let badDebtRate = profile.badDebt * (1 + rng.normal(0.2));
      if (seed.story === "bad_debt") badDebtRate = ramp(i, MAR_26 - 1, 23, 0.014, 0.062) + rng.normal(0.0015);

      line(budget, "gross_potential_rent", gprBudget);
      line(actual, "gross_potential_rent", gprActual);
      line(budget, "loss_to_lease", -gprBudget * ltlBudgetRate);
      line(actual, "loss_to_lease", -gprActual * ltlActualRate);
      line(budget, "vacancy_loss", -gprBudget * (1 - occBudget));
      line(actual, "vacancy_loss", -gprActual * (1 - occActual));
      line(budget, "concessions", -gprBudget * profile.concessions);
      line(actual, "concessions", -gprActual * Math.max(0, concessionsRate));
      line(budget, "bad_debt", -gprBudget * profile.badDebt);
      line(actual, "bad_debt", -gprActual * Math.max(0, badDebtRate));
      const otherBudget = property.units * profile.otherIncome * budgetYearFactor(month, 0.02);
      line(budget, "other_income", otherBudget);
      line(actual, "other_income", otherBudget * (1 + rng.normal(0.035)));

      // ---- Expenses ------------------------------------------------------
      const budgetInflation = budgetYearFactor(month, EXPENSE_INFLATION);
      const opexEntries = Object.entries(profile.opex) as [Exclude<ExpenseCategory, "management_fees">, number][];
      for (const [category, perUnit] of opexEntries) {
        let seasonal = 1;
        if (category === "utilities") seasonal = isSummer(m) ? 1 + seed.summerUtilityLift : isWinter(m) ? 1.08 : 0.94;
        if (category === "repairs_maintenance") seasonal = isSummer(m) ? 1.12 : 0.95;
        if (category === "turnover") seasonal = m >= 5 && m <= 8 ? 1.28 : 0.86;
        if (category === "property_taxes" || category === "insurance") seasonal = 1;

        const b = property.units * perUnit * budgetInflation * seasonal;
        let a = b * (1 + bias.opex + rng.normal(category === "property_taxes" || category === "insurance" ? 0.004 : 0.045));

        if (seed.story === "hvac" && category === "repairs_maintenance") {
          a *= [1, 1.48, 1.84, 2.12, 2.26, 1.96][Math.max(0, Math.min(5, i - (MAY_26 - 1)))];
        }
        if (seed.story === "utilities_leak" && category === "utilities" && i >= JUN_26) a *= 1.24;
        if (seed.story === "payroll_contract_labor" && category === "payroll" && i >= APR_26) a *= 1.22;
        if (property.property_manager_id === "pm_crestline" && category === "contract_services") {
          // GreenScape's 2026 contract renewal came in above what the budget assumed.
          a *= i >= JAN_26 ? 1.17 : 1.03;
        }
        line(budget, category, b);
        line(actual, category, a);
      }

      line(budget, "management_fees", revenueBudget * MANAGEMENT_FEE);
      line(actual, "management_fees", revenueActual * MANAGEMENT_FEE);

      // ---- Month-end stats ----------------------------------------------
      let delinquency = profile.delinquency * (1 + rng.normal(0.12));
      if (seed.story === "bad_debt") delinquency = ramp(i, MAR_26 - 1, 23, 0.041, 0.104) + rng.normal(0.003);
      const billed = gprActual * (occActual - ltlActualRate) + otherBudget;
      occupancy.push({
        org_id: ORG_ID,
        property_id: property.id,
        month,
        occupied_units: Math.round(property.units * occActual),
        budget_occupied_units: Math.round(property.units * occBudget),
        delinquent_balance: Math.round(billed * delinquency),
        billed_charges: Math.round(billed),
      });
    });
  }

  return { budget, actual, occupancy, units, leases, workOrders };
}

let cache: GeneratedPortfolio | null = null;

export function getGenerated(): GeneratedPortfolio {
  if (!cache) cache = generate();
  return cache;
}
