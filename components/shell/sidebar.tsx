"use client";

import { ArrowLeftRight, Building2, ChartNoAxesColumn, Database, FileText, LayoutGrid, ListChecks, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Dot } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { getCloseSummary, getCurrentMember, getOrganization, getOwnerMember, listIssues, SESSION_COOKIE } from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import { PRODUCT_NAME } from "@/lib/labels";
import { SHOW_DEV_TOOLS, useApp } from "./app-context";
import { DevTools } from "./dev-tools";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  exact?: boolean;
  badge?: "acting" | "close";
}

const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: "Portfolio",
    items: [
      { href: "/app", label: "Overview", icon: LayoutGrid, exact: true },
      { href: "/app/performance", label: "Performance", icon: ChartNoAxesColumn },
      { href: "/app/properties", label: "Properties", icon: Building2 },
    ],
  },
  {
    label: "Workflow",
    items: [
      { href: "/app/actions", label: "Actions", icon: ListChecks, badge: "acting" },
      { href: "/app/reports", label: "Reports", icon: FileText },
      { href: "/app/data-sources", label: "Data Sources", icon: Database, badge: "close" },
      // Questions to property managers are on hold for the MVP (see components/questions).
      // { href: "/app/questions", label: "Questions", icon: MessageSquareText },
    ],
  },
  {
    label: "Organization",
    items: [{ href: "/app/settings", label: "Settings", icon: Settings }],
  },
];

/** What the owner sees: one page and the reports shared with them. */
const OWNER_NAV: { label: string; items: NavItem[] }[] = [
  {
    label: "Owner view",
    items: [
      { href: "/app", label: "Portfolio", icon: LayoutGrid, exact: true },
      { href: "/app/reports", label: "Shared reports", icon: FileText },
    ],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { orgId, role, setRole } = useApp();
  const owner = role === "owner";
  const { data: org } = useData(() => getOrganization(orgId), [orgId]);
  const { data: me } = useData(() => (owner ? getOwnerMember() : getCurrentMember()), [owner]);
  const { data: issues } = useData(() => listIssues(orgId), [orgId]);
  const { data: close } = useData(() => getCloseSummary(orgId), [orgId]);
  const [menuOpen, setMenuOpen] = useState(false);
  const acting = issues?.filter((i) => i.status === "acting").length ?? 0;
  const closeBlocked = Boolean(close && (close.managers_in < close.managers_total || close.missing.length > 0));

  const signOut = () => {
    document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
    router.push("/login");
  };

  return (
    <nav className="flex h-full w-[220px] flex-col border-r border-border bg-bg" aria-label="Primary">
      <div className="flex h-14 flex-col justify-center px-4">
        <Link href="/app" onClick={onNavigate} className="num text-[13px] font-semibold tracking-[0.06em] text-fg">
          {PRODUCT_NAME}
        </Link>
        <span className="truncate text-[11px] text-fg-3">
          {org?.name ?? " "}
          {org?.is_sample && <span className="text-fg-3/70"> (sample)</span>}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pt-2">
        {(owner ? OWNER_NAV : NAV).map((section) => (
          <div key={section.label} className="mb-4">
            <div className="eyebrow px-2 pb-1.5">{section.label}</div>
            <ul className="flex flex-col gap-px">
              {section.items.map((item) => {
                const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-7 items-center gap-2 rounded-md px-2 text-xs transition-colors duration-100",
                        active ? "bg-fg/[0.06] font-medium text-fg" : "text-fg-2 hover:bg-fg/[0.03] hover:text-fg",
                      )}
                    >
                      <Icon className={cn("size-3.5", active ? "text-fg" : "text-fg-3")} strokeWidth={1.75} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge === "acting" && acting > 0 && <span className="num text-[10px] text-fg-3">{acting}</span>}
                      {item.badge === "close" && closeBlocked && <Dot tone="warning" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {SHOW_DEV_TOOLS && <DevTools />}

      <div className="relative border-t border-border p-2">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-fg/[0.03]"
        >
          <span className="num flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-[10px] text-fg-2">
            {me?.initials ?? "··"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-fg">{me?.name ?? " "}</span>
            <span className="block truncate text-[11px] text-fg-3">{org?.name ?? " "}</span>
          </span>
        </button>
        {menuOpen && (
          <div className="absolute right-2 bottom-full left-2 mb-1 rounded-md border border-border bg-bg p-1 shadow-overlay">
            <button
              type="button"
              onClick={() => {
                setRole(owner ? "asset_manager" : "owner");
                setMenuOpen(false);
                router.push("/app");
              }}
              className="flex h-7 w-full cursor-pointer items-center gap-2 rounded px-2 text-xs text-fg-2 hover:bg-fg/[0.04] hover:text-fg"
            >
              <ArrowLeftRight className="size-3.5" strokeWidth={1.75} /> {owner ? "Back to Jordan Reyes" : "View as owner (Dana Whitfield)"}
            </button>
            {!owner && (
            <Link
              href="/app/settings"
              onClick={() => {
                setMenuOpen(false);
                onNavigate?.();
              }}
              className="flex h-7 items-center gap-2 rounded px-2 text-xs text-fg-2 hover:bg-fg/[0.04] hover:text-fg"
            >
              <Settings className="size-3.5" strokeWidth={1.75} /> Settings
            </Link>
            )}
            <button type="button" onClick={signOut} className="flex h-7 w-full cursor-pointer items-center gap-2 rounded px-2 text-xs text-fg-2 hover:bg-fg/[0.04] hover:text-fg">
              <LogOut className="size-3.5" strokeWidth={1.75} /> Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
