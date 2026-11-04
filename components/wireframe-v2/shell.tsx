"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ForceLight } from "@/components/theme/theme-provider";
import { cn } from "@/lib/cn";
import { PRODUCT_NAME } from "@/lib/labels";
import { ORG } from "./seed";
import { useWf, type Compare, type Period } from "./store";
import { Segmented } from "./ui";

const B = "/wireframe-v2";

const NAV: { group?: string; items: { href: string; label: string }[] }[] = [
  { items: [{ href: `${B}/overview`, label: "Overview" }] },
  {
    group: "Month-end",
    items: [
      { href: `${B}/close`, label: "Close" },
      { href: `${B}/exceptions`, label: "Exceptions" },
      { href: `${B}/questions`, label: "Questions" },
      { href: `${B}/tasks`, label: "Tasks" },
      { href: `${B}/owner-report`, label: "Owner report" },
      { href: `${B}/decisions`, label: "Decision log" },
    ],
  },
  {
    group: "Portfolio",
    items: [
      { href: `${B}/properties`, label: "Properties" },
      { href: `${B}/financials`, label: "Financials" },
      { href: `${B}/leasing`, label: "Leasing and revenue" },
      { href: `${B}/operations`, label: "Operations" },
      { href: `${B}/renovations`, label: "Renovations" },
      { href: `${B}/capital`, label: "Capital and debt" },
    ],
  },
  { items: [{ href: `${B}/settings`, label: "Settings" }] },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen bg-bg text-fg">
      <ForceLight />
      <aside className="sticky top-0 flex h-screen w-[208px] shrink-0 flex-col border-r border-fg/15 px-3 py-4">
        <Link href="/" className="num mb-5 block px-2 text-[13px] font-semibold tracking-[0.06em] hover:opacity-70">
          {PRODUCT_NAME}
        </Link>
        <nav className="flex flex-col gap-4 overflow-y-auto">
          {NAV.map((g, i) => (
            <div key={g.group ?? i} className="flex flex-col gap-0.5">
              {g.group && <span className="mb-1 px-2 text-[10px] font-medium tracking-wide text-fg-3 uppercase">{g.group}</span>}
              {g.items.map((n) => {
                const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
                return (
                  <Link key={n.href} href={n.href} className={cn("rounded-md px-2 py-1.5 text-xs transition-colors", active ? "bg-fg/[0.07] font-medium text-fg" : "text-fg-2 hover:bg-fg/[0.04] hover:text-fg")}>
                    {n.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="mt-auto border-t border-fg/10 px-2 pt-3 text-[11px] text-fg-3">
          <p className="text-fg-2">{ORG}</p>
          <Link href={B} className="underline decoration-fg/20 underline-offset-2 hover:text-fg">
            Sign out
          </Link>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const PERIODS: Period[] = ["Month", "YTD", "T-3", "T-12"];
const COMPARES: Compare[] = ["Budget", "Prior year", "Underwriting"];

export function PeriodControls() {
  const { state, act } = useWf();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Segmented label="Period" value={state.period} options={PERIODS} onChange={act.setPeriod} />
      <Segmented label="Compare to" value={state.compare} options={COMPARES} onChange={act.setCompare} />
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
      <header className="border-b border-fg/15 px-6 pt-4 pb-3">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-1.5 flex items-center gap-1.5 text-[11px] text-fg-3">
            {crumbs.map((c, i) => (
              <span key={c.label} className="flex items-center gap-1.5">
                {i > 0 && <span>/</span>}
                {c.href ? (
                  <Link href={c.href} className="underline decoration-fg/20 underline-offset-2 hover:text-fg">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-fg-2">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold">{title}</h1>
            {subtitle && <div className="mt-0.5 text-[11px] text-fg-3">{subtitle}</div>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {controls && <PeriodControls />}
            {actions}
          </div>
        </div>
      </header>
      <main className="flex min-w-0 flex-col gap-5 px-6 py-6">{children}</main>
    </>
  );
}

export const href = {
  property: (id: string) => `${B}/properties/${id}`,
  unit: (propertyId: string, unit: string) => `${B}/properties/${propertyId}/units/${unit}`,
  exception: (id: string) => `${B}/exceptions/${id}`,
  project: (id: string) => `${B}/renovations/${id}`,
  root: B,
};
