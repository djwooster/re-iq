"use client";

import { CircleCheck, Download, ExternalLink, FileSpreadsheet, RotateCw, ScanText, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { downloadUrl } from "@/lib/uploads/actions";
import { reportTypeLabel } from "@/lib/uploads/report-types";
import { deleteReport, rereadReport } from "@/lib/workspace/actions";
import { dateLabel, monthLabel } from "@/lib/workspace/format";
import type { Property, ReportRead, ReportRow } from "@/lib/workspace/queries";
import { ReadCard, TYPE_LABEL, useRefreshWhileReading } from "./review";
import { AddReportsButton } from "./add-reports";
import { Button, Empty, FilterMenu, PropertyTd, Row, RowMenu, SelectTd, SelectionBar, SpotEmpty, Table, Tabs, Td, useSelection, type RowAction } from "./ui";

/**
 * Reports: every report the org has received, with its reading status. Tabs: All (a table with
 * filters, a menu per report, and checkboxes for acting on several at once), To review (the review
 * cards), Couldn't read. A row opens the report.
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

export function Reports({ tab, rows, statuses, reads, properties, period, canDelete }: { tab: ReportsTab; rows: ReportRow[]; statuses: Record<string, ReadStatus>; reads: ReportRead[]; properties: Property[]; period: string; canDelete: boolean }) {
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
        <AllReports rows={rows} statuses={statuses} properties={properties} period={period} canDelete={canDelete} />
      ) : shown.length ? (
        <div className="flex flex-col gap-3">
          {shown.map((r) => (
            <div key={r.id} className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-fg">{properties.find((p) => p.id === r.property_id)?.name}</span>
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

function AllReports({ rows, statuses, properties, period, canDelete }: { rows: ReportRow[]; statuses: Record<string, ReadStatus>; properties: Property[]; period: string; canDelete: boolean }) {
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
  const filter = (key: keyof typeof filters) => (value: string) => setFilters((f) => ({ ...f, [key]: value }));
  const filtered = Object.values(filters).some(Boolean);
  const selection = useSelection(shown);
  const { selected } = selection;
  if (!rows.length)
    return (
      <SpotEmpty
        icons={[<FileSpreadsheet key="FileSpreadsheet" />, <ScanText key="ScanText" />, <CircleCheck key="CircleCheck" />]}
        title="No reports yet"
        action={<AddReportsButton properties={properties.filter((p) => !p.archived_at)} period={period} variant="secondary" />}
      >
        Add last month&apos;s P&amp;Ls, T-12s and rent rolls. RE-IQ reads each one and lists anything to review.
      </SpotEmpty>
    );
  return (
    <div className="flex flex-col gap-3">
      {selected.length > 0 ? (
        <BulkBar rows={selected} statuses={statuses} canDelete={canDelete} onClear={selection.clear} />
      ) : (
        <div className="flex min-h-8 flex-wrap items-center justify-end gap-2">
          {filtered && (
            <button type="button" onClick={() => setFilters({ property: "", type: "", month: "", status: "" })} className="px-1 text-xs text-brand transition-opacity hover:opacity-75">
              Clear filters
            </button>
          )}
          <FilterMenu label="Property" allLabel="All properties" value={filters.property} onChange={filter("property")} options={properties.map((p) => ({ value: p.id, label: p.name }))} />
          <FilterMenu label="Report" allLabel="All reports" value={filters.type} onChange={filter("type")} options={types.map((t) => ({ value: t, label: t }))} />
          <FilterMenu label="Month" allLabel="All months" value={filters.month} onChange={filter("month")} options={months.map((m) => ({ value: m, label: monthLabel(m) }))} />
          <FilterMenu label="Status" allLabel="Any status" value={filters.status} onChange={filter("status")} options={(Object.keys(STATUS) as ReadStatus[]).map((s) => ({ value: s, label: STATUS[s].label }))} />
        </div>
      )}
      {shown.length ? (
        <Table
          columns={["Property", "Report", "Month", "File", "Received", "From", "Status", { label: "", sort: false }]}
          select={selection.select}
        >
          {shown.map((r) => {
            const status = statuses[r.id] ?? "notRead";
            const checked = selection.isSelected(r.id);
            return (
              <Row key={r.id} href={`/app/reports/${r.id}`} selected={checked}>
                <SelectTd label={`Select ${r.file_name}`} checked={checked} onChange={() => selection.toggle(r.id)} />
                <PropertyTd>{names.get(r.property_id) ?? "Archived property"}</PropertyTd>
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

/** Replaces the filters while reports are checked: download, read again or delete them all at once. */
function BulkBar({ rows, statuses, canDelete, onClear }: { rows: ReportRow[]; statuses: Record<string, ReadStatus>; canDelete: boolean; onClear: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const n = rows.length;
  const reports = (k: number) => `${k} ${k === 1 ? "report" : "reports"}`;
  // Same rule as the row menu: only reports the reader handled (or failed on) can be read again.
  const rereadable = rows.filter((r) => statuses[r.id] === "read" || statuses[r.id] === "failed");

  // Each signed URL downloads as an attachment, so a hidden frame per file saves them all without leaving the page.
  const download = () =>
    start(async () => {
      let failed = 0;
      for (const r of rows) {
        const res = await downloadUrl(r.id);
        if (!res.ok) {
          failed++;
          continue;
        }
        const frame = document.createElement("iframe");
        frame.hidden = true;
        frame.src = res.url;
        document.body.appendChild(frame);
        setTimeout(() => frame.remove(), 60_000);
      }
      if (failed) toast(`${reports(failed)} couldn't be downloaded`);
    });

  const reread = () =>
    start(async () => {
      const results = await Promise.all(rereadable.map((r) => rereadReport(r.id)));
      const failed = results.filter((res) => !res.ok).length;
      toast(failed ? `${reports(failed)} couldn't be read again` : `Reading ${reports(rereadable.length)} again`);
      router.refresh();
    });

  const remove = () =>
    start(async () => {
      const results = await Promise.all(rows.map((r) => deleteReport(r.id)));
      const failed = results.filter((res) => !res.ok).length;
      setConfirming(false);
      toast(failed ? `${reports(failed)} couldn't be deleted` : `${reports(n)} deleted`);
      if (!failed) onClear();
      router.refresh();
    });

  return (
    <SelectionBar count={n} onClear={onClear}>
        <Button variant="secondary" icon={<Download className="size-3.5" />} disabled={pending} onClick={download}>
          Download
        </Button>
        {rereadable.length > 0 && (
          <Button variant="secondary" icon={<RotateCw className="size-3.5" />} disabled={pending} onClick={reread}>
            Read again{rereadable.length < n ? ` (${rereadable.length})` : ""}
          </Button>
        )}
        {canDelete && (
          <Button variant="danger-ghost" icon={<Trash2 className="size-3.5" />} disabled={pending} onClick={() => setConfirming(true)}>
            Delete
          </Button>
        )}
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Delete ${reports(n)}?`}
        description={`${n === 1 ? "This report and anything read from it are" : "These reports and anything read from them are"} removed for everyone in your workspace. This can't be undone.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="danger-ghost" disabled={pending} onClick={remove}>
              {pending ? "Deleting…" : `Delete ${reports(n)}`}
            </Button>
          </>
        }
      />
    </SelectionBar>
  );
}

/** Open, download, read again, delete. */
function ReportMenu({ row, status, canDelete }: { row: ReportRow; status: ReadStatus; canDelete: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const actions: RowAction[] = [
    { label: "Open", icon: ExternalLink, onSelect: () => router.push(`/app/reports/${row.id}`) },
    {
      label: "Download",
      icon: Download,
      onSelect: () =>
        start(async () => {
          const res = await downloadUrl(row.id);
          if (res.ok) window.location.assign(res.url);
          else toast(res.message);
        }),
    },
  ];
  if (status === "read" || status === "failed")
    actions.push({
      label: "Read again",
      icon: RotateCw,
      onSelect: () =>
        start(async () => {
          const res = await rereadReport(row.id);
          if (!res.ok) toast(res.message);
          router.refresh();
        }),
    });
  if (canDelete) actions.push({ label: "Delete", icon: Trash2, danger: true, onSelect: () => setConfirming(true) });
  return (
    <>
      <RowMenu label={row.file_name} actions={actions} disabled={pending} />
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
    </>
  );
}
