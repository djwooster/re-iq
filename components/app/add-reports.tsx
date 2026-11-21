"use client";

import { Check, FileSpreadsheet, FileText, Loader2, Plus, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Modal } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { PACKAGE, REPORT_TYPE, detectKind, guessProperty, sameProperty, type ReportKind } from "@/lib/uploads/match";
import { sendFile } from "@/lib/uploads/send";
import { addPropertyNamed } from "@/lib/workspace/actions";
import type { Property } from "@/lib/workspace/queries";
import { Button, FilterMenu } from "./ui";

/**
 * Add reports, from anywhere: a button that opens a popup over the current page. Drop the month's
 * files; each is matched to a property and a report type by its name (fix either in its row), then
 * Upload. Files stay in the browser until then. When everything is in, the popup closes and the
 * page refreshes; reading starts on its own. A file named for a property the workspace doesn't have
 * yet offers it as a new property, created on upload.
 */

/** A property picked for a file: an existing id, or `new:<name>` for one created on upload. */
const NEW = "new:";

interface Staged {
  id: string;
  file: File;
  property: string;
  kind: ReportKind;
  state: "waiting" | "uploading" | "done" | "failed";
  error?: string;
}

const KINDS: ReportKind[] = [...PACKAGE, "Other"];

let seq = 0;
const uid = () => `f${Date.now().toString(36)}${(seq++).toString(36)}`;

export function AddReportsButton({ properties, period, variant = "primary", label = "Add reports" }: { properties: Property[]; period: string; variant?: "primary" | "secondary"; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} icon={<Plus className="size-3.5" />} onClick={() => setOpen(true)}>
        {label}
      </Button>
      {/* Mounted only while open, so every opening starts empty. */}
      {open && <AddReports properties={properties} period={period} onClose={() => setOpen(false)} />}
    </>
  );
}

