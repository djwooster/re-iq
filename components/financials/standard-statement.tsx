"use client";

import { FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { formatMonth } from "@/lib/dates";
import type { StandardRow, StandardStatement } from "@/lib/data";
import { formatCurrency } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/labels";
import type { GlCategory } from "@/lib/types";

/**
 * A T12 in the standard chart of accounts. Each row expands to the manager's
 * lines behind it; `onSource` adds a link to open them in the original report.
 */
export function StandardStatementTable({ statement, onSource }: { statement: StandardStatement; onSource?: (category: GlCategory) => void }) {
  const [openRow, setOpenRow] = useState<string | null>(null);
  const data = statement;
  const total = (r: Record<string, number>) => data.months.reduce((s, m) => s + r[m], 0);
  const row = (r: StandardRow) => (
    <Row
      key={r.category}
      label={CATEGORY_LABELS[r.category]}
      values={data.months.map((m) => r.amounts[m])}
      total={r.total}
      sources={r.sources}
      open={openRow === r.category}
      onToggle={() => setOpenRow(openRow === r.category ? null : r.category)}
      onSource={onSource ? () => onSource(r.category) : undefined}
    />
  );
  return (
    <Table>
      <THead>
        <Th className="sticky left-0 bg-surface">Account</Th>
        {data.months.map((m) => (
          <Th key={m} align="right">
            {formatMonth(m, "tiny")}
          </Th>
        ))}
        <Th align="right">Total</Th>
      </THead>
      <tbody>
        <SectionRow label="Revenue" span={data.months.length + 2} />
        {data.revenue.map(row)}
        <Row label="Total revenue" values={data.months.map((m) => data.totals.revenue[m])} total={total(data.totals.revenue)} strong />
        <SectionRow label="Operating expenses" span={data.months.length + 2} />
        {data.expenses.map(row)}
        <Row label="Total expenses" values={data.months.map((m) => data.totals.expenses[m])} total={total(data.totals.expenses)} strong />
        <Row label="Net operating income" values={data.months.map((m) => data.totals.noi[m])} total={total(data.totals.noi)} strong />
      </tbody>
    </Table>
  );
}

function SectionRow({ label, span }: { label: string; span: number }) {
  return (
    <tr className="border-b border-border/70">
      <td colSpan={span} className="eyebrow sticky left-0 bg-surface px-4 pt-3 pb-1">
        {label}
      </td>
    </tr>
  );
}

function Row({
  label,
  values,
  total,
  sources,
  strong,
  open,
  onToggle,
  onSource,
}: {
  label: string;
  values: number[];
  total: number;
  sources?: StandardRow["sources"];
  strong?: boolean;
  open?: boolean;
  onToggle?: () => void;
  onSource?: () => void;
}) {
  return (
    <>
      <Tr onClick={onToggle} selected={open}>
        <Td className={cn("sticky left-0 bg-surface", strong ? "font-medium text-fg" : "text-fg-2")}>
          {label}
          {sources && <span className="num ml-1.5 text-[10px] text-fg-3">{sources.length > 1 ? `${sources.length} lines` : sources[0].code}</span>}
        </Td>
        {values.map((v, i) => (
          <Td key={i} align="right" mono className={strong ? "text-fg" : "text-fg-2"}>
            {formatCurrency(v)}
          </Td>
        ))}
        <Td align="right" mono className={cn(strong && "font-medium", "text-fg")}>
          {formatCurrency(total)}
        </Td>
      </Tr>
      {open && sources && (
        <tr className="border-b border-border/70 bg-fg/[0.02]">
          <td colSpan={values.length + 2} className="px-4 py-2">
            <ul className="flex flex-col gap-0.5">
              {onSource && (
                <li className="pb-1">
                  <button type="button" onClick={onSource} className="flex cursor-pointer items-center gap-1 text-[11px] text-fg-3 underline decoration-border underline-offset-2 hover:text-fg">
                    <FileSpreadsheet className="size-3" strokeWidth={1.75} /> Open in the manager&apos;s report
                  </button>
                </li>
              )}
              {sources.map((s) => (
                <li key={s.code} className="flex max-w-[420px] justify-between gap-4 text-[11px]">
                  <span className="text-fg-2">
                    <span className="num mr-1.5 text-fg-3">{s.code}</span>
                    {s.label}
                  </span>
                  <span className="num text-fg-2">{formatCurrency(s.total)}</span>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}
