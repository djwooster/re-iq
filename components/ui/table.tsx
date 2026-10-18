"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";

export function Table({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-border">{children}</tr>
    </thead>
  );
}

export function Th({
  children,
  align = "left",
  className,
  sortKey,
  sort,
  onSort,
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  className?: string;
  sortKey?: string;
  sort?: SortState;
  onSort?: (key: string) => void;
}) {
  const active = sortKey && sort?.key === sortKey;
  const content = (
    <span className={cn("inline-flex items-center gap-1", align === "right" && "flex-row-reverse")}>
      {children}
      {sortKey && (
        <span className={cn("transition-opacity duration-150", active ? "opacity-100" : "opacity-0 group-hover:opacity-60")}>
          {sort?.dir === "asc" && active ? <ArrowUp className="size-2.5" /> : <ArrowDown className="size-2.5" />}
        </span>
      )}
    </span>
  );
  return (
    <th
      scope="col"
      aria-sort={active ? (sort?.dir === "asc" ? "ascending" : "descending") : undefined}
      className={cn(
        "eyebrow h-8 whitespace-nowrap px-3 font-normal first:pl-4 last:pr-4",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
    >
      {sortKey ? (
        <button type="button" onClick={() => onSort?.(sortKey)} className={cn("group cursor-pointer uppercase hover:text-fg-2", active && "text-fg-2")}>
          {content}
        </button>
      ) : (
        content
      )}
    </th>
  );
}

export function Tr({ children, onClick, className, selected }: { children: React.ReactNode; onClick?: () => void; className?: string; selected?: boolean }) {
  return (
    <tr
      onClick={onClick}
      onKeyDown={onClick ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick()) : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "border-b border-border/70 transition-colors duration-100 last:border-b-0",
        onClick && "cursor-pointer hover:bg-fg/[0.025] focus-visible:bg-fg/[0.04] focus-visible:outline-none",
        selected && "bg-fg/[0.04]",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function Td({ children, align = "left", className, mono }: { children?: React.ReactNode; align?: "left" | "right"; className?: string; mono?: boolean }) {
  return (
    <td className={cn("h-9 whitespace-nowrap px-3 first:pl-4 last:pr-4", align === "right" && "text-right", mono && "num", className)}>
      {children}
    </td>
  );
}

export interface SortState {
  key: string;
  dir: "asc" | "desc";
}

/** Client-side sorting with stable defaults; numbers sort descending first. */
export function useSort<T>(rows: T[], accessors: Record<string, (row: T) => number | string>, initial: SortState) {
  const [sort, setSort] = useState<SortState>(initial);
  const sorted = useMemo(() => {
    const get = accessors[sort.key];
    if (!get) return rows;
    return [...rows].sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);
  const onSort = (key: string) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: typeof accessors[key]?.(rows[0]) === "string" ? "asc" : "desc" }));
  return { sorted, sort, onSort };
}
