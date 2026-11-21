"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/controls";
import { reportTypeLabel } from "@/lib/uploads/report-types";
import { dateLabel, monthLabel } from "@/lib/workspace/format";
import type { Property, ReportRead, ReportRow } from "@/lib/workspace/queries";
import { ReadCard, TYPE_LABEL, useRefreshWhileReading } from "./review";
import { Empty, Row, Table, Tabs, Td } from "./ui";

/**
 * Reports: every report the org has received, with its reading status. Tabs: All (a table), To
 * review (the review cards), Couldn't read. A row opens the report.
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

export function Reports({ tab, rows, statuses, reads, properties }: { tab: ReportsTab; rows: ReportRow[]; statuses: Record<string, ReadStatus>; reads: ReportRead[]; properties: Property[] }) {
  const router = useRouter();
  useRefreshWhileReading(reads);
  const toReview = reads.filter((r) => r.status === "reading" || r.status === "read");
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
        <AllReports rows={rows} statuses={statuses} properties={properties} />
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

function AllReports({ rows, statuses, properties }: { rows: ReportRow[]; statuses: Record<string, ReadStatus>; properties: Property[] }) {
  const [property, setProperty] = useState("");
  const names = new Map(properties.map((p) => [p.id, p.name]));
  const shown = property ? rows.filter((r) => r.property_id === property) : rows;
  if (!rows.length) return <Empty>No reports yet. Add last month&apos;s reports to get started.</Empty>;
  return (
    <div className="flex flex-col gap-3">
      <div className="w-56">
        <Select aria-label="Property" value={property} onChange={(e) => setProperty(e.target.value)}>
          <option value="">All properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>
      <Table columns={["Property", "Report", "Month", "File", "Received", "From", "Status"]}>
        {shown.map((r) => {
          const status = STATUS[statuses[r.id] ?? "notRead"];
          return (
            <Row key={r.id} href={`/app/reports/${r.id}`}>
              <Td className="font-medium whitespace-nowrap text-property">{names.get(r.property_id) ?? "Property"}</Td>
              <Td className="whitespace-nowrap">{r.read?.report_type ? TYPE_LABEL[r.read.report_type] : reportTypeLabel(r.report_type)}</Td>
              <Td className="whitespace-nowrap text-fg-2">{monthLabel(r.read?.period ?? r.period)}</Td>
              <Td className="max-w-[220px] truncate text-fg-2" >
                <span title={r.file_name}>{r.file_name}</span>
              </Td>
              <Td className="whitespace-nowrap text-fg-2">{dateLabel(r.created_at)}</Td>
              <Td className="whitespace-nowrap text-fg-2">{r.uploaderName ?? "—"}</Td>
              <Td>
                <Badge tone={status.tone}>{status.label}</Badge>
              </Td>
            </Row>
          );
        })}
      </Table>
    </div>
  );
}
