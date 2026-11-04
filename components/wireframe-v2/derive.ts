import { MANAGERS, MAPPING, MISSING, PACKAGE, PROPERTIES, RECEIVED, RECON_CHECKS, REPORT_DUE, TODAY, property, type CheckState, type Exception, type ManagerId, type Project } from "./seed";
import { isOverdue } from "./store";

/** Close status and readiness, worked out from the seed plus what's been clicked. */

interface Slice {
  exceptions: Exception[];
  projects: Project[];
  mapped: string[];
}

export type CellState = { state: "Received"; date: string } | { state: "Late" } | { state: "Missing" };

export function packageCell(propertyId: string, report: string): CellState {
  const date = RECEIVED[property(propertyId)!.manager];
  if (!date) return { state: "Late" };
  if (MISSING[propertyId]?.includes(report)) return { state: "Missing" };
  return { state: "Received", date };
}

export function managerState(id: ManagerId): "All received" | "Partial" | "Late" {
  if (!RECEIVED[id]) return TODAY > REPORT_DUE ? "Late" : "Partial";
  return PROPERTIES.some((p) => p.manager === id && MISSING[p.id]?.length) ? "Partial" : "All received";
}

export function closeSummary() {
  const states = MANAGERS.map((m) => managerState(m.id));
  const n = (s: string) => states.filter((x) => x === s).length;
  return { inFull: n("All received"), partial: n("Partial"), late: n("Late"), reports: PACKAGE.length };
}

export const mappingPending = (s: Slice) => MAPPING.filter((l) => !l.sure && !s.mapped.includes(l.id)).length;

export function reconChecks(s: Slice, propertyId: string): { check: string; state: CheckState; note?: string }[] {
  const p = property(propertyId)!;
  return RECON_CHECKS.map((check) => {
    if (!RECEIVED[p.manager]) return { check, state: "Waiting", note: "Package not received" };
    if (propertyId === "c" && check === "Rent roll ties to P&L") return { check, state: "Break", note: "Rent roll total doesn't tie to rental income on the P&L" };
    if (p.manager === "m3" && check === "GL mapped to owner's chart of accounts" && mappingPending(s)) return { check, state: "Waiting", note: "Lines to confirm in Mapping review" };
    return { check, state: "Pass" };
  });
}

export function reconSummary(s: Slice) {
  const all = PROPERTIES.flatMap((p) => reconChecks(s, p.id));
  return { breaks: all.filter((c) => c.state === "Break").length, waiting: all.filter((c) => c.state === "Waiting").length };
}

/** Why a property isn't ready for the owner report yet, or null when it is. */
export function blocker(s: Slice, propertyId: string): string | null {
  const p = property(propertyId)!;
  if (!RECEIVED[p.manager]) return "Package late";
  if (MISSING[propertyId]?.length) return `${MISSING[propertyId].join(", ")} missing`;
  const checks = reconChecks(s, propertyId);
  if (checks.some((c) => c.state === "Break")) return "Reconciliation break";
  if (checks.some((c) => c.state === "Waiting")) return "Mapping to confirm";
  const open = s.exceptions.filter((e) => e.property === propertyId && e.stage !== "closed").length;
  if (open) return `${open} open exception${open > 1 ? "s" : ""}`;
  return null;
}

export const readyProperties = (s: Slice) => PROPERTIES.filter((p) => !blocker(s, p.id));

/** The top of the Overview: is the month closed, what's stuck, how close is the owner report. */
export function monthStatus(s: Slice & { ownerReport: { sent?: string } }) {
  const c = closeSummary();
  const r = reconSummary(s);
  const managersIn = c.inFull + c.partial;
  const by = (stage: Exception["stage"]) => s.exceptions.filter((e) => e.stage === stage).length;
  return {
    close: {
      done: !c.late && !c.partial && !r.breaks && !r.waiting,
      managersIn,
      managers: managersIn + c.late,
      notes: [c.partial && `${c.partial} partial`, c.late && `${c.late} late`, r.breaks && `${r.breaks} reconciliation break${r.breaks > 1 ? "s" : ""}`, mappingPending(s) && `${mappingPending(s)} lines to map`].filter(Boolean) as string[],
    },
    exceptions: {
      stages: (["new", "diagnosing", "waiting", "assigned"] as const).map((stage) => ({ stage, count: by(stage) })),
      overdue: s.exceptions.filter(isOverdue).length,
      replied: s.exceptions.filter((e) => e.stage === "waiting" && e.question?.reply).length,
    },
    report: { ready: readyProperties(s).length, total: PROPERTIES.length, sent: s.ownerReport.sent },
  };
}
