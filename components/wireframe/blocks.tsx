"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Wireframe building blocks: labeled gray boxes and nothing else. No numbers,
 * no sample data. Boxes with an `href` or `onClick` are clickable and show →.
 */

interface Clickable {
  href?: string;
  onClick?: () => void;
}

function Frame({ href, onClick, className, children }: Clickable & { className?: string; children: React.ReactNode }) {
  const base = cn("relative rounded-md border border-fg/15 bg-fg/[0.035]", (href || onClick) && "group cursor-pointer transition-colors hover:border-fg/40 hover:bg-fg/[0.06]", className);
  if (href) return <Link href={href} className={cn("block", base)}>{children}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cn("block w-full text-left", base)}>{children}</button>;
  return <div className={base}>{children}</div>;
}

function Arrow() {
  return <span className="absolute top-2 right-2.5 text-xs text-fg-3 transition-colors group-hover:text-[var(--wf-accent)]">→</span>;
}

export function Box({ label, href, onClick, className, children }: Clickable & { label: string; className?: string; children?: React.ReactNode }) {
  return (
    <Frame href={href} onClick={onClick} className={cn("min-h-20 p-3", className)}>
      <span className="text-xs font-medium text-fg-2">{label}</span>
      {(href || onClick) && <Arrow />}
      {children}
    </Frame>
  );
}

/** A chart or image: a box with a diagonal cross. */
export function ChartBox({ label = "Chart", className }: { label?: string; className?: string }) {
  return (
    <Frame className={cn("min-h-44 overflow-hidden", className)}>
      <svg className="absolute inset-0 h-full w-full text-fg/15" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
        <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
        <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="relative m-3 inline-block rounded bg-bg px-1.5 py-0.5 text-xs font-medium text-fg-2">{label}</span>
    </Frame>
  );
}

/** A table: a header of column placeholders and empty rows. Rows can link somewhere. */
export function TableBox({ label, rowLabel, columns = 4, rows = 5, rowHref }: { label: string; rowLabel?: string; columns?: number; rows?: number; rowHref?: string }) {
  return (
    <Frame className="p-3">
      <span className="text-xs font-medium text-fg-2">{label}</span>
      <div className="mt-2.5 overflow-hidden rounded border border-fg/15 bg-bg">
        <div className="grid gap-3 border-b border-fg/15 px-3 py-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr)) 16px` }}>
          {Array.from({ length: columns }, (_, i) => (
            <span key={i} className="text-[11px] text-fg-3">
              Column
            </span>
          ))}
          <span />
        </div>
        {Array.from({ length: rows }, (_, r) => {
          const cells = (
            <>
              {Array.from({ length: columns }, (_, i) =>
                i === 0 && rowLabel ? (
                  <span key={i} className={cn("text-[11px]", rowHref ? "font-medium text-[var(--wf-accent)] group-hover:underline" : "text-fg-2")}>
                    {rowLabel} {r + 1}
                  </span>
                ) : (
                  <span key={i} className="my-auto h-2 rounded-sm bg-fg/[0.08]" />
                ),
              )}
              <span className="text-xs text-fg-3 transition-colors group-hover:text-[var(--wf-accent)]">{rowHref ? "→" : ""}</span>
            </>
          );
          const cls = "grid gap-3 border-b border-fg/10 px-3 py-2.5 last:border-b-0";
          const style = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr)) 16px` };
          return rowHref ? (
            <Link key={r} href={rowHref} className={cn(cls, "group transition-colors hover:bg-fg/[0.05]")} style={style}>
              {cells}
            </Link>
          ) : (
            <div key={r} className={cls} style={style}>
              {cells}
            </div>
          );
        })}
      </div>
    </Frame>
  );
}

/** Not clickable: a place for interviewees to say what's missing. */
export function ExpectBox() {
  return (
    <div className="flex min-h-24 items-center justify-center rounded-md border border-dashed border-fg/30 p-4 text-xs text-fg-3">
      What would you expect here?
    </div>
  );
}

export function WfButton({ href, onClick, children }: Clickable & { children: React.ReactNode }) {
  const cls = "inline-flex cursor-pointer items-center justify-center rounded-md bg-[var(--wf-accent)] px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-85";
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-[11px] text-fg-3">
      {items.map((it, i) => (
        <span key={it.label} className="flex items-center gap-1.5">
          {i > 0 && <span>/</span>}
          {it.href ? (
            <Link href={it.href} className="underline decoration-fg/20 underline-offset-2 hover:text-fg">
              {it.label}
            </Link>
          ) : (
            <span className="text-fg-2">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function WfTabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (t: T) => void; tabs: { id: T; label: string }[] }) {
  return (
    <div role="tablist" className="flex flex-wrap gap-1 border-b border-fg/15">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn("-mb-px cursor-pointer border-b-2 px-3 py-2 text-xs transition-colors", value === t.id ? "border-[var(--wf-accent)] font-medium text-fg" : "border-transparent text-fg-3 hover:text-fg-2")}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
