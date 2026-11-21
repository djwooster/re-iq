"use client";

import { Download, ExternalLink, MoreHorizontal, RotateCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/controls";
import { Modal } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { downloadUrl } from "@/lib/uploads/actions";
import { reportTypeLabel } from "@/lib/uploads/report-types";
import { deleteReport, rereadReport } from "@/lib/workspace/actions";
import { dateLabel, monthLabel } from "@/lib/workspace/format";
import type { Property, ReportRead, ReportRow } from "@/lib/workspace/queries";
import { ReadCard, TYPE_LABEL, useRefreshWhileReading } from "./review";
import { Button, Empty, Row, Table, Tabs, Td } from "./ui";

/**
 * Reports: every report the org has received, with its reading status. Tabs: All (a table with
 * filters and a menu per report), To review (the review cards), Couldn't read. A row opens the report.
 */

export type ReportsTab = "all" | "review" | "failed";
/** How far reading got, for the table. `notRead`: a kind of report the reader doesn't handle yet. */
export type ReadStatus = ReportRead["status"] | "notRead";

const STATUS: Record<ReadStatus, { label: string; tone: "neutral" | "warning" | "favorable" | "unfavorable" }> = {
  reading: { label: "Reading", tone: "neutral" },
  read: { label: "To review", tone: "warning" },
  confirmed: { label: "Confirmed", tone: "favorable" },
  failed: { label: "Couldn't read", tone: "unfavorable" },
  notRead: { label: "Not read yet", tone: "neutral" },
};

/** A read worth reviewing: it found a report the reader handles (not "other"). */
export const needsReview = (r: Pick<ReportRead, "status" | "report_type">) => r.status === "reading" || (r.status === "read" && r.report_type !== "other");

/** What a row is: what reading found, else what it was sent as. */
const typeOf = (r: ReportRow) => (r.read?.report_type && r.read.report_type !== "other" ? TYPE_LABEL[r.read.report_type] : reportTypeLabel(r.report_type));

export function Reports({ tab, rows, statuses, reads, properties, canDelete }: { tab: ReportsTab; rows: ReportRow[]; statuses: Record<string, ReadStatus>; reads: ReportRead[]; properties: Property[]; canDelete: boolean }) {
  const router = useRouter();
  useRefreshWhileReading(reads);
  const toReview = reads.filter(needsReview);
  const failed = reads.filter((r) => r.status === "failed");
  const shown = tab === "review" ? toReview : failed;
  return (
    <>
      <Tabs
        value={tab}
        onChange={(t) => router.replace(t === "all" ? "/app/reports" : `/app/reports?tab=${t}`, { scroll: false })}
        tabs={[
          { id: "all" as ReportsTab, label: "All", count: rows.length },
          { id: "review" as ReportsTab, label: "To review", count: toReview.length },
          { id: "failed" as ReportsTab, label: "Couldn't read", count: failed.length },
        ]}
      />
      {tab === "all" ? (
        <AllReports rows={rows} statuses={statuses} properties={properties} canDelete={canDelete} />
      ) : shown.length ? (
        <div className="flex flex-col gap-3">
          {shown.map((r) => (
            <div key={r.id} className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-property">{properties.find((p) => p.id === r.property_id)?.name}</span>
              <ReadCard read={r} />
            </div>
          ))}
        </div>
      ) : (
        <Empty>{tab === "review" ? "Nothing waiting for review." : "Every report was read."}</Empty>
      )}
    </>
  );
}

function AllReports({ rows, statuses, properties, canDelete }: { rows: ReportRow[]; statuses: Record<string, ReadStatus>; properties: Property[]; canDelete: boolean }) {
  const [filters, setFilters] = useState({ property: "", type: "", month: "", status: "" });
  const names = new Map(properties.map((p) => [p.id, p.name]));
  const monthOf = (r: ReportRow) => r.read?.period ?? r.period;
  const types = [...new Set(rows.map(typeOf))].sort();
  const months = [...new Set(rows.map(monthOf))].sort().reverse();
  const shown = rows.filter(
    (r) =>
      (!filters.property || r.property_id === filters.property) &&
      (!filters.type || typeOf(r) === filters.type) &&
      (!filters.month || monthOf(r) === filters.month) &&
      (!filters.status || (statuses[r.id] ?? "notRead") === filters.status),
  );
  const filter = (key: keyof typeof filters) => (e: React.ChangeEvent<HTMLSelectElement>) => setFilters((f) => ({ ...f, [key]: e.target.value }));
  if (!rows.length) return <Empty>No reports yet. Add last month&apos;s reports to get started.</Empty>;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="w-56">
          <Select aria-label="Property" value={filters.property} onChange={filter("property")}>
            <option value="">All properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select aria-label="Report" value={filters.type} onChange={filter("type")} className="w-48">
            <option value="">All reports</option>
            {types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
          <Select aria-label="Month" value={filters.month} onChange={filter("month")} className="w-40">
            <option value="">All months</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </Select>
          <Select aria-label="Status" value={filters.status} onChange={filter("status")} className="w-40">
            <option value="">Any status</option>
            {(Object.keys(STATUS) as ReadStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS[s].label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {shown.length ? (
        <Table columns={["Property", "Report", "Month", "File", "Received", "From", "Status", { label: "", sort: false }]}>
          {shown.map((r) => {
            const status = statuses[r.id] ?? "notRead";
            return (
              <Row key={r.id} href={`/app/reports/${r.id}`}>
                <Td className="font-medium whitespace-nowrap text-property">{names.get(r.property_id) ?? "Archived property"}</Td>
                <Td className="whitespace-nowrap">{typeOf(r)}</Td>
                <Td className="whitespace-nowrap text-fg-2">{monthLabel(monthOf(r))}</Td>
                <Td className="max-w-[220px] truncate text-fg-2">
                  <span title={r.file_name}>{r.file_name}</span>
                </Td>
                <Td className="whitespace-nowrap text-fg-2">{dateLabel(r.created_at)}</Td>
                <Td className="whitespace-nowrap text-fg-2">{r.uploaderName ?? "—"}</Td>
                <Td>
                  <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge>
                </Td>
                <Td className="w-10 text-right">
                  <ReportMenu row={r} status={status} canDelete={canDelete} />
                </Td>
              </Row>
            );
          })}
        </Table>
      ) : (
        <Empty>No reports match these filters.</Empty>
      )}
    </div>
  );
}

/** Open, download, read again, delete. */
function ReportMenu({ row, status, canDelete }: { row: ReportRow; status: ReadStatus; canDelete: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const run = (fn: () => Promise<void>) => () => {
    setOpen(false);
    start(fn);
  };
  const item = "flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-xs text-fg-2 hover:bg-fg/[0.04] hover:text-fg";
  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <button type="button" aria-label={`Actions for ${row.file_name}`} aria-haspopup="menu" aria-expanded={open} disabled={pending} onClick={() => setOpen((v) => !v)} className="rounded-md p-1.5 text-fg-3 transition-colors hover:bg-fg/[0.06] hover:text-fg disabled:opacity-50">
        <MoreHorizontal className="size-3.5" />
      </button>
      {open && (
        <div role="menu" className="absolute top-full right-0 z-20 mt-1 w-44 rounded-lg border border-border bg-bg p-1 text-left shadow-overlay">
          <button type="button" role="menuitem" className={item} onClick={run(async () => router.push(`/app/reports/${row.id}`))}>
            <ExternalLink className="size-3.5" /> Open
          </button>
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={run(async () => {
              const res = await downloadUrl(row.id);
              if (res.ok) window.location.assign(res.url);
              else toast(res.message);
            })}
          >
            <Download className="size-3.5" /> Download
          </button>
          {(status === "read" || status === "failed") && (
            <button
              type="button"
              role="menuitem"
              className={item}
              onClick={run(async () => {
                const res = await rereadReport(row.id);
                if (!res.ok) toast(res.message);
                router.refresh();
              })}
            >
              <RotateCw className="size-3.5" /> Read again
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              role="menuitem"
              className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-xs text-unfavorable hover:bg-unfavorable/10"
              onClick={() => {
                setOpen(false);
                setConfirming(true);
              }}
            >
              <Trash2 className="size-3.5" /> Delete
            </button>
          )}
        </div>
      )}
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Delete this report?"
        description={`${row.file_name} and anything read from it are removed for everyone in your workspace. This can't be undone.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              variant="danger-ghost"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await deleteReport(row.id);
                  setConfirming(false);
                  toast(res.ok ? "Report deleted" : res.message, res.ok ? { detail: row.file_name } : undefined);
                  router.refresh();
                })
              }
            >
              {pending ? "Deleting…" : "Delete report"}
            </Button>
          </>
        }
      />
    </div>
  );
}
