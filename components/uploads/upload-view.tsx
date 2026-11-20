"use client";

import { CheckCircle2, CircleAlert, FileUp, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/empty-state";
import { THead, Table, Td, Th, Tr } from "@/components/ui/table";
import { DownloadButton } from "@/components/workspace/download-button";
import { dateLabel, monthLabel } from "@/components/workspace/shared";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { finalizeUpload, startUpload, type UploadMeta } from "@/lib/uploads/actions";
import { REPORT_GROUPS, reportTypeLabel } from "@/lib/uploads/report-types";
import { ACCEPTED_EXTENSIONS, MAX_UPLOAD_BYTES, REJECTION_MESSAGE, extensionOf } from "@/lib/uploads/validate";
import type { Property, Upload } from "@/lib/workspace/queries";

type Status = {
  name: string;
  state: "uploading" | "done" | "failed";
  message?: string;
};

/** Last month, as YYYY-MM: the usual period for a monthly package. */
function lastMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** The property managers' upload page: the upload card, then everything they've uploaded for the property. */
export function UploadView({ properties, selectedId, history }: { properties: Property[]; selectedId: string; history: Upload[] }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[18px] font-semibold text-fg">Upload reports</h1>
        <p className="mt-1 text-xs text-fg-3">{UPLOAD_HINT}</p>
      </div>
      <UploadCard properties={properties} selectedId={selectedId} propertyHref="/upload?property=" />
      <History history={history} />
    </div>
  );
}

export const UPLOAD_HINT = "Excel, CSV, PDF or photos, up to 25 MB each. Photos have their location and camera details removed.";

/**
 * Pick the property, report type and month, then drop files. With one property the picker is hidden;
 * `propertyHref` is the URL prefix picking another property goes to (the id is appended).
 */
export function UploadCard({ properties, selectedId, propertyHref }: { properties: Property[]; selectedId: string; propertyHref: string }) {
  const router = useRouter();
  const [reportType, setReportType] = useState("");
  const [period, setPeriod] = useState(lastMonth);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [busy, setBusy] = useState(false);
  const ready = Boolean(reportType && period);

  const setStatus = (i: number, s: Partial<Status>) => setStatuses((all) => all.map((x, k) => (k === i ? { ...x, ...s } : x)));

  async function uploadAll(files: File[]) {
    if (!ready || !files.length) return;
    setBusy(true);
    const offset = statuses.length;
    setStatuses((all) => [...all, ...files.map((f) => ({ name: f.name, state: "uploading" as const }))]);
    const storage = createClient().storage.from("incoming");
    for (const [n, file] of files.entries()) {
      const i = offset + n;
      if (!(ACCEPTED_EXTENSIONS as readonly string[]).includes(extensionOf(file.name))) {
        setStatus(i, {
          state: "failed",
          message: REJECTION_MESSAGE.type_not_allowed,
        });
        continue;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setStatus(i, { state: "failed", message: REJECTION_MESSAGE.too_large });
        continue;
      }
      const meta: UploadMeta = {
        propertyId: selectedId,
        reportType,
        period,
        fileName: file.name,
      };
      const start = await startUpload(meta, file.size);
      if (!start.ok) {
        setStatus(i, { state: "failed", message: start.message });
        continue;
      }
      const sent = await storage.uploadToSignedUrl(start.path, start.token, file, { contentType: file.type || "application/octet-stream" });
      if (sent.error) {
        setStatus(i, {
          state: "failed",
          message: "The upload didn't finish. Check your connection and try again.",
        });
        continue;
      }
      const done = await finalizeUpload(meta, start.uploadId);
      setStatus(
        i,
        done.ok
          ? {
              state: "done",
              message: done.version > 1 ? `Saved as version ${done.version}` : undefined,
            }
          : { state: "failed", message: done.message },
      );
    }
    setBusy(false);
    router.refresh();
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: uploadAll,
    multiple: true,
    disabled: !ready || busy,
    noKeyboard: false,
  });

  const single = properties.length === 1;
  return (
    <Card>
      <div className={cn("grid gap-3 p-4", single ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
        {!single && (
          <Field label="Property">
            {(id) => (
              <Select id={id} value={selectedId} onChange={(e) => router.replace(`${propertyHref}${e.target.value}`)}>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field label="Report type">
          {(id) => (
            <Select id={id} value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="">Choose a report type</option>
              {REPORT_GROUPS.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.types.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Month it covers">{(id) => <Input id={id} type="month" value={period} onChange={(e) => setPeriod(e.target.value)} required />}</Field>
      </div>
      <div className="px-4 pb-4">
        <div
          {...getRootProps()}
          className={cn(
            "flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-10 text-center transition-colors",
            ready && !busy ? "cursor-pointer border-border-strong hover:bg-fg/[0.02]" : "cursor-not-allowed border-border opacity-60",
            isDragActive && "bg-fg/[0.04]",
          )}
        >
          <input {...getInputProps()} aria-label="Choose files to upload" />
          <FileUp className="size-5 text-fg-3" />
          <span className="text-[13px] font-medium text-fg">{ready ? "Drop files here, or click to choose" : "Choose a report type and month first"}</span>
          <span className="text-[11px] text-fg-3">.xlsx, .xls, .csv, .pdf, .jpg, .png, .heic</span>
        </div>
        {statuses.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5">
            {statuses.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                {s.state === "uploading" && <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-fg-3" />}
                {s.state === "done" && <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-favorable" />}
                {s.state === "failed" && <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-unfavorable" />}
                <span className="min-w-0">
                  <span className="text-fg">{s.name}</span>
                  {s.message && <span className={cn("ml-1.5", s.state === "failed" ? "text-unfavorable" : "text-fg-3")}>{s.message}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function History({ history }: { history: Upload[] }) {
  return (
    <Card>
      <CardHeader title="Your uploads for this property" description="Everything you've uploaded here, any month." />
      {history.length === 0 ? (
        <EmptyState title="Nothing uploaded yet" description="Files you upload for this property appear here." />
      ) : (
        <Table>
          <THead>
            <Th>Uploaded</Th>
            <Th>Report</Th>
            <Th>Month</Th>
            <Th>File</Th>
            <Th />
          </THead>
          <tbody>
            {history.map((u) => (
              <Tr key={u.id}>
                <Td className="text-fg-2">{dateLabel(u.created_at)}</Td>
                <Td className="text-fg">{reportTypeLabel(u.report_type)}</Td>
                <Td className="text-fg-2">{monthLabel(u.period)}</Td>
                <Td className="text-fg-2">
                  {u.file_name}
                  {u.version > 1 && <span className="ml-1.5 text-[11px] text-fg-3">version {u.version}</span>}
                </Td>
                <Td align="right">
                  <DownloadButton uploadId={u.id} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
