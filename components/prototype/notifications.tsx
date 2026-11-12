"use client";

import { AlertCircle, Bell, Check, CheckCheck, Clock, FileCheck, MessageSquare, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { managerState } from "./derive";
import { CLOSE_MONTH, MANAGERS, REPORT_DUE, TODAY, fmtDate, property } from "./seed";
import { href } from "./shell";
import { isOverdue, useWf } from "./store";

/**
 * Time-sensitive events across the workspace, derived from the same state the
 * pages show. Read state is kept per id, so an exception that gets a reply
 * after going overdue notifies again.
 */

type Tone = "red" | "amber" | "green" | "neutral";

interface Notification {
  id: string;
  tone: Tone;
  icon: typeof Bell;
  title: string;
  /** Property name, shown in property blue. */
  property?: string;
  detail: string;
  date: string;
  href: string;
}

const TONE: Record<Tone, string> = {
  red: "bg-unfavorable/10 text-unfavorable",
  amber: "bg-warning/12 text-warning",
  green: "bg-favorable/10 text-favorable",
  neutral: "bg-fg/[0.05] text-fg-2",
};

function useNotifications(): Notification[] {
  const { state } = useWf();
  const name = (id: string) => property(id)?.name ?? "";
  const list: Notification[] = [
    ...state.exceptions.filter(isOverdue).map((e) => ({ id: `overdue:${e.id}`, tone: "red" as const, icon: AlertCircle, title: `Overdue: ${e.trigger}`, property: name(e.property), detail: `No reply since ${fmtDate(e.question!.sent)}`, date: e.question!.due, href: href.exception(e.id) })),
    ...state.exceptions
      .filter((e) => e.stage === "waiting" && e.question?.reply)
      .map((e) => ({ id: `reply:${e.id}`, tone: "green" as const, icon: MessageSquare, title: `Reply: ${e.trigger}`, property: name(e.property), detail: e.question!.reply!.text, date: e.question!.reply!.received, href: href.exception(e.id) })),
    ...state.exceptions.filter((e) => e.stage === "new").map((e) => ({ id: `new:${e.id}`, tone: "neutral" as const, icon: Sparkles, title: `New exception: ${e.trigger}`, property: name(e.property), detail: e.source, date: e.opened, href: href.exception(e.id) })),
    ...MANAGERS.filter((m) => managerState(m.id) === "Late").map((m) => ({ id: `late:${m.id}`, tone: "amber" as const, icon: Clock, title: `${state.names.managers[m.id].name} missed the ${CLOSE_MONTH} deadline`, detail: `Package was due ${fmtDate(REPORT_DUE)}`, date: REPORT_DUE, href: href.manager(m.id) })),
    ...state.approvals
      .filter((a) => a.status === "Waiting")
      .map((a) => ({ id: `approval:${a.id}`, tone: "neutral" as const, icon: FileCheck, title: `Approval requested: ${a.title}`, property: name(a.property), detail: `From ${a.from}`, date: a.submitted, href: a.projectId ? href.project(a.projectId) : "/prototype/tasks" })),
  ];
  return list.sort((x, y) => y.date.localeCompare(x.date));
}

const when = (iso: string) => (iso === TODAY ? "Today" : fmtDate(iso));

export function Notifications() {
  const { state, act } = useWf();
  const router = useRouter();
  const all = useNotifications();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const ref = useRef<HTMLDivElement>(null);
  const unread = all.filter((n) => !state.seen.includes(n.id));
  const shown = tab === "unread" ? unread : all;

  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const go = (n: Notification) => {
    act.markSeen([n.id]);
    setOpen(false);
    router.push(n.href);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={unread.length ? `Notifications, ${unread.length} unread` : "Notifications"}
        className={cn("relative flex size-7 items-center justify-center rounded-md text-fg-2 transition-colors hover:bg-fg/[0.05] hover:text-fg", open && "bg-fg/[0.05] text-fg")}
      >
        <Bell className="size-4" strokeWidth={1.75} />
        {unread.length > 0 && <span className="num absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-unfavorable px-1 text-[9px] font-semibold text-bg">{unread.length}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 z-50 mt-1.5 flex max-h-[min(560px,80vh)] w-[min(380px,calc(100vw-24px))] flex-col rounded-lg border border-border bg-bg shadow-overlay"
          >
            <div className="flex items-center justify-between gap-3 px-3 pt-3">
              <h2 className="text-sm font-semibold">Notifications</h2>
              {unread.length > 0 && (
                <button type="button" onClick={() => act.markSeen(unread.map((n) => n.id))} className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-fg-2 transition-colors hover:bg-fg/[0.04] hover:text-fg">
                  <CheckCheck className="size-3.5" /> Mark all as read
                </button>
              )}
            </div>
            <div className="flex gap-1 border-b border-border px-3 pt-2" role="tablist">
              {(["all", "unread"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={cn("-mb-px flex items-center gap-1.5 border-b-2 px-1.5 pb-2 text-xs transition-colors", tab === t ? "border-fg font-medium text-fg" : "border-transparent text-fg-3 hover:text-fg")}
                >
                  {t === "all" ? "All" : "Unread"}
                  {t === "unread" && unread.length > 0 && <span className="num rounded-full bg-fg/[0.06] px-1.5 text-[10px] text-fg-2">{unread.length}</span>}
                </button>
              ))}
            </div>
            {shown.length ? (
              <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
                {shown.map((n) => {
                  const isUnread = !state.seen.includes(n.id);
                  const Icon = n.icon;
                  return (
                    <li key={n.id} className="group relative">
                      <button type="button" onClick={() => go(n)} className="flex w-full items-start gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-fg/[0.03]">
                        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", TONE[n.tone])}>
                          <Icon className="size-3.5" strokeWidth={2} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block text-xs leading-4", isUnread ? "font-medium text-fg" : "text-fg-2")}>{n.title}</span>
                          <span className="mt-0.5 block truncate text-xs text-fg-3">
                            {n.property && <span className="text-property">{n.property} · </span>}
                            {n.detail}
                          </span>
                          <span className="num mt-1 block text-[11px] text-fg-3">{when(n.date)}</span>
                        </span>
                        <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", isUnread ? "bg-brand" : "bg-transparent")} aria-label={isUnread ? "Unread" : undefined} />
                      </button>
                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => act.markSeen([n.id])}
                          aria-label="Mark as read"
                          title="Mark as read"
                          className="absolute right-2 bottom-2 hidden rounded-md border border-border bg-bg p-1 text-fg-3 transition-colors group-hover:block hover:text-fg"
                        >
                          <Check className="size-3" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-2 px-3 py-10 text-center">
                <CheckCheck className="size-5 text-fg-3" />
                <span className="text-xs text-fg-2">You&apos;re all caught up.</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
