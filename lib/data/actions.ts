import { LATEST_MONTH, TODAY, addMonths, compareMonths, monthOf, monthRange } from "@/lib/dates";
import type { Action, ActionStatus, GlCategory, MonthKey } from "@/lib/types";
import { categoryVariance, delay, isNewWorkspace, propertyRecords, sumFinancials } from "./core";
import { ORG_ID } from "./mock/catalog";
import { listInsights } from "./insights";
import { readOverlay, writeOverlay } from "./store";

/**
 * Recommended actions. Status changes are tracked in this app only; nothing
 * is written back to any property management system in Phase 1.
 */

type SeedAction = Omit<Action, "org_id" | "estimated_impact" | "property_id" | "updated_at"> & {
  updated_at?: string;
  /** For actions whose insight has since resolved and left the list. */
  property_id?: string;
  estimated_impact?: number;
  /** The GL line a completed action should move, and the first month it should show. */
  measure?: { category: GlCategory; from: MonthKey };
};

const SEED: SeedAction[] = [
  { id: "act_lakeline_plan", insight_id: "ins_lakeline_vacancy", title: "Request a 60-day leasing recovery plan from Harbor", detail: "Ask for weekly traffic, tours, applications, and conversion by source, plus the concession policy they propose.", status: "new", assignee_id: "mem_jordan", due_date: "2026-10-23", created_at: "2026-10-14T07:00:00Z" },
  { id: "act_lakeline_cap", insight_id: "ins_lakeline_vacancy", title: "Cap move-in concessions at four weeks on 12-month leases", detail: "Concessions are running near six weeks. Hold the cap and track whether conversion drops.", status: "accepted", assignee_id: "mem_jordan", due_date: "2026-10-31", created_at: "2026-10-09T07:00:00Z", updated_at: "2026-10-10T15:20:00Z" },
  { id: "act_mesa_bids", insight_id: "ins_mesa_hvac", title: "Get condenser replacement bids for six Mesa Verde units", detail: "Compare replacement cost against the repair run-rate since May before approving more repairs on these units.", status: "new", assignee_id: "mem_sam", due_date: "2026-10-28", created_at: "2026-10-14T07:00:00Z" },
  { id: "act_magnolia_review", insight_id: "ins_magnolia_bad_debt", title: "Review 60+ day delinquent accounts with Meridian", detail: "Agree on a payment plan or filing decision for every account more than 60 days past due.", status: "accepted", assignee_id: "mem_elena", due_date: "2026-10-24", created_at: "2026-09-16T07:00:00Z", updated_at: "2026-09-18T13:05:00Z" },
  { id: "act_peachtree_leak", insight_id: "ins_peachtree_utilities", title: "Schedule a leak-detection survey at Peachtree Landing", detail: "Pull the last four water bills by meter and send them with the request.", status: "new", assignee_id: null, due_date: null, created_at: "2026-10-14T07:00:00Z" },
  { id: "act_willow_hiring", insight_id: "ins_willow_payroll", title: "Get a hiring timeline for two maintenance roles at Willow Bend", detail: "Harbor confirmed both roles are posted. Ask for target start dates and when contract labor rolls off.", status: "done", assignee_id: "mem_sam", due_date: "2026-10-10", created_at: "2026-09-12T07:00:00Z", updated_at: "2026-10-08T16:40:00Z", measure: { category: "payroll", from: "2026-11" } },
  { id: "act_camelback_irrigation", insight_id: "ins_camelback_utilities", property_id: "prop_camelback", estimated_impact: 42_000, title: "Repair the irrigation main leak at Camelback Vista", detail: "Water ran 27% over budget from March while occupancy held. Summit found a cracked irrigation main and repaired it June 30.", status: "done", assignee_id: "mem_sam", due_date: "2026-06-30", created_at: "2026-06-11T07:00:00Z", updated_at: "2026-06-30T21:10:00Z", measure: { category: "utilities", from: "2026-07" } },
  { id: "act_gulch_concessions", insight_id: "ins_gulch_concessions", property_id: "prop_gulch", estimated_impact: 150_000, title: "End the six-week move-in special at Gulch Terrace", detail: "Occupancy was back above budget, so the January lease-up special was no longer needed. Crestline ended it for leases signed after May 31.", status: "done", assignee_id: "mem_jordan", due_date: "2026-05-31", created_at: "2026-05-14T07:00:00Z", updated_at: "2026-05-29T18:02:00Z", measure: { category: "concessions", from: "2026-06" } },
  { id: "act_brookstone_renewals", insight_id: "opp_brookstone_renewals", title: "Set renewal targets for expiring below-market leases at Brookstone", detail: "Start with the largest gaps. Crestline sends renewal offers 60 days out, so the first batch is due this week.", status: "new", assignee_id: "mem_jordan", due_date: "2026-10-22", created_at: "2026-10-14T07:00:00Z" },
  { id: "act_landscaping_rebid", insight_id: "opp_landscaping_rebid", title: "Ask Crestline to rebid landscaping across four properties", detail: "GreenScape's contract renews in January. Request at least two competing bids.", status: "new", assignee_id: "mem_priya", due_date: "2026-11-07", created_at: "2026-10-14T07:00:00Z" },
  { id: "act_portfolio_renewals", insight_id: "opp_portfolio_renewals", title: "Review 90-day renewal pricing with each property manager", detail: "Bring the list of expiring below-market leases to each manager's monthly call.", status: "dismissed", assignee_id: null, due_date: null, created_at: "2026-10-01T07:00:00Z", updated_at: "2026-10-02T10:12:00Z" },
];

