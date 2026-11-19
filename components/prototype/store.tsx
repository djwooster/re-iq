"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAccount } from "./account";
import {
  APPROVALS,
  DEFAULT_NAMES,
  ORG,
  applyWorkspace,
  DECISIONS,
  EXCEPTIONS,
  ME,
  PROJECTS,
  TASKS,
  TODAY,
  fmtDate,
  managerOf,
  type Approval,
  type Decision,
  type Exception,
  type LogEntry,
  type Project,
  type ProjectStatus,
  type ProjectType,
  type ManagerId,
  type Task,
  type TaskStatus,
  type Names,
  type Upload,
} from "./seed";

/**
 * Clicks carry across screens (a question sent on one exception shows up in
 * the exceptions list and on the Overview) and persist in this browser until
 * "Start over" in the user menu.
 */

export type Period = "Month" | "YTD" | "T-3" | "T-12";
export type Compare = "Budget" | "Prior year" | "Underwriting";

/** What the user enters during setup before the workspace exists. */
export interface Draft {
  org: string;
  /** Each property's id is a slot in the seed (a–l), in the order they're added. */
  /** `manager` is a company the user picked; without it, the one read off the reports. */
  properties: { id: string; name: string; reports: Upload[]; manager?: string }[];
  /** Files RE-IQ couldn't match to a property. */
  unassigned?: Upload[];
  /** Seeded companies keep their seed id (m1–m4); ones the user adds get a new id. `sent` is when their upload link was emailed. */
  managers: { id: string; name: string; email: string; properties: string[]; sent?: string }[];
  reviewed: boolean;
}

interface State {
  org: string;
  user: { name: string; email: string };
  /** False until setup finishes; the workspace has no data before then. */
  setupDone: boolean;
  /** Properties in the workspace. Empty means all of them (the demo). */
  included: string[];
  uploads: Upload[];
  names: Names;
  draft: Draft;
  exceptions: Exception[];
  projects: Project[];
  tasks: Task[];
  approvals: Approval[];
  decisions: Decision[];
  mapped: string[];
  ownerReport: { sent?: string };
  /** Set once the AM closes November: when, and the checklist items still open at the time. */
  closed?: { date: string; open: string[] };
  /** Notification ids the user has read (see notifications.tsx). */
  seen: string[];
  period: Period;
  compare: Compare;
}

const emptyDraft = (): Draft => ({ org: "", properties: [], managers: [], reviewed: false });

const initial = (): State => ({
  org: ORG,
  user: { name: "Asset manager", email: "am@ownerfirm.com" },
  setupDone: false,
  included: [],
  uploads: [],
  names: DEFAULT_NAMES,
  draft: emptyDraft(),
  exceptions: EXCEPTIONS,
  projects: PROJECTS,
  tasks: TASKS,
  approvals: APPROVALS,
  decisions: DECISIONS,
  mapped: [],
  ownerReport: {},
  seen: [],
  period: "Month",
  compare: "Budget",
});

const entry = (text: string, who = ME): LogEntry => ({ date: TODAY, who, text });

export interface AssignInput {
  action: string;
  assignee: string;
  due: string;
  why: string;
  project?: { name: string; type: ProjectType };
}

