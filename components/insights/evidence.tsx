"use client";

import { FileSpreadsheet, Plug } from "lucide-react";
import Link from "next/link";
import type { EvidenceItem, EvidenceSource } from "@/lib/types";

export function EvidenceList({ items }: { items: EvidenceItem[] }) {
  return (
    <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
      {items.map((e) => (
        <div key={e.label} className="bg-surface px-3 py-2">
          <dt className="text-[11px] text-fg-3">{e.label}</dt>
          <dd className="num mt-0.5 text-[13px] text-fg">{e.value}</dd>
          {e.detail && <dd className="mt-0.5 text-[11px] text-fg-3">{e.detail}</dd>}
        </div>
      ))}
    </dl>
  );
}

export function SourceList({ sources }: { sources: EvidenceSource[] }) {
  if (!sources.length) return null;
  const unique = sources.filter((s, i) => sources.findIndex((x) => x.id === s.id) === i);
  return (
    <ul className="flex flex-col gap-1">
      {unique.map((s) => {
        const Icon = s.kind === "connector" ? Plug : FileSpreadsheet;
        return (
          <li key={s.id}>
            <Link
              href={s.kind === "import" ? `/app/data-sources?import=${s.id}` : "/app/data-sources#connectors"}
              className="group flex items-start gap-2 rounded px-1 py-1 transition-colors hover:bg-fg/[0.03]"
            >
              <Icon className="mt-0.5 size-3 shrink-0 text-fg-3" strokeWidth={1.75} />
              <span className="min-w-0">
                <span className="num block truncate text-[11px] text-fg-2 group-hover:text-fg">{s.label}</span>
                <span className="block truncate text-[11px] text-fg-3">{s.detail}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function EstimateTag() {
  return <span className="num ml-1 rounded-sm border border-border px-1 align-[1px] text-[9px] tracking-[0.06em] text-fg-3 uppercase">Estimate</span>;
}
