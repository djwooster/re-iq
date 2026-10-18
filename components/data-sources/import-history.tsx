"use client";

import { FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Td, Th, THead, Tr, useSort } from "@/components/ui/table";
import { formatDateTime } from "@/lib/dates";
import { describePeriod } from "@/lib/data";
import { IMPORT_STATUS_LABELS, REPORT_TYPE_SHORT } from "@/lib/labels";
import type { Import, ImportStatus, Member, PropertyRecord } from "@/lib/types";

export function ImportStatusBadge({ status }: { status: ImportStatus }) {
  const tone = { processed: "neutral", needs_review: "warning", failed: "unfavorable" } as const;
  return (
    <Badge tone={tone[status]} dot>
      {IMPORT_STATUS_LABELS[status]}
    </Badge>
  );
}

type Filter = "all" | "needs_review" | "failed";

export function ImportHistory({
  imports,
  properties,
  members,
  selectedId,
  onSelect,
}: {
  imports: Import[];
  properties: PropertyRecord[];
  members: Member[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [limit, setLimit] = useState(20);
  const name = (id: string) => properties.find((p) => p.id === id)?.name ?? "";
  const who = (id: string) => members.find((m) => m.id === id)?.name ?? "A teammate";
  const rows = imports.filter((i) => filter === "all" || i.status === filter);
  const { sorted, sort, onSort } = useSort(
    rows,
    {
      file: (i) => i.file_name.toLowerCase(),
      type: (i) => REPORT_TYPE_SHORT[i.report_type],
      property: (i) => name(i.property_id),
      period: (i) => i.period,
      by: (i) => who(i.uploaded_by),
      uploaded: (i) => i.uploaded_at,
      status: (i) => i.status,
    },
    { key: "uploaded", dir: "desc" },
  );
  const count = (s: ImportStatus) => imports.filter((i) => i.status === s).length;

  return (
    <Card>
      <CardHeader
        title="Import history"
        description="Every report we've read, what we decided it was, and where its numbers went."
        action={
          <Tabs
            value={filter}
            onChange={(f) => {
              setFilter(f);
              setLimit(20);
            }}
            className="border-b-0"
            tabs={[
              { id: "all", label: "All", count: imports.length },
              { id: "needs_review", label: "Needs review", count: count("needs_review") },
              { id: "failed", label: "Failed", count: count("failed") },
            ]}
          />
        }
      />
      {sorted.length === 0 ? (
        <EmptyState title={filter === "all" ? "No uploads yet" : `Nothing ${IMPORT_STATUS_LABELS[filter as ImportStatus].toLowerCase()}`} description={filter === "all" ? "Upload a rent roll or T12 above to get started." : "Every import in this view is in good shape."} />
      ) : (
        <Table>
          <THead>
            <Th sortKey="file" sort={sort} onSort={onSort}>
              File
            </Th>
            <Th sortKey="type" sort={sort} onSort={onSort}>
              Type
            </Th>
            <Th sortKey="property" sort={sort} onSort={onSort}>
              Property
            </Th>
            <Th sortKey="period" sort={sort} onSort={onSort}>
              Period
            </Th>
            <Th sortKey="by" sort={sort} onSort={onSort} className="hidden xl:table-cell">
              Uploaded by
            </Th>
            <Th sortKey="uploaded" sort={sort} onSort={onSort}>
              Uploaded
            </Th>
            <Th sortKey="status" sort={sort} onSort={onSort}>
              Status
            </Th>
          </THead>
          <tbody>
            {sorted.slice(0, limit).map((i) => {
              const Icon = i.file_format === "pdf" ? FileText : FileSpreadsheet;
              return (
                <Tr key={i.id} onClick={() => onSelect(i.id)} selected={selectedId === i.id}>
                  <Td className="max-w-[320px]">
                    <span className="flex items-center gap-2">
                      <Icon className="size-3.5 shrink-0 text-fg-3" strokeWidth={1.75} />
                      <span className="num truncate text-[11px] text-fg">{i.file_name}</span>
                    </span>
                  </Td>
                  <Td className="text-fg-2">{REPORT_TYPE_SHORT[i.report_type]}</Td>
                  <Td className="text-fg-2">{name(i.property_id)}</Td>
                  <Td mono className="text-[11px] text-fg-2">
                    {describePeriod(i.report_type, i.period).replace("12 months ending ", "TTM ")}
                  </Td>
                  <Td className="hidden text-fg-2 xl:table-cell">{who(i.uploaded_by)}</Td>
                  <Td mono className="text-[11px] text-fg-3">
                    {formatDateTime(i.uploaded_at)}
                  </Td>
                  <Td>
                    <ImportStatusBadge status={i.status} />
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
      {sorted.length > limit && (
        <div className="border-t border-border px-4 py-2.5">
          <button type="button" onClick={() => setLimit((l) => l + 40)} className="cursor-pointer text-[11px] text-fg-3 hover:text-fg">
            Show {Math.min(40, sorted.length - limit)} more of {sorted.length - limit} remaining
          </button>
        </div>
      )}
    </Card>
  );
}
