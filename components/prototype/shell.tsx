"use client";

import { AlertCircle, Building2, CalendarCheck, ChartNoAxesColumn, ClipboardCheck, FileText, HardHat, Landmark, LayoutGrid, ListChecks, LogOut, Menu, RotateCcw, ScrollText, Settings, Users, Wrench, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FadeIn } from "@/components/ui/motion";
import { cn } from "@/lib/cn";
import { PRODUCT_NAME } from "@/lib/labels";
import { managerState } from "./derive";
import { MANAGERS } from "./seed";
import { openExceptions, useWf, type Compare, type Period } from "./store";
import { Segmented } from "./ui";

const B = "/prototype";

interface Item {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  badge?: "exceptions" | "tasks" | "close";
}

const NAV: { group?: string; items: Item[] }[] = [
  { items: [{ href: `${B}/overview`, label: "Overview", icon: LayoutGrid }] },
  {
    group: "Month-end",
    items: [
      { href: `${B}/close`, label: "Close", icon: ClipboardCheck, badge: "close" },
      { href: `${B}/exceptions`, label: "Exceptions", icon: AlertCircle, badge: "exceptions" },
      { href: `${B}/tasks`, label: "Tasks", icon: ListChecks, badge: "tasks" },
      { href: `${B}/owner-report`, label: "Owner report", icon: FileText },
      { href: `${B}/decisions`, label: "Decision log", icon: ScrollText },
    ],
  },
  {
    group: "Portfolio",
    items: [
      { href: `${B}/properties`, label: "Properties", icon: Building2 },
      { href: `${B}/managers`, label: "Managers", icon: Users },
      { href: `${B}/financials`, label: "Financials", icon: ChartNoAxesColumn },
      { href: `${B}/leasing`, label: "Leasing and revenue", icon: CalendarCheck },
      { href: `${B}/operations`, label: "Operations", icon: Wrench },
      { href: `${B}/renovations`, label: "Renovations", icon: HardHat },
      { href: `${B}/capital`, label: "Capital and debt", icon: Landmark },
    ],
  },
];

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { state } = useWf();
  const open = openExceptions(state).length;
  const waiting = state.approvals.filter((a) => a.status === "Waiting").length + state.projects.filter((p) => p.status === "Active" && (p.step === 2 || (p.step === 4 && p.type === "Interior"))).length;
  const closeOpen = MANAGERS.some((m) => managerState(m.id) !== "All received");
  return (
    <div className="flex-1 overflow-y-auto px-2 pt-1">
      {NAV.map((g, i) => (
        <div key={g.group ?? i} className="mb-4">
          {g.group && <div className="eyebrow px-2 pb-1.5">{g.group}</div>}
          <ul className="flex flex-col gap-px">
            {g.items.map((n) => {
              const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
              const Icon = n.icon;
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn("flex h-7 items-center gap-2 rounded-md px-2 text-xs transition-colors duration-100", active ? "bg-fg/[0.06] font-medium text-fg" : "text-fg-2 hover:bg-fg/[0.03] hover:text-fg")}
                  >
                    <Icon className={cn("size-3.5", active ? "text-fg" : "text-fg-3")} strokeWidth={1.75} />
                    <span className="flex-1">{n.label}</span>
                    {n.badge === "exceptions" && open > 0 && <span className="num text-[11px] text-fg-3">{open}</span>}
                    {n.badge === "tasks" && waiting > 0 && <span className="num text-[11px] text-fg-3">{waiting}</span>}
                    {n.badge === "close" && closeOpen && <span className="size-1.5 rounded-full bg-warning" aria-label="Close in progress" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function UserMenu() {
  const { state, act } = useWf();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const initials = state.user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div ref={ref} className="relative border-t border-border p-2">
      {open && (
        <div className="absolute right-2 bottom-full left-2 mb-1 rounded-lg border border-border bg-bg p-1 shadow-overlay">
          <div className="border-b border-border px-2 pt-1.5 pb-2 text-xs text-fg-3">{state.user.email}</div>
          <Link href={`${B}/settings`} onClick={() => setOpen(false)} className="flex h-7 items-center gap-2 rounded-md px-2 text-xs text-fg-2 hover:bg-fg/[0.04] hover:text-fg">
            <Settings className="size-3.5" strokeWidth={1.75} /> Settings
          </Link>
          <button
            type="button"
            onClick={() => {
              act.reset();
              router.push(B);
            }}
            className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-xs text-fg-2 hover:bg-fg/[0.04] hover:text-fg"
          >
            <RotateCcw className="size-3.5" strokeWidth={1.75} /> Start over
          </button>
          <Link href={B} className="flex h-7 items-center gap-2 rounded-md px-2 text-xs text-fg-2 hover:bg-fg/[0.04] hover:text-fg">
            <LogOut className="size-3.5" strokeWidth={1.75} /> Sign out
          </Link>
        </div>
      )}
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-fg/[0.03]">
        <span className="num flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-[11px] text-fg-2">{initials}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-fg">{state.user.name}</span>
          <span className="block truncate text-xs text-fg-3">Asset manager</span>
        </span>
      </button>
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { state } = useWf();
  return (
    <nav aria-label="Primary" className="flex h-full w-[220px] flex-col border-r border-border bg-bg">
      <div className="flex h-12 items-center gap-2 px-4">
        <Link href={`${B}/overview`} onClick={onNavigate} className="num text-[13px] font-semibold tracking-[0.06em] text-fg">
          {PRODUCT_NAME}
        </Link>
      </div>
      <div className="mx-2 mb-3 flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5">
        <span className="flex size-5 shrink-0 items-center justify-center rounded bg-fg/[0.08] text-[11px] font-semibold text-fg-2">{state.org.slice(0, 1).toUpperCase()}</span>
        <span className="truncate text-xs font-medium">{state.org}</span>
      </div>
      <Nav onNavigate={onNavigate} />
      <UserMenu />
    </nav>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { state, hydrated } = useWf();
  const router = useRouter();
  // No workspace data exists until setup finishes, so send unfinished accounts there.
  useEffect(() => {
    if (hydrated && !state.setupDone) router.replace("/prototype/setup/properties");
  }, [hydrated, state.setupDone, router]);
  // Always render the page (so the route prerenders), but keep it hidden until we know setup is done.
  const ready = hydrated && state.setupDone;
  return (
    <div className={cn("flex min-h-screen bg-bg text-fg", !ready && "invisible")} aria-hidden={!ready || undefined}>
      <aside className="sticky top-0 hidden h-screen shrink-0 md:block">
        <Sidebar />
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-backdrop" onClick={() => setOpen(false)} />
          <div className="relative h-full w-[220px] shadow-overlay">
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex h-12 items-center gap-2 border-b border-border px-4 md:hidden">
          <button type="button" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((v) => !v)} className="rounded-md p-1 text-fg-2 hover:bg-fg/[0.04]">
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
          <span className="num text-[13px] font-semibold tracking-[0.06em]">{PRODUCT_NAME}</span>
        </div>
        {children}
      </div>
    </div>
  );
}

const PERIODS: Period[] = ["Month", "YTD", "T-3", "T-12"];
const COMPARES: Compare[] = ["Budget", "Prior year", "Underwriting"];

export function PeriodControls() {
  const { state, act } = useWf();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Segmented label="" value={state.period} options={PERIODS} onChange={act.setPeriod} />
      <Segmented label="vs." value={state.compare} options={COMPARES} onChange={act.setCompare} />
    </div>
  );
}

export interface Crumb {
  label: string;
  href?: string;
}

/** Page frame. `controls` adds the period and compare-to controls used on data pages. */
export function Page({ title, subtitle, crumbs, controls, actions, children }: { title: React.ReactNode; subtitle?: React.ReactNode; crumbs?: Crumb[]; controls?: boolean; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <header className="px-6 pt-6 pb-4">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1.5 text-xs text-fg-3">
            {crumbs.map((c, i) => (
              <span key={c.label} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-fg/20">/</span>}
                {c.href ? (
                  <Link href={c.href} className="transition-colors hover:text-fg">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-fg-2">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[20px] leading-7 font-semibold tracking-tight text-fg">{title}</h1>
            {subtitle && <div className="mt-0.5 text-xs text-fg-3">{subtitle}</div>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {controls && <PeriodControls />}
            {actions}
          </div>
        </div>
      </header>
      <FadeIn className="flex min-w-0 flex-col gap-6 px-6 pb-12">{children}</FadeIn>
    </>
  );
}

export const href = {
  property: (id: string) => `${B}/properties/${id}`,
  unit: (propertyId: string, unit: string) => `${B}/properties/${propertyId}/units/${unit}`,
  exception: (id: string) => `${B}/exceptions/${id}`,
  manager: (id: string) => `${B}/managers/${id}`,
  project: (id: string) => `${B}/renovations/${id}`,
  root: B,
};