function useActions(set: React.Dispatch<React.SetStateAction<State>>) {
  return useMemo(() => {
    const ex = (id: string, fn: (e: Exception) => Partial<Exception>, s: State) => s.exceptions.map((e) => (e.id === id ? { ...e, ...fn(e) } : e));
    const pr = (id: string, fn: (p: Project) => Partial<Project>, s: State) => s.projects.map((p) => (p.id === id ? { ...p, ...fn(p) } : p));

    return {
      setPeriod: (period: Period) => set((s) => ({ ...s, period })),
      setCompare: (compare: Compare) => set((s) => ({ ...s, compare })),

      startDiagnosis: (id: string) => set((s) => ({ ...s, exceptions: ex(id, (e) => ({ stage: "diagnosing", log: [...e.log, entry("Started diagnosing")] }), s) })),
      setNature: (id: string, nature: "One-time" | "Ongoing") => set((s) => ({ ...s, exceptions: ex(id, (e) => ({ nature, log: [...e.log, entry(`Marked ${nature.toLowerCase()}`)] }), s) })),
      markWaiting: (id: string, text: string, due: string) =>
        set((s) => ({
          ...s,
          exceptions: ex(id, (e) => ({ stage: "waiting", question: { text, sent: TODAY, due }, log: [...e.log, entry(`Waiting on ${managerOf(e.property).name} · due ${fmtDate(due)}`)] }), s),
        })),
      recordReply: (id: string, text: string, file?: string) =>
        set((s) => ({
          ...s,
          exceptions: ex(
            id,
            (e) => ({
              question: e.question && { ...e.question, reply: { text, file, received: TODAY } },
              log: [...e.log, entry(`Answer from ${managerOf(e.property).name}${file ? ` · ${file}` : ""}`)],
            }),
            s,
          ),
        })),

      assign: (id: string, input: AssignInput) =>
        set((s) => {
          const e = s.exceptions.find((x) => x.id === id)!;
          const projectId = input.project ? `${e.property}-new-${s.projects.length + 1}` : undefined;
          const task: Task = { id: `t${s.tasks.length + 1}`, title: input.project ? `Scope ${input.project.name}` : input.action, property: e.property, owner: input.assignee, due: input.due, status: "Open", exceptionId: id, projectId };
          const projects = input.project
            ? [
                ...s.projects,
                {
                  id: projectId!,
                  property: e.property,
                  name: input.project.name,
                  type: input.project.type,
                  step: 1,
                  status: "Active" as ProjectStatus,
                  exceptionId: id,
                  triggers: ["Linked exception"],
                  log: [entry(`Created from exception: ${e.trigger}`)],
                },
              ]
            : s.projects;
          return {
            ...s,
            projects,
            tasks: [...s.tasks, task],
            decisions: [{ date: TODAY, property: e.property, decision: input.project ? `Start a capital project: ${input.project.name}` : input.action, who: ME, why: input.why || "No reason recorded", exceptionId: id, projectId }, ...s.decisions],
            exceptions: ex(
              id,
              (x) => ({
                stage: "assigned",
                action: input.action,
                projectId: projectId ?? x.projectId,
                log: [...x.log, entry(`Action: ${input.action}`), entry(`Assigned to ${input.assignee} · due ${fmtDate(input.due)}`)],
              }),
              s,
            ),
          };
        }),
      setTaskStatus: (taskId: string, status: TaskStatus) =>
        set((s) => {
          const t = s.tasks.find((x) => x.id === taskId)!;
          return {
            ...s,
            tasks: s.tasks.map((x) => (x.id === taskId ? { ...x, status } : x)),
            exceptions: t.exceptionId ? ex(t.exceptionId, (e) => ({ log: [...e.log, entry(`Task "${t.title}" marked ${status.toLowerCase()}`)] }), s) : s.exceptions,
          };
        }),
      closeException: (id: string) => set((s) => ({ ...s, exceptions: ex(id, (e) => ({ stage: "closed", log: [...e.log, entry("Closed")] }), s) })),

      advance: (projectId: string, note: string) => set((s) => ({ ...s, projects: pr(projectId, (p) => ({ step: Math.min(6, p.step + 1), log: [...p.log, entry(note)] }), s) })),
      gate: (projectId: string, gate: "A" | "B", outcome: "approve" | "rescope" | "drop") =>
        set((s) => {
          const p = s.projects.find((x) => x.id === projectId)!;
          const label = gate === "A" ? { approve: "Gate A approved: Approve and fund", rescope: "Gate A: sent back to re-scope", drop: "Gate A: dropped" }[outcome] : { approve: "Gate B passed: Scale", rescope: "Gate B: re-scope the tier", drop: "Gate B: dropped" }[outcome];
          return {
            ...s,
            projects: pr(projectId, (x) => ({ step: outcome === "approve" ? x.step + 1 : x.step, status: outcome === "drop" ? "Dropped" : x.status, log: [...x.log, entry(label)] }), s),
            decisions: [{ date: TODAY, property: p.property, decision: `${label} · ${p.name}`, who: ME, why: gate === "A" ? "Return on cost vs. the 15% hurdle" : "Pilot premium vs. underwriting (within 10%)", projectId }, ...s.decisions],
          };
        }),
      projectDecision: (projectId: string, choice: "Continue" | "Pause" | "Stop" | "Refinance or sell") =>
        set((s) => {
          const p = s.projects.find((x) => x.id === projectId)!;
          const status: ProjectStatus = choice === "Pause" ? "Paused" : choice === "Stop" ? "Stopped" : p.status;
          return {
            ...s,
            projects: pr(projectId, (x) => ({ status, log: [...x.log, entry(`Decided: ${choice}`)] }), s),
            decisions: [{ date: TODAY, property: p.property, decision: `${choice} · ${p.name}`, who: ME, why: "Measured return on cost and value created vs. plan", projectId }, ...s.decisions],
          };
        }),

      decideApproval: (id: string, status: "Approved" | "Declined") =>
        set((s) => {
          const a = s.approvals.find((x) => x.id === id)!;
          return {
            ...s,
            approvals: s.approvals.map((x) => (x.id === id ? { ...x, status } : x)),
            projects: a.projectId ? pr(a.projectId, (p) => ({ log: [...p.log, entry(`${status}: ${a.title}`)] }), s) : s.projects,
            decisions: [{ date: TODAY, property: a.property, decision: `${status}: ${a.title}`, who: ME, why: `${a.kind} submitted by ${a.from}`, projectId: a.projectId }, ...s.decisions],
          };
        }),

      /** A new account is a new, empty workspace, whatever this browser saved before. */
      signUp: (user: { name: string; email: string }, org: string) => {
        applyWorkspace(DEFAULT_NAMES);
        set({ ...initial(), user, draft: { ...emptyDraft(), org } });
      },
      setDraft: (fn: (d: Draft) => Draft) => set((s) => ({ ...s, draft: fn(s.draft) })),
      /** Setup is done: the draft's names become the workspace's names everywhere. */
      finishSetup: () =>
        set((s) => {
          const d = s.draft;
          const names: Names = {
            properties: { ...DEFAULT_NAMES.properties, ...Object.fromEntries(d.properties.map((p) => [p.id, p.name.trim() || DEFAULT_NAMES.properties[p.id]])) },
            // Added companies and moved properties stay in setup; the sample portfolio keeps its four managers.
            managers: { ...DEFAULT_NAMES.managers, ...Object.fromEntries(d.managers.filter((m) => m.id in DEFAULT_NAMES.managers).map((m) => [m.id, { name: m.name.trim() || DEFAULT_NAMES.managers[m.id as ManagerId].name, email: m.email.trim() }])) },
          };
          // The dashboard always shows the sample portfolio; setup only renames it.
          return {
            ...renamed(initial(), names, []),
            org: d.org.trim() || ORG,
            names,
            draft: s.draft,
            user: s.user,
            setupDone: true,
          };
        }),
      reset: () => {
        try {
          localStorage.removeItem(KEY);
        } catch {}
        applyWorkspace(DEFAULT_NAMES);
        set(initial());
      },
      approveMapping: (ids: string[]) => set((s) => ({ ...s, mapped: [...new Set([...s.mapped, ...ids])] })),
      sendOwnerReport: () => set((s) => ({ ...s, ownerReport: { sent: TODAY } })),
      closeMonth: (open: string[]) => set((s) => ({ ...s, closed: { date: TODAY, open } })),
      markSeen: (ids: string[]) => set((s) => ({ ...s, seen: [...new Set([...s.seen, ...ids])] })),
    };
  }, [set]);
}

