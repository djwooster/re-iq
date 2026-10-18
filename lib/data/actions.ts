import { TODAY } from "@/lib/dates";
import type { Action, ActionStatus } from "@/lib/types";
import { delay } from "./core";
import { ORG_ID } from "./mock/catalog";
import { listInsights } from "./insights";
import { readOverlay, writeOverlay } from "./store";

/**
 * Recommended actions. Status changes are tracked in this app only; nothing
 * is written back to any property management system in Phase 1.
 */

type SeedAction = Omit<Action, "org_id" | "estimated_impact" | "property_id" | "updated_at"> & { updated_at?: string };

const SEED: SeedAction[] = [
  { id: "act_lakeline_plan", insight_id: "ins_lakeline_vacancy", title: "Request a 60-day leasing recovery plan from Harbor", detail: "Ask for weekly traffic, tours, applications, and conversion by source, plus the concession policy they propose.", status: "new", assignee_id: "mem_jordan", due_date: "2026-10-23", created_at: "2026-10-14T07:00:00Z" },
  { id: "act_lakeline_cap", insight_id: "ins_lakeline_vacancy", title: "Cap move-in concessions at four weeks on 12-month leases", detail: "Concessions are running near six weeks. Hold the cap and track whether conversion drops.", status: "accepted", assignee_id: "mem_jordan", due_date: "2026-10-31", created_at: "2026-10-09T07:00:00Z", updated_at: "2026-10-10T15:20:00Z" },
  { id: "act_mesa_bids", insight_id: "ins_mesa_hvac", title: "Get condenser replacement bids for six Mesa Verde units", detail: "Compare replacement cost against the repair run-rate since May before approving more repairs on these units.", status: "new", assignee_id: "mem_sam", due_date: "2026-10-28", created_at: "2026-10-14T07:00:00Z" },
  { id: "act_magnolia_review", insight_id: "ins_magnolia_bad_debt", title: "Review 60+ day delinquent accounts with Meridian", detail: "Agree on a payment plan or filing decision for every account more than 60 days past due.", status: "accepted", assignee_id: "mem_elena", due_date: "2026-10-24", created_at: "2026-09-16T07:00:00Z", updated_at: "2026-09-18T13:05:00Z" },
  { id: "act_peachtree_leak", insight_id: "ins_peachtree_utilities", title: "Schedule a leak-detection survey at Peachtree Landing", detail: "Pull the last four water bills by meter and send them with the request.", status: "new", assignee_id: null, due_date: null, created_at: "2026-10-14T07:00:00Z" },
  { id: "act_willow_hiring", insight_id: "ins_willow_payroll", title: "Get a hiring timeline for two maintenance roles at Willow Bend", detail: "Harbor confirmed both roles are posted. Ask for target start dates and when contract labor rolls off.", status: "done", assignee_id: "mem_sam", due_date: "2026-10-10", created_at: "2026-09-12T07:00:00Z", updated_at: "2026-10-08T16:40:00Z" },
  { id: "act_brookstone_renewals", insight_id: "opp_brookstone_renewals", title: "Set renewal targets for expiring below-market leases at Brookstone", detail: "Start with the largest gaps. Crestline sends renewal offers 60 days out, so the first batch is due this week.", status: "new", assignee_id: "mem_jordan", due_date: "2026-10-22", created_at: "2026-10-14T07:00:00Z" },
  { id: "act_landscaping_rebid", insight_id: "opp_landscaping_rebid", title: "Ask Crestline to rebid landscaping across four properties", detail: "GreenScape's contract renews in January. Request at least two competing bids.", status: "new", assignee_id: "mem_priya", due_date: "2026-11-07", created_at: "2026-10-14T07:00:00Z" },
  { id: "act_portfolio_renewals", insight_id: "opp_portfolio_renewals", title: "Review 90-day renewal pricing with each property manager", detail: "Bring the list of expiring below-market leases to each manager's monthly call.", status: "dismissed", assignee_id: null, due_date: null, created_at: "2026-10-01T07:00:00Z", updated_at: "2026-10-02T10:12:00Z" },
];

export async function listActions(orgId: string): Promise<Action[]> {
  await delay();
  const insights = await listInsights(orgId);
  const patches = readOverlay().actionPatches;
  return SEED.map((a) => {
    const insight = insights.find((i) => i.id === a.insight_id);
    return {
      ...a,
      org_id: ORG_ID,
      property_id: insight?.property_id ?? null,
      estimated_impact: insight?.impact ?? 0,
      updated_at: a.updated_at ?? a.created_at,
      ...patches[a.id],
    };
  }).filter((a) => a.org_id === orgId);
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
