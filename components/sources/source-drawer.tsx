"use client";

import { FileSpreadsheet } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";
import { Skeleton } from "@/components/ui/empty-state";
import { Drawer } from "@/components/ui/overlay";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { formatDate, formatMonth } from "@/lib/dates";
import { getSourceDetail, type SourceDetail, type SourceRef } from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import { formatCurrency, formatPercent } from "@/lib/format";

const SourceContext = createContext<(ref: SourceRef) => void>(() => {});

/** Lets any number on the page open the manager's report it came from. */
export function SourceProvider({ children }: { children: React.ReactNode }) {
  const [ref, setRef] = useState<SourceRef | null>(null);
  const open = useCallback((r: SourceRef) => setRef(r), []);
  return (
    <SourceContext.Provider value={open}>
      {children}
      <SourceDrawer sourceRef={ref} onClose={() => setRef(null)} />
    </SourceContext.Provider>
  );
}

export const useOpenSource = () => useContext(SourceContext);

/** A source citation that opens the line in context. */
export function SourceLink({ source, label, className }: { source: SourceRef; label: string; className?: string }) {
  const open = useOpenSource();
  return (
    <button
      type="button"
      onClick={() => open(source)}
      className={cn("group inline-flex max-w-full cursor-pointer items-start gap-1.5 text-left text-[11px] text-fg-3 transition-colors hover:text-fg", className)}
    >
      <FileSpreadsheet className="mt-px size-3 shrink-0" strokeWidth={1.75} />
      <span className="num underline decoration-border underline-offset-2 group-hover:decoration-fg-3">{label}</span>
    </button>
  );
}

function SourceDrawer({ sourceRef, onClose }: { sourceRef: SourceRef | null; onClose: () => void }) {
  const { data } = useData(() => (sourceRef ? getSourceDetail(sourceRef) : Promise.resolve(null)), [JSON.stringify(sourceRef)]);
  const detail = sourceRef ? data : null;
  return (
    <Drawer
      open={Boolean(sourceRef)}
      onClose={onClose}
      width={detail?.kind === "t12" ? 960 : 560}
      eyebrow="Source"
      title={detail ? `${detail.property_name} · ${detail.source.report}` : " "}
    >
      {!detail ? (
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1 rounded-md border border-border bg-surface px-3 py-2.5">
            <span className="num text-xs text-fg">{detail.source.import?.file_name ?? "Not received"}</span>
            <span className="text-[11px] text-fg-3">
              {detail.source.system} · {detail.source.manager}
              {detail.source.received ? ` · ${detail.source.received}` : ""}
            </span>
          </div>
          <SourceBody detail={detail} />
        </div>
      )}
    </Drawer>
  );
}

function SourceBody({ detail }: { detail: SourceDetail }) {
  switch (detail.kind) {
    case "t12":
      return (
        <div>
          <p className="mb-2 text-[11px] text-fg-3">As reported, in the manager&apos;s chart of accounts. Highlighted: the line this number comes from.</p>
          <div className="rounded-md border border-border bg-surface">
            <Table>
              <THead>
                <Th className="sticky left-0 bg-surface">Line</Th>
                {detail.months.map((m) => (
                  <Th key={m} align="right">
                    {formatMonth(m, "tiny")}
                  </Th>
                ))}
                <Th align="right">Total</Th>
              </THead>
              <tbody>
                {detail.lines
                  .filter((l) => l.total !== 0 || detail.highlight.includes(l.code))
                  .map((l) => {
                    const hit = detail.highlight.includes(l.code);
                    return (
                      <Tr key={l.code} className={hit ? "bg-surface-2" : undefined}>
                        <Td className={cn("sticky left-0 max-w-[220px] truncate", hit ? "bg-surface-2 font-medium text-fg" : "bg-surface text-fg-2")}>
                          <span className="num mr-2 text-[10px] text-fg-3">{l.code}</span>
                          {l.label}
                        </Td>
                        {detail.months.map((m) => (
                          <Td key={m} align="right" mono className={hit ? "text-fg" : "text-fg-2"}>
                            {formatCurrency(l.amounts[m] ?? 0)}
                          </Td>
                        ))}
                        <Td align="right" mono className={hit ? "font-medium text-fg" : "text-fg-2"}>
                          {formatCurrency(l.total)}
                        </Td>
                      </Tr>
                    );
                  })}
              </tbody>
            </Table>
          </div>
        </div>
      );
    case "rent_roll":
      return (
        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border">
          {[
            ["Units", String(detail.units)],
            ["Occupied", `${detail.occupied} · ${formatPercent(detail.occupied / detail.units)}`],
            ["Vacant", String(detail.vacant)],
          ].map(([k, v]) => (
            <div key={k} className="bg-surface px-3 py-2">
              <dt className="text-[11px] text-fg-3">{k}</dt>
              <dd className="num mt-0.5 text-[13px] text-fg">{v}</dd>
            </div>
          ))}
          <p className="col-span-3 bg-surface px-3 py-2 text-[11px] text-fg-3">Unit status at {formatDate(detail.as_of, true)}, counted from the rent roll.</p>
        </dl>
      );
    case "ar_aging": {
      const total = detail.buckets.reduce((s, b) => s + b.amount, 0);
      return (
        <div className="rounded-md border border-border bg-surface">
          <Table>
            <THead>
              <Th>Days past due</Th>
              <Th align="right">Balance</Th>
              <Th align="right">Share</Th>
            </THead>
            <tbody>
              {detail.buckets.map((b) => (
                <Tr key={b.label}>
                  <Td mono>{b.label}</Td>
                  <Td align="right" mono>
                    {formatCurrency(b.amount)}
                  </Td>
                  <Td align="right" mono className="text-fg-3">
                    {formatPercent(b.amount / total, 0)}
                  </Td>
                </Tr>
              ))}
              <Tr>
                <Td className="font-medium">Total, {formatDate(detail.as_of)}</Td>
                <Td align="right" mono className="font-medium">
                  {formatCurrency(total)}
                </Td>
                <Td />
              </Tr>
            </tbody>
          </Table>
        </div>
      );
    }
    case "work_orders":
      return (
        <div>
          <p className="mb-2 text-[11px] text-fg-3">
            {detail.rows.length} work orders{detail.filter ? ` · ${detail.filter}` : ""}
          </p>
          <div className="rounded-md border border-border bg-surface">
            <Table>
              <THead>
                <Th>Opened</Th>
                <Th>Unit</Th>
                <Th>Description</Th>
                <Th>Vendor</Th>
                <Th align="right">Cost</Th>
              </THead>
              <tbody>
                {detail.rows.map((w) => (
                  <Tr key={w.id}>
                    <Td mono className="text-fg-2">
                      {formatDate(w.opened_at)}
                    </Td>
                    <Td mono>{w.unit_number ?? "Common"}</Td>
                    <Td className="max-w-[180px] truncate text-fg-2">{w.description}</Td>
                    <Td className="text-fg-3">{w.vendor_name ?? "In-house"}</Td>
                    <Td align="right" mono>
                      {w.cost === null ? "Open" : formatCurrency(w.cost)}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      );
  }
}
