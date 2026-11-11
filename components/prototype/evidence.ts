import { fmt } from "./metrics";
import { DELINQUENT, LAST, MONTHS, OCT, debt, dscrSeries, month, series, unit } from "./numbers";

/**
 * The numbers behind each exception's drill path: the KPI against its
 * threshold, the report row that drives it, that line by month, and the
 * units or GL transactions underneath. Built from numbers.ts so the drill
 * agrees with the scorecard and the tables.
 */

type Fmt = (v: number) => string;
type Good = "up" | "down";

export interface Evidence {
  metric: { actual: number; format: Fmt; threshold: number; thresholdLabel: string; good: Good; tone: "favorable" | "unfavorable" | "warning"; series: { month: string; value: number | null }[] };
  report: { label: string; actual: number | null; plan: number | null; format: Fmt; good: Good }[];
  line: { months: string[]; actual: (number | null)[]; plan: number[]; format: Fmt; good: Good };
  /** GL transactions, when the drill ends in the ledger. Units come from numbers.unit(). */
  gl?: { date: string; vendor: string; invoice: string; amount: number }[];
}

const SIX = MONTHS.slice(-6) as unknown as string[];
const lastSix = <T>(xs: T[]) => xs.slice(-6);
const perMonth = (v: number) => `${fmt.usd(v)}/mo`;

