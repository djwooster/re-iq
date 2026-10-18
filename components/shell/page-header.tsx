"use client";

import { Menu } from "lucide-react";
import { useMobileNav } from "./app-shell";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  const openNav = useMobileNav();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex min-h-12 max-w-[1400px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" onClick={openNav} className="-ml-1 cursor-pointer rounded-md p-1 text-fg-3 hover:text-fg md:hidden" aria-label="Open navigation">
            <Menu className="size-4" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] leading-5 font-semibold text-fg">{title}</h1>
            {subtitle && <p className="truncate text-[11px] text-fg-3">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function PageBody({ children, narrow }: { children: React.ReactNode; narrow?: boolean }) {
  return <div className={`mx-auto w-full px-4 py-5 md:px-6 ${narrow ? "max-w-[720px]" : "max-w-[1400px]"}`}>{children}</div>;
}
