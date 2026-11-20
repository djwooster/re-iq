import Link from "next/link";
import { FadeIn } from "@/components/ui/motion";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";

export interface Crumb {
  label: string;
  href?: string;
}

/** Page frame for the signed-in app: title, optional crumbs, actions and tabs on the bottom edge. */
export function Page({ title, subtitle, crumbs, actions, tabs, children }: { title: React.ReactNode; subtitle?: React.ReactNode; crumbs?: Crumb[]; actions?: React.ReactNode; tabs?: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <header className={cn("px-6 pt-6", tabs ? "mb-5 border-b border-border" : "pb-4")}>
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
            <h1 className="text-[24px] leading-8 font-semibold tracking-tight text-fg">{title}</h1>
            {subtitle && <div className="mt-0.5 text-xs text-fg-3">{subtitle}</div>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
        </div>
        {tabs && <div className="mt-5 [&>[role=tablist]]:border-b-0">{tabs}</div>}
      </header>
      <FadeIn className="flex min-w-0 flex-col gap-6 px-6 pb-12">{children}</FadeIn>
    </>
  );
}

/** A whole page with nothing in it yet: one bordered panel with an icon, a title and what will show here. */
export function EmptyPage({ title, icon, heading, description, action }: { title: string; icon: React.ReactNode; heading: string; description: string; action?: React.ReactNode }) {
  return (
    <Page title={title}>
      <div className="rounded-lg border border-border bg-surface">
        <EmptyState icon={icon} title={heading} description={description} action={action} className="py-20" />
      </div>
    </Page>
  );
}

/** A link that looks like a button. */
export function LinkButton({ href, variant = "primary", children }: { href: string; variant?: "primary" | "secondary"; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-[background-color,border-color,opacity] duration-150",
        variant === "primary" ? "border-transparent bg-inverted text-inverted-fg hover:opacity-90" : "border-border bg-surface text-fg hover:border-border-strong hover:bg-surface-2",
      )}
    >
      {children}
    </Link>
  );
}
