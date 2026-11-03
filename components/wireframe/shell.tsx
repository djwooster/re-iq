"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ForceLight } from "@/components/theme/theme-provider";
import { cn } from "@/lib/cn";
import { PRODUCT_NAME } from "@/lib/labels";

const NAV = [
  { href: "/wireframe/dashboard", label: "Dashboard" },
  { href: "/wireframe/properties", label: "Properties" },
  { href: "/wireframe/upload", label: "Upload" },
  { href: "/wireframe/report-status", label: "Report status" },
  { href: "/wireframe/reports", label: "Reports" },
];

/** Which nav item a page belongs to, so drill-down pages keep their section highlighted. */
const SECTION: Record<string, string> = {
  "/wireframe/property": "/wireframe/properties",
  "/wireframe/unit": "/wireframe/properties",
  "/wireframe/tenant": "/wireframe/properties",
};

export function WireframeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const section = SECTION[pathname] ?? pathname;
  return (
    <div className="flex min-h-screen bg-bg text-fg">
      <ForceLight />
      <aside className="w-[200px] shrink-0 border-r border-fg/15 px-3 py-4">
        <div className="num mb-6 px-2 text-[13px] font-semibold tracking-[0.06em]">{PRODUCT_NAME}</div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((n) => {
            const active = section === n.href || section.startsWith(`${n.href}/`);
            return (
              <Link key={n.href} href={n.href} className={cn("rounded-md px-2 py-1.5 text-xs transition-colors", active ? "bg-fg/[0.07] font-medium text-fg" : "text-fg-2 hover:bg-fg/[0.04] hover:text-fg")}>
                {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function WfPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <header className="flex h-12 items-center justify-between border-b border-fg/15 px-6">
        <h1 className="text-sm font-semibold">{title}</h1>
        <Link href="/wireframe" className="text-[11px] text-fg-3 underline decoration-fg/20 underline-offset-2 hover:text-fg">
          Restart
        </Link>
      </header>
      <main className="mx-auto flex max-w-[1100px] flex-col gap-4 px-6 py-6">{children}</main>
    </>
  );
}
