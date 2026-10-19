import Link from "next/link";
import { PRODUCT_NAME } from "@/lib/labels";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-[1280px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="num text-[13px] font-semibold tracking-[0.06em] text-fg">
          {PRODUCT_NAME}
        </Link>
        <nav className="flex items-center gap-1 text-xs">
          <Link href="/login" className="rounded-md px-2.5 py-1.5 text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg">
            Try the demo
          </Link>
          <a href="#early-access" className="rounded-md bg-inverted px-3 py-1.5 font-medium text-inverted-fg transition-opacity hover:opacity-90">
            Early access
          </a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-4 py-6 text-[11px] text-fg-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span className="num tracking-[0.06em]">{PRODUCT_NAME}</span>
        <span>Portfolio intelligence for multifamily owners and asset managers.</span>
      </div>
    </footer>
  );
}