export async function listActions(orgId: string): Promise<Action[]> {
  await delay();
  const insights = await listInsights(orgId);
  const patches = readOverlay().actionPatches;
  const fresh = isNewWorkspace();
  // A new workspace gets each action untouched, dated when its insight first appears.
  const seed = fresh
    ? SEED.filter((a) => insights.some((i) => i.id === a.insight_id)).map((a) => ({ ...a, status: "new" as const, assignee_id: null, due_date: null, created_at: `${TODAY}T07:00:00Z`, updated_at: undefined }))
    : SEED;
  return seed.map((a) => {
    const insight = insights.find((i) => i.id === a.insight_id);
    return {
      id: a.id,
      insight_id: a.insight_id,
      title: a.title,
      detail: a.detail,
      status: a.status,
      assignee_id: a.assignee_id,
      due_date: a.due_date,
      created_at: a.created_at,
      org_id: ORG_ID,
      property_id: insight?.property_id ?? a.property_id ?? null,
      estimated_impact: insight?.impact ?? a.estimated_impact ?? 0,
      updated_at: a.updated_at ?? a.created_at,
      ...patches[a.id],
    };
  }).filter((a) => a.org_id === orgId);
}

// ---- Outcomes ------------------------------------------------------------

/** Months before a fix that set the baseline. */
const BASELINE_MONTHS = 3;

export interface ActionOutcome {
  action_id: string;
  property_id: string;
  category: GlCategory;
  /** First month the fix should show in the numbers. */
  from: MonthKey;
  state: "measuring" | "measured";
  baseline_months: MonthKey[];
  /** Average monthly NOI variance on the line before the fix. Negative is unfavorable. */
  baseline_monthly: number;
  after_months: MonthKey[];
  after_monthly: number | null;
  /** NOI recovered since the fix against the baseline run-rate. An estimate. */
  recovered: number;
  /** The same improvement over a full year. An estimate. */
  annualized: number;
}

function lineVariance(propertyId: string, category: GlCategory, months: MonthKey[]) {
  return months.map((m) => categoryVariance(sumFinancials(propertyId, [m], "mtd"), category));
}

/**
 * Did it work? For each completed action with a line to watch, compare the
 * monthly variance after the fix with the months before it, from the same
 * ledger as every other view.
 */
export async function listOutcomes(orgId: string): Promise<ActionOutcome[]> {
  const actions = await listActions(orgId);
  const records = propertyRecords();
  return SEED.filter((s) => s.measure && actions.find((a) => a.id === s.id)?.status === "done").map((s) => {
    const action = actions.find((a) => a.id === s.id)!;
    const { category, from } = s.measure!;
    const propertyId = action.property_id!;
    const through = monthOf(records.find((r) => r.id === propertyId)?.data_through ?? `${LATEST_MONTH}-01`);
    const baselineMonths = monthRange(addMonths(from, -BASELINE_MONTHS), addMonths(from, -1)).filter((m) => compareMonths(m, through) <= 0);
    const baseline = lineVariance(propertyId, category, baselineMonths);
    const baselineMonthly = baseline.reduce((x, y) => x + y, 0) / Math.max(1, baseline.length);
    const afterMonths = compareMonths(from, through) <= 0 ? monthRange(from, through) : [];
    const after = lineVariance(propertyId, category, afterMonths);
    const afterMonthly = after.length ? after.reduce((x, y) => x + y, 0) / after.length : null;
    return {
      action_id: s.id,
      property_id: propertyId,
      category,
      from,
      state: after.length ? "measured" : "measuring",
      baseline_months: baselineMonths,
      baseline_monthly: baselineMonthly,
      after_months: afterMonths,
      after_monthly: afterMonthly,
      recovered: after.reduce((sum, v) => sum + (v - baselineMonthly), 0),
      annualized: afterMonthly === null ? 0 : (afterMonthly - baselineMonthly) * 12,
    };
  });
}

export async function updateAction(id: string, patch: Partial<Pick<Action, "status" | "assignee_id">>): Promise<void> {
  await delay(250);
  writeOverlay((d) => {
    d.actionPatches[id] = { ...d.actionPatches[id], ...patch, updated_at: `${TODAY}T${new Date().toISOString().slice(11, 19)}Z` };
  });
}

export async function setActionStatus(id: string, status: ActionStatus) {
  return updateAction(id, { status });
}