function AddReports({ properties, period, onClose }: { properties: Property[]; period: string; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [files, setFiles] = useState<Staged[]>([]);
  const [busy, setBusy] = useState(false);

  /** Matches each dropped file to a property (existing first, then one its name suggests) and a report type. */
  const add = (dropped: File[]) =>
    setFiles((current) => [
      ...current,
      ...dropped.map((file): Staged => {
        const guess = guessProperty(file.name);
        const match = guess ? properties.find((p) => sameProperty(p.name, guess)) : undefined;
        return { id: uid(), file, property: match?.id ?? (guess ? `${NEW}${guess}` : ""), kind: detectKind(file.name), state: "waiting" };
      }),
    ]);
  const { getRootProps, getInputProps, isDragActive, open: choose } = useDropzone({ onDrop: add, noClick: true, multiple: true, disabled: busy });

  const patch = (id: string, change: Partial<Staged>) => setFiles((x) => x.map((f) => (f.id === id ? { ...f, ...change } : f)));
  // New properties suggested by file names, offered to every row.
  const suggested = [...new Set(files.map((f) => f.property).filter((p) => p.startsWith(NEW)))];
  const propertyOptions = [...properties.map((p) => ({ value: p.id, label: p.name })), ...suggested.map((p) => ({ value: p, label: `New: ${p.slice(NEW.length)}` }))];
  const waiting = files.filter((f) => f.state !== "done");
  const ready = waiting.length > 0 && waiting.every((f) => f.property);

  const upload = async () => {
    setBusy(true);
    // Create the new properties first, once each.
    const ids = new Map<string, string>();
    for (const key of new Set(waiting.map((f) => f.property).filter((p) => p.startsWith(NEW)))) {
      const res = await addPropertyNamed(key.slice(NEW.length));
      if (res.ok) ids.set(key, res.id);
      else for (const f of waiting.filter((w) => w.property === key)) patch(f.id, { state: "failed", error: res.message });
    }
    let sent = 0;
    for (const f of waiting) {
      const propertyId = f.property.startsWith(NEW) ? ids.get(f.property) : f.property;
      if (!propertyId) continue;
      // A created property is now a real one: point the row at it, so a retry doesn't create it again.
      if (propertyId !== f.property) patch(f.id, { property: propertyId });
      patch(f.id, { state: "uploading", error: undefined });
      const res = await sendFile({ propertyId, reportType: REPORT_TYPE[f.kind], period: period.slice(0, 7), fileName: f.file.name }, f.file);
      if (res.ok) {
        sent++;
        patch(f.id, { state: "done" });
      } else patch(f.id, { state: "failed", error: res.message });
    }
    setBusy(false);
    router.refresh();
    const failed = waiting.length - sent;
    if (!failed) {
      toast(`${sent} ${sent === 1 ? "report" : "reports"} added`, { detail: "Reading starts now. Check Reports for anything to review." });
      onClose();
    } else if (sent) toast(`${sent} added, ${failed} didn't upload`);
  };

  const count = waiting.length;
  return (
    <Modal
      open
      onClose={() => !busy && onClose()}
      dismissible={!busy}
      width={720}
      title="Add reports"
      description="Drop this month's reports. Each file is matched to a property and a report type by its name; change either before you upload."
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy || !ready} onClick={upload}>
            {busy ? "Uploading…" : count ? `Upload ${count} ${count === 1 ? "report" : "reports"}` : "Upload"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div
          {...getRootProps()}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center transition-colors duration-200",
            files.length ? "px-4 py-5" : "px-6 py-10",
            isDragActive ? "border-brand bg-brand-soft" : "border-border-strong/70",
          )}
        >
          <input {...getInputProps()} aria-label="Add reports" />
          <UploadCloud className={cn("size-5", isDragActive ? "text-brand" : "text-fg-3")} strokeWidth={1.5} />
          <span className="text-xs text-fg-2">{isDragActive ? "Drop to add" : files.length ? "Drop more reports" : "Drop this month's reports here"}</span>
          <button type="button" onClick={choose} disabled={busy} className="mt-1 rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] font-medium text-brand transition-colors hover:border-border-strong hover:bg-surface-2 disabled:opacity-50">
            Choose files
          </button>
        </div>

        {files.length > 0 && (
          <div className="rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="h-8 pl-3 font-medium text-fg-2">File</th>
                  <th className="h-8 px-2 font-medium text-fg-2">Property</th>
                  <th className="h-8 px-2 font-medium text-fg-2">Report</th>
                  <th className="w-10" aria-label="Status" />
                </tr>
              </thead>
              <tbody>
                {files.map((f) => {
                  const locked = busy || f.state === "done";
                  return (
                    <tr key={f.id} className="border-b border-border/70 last:border-b-0">
                      <td className="max-w-0 py-2 pl-3">
                        <span className="flex min-w-0 items-center gap-2">
                          <FileIcon name={f.file.name} />
                          <span className="truncate" title={f.file.name}>
                            {f.file.name}
                          </span>
                        </span>
                        {f.error && <span className="mt-0.5 block pl-5.5 text-[11px] text-unfavorable">{f.error}</span>}
                      </td>
                      <td className="w-48 px-2 py-2">
                        {locked ? (
                          <span className="block truncate text-fg-2">{propertyOptions.find((o) => o.value === f.property)?.label}</span>
                        ) : (
                          <FilterMenu label="Property" hideLabel placeholder="Choose property" invalid value={f.property} options={propertyOptions} onChange={(v) => patch(f.id, { property: v })} />
                        )}
                      </td>
                      <td className="w-40 px-2 py-2">
                        {locked ? (
                          <span className="block truncate text-fg-2">{f.kind}</span>
                        ) : (
                          <FilterMenu label="Report" hideLabel value={f.kind} options={KINDS.map((k) => ({ value: k, label: k }))} onChange={(v) => patch(f.id, { kind: v as ReportKind })} />
                        )}
                      </td>
                      <td className="w-10 pr-2 text-right">
                        {f.state === "uploading" ? (
                          <Loader2 className="ml-auto size-3.5 animate-spin text-fg-3" aria-label="Uploading" />
                        ) : f.state === "done" ? (
                          <Check className="ml-auto size-3.5 text-favorable" aria-label="Uploaded" />
                        ) : (
                          <button type="button" disabled={busy} aria-label={`Remove ${f.file.name}`} onClick={() => setFiles((x) => x.filter((q) => q.id !== f.id))} className="rounded-md p-1.5 text-fg-3 transition-colors hover:bg-fg/[0.06] hover:text-fg disabled:opacity-50">
                            <X className="size-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}

function FileIcon({ name }: { name: string }) {
  return /\.pdf$/i.test(name) ? <FileText className="size-3.5 shrink-0 text-file-pdf" /> : <FileSpreadsheet className={cn("size-3.5 shrink-0", /\.csv$/i.test(name) ? "text-file-csv" : "text-file-xls")} />;
}
