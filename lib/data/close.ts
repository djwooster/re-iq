import { LATEST_MONTH, TODAY, addDays, daysBetween, formatDate, formatMonth, monthEnd } from "@/lib/dates";
import { joinList } from "@/lib/format";
import { REPORT_TYPE_LABELS } from "@/lib/labels";
import type { Import, MonthKey, PropertyManager, PropertyRecord, ReportType } from "@/lib/types";
import { delay, effectiveImports, propertyRecords } from "./core";
import { propertyManagers } from "./mock/catalog";
import { MONTHLY_REPORTS } from "./mock/imports";
import { getCurrentMember, getOrganization } from "./org";
import { readOverlay, writeOverlay } from "./store";

/**
 * The month-end close: which reports each property manager owes for a month,
 * which arrived, and which still block the numbers. Every property is fed by
 * uploads, so this checklist is where each month starts.
 */

/** Reports every property sends each month. A future org setting. */
export const REQUIRED_REPORTS: ReportType[] = MONTHLY_REPORTS;

/** Days after month end that reports are due under the management agreements. A future org setting. */
export const REPORT_DUE_DAYS = 12;

export type ReportState = "received" | "needs_review" | "failed" | "missing";

export interface ReportSlot {
  report_type: ReportType;
  state: ReportState;
  import: Import | null;
  /** Days after the due date it arrived, or is overdue by when missing. Zero or less is on time. */
  days_late: number;
}

export interface PropertyClose {
  property: PropertyRecord;
  reports: ReportSlot[];
  ready: boolean;
}

export interface ManagerClose {
  manager: PropertyManager;
  property_ids: string[];
  outstanding: { property: PropertyRecord; report_type: ReportType; state: ReportState }[];
  reminder_sent_at: string | null;
}

export interface CloseStatus {
  month: MonthKey;
  organization_name: string;
  /** Signs reminder emails. */
  sender_name: string;
  due_date: string;
  properties: PropertyClose[];
  managers: ManagerClose[];
  ready_count: number;
  /** Uploads waiting on someone at the owner to confirm mappings. */
  review_count: number;
  /** Reports missing or unreadable, which the property manager has to send. */
  outstanding_count: number;
}

export function closeDueDate(month: MonthKey) {
  return addDays(monthEnd(month), REPORT_DUE_DAYS);
}

function slotFor(property: PropertyRecord, type: ReportType, month: MonthKey, imports: Import[], due: string): ReportSlot {
  const candidates = imports.filter((i) => i.property_id === property.id && i.report_type === type && i.period === month);
  const imp = candidates.find((i) => i.status === "processed") ?? candidates.find((i) => i.status === "needs_review") ?? candidates[0] ?? null;
  const state: ReportState = !imp ? "missing" : imp.status === "processed" ? "received" : imp.status;
  const arrived = imp && imp.status !== "failed" ? imp.uploaded_at.slice(0, 10) : TODAY;
  return { report_type: type, state, import: imp, days_late: daysBetween(due, arrived) };
}

export async function getCloseStatus(orgId: string, month: MonthKey = LATEST_MONTH): Promise<CloseStatus> {
  await delay();
  const imports = effectiveImports().filter((i) => i.org_id === orgId);
  const records = propertyRecords(imports).filter((r) => r.org_id === orgId);
  const due = closeDueDate(month);
  const reminders = readOverlay().reminders;
  const [org, me] = await Promise.all([getOrganization(orgId), getCurrentMember()]);

  const properties = records.map((property) => {
    const reports = REQUIRED_REPORTS.map((t) => slotFor(property, t, month, imports, due));
    return { property, reports, ready: reports.every((r) => r.state === "received") };
  });

  const managers = propertyManagers
    .filter((m) => m.org_id === orgId && properties.some((p) => p.property.property_manager_id === m.id))
    .map((manager) => {
      const mine = properties.filter((p) => p.property.property_manager_id === manager.id);
      return {
        manager,
        property_ids: mine.map((p) => p.property.id),
        outstanding: mine.flatMap((p) =>
          p.reports.filter((r) => r.state === "missing" || r.state === "failed").map((r) => ({ property: p.property, report_type: r.report_type, state: r.state })),
        ),
        reminder_sent_at: reminders[`${manager.id}|${month}`] ?? null,
      };
    });

  const slots = properties.flatMap((p) => p.reports);
  return {
    month,
    organization_name: org.name,
    sender_name: me.name,
    due_date: due,
    properties,
    managers,
    ready_count: properties.filter((p) => p.ready).length,
    review_count: slots.filter((s) => s.state === "needs_review").length,
    outstanding_count: slots.filter((s) => s.state === "missing" || s.state === "failed").length,
  };
}

/** The reminder email for a manager's outstanding reports, ready to paste. */
export function reminderEmail(close: CloseStatus, managerId: string): { to: string; subject: string; body: string } | null {
  const m = close.managers.find((x) => x.manager.id === managerId);
  if (!m || m.outstanding.length === 0) return null;
  const first = m.manager.contact_name.split(" ")[0];
  const lines = m.outstanding.map(
    (o) => `- ${o.property.name}: ${REPORT_TYPE_LABELS[o.report_type]}${o.state === "failed" ? " (the file we received could not be read; an Excel export works best)" : ""}`,
  );
  const monthName = formatMonth(close.month, "long");
  return {
    to: m.manager.contact_email,
    subject: `${monthName} reports still needed for ${joinList([...new Set(m.outstanding.map((o) => o.property.short_name))])}`,
    body: [
      `Hi ${first},`,
      "",
      `We're closing ${monthName} for ${close.organization_name} and still need:`,
      "",
      ...lines,
      "",
      `These were due ${formatDate(close.due_date)}. Reply with the files and we'll take it from there.`,
      "",
      "Thanks,",
      close.sender_name,
    ].join("\n"),
  };
}

export async function markReminderSent(managerId: string, month: MonthKey = LATEST_MONTH): Promise<void> {
  await delay(150);
  writeOverlay((d) => {
    d.reminders[`${managerId}|${month}`] = `${TODAY}T${new Date().toISOString().slice(11, 19)}Z`;
  });
}

export interface CloseSummary {
  month: MonthKey;
  managers_total: number;
  /** Managers who have sent their package, complete or not. */
  managers_in: number;
  /** Managers past the due date with nothing received. */
  late: PropertyManager[];
  /** Reports missing from packages that did arrive. */
  missing: { property: PropertyRecord; report_type: ReportType }[];
  due_date: string;
}

/** The one-line read on the month's close: who's in, who's late, what's missing. */
export async function getCloseSummary(orgId: string, month: MonthKey = LATEST_MONTH): Promise<CloseSummary> {
  const close = await getCloseStatus(orgId, month);
  const received = (m: ManagerClose) =>
    close.properties.some((p) => m.property_ids.includes(p.property.id) && p.reports.some((r) => r.state !== "missing"));
  const inManagers = close.managers.filter(received);
  return {
    month,
    managers_total: close.managers.length,
    managers_in: inManagers.length,
    late: close.managers.filter((m) => !received(m) && TODAY > close.due_date).map((m) => m.manager),
    missing: inManagers.flatMap((m) => m.outstanding.map((o) => ({ property: o.property, report_type: o.report_type }))),
    due_date: close.due_date,
  };
}
