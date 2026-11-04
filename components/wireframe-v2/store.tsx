"use client";

import { createContext, useContext, useMemo, useState } from "react";
import {
  APPROVALS,
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
  type Task,
  type TaskStatus,
} from "./seed";

/**
 * Clicks carry across screens (a question sent on one exception shows up in
 * Questions and on the Overview strip) and reset on reload.
 */

export type Period = "Month" | "YTD" | "T-3" | "T-12";
export type Compare = "Budget" | "Prior year" | "Underwriting";

interface State {
  exceptions: Exception[];
  projects: Project[];
  tasks: Task[];
  approvals: Approval[];
  decisions: Decision[];
  mapped: string[];
  ownerReport: { sent?: string };
  period: Period;
  compare: Compare;
}

const initial = (): State => ({
  exceptions: EXCEPTIONS,
  projects: PROJECTS,
  tasks: TASKS,
  approvals: APPROVALS,
  decisions: DECISIONS,
  mapped: [],
  ownerReport: {},
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
      sendQuestion: (id: string, text: string, due: string) =>
        set((s) => ({
          ...s,
          exceptions: ex(id, (e) => ({ stage: "waiting", question: { text, sent: TODAY, due }, log: [...e.log, entry(`Asked ${managerOf(e.property).name} by email · due ${fmtDate(due)}`)] }), s),
        })),
      remind: (id: string) => set((s) => ({ ...s, exceptions: ex(id, (e) => ({ log: [...e.log, entry(`Sent a reminder to ${managerOf(e.property).name}`)] }), s) })),
      recordReply: (id: string, text: string, file?: string) =>
        set((s) => ({
          ...s,
          exceptions: ex(
            id,
            (e) => ({
              question: e.question && { ...e.question, reply: { text, file, received: TODAY } },
              log: [...e.log, entry(`Recorded reply from ${managerOf(e.property).name}${file ? ` · ${file}` : ""}`)],
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

      approveMapping: (ids: string[]) => set((s) => ({ ...s, mapped: [...new Set([...s.mapped, ...ids])] })),
      sendOwnerReport: () => set((s) => ({ ...s, ownerReport: { sent: TODAY } })),
    };
  }, [set]);
}

type Actions = ReturnType<typeof useActions>;
const Ctx = createContext<{ state: State; act: Actions } | null>(null);

export function WfStore({ children }: { children: React.ReactNode }) {
  const [state, set] = useState(initial);
  const act = useActions(set);
  const value = useMemo(() => ({ state, act }), [state, act]);
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