function build(): Record<string, Evidence> {
  // Property F: rate reset in September.
  const f = debt("f");
  const fInterest = (rate: number) => (f.balance * rate) / 12;
  const fPlan = fInterest(0.0565);
  const fActual = fInterest(0.0712);

  // Property E: billed rent and the aging that makes delinquency 4.1%.
  const el = month("e", LAST).lines;
  const billed = el["Gross potential rent"] + el.Vacancy + el["Loss to lease"] + el.Concessions;
  const d6190 = Object.values(DELINQUENT.e).reduce((s, u) => s + u.balance, 0);
  const d3160 = Math.round(0.041 * billed - d6190);

  // Property A: HVAC is about 40% of repairs budget.
  const rm = (m: number, b: "Actual" | "Budget") => month("a", m, b).lines["Repairs & maintenance"];
  const hvac = (m: number, b: "Actual" | "Budget") => rm(m, "Budget") * 0.4 + (b === "Actual" ? rm(m, "Actual") - rm(m, "Budget") : 0) * 0.92;

  // Property H: P&L lines.
  const h = month("h", LAST);
  const hb = month("h", LAST, "Budget");

  return {
    "d-exposure": {
      metric: { tone: "unfavorable", actual: 0.094, format: fmt.pct, threshold: 0.08, thresholdLabel: "8% threshold", good: "down", series: MONTHS.map((m, i) => ({ month: m, value: [0.061, 0.06, 0.058, 0.056, 0.059, 0.062, 0.064, 0.066, 0.07, 0.076, 0.084, 0.094][i] })) },
      report: [
        { label: "Floor plan 1A", actual: 0.068, plan: 0.08, format: fmt.pct, good: "down" },
        { label: "Floor plan 1B", actual: 0.074, plan: 0.08, format: fmt.pct, good: "down" },
        { label: "Floor plan 2A", actual: 0.089, plan: 0.08, format: fmt.pct, good: "down" },
        { label: "Floor plan 2B · Notice to vacate", actual: 0.148, plan: 0.08, format: fmt.pct, good: "down" },
      ],
      line: { months: SIX, actual: [3, 4, 4, 6, 9, 12], plan: [5, 5, 5, 5, 5, 5], format: fmt.int, good: "down" },
    },
    "f-dscr": {
      metric: { tone: "warning", actual: 1.31, format: fmt.x, threshold: 1.25, thresholdLabel: "1.25x covenant", good: "up", series: dscrSeries("f") },
      report: [
        { label: "Net operating income", actual: month("f", LAST).noi, plan: month("f", LAST, "Budget").noi, format: fmt.usd, good: "up" },
        { label: "Principal", actual: 0, plan: 0, format: fmt.usd, good: "down" },
        { label: "Interest expense", actual: fActual, plan: fPlan, format: fmt.usd, good: "down" },
        { label: "Reserve deposits", actual: 6_000, plan: 6_000, format: fmt.usd, good: "down" },
      ],
      line: { months: SIX, actual: [fPlan, fPlan, fPlan, fActual, fActual, fActual], plan: [fPlan, fPlan, fPlan, fPlan, fPlan, fPlan], format: fmt.usd, good: "down" },
      gl: [
        { date: "Nov 1", vendor: "Lender · November interest", invoice: "LN-2211-11", amount: fActual },
        { date: "Oct 1", vendor: "Lender · Rate reset adjustment", invoice: "LN-2211-RA", amount: fActual - fPlan },
        { date: "Oct 1", vendor: "Lender · October interest", invoice: "LN-2211-10", amount: fPlan },
      ],
    },
    "h-ahead": {
      metric: { tone: "favorable",
        actual: h.noi / hb.noi - 1,
        format: fmt.signedPct,
        threshold: 0.05,
        thresholdLabel: "5% ahead of budget",
        good: "up",
        series: MONTHS.map((m, i) => ({ month: m, value: month("h", i).noi / month("h", i, "Budget").noi - 1 })),
      },
      report: [
        { label: "Gross potential rent", actual: h.lines["Gross potential rent"], plan: hb.lines["Gross potential rent"], format: fmt.usd, good: "up" },
        { label: "Vacancy", actual: h.lines.Vacancy, plan: hb.lines.Vacancy, format: fmt.usd, good: "up" },
        { label: "Effective gross income", actual: h.egi, plan: hb.egi, format: fmt.usd, good: "up" },
        { label: "Operating expenses", actual: h.opex, plan: hb.opex, format: fmt.usd, good: "down" },
      ],
      line: { months: SIX, actual: lastSix(MONTHS.map((_, i) => month("h", i).egi)), plan: lastSix(MONTHS.map((_, i) => month("h", i, "Budget").egi)), format: fmt.usd, good: "up" },
      gl: [
        { date: "Nov 1", vendor: "Rent roll posting · November", invoice: "RR-1101", amount: h.lines["Gross potential rent"] + h.lines.Vacancy + h.lines["Loss to lease"] },
        { date: "Nov 1", vendor: "Renewal increases · November", invoice: "RN-1101", amount: 6_140 },
        { date: "Nov 30", vendor: "Other income · November", invoice: "OI-1130", amount: h.lines["Other income"] },
      ],
    },
    "b-tradeout": {
      metric: { tone: "unfavorable",
        actual: 142,
        format: perMonth,
        threshold: 166.5,
        thresholdLabel: "Within 10% of the $185 underwritten",
        good: "up",
        series: MONTHS.map((m, i) => ({ month: m, value: i < 9 ? null : [128, 151, 142][i - 9] })),
      },
      report: [
        { label: "Classic · new leases", actual: 0.024, plan: 0.03, format: fmt.signedPct, good: "up" },
        { label: "Classic · renewals", actual: 0.036, plan: 0.04, format: fmt.signedPct, good: "up" },
        { label: "Renovated tier · new leases", actual: 142, plan: 185, format: perMonth, good: "up" },
        { label: "Renovated tier · renewals", actual: null, plan: null, format: perMonth, good: "up" },
      ],
      line: { months: SIX, actual: [null, null, null, 128, 151, 142], plan: [185, 185, 185, 185, 185, 185], format: perMonth, good: "up" },
    },
    "e-delinquency": {
      metric: { tone: "unfavorable", actual: 0.041, format: fmt.pct, threshold: 0.03, thresholdLabel: "3% of rent", good: "down", series: MONTHS.map((m, i) => ({ month: m, value: [0.014, 0.015, 0.014, 0.017, 0.016, 0.019, 0.021, 0.024, 0.027, 0.029, 0.034, 0.041][i] })) },
      report: [
        { label: "0–30 days", actual: 7_240, plan: 6_800, format: fmt.usd, good: "down" },
        { label: "31–60 days", actual: d3160, plan: 1_900, format: fmt.usd, good: "down" },
        { label: "61–90 days", actual: d6190, plan: 1_200, format: fmt.usd, good: "down" },
        { label: "90+ days", actual: 0, plan: 600, format: fmt.usd, good: "down" },
      ],
      line: { months: SIX, actual: [1_180, 1_420, 1_960, 3_850, 6_240, d6190], plan: [1_200, 1_200, 1_200, 1_200, 1_200, 1_200], format: fmt.usd, good: "down" },
    },
    "k-turn": {
      metric: { tone: "unfavorable", actual: 12.6, format: fmt.days, threshold: 10, thresholdLabel: "10-day ceiling", good: "down", series: MONTHS.map((m, i) => ({ month: m, value: [7.8, 7.5, 7.9, 8.1, 7.6, 7.9, 8.4, 8.8, 9.6, 10.4, 11.5, 12.6][i] })) },
      report: [
        { label: "Vacant, ready", actual: 2, plan: 4, format: fmt.int, good: "up" },
        { label: "Vacant, not ready", actual: 4, plan: 1, format: fmt.int, good: "down" },
        { label: "Down units", actual: 1, plan: 0, format: fmt.int, good: "down" },
        { label: "Scheduled move-ins", actual: 3, plan: 4, format: fmt.int, good: "up" },
      ],
      line: { months: SIX, actual: [1, 1, 2, 2, 3, 4], plan: [1, 1, 1, 1, 1, 1], format: fmt.int, good: "down" },
    },
    "g-ltl": {
      metric: { tone: "unfavorable", actual: series("g", (k) => k.ltl).at(LAST)!.value!, format: fmt.pct, threshold: 0.05, thresholdLabel: "5% threshold", good: "down", series: series("g", (k) => k.ltl) },
      report: [
        { label: "New leases · in-place vs. market", actual: 0.021, plan: 0.03, format: fmt.pct, good: "down" },
        { label: "Renewals · in-place vs. market", actual: 0.094, plan: 0.045, format: fmt.pct, good: "down" },
        { label: "Month-to-month", actual: 0.048, plan: 0.04, format: fmt.pct, good: "down" },
        { label: "Model and down units", actual: null, plan: null, format: fmt.pct, good: "down" },
      ],
      line: { months: SIX, actual: [0.058, 0.064, 0.071, 0.079, 0.086, 0.094], plan: [0.045, 0.045, 0.045, 0.045, 0.045, 0.045], format: fmt.pct, good: "down" },
    },
    "a-repairs": {
      metric: { tone: "unfavorable",
        actual: rm(LAST, "Actual") / rm(LAST, "Budget") - 1,
        format: fmt.signedPct,
        threshold: 0.05,
        thresholdLabel: "5% over budget",
        good: "down",
        series: MONTHS.map((m, i) => ({ month: m, value: rm(i, "Actual") / rm(i, "Budget") - 1 })),
      },
      report: [
        { label: "Payroll", actual: month("a", OCT).lines.Payroll, plan: month("a", OCT, "Budget").lines.Payroll, format: fmt.usd, good: "down" },
        { label: "HVAC repairs", actual: hvac(OCT, "Actual"), plan: hvac(OCT, "Budget"), format: fmt.usd, good: "down" },
        { label: "Plumbing repairs", actual: rm(OCT, "Budget") * 0.24, plan: rm(OCT, "Budget") * 0.25, format: fmt.usd, good: "down" },
        { label: "Turnover", actual: month("a", OCT).lines.Turnover, plan: month("a", OCT, "Budget").lines.Turnover, format: fmt.usd, good: "down" },
      ],
      line: { months: SIX, actual: lastSix(MONTHS.map((_, i) => hvac(i, "Actual"))), plan: lastSix(MONTHS.map((_, i) => hvac(i, "Budget"))), format: fmt.usd, good: "down" },
      gl: [
        { date: "Oct 4", vendor: "HVAC vendor · Building 2 rooftop unit", invoice: "INV-4100", amount: 2_340 },
        { date: "Oct 11", vendor: "HVAC vendor · Building 2 compressor", invoice: "INV-4137", amount: 1_865 },
        { date: "Oct 19", vendor: "HVAC vendor · Building 3 rooftop unit", invoice: "INV-4174", amount: 1_410 },
        { date: "Oct 26", vendor: "HVAC vendor · Emergency call", invoice: "INV-4211", amount: 685 },
      ],
    },
  };
}

let cache: Record<string, Evidence> | null = null;
export const evidence = (id: string) => (cache ??= build())[id];

/** The unit rows at the bottom of a units drill. */
export const drillUnits = (propertyId: string, units: string[]) => units.map((u) => unit(propertyId, u.replace("Unit ", "")));
