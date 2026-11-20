"use client";

import { AlertCircle, Building2, CalendarCheck, ChartNoAxesColumn, ClipboardCheck, FileText, HardHat, Landmark, LayoutGrid, ListChecks, LogOut, Menu, Settings, Users, Wrench, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { signOut } from "@/lib/auth/actions";
import { cn } from "@/lib/cn";
import { PRODUCT_NAME } from "@/lib/labels";
import { Notifications } from "./notifications";

/** The signed-in app's frame: the same sidebar as the prototype, with the real org and person. */

export interface ShellAccount {
  orgName: string;
  name: string;
  email: string;
  roleLabel: string;
  /** Some property hasn't sent last month's reports yet: the prototype's dot on Close. */
  closeOpen: boolean;
}

const NAV: { group?: string; items: { href: string; label: string; icon: typeof LayoutGrid; badge?: "close" }[] }[] = [
  { items: [{ href: "/app", label: "Overview", icon: LayoutGrid }] },
  {
    group: "Month-end",
    items: [
      { href: "/app/close", label: "Close", icon: ClipboardCheck, badge: "close" },
      { href: "/app/exceptions", label: "Exceptions", icon: AlertCircle },
      { href: "/app/tasks", label: "Tasks", icon: ListChecks },
      { href: "/app/owner-report", label: "Owner report", icon: FileText },
    ],
  },
  {
    group: "Portfolio",
    items: [
      { href: "/app/properties", label: "Properties", icon: Building2 },
      { href: "/app/managers", label: "Managers", icon: Users },
      { href: "/app/financials", label: "Financials", icon: ChartNoAxesColumn },
      { href: "/app/leasing", label: "Leasing and revenue", icon: CalendarCheck },
      { href: "/app/operations", label: "Operations", icon: Wrench },
      { href: "/app/renovations", label: "Renovations", icon: HardHat },
      { href: "/app/capital", label: "Capital and debt", icon: Landmark },
    ],
  },
];

function Nav({ closeOpen, onNavigate }: { closeOpen: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <div className="flex-1 overflow-y-auto px-2 pt-1">
      {NAV.map((section, i) => (
        <div key={section.group ?? i} className="mb-5">
          {section.group && <div className="px-2 pb-1 text-[11px] font-medium text-fg-3">{section.group}</div>}
          <ul className="flex flex-col gap-px">
            {section.items.map(({ href, label, icon: Icon, badge }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active(href) ? "page" : undefined}
                  className={cn("flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors duration-100", active(href) ? "bg-brand-soft font-medium text-brand" : "text-fg/80 hover:bg-fg/[0.04] hover:text-fg")}
                >
                  <Icon className={cn("size-4", active(href) ? "text-brand" : "text-fg-2")} strokeWidth={1.75} />
                  <span className="flex-1">{label}</span>
                  {badge === "close" && closeOpen && <span className="size-1.5 rounded-full bg-warning" aria-label="Close in progress" />}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function UserMenu({ account, onNavigate }: { account: ShellAccount; onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const shown = account.name || account.email;
  const initials = shown
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div ref={ref} className="relative border-t border-border p-2">
      {open && (
        <div className="absolute right-2 bottom-full left-2 mb-1 rounded-lg border border-border bg-bg p-1 shadow-overlay">
          <div className="truncate border-b border-border px-2 pt-1.5 pb-2 text-xs text-fg-3">{account.email}</div>
          <Link
            href="/app/settings"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="flex h-7 items-center gap-2 rounded-md px-2 text-xs text-fg-2 hover:bg-fg/[0.04] hover:text-fg"
          >
            <Settings className="size-3.5" strokeWidth={1.75} /> Settings
          </Link>
          <button type="button" onClick={() => signOut()} className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-xs text-fg-2 hover:bg-fg/[0.04] hover:text-fg">
            <LogOut className="size-3.5" strokeWidth={1.75} /> Sign out
          </button>
        </div>
      )}
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-fg/[0.03]">
        <span className="num flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-[11px] text-fg-2">{initials}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-fg">{shown}</span>
          <span className="block truncate text-xs text-fg-3">{account.roleLabel}</span>
        </span>
      </button>
    </div>
  );
}

function Sidebar({ account, onNavigate }: { account: ShellAccount; onNavigate?: () => void }) {
  return (
    <nav aria-label="Primary" className="flex h-full w-[220px] flex-col border-r border-border bg-surface">
      <div className="flex h-12 items-center justify-between gap-2 pr-2.5 pl-4">
        <Link href="/app" onClick={onNavigate} className="num text-[13px] font-semibold tracking-[0.06em] text-fg">
          {PRODUCT_NAME}
        </Link>
        <Notifications />
      </div>
      <div className="mx-2 mb-4 flex items-center gap-2 rounded-md border border-border bg-bg px-2 py-1.5">
        <span className="flex size-5 shrink-0 items-center justify-center rounded bg-fg/[0.08] text-[11px] font-semibold text-fg-2">{account.orgName.slice(0, 1).toUpperCase()}</span>
        <span className="truncate text-xs font-medium">{account.orgName}</span>
      </div>
      <Nav closeOpen={account.closeOpen} onNavigate={onNavigate} />
      <UserMenu account={account} onNavigate={onNavigate} />
    </nav>
  );
}

export function AppShell({ account, children }: { account: ShellAccount; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <ToastProvider>
    <div className="flex min-h-screen bg-bg text-fg">
      <aside className="sticky top-0 hidden h-screen shrink-0 md:block">
        <Sidebar account={account} />
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-backdrop" onClick={() => setOpen(false)} />
          <div className="relative h-full w-[220px] shadow-overlay">
            <Sidebar account={account} onNavigate={() => setOpen(false)} />
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
    </ToastProvider>
  );
}