type Actions = ReturnType<typeof useActions>;
const Ctx = createContext<{ state: State; act: Actions; hydrated: boolean } | null>(null);

const KEY = "reiq-prototype-v2";

/**
 * The seed's text names managers and properties by their default names
 * ("Waiting on Manager 2"). After setup renames them, rewrite that text so
 * logs, tasks, and approvals say the new names too.
 */
function renamed(s: State, names: Names, included: string[]): State {
  applyWorkspace(names, included);
  const mgr = new Map(Object.entries(DEFAULT_NAMES.managers).map(([id, m]) => [m.name, names.managers[id as ManagerId].name]));
  const prop = new Map(Object.entries(DEFAULT_NAMES.properties).map(([id, n]) => [n, names.properties[id]]));
  const json = JSON.stringify(s)
    .replace(/Manager [1-4]\b/g, (x) => JSON.stringify(mgr.get(x) ?? x).slice(1, -1))
    .replace(/Property [A-L]\b/g, (x) => JSON.stringify(prop.get(x) ?? x).slice(1, -1));
  return JSON.parse(json);
}

export function WfStore({ children }: { children: React.ReactNode }) {
  const [state, set] = useState(initial);
  const act = useActions(set);
  const [hydrated, setHydrated] = useState(false);

  // Load what this browser saved, then keep saving. Reads and writes can fail
  // (private windows, blocked storage); the prototype still works without them.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as State;
        applyWorkspace(saved.names, saved.included);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from storage
        set({ ...initial(), ...saved });
      }
    } catch {}
    setHydrated(true);
  }, []);
  // Save only once the loaded state has rendered. Saving earlier writes the
  // initial state over what was saved (dev runs effects twice, so a reload lost it).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state, hydrated]);

  // Signed in for real: the person's name, email and org replace the sample ones on every screen.
  const account = useAccount();
  const shown = useMemo(
    () => (account ? { ...state, user: { name: account.name || account.email, email: account.email }, org: account.orgName || state.org } : state),
    [state, account],
  );
  const value = useMemo(() => ({ state: shown, act, hydrated }), [shown, act, hydrated]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWf() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWf outside WfStore");
  return v;
}

/** Overdue: a question past its due date with no reply. */
export const isOverdue = (e: Exception) => e.stage === "waiting" && !!e.question && !e.question.reply && e.question.due < TODAY;

export const openExceptions = (s: State, propertyId?: string) => s.exceptions.filter((e) => e.stage !== "closed" && (!propertyId || e.property === propertyId));
