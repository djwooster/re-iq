"use client";

import { reportTypeLabel } from "@/lib/uploads/report-types";
import { dateLabel, monthLabel, sizeLabel } from "@/lib/workspace/format";
import type { ReportRead, Upload } from "@/lib/workspace/queries";
import { ReadCard, useRefreshWhileReading } from "./review";
import { Empty } from "./ui";

/** A report's facts, then what was read from it (or why it wasn't). */
export function ReportDetail({ upload, read, propertyName, from }: { upload: Upload; read: ReportRead | null; propertyName: string; from: string | null }) {
  useRefreshWhileReading(read ? [read] : []);
  const facts = [
    ["Property", propertyName],
    ["Sent as", reportTypeLabel(upload.report_type)],
    ["Month", monthLabel(upload.period)],
    ["Received", dateLabel(upload.created_at)],
    ["From", from ?? "—"],
    ["Size", `${sizeLabel(upload.size_bytes)}${upload.version > 1 ? ` · version ${upload.version}` : ""}`],
  ];
  return (
    <>
      <dl className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-surface p-4 text-xs sm:grid-cols-3 lg:grid-cols-6">
        {facts.map(([label, value]) => (
          <div key={label} className="flex min-w-0 flex-col gap-1">
            <dt className="text-fg-3">{label}</dt>
            <dd className="truncate">{value}</dd>
          </div>
        ))}
      </dl>
      {read ? <ReadCard read={read} /> : <Empty>RE-IQ doesn&apos;t read this kind of report yet. It&apos;s stored, and you can download it any time.</Empty>}
    </>
  );
}
