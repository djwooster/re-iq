"use client";

import { Check, FileSpreadsheet, FileText, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import { useApp } from "@/components/shell/app-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/controls";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { ALL_MONTHS, formatDate, formatMonth, LATEST_MONTH, monthEnd } from "@/lib/dates";
import {
  confirmUpload,
  findSupersededImport,
  listProperties,
  uploadReport,
  UPLOAD_STEPS,
  type UploadDraft,
  type UploadStep,
} from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import { formatFileSize } from "@/lib/format";
import { REPORT_TYPE_LABELS, REPORT_TYPE_SHORT, SYSTEM_LABELS } from "@/lib/labels";
import type { AccountMapping, MonthKey, ReportType } from "@/lib/types";
import { isFlagged, MappingTable } from "./mapping-table";
import { UploadZone } from "./upload-zone";

interface Job {
  id: string;
  file: { name: string; size: number };
  phase: "parsing" | "review" | "done" | "error";
  step: UploadStep;
  draft?: UploadDraft;
  error?: string;
  // Review choices
  propertyId?: string;
  period?: MonthKey;
  reportType?: ReportType;
  mappings?: AccountMapping[];
  result?: string;
}

let jobSeq = 0;

/** Drop zone plus a card per file that walks through parse → detect → map → confirm. */
export function UploadFlow({ compact, onImported }: { compact?: boolean; onImported?: () => void }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const patch = useCallback((id: string, p: Partial<Job>) => setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...p } : j))), []);

  const start = useCallback(
    (files: File[]) => {
      const created: Job[] = files.map((f) => ({ id: `job_${++jobSeq}`, file: { name: f.name, size: f.size }, phase: "parsing", step: "reading" }));
      setJobs((js) => [...created, ...js]);
      // Parse sequentially, like a single ingestion worker would.
      (async () => {
        for (const job of created) {
          try {
            const draft = await uploadReport(job.file, (step) => patch(job.id, { step }));
            patch(job.id, {
              phase: "review",
              draft,
              propertyId: draft.property_id ?? undefined,
              period: draft.period ?? undefined,
              reportType: draft.report_type ?? undefined,
              mappings: draft.mappings,
            });
          } catch (e) {
            patch(job.id, { phase: "error", error: (e as Error).message });
          }
        }
      })();
    },
    [patch],
  );

  return (
    <div className="flex flex-col gap-3">
      <UploadZone onFiles={start} compact={compact} />
      <AnimatePresence initial={false}>
        {jobs.map((job) => (
          <motion.div
            key={job.id}
            layout="position"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <JobCard
              job={job}
              onChange={(p) => patch(job.id, p)}
              onRemove={() => setJobs((js) => js.filter((j) => j.id !== job.id))}
              onImported={onImported}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function FileIcon({ name }: { name: string }) {
  const Icon = name.toLowerCase().endsWith(".pdf") ? FileText : FileSpreadsheet;
  return <Icon className="size-3.5 shrink-0 text-fg-3" strokeWidth={1.75} />;
}

function JobCard({ job, onChange, onRemove, onImported }: { job: Job; onChange: (p: Partial<Job>) => void; onRemove: () => void; onImported?: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <FileIcon name={job.file.name} />
        <span className="num min-w-0 flex-1 truncate text-xs text-fg">{job.file.name}</span>
        <span className="num shrink-0 text-[10px] text-fg-3">{formatFileSize(job.file.size)}</span>
        {job.phase === "done" && <Badge tone="favorable">Imported</Badge>}
        {job.phase === "error" && <Badge tone="unfavorable">Failed</Badge>}
        {(job.phase === "done" || job.phase === "error" || job.phase === "review") && (
          <button type="button" onClick={onRemove} className="cursor-pointer rounded p-0.5 text-fg-3 hover:text-fg" aria-label={job.phase === "review" ? "Discard upload" : "Dismiss"}>
            <X className="size-3.5" />
          </button>
        )}
      </div>
      {job.phase === "parsing" && <ParsingSteps step={job.step} />}
      {job.phase === "error" && <p className="border-t border-border px-3.5 py-2.5 text-xs text-fg-2">{job.error}</p>}
      {job.phase === "done" && <p className="border-t border-border px-3.5 py-2.5 text-xs text-fg-2">{job.result}</p>}
      {job.phase === "review" && job.draft && <Review job={job} onChange={onChange} onImported={onImported} />}
    </div>
  );
}

function ParsingSteps({ step }: { step: UploadStep }) {
  const index = UPLOAD_STEPS.findIndex((s) => s.id === step);
  return (
    <div className="border-t border-border px-3.5 py-3">
      <Progress value={(index + 0.6) / UPLOAD_STEPS.length} />
      <ol className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1">
        {UPLOAD_STEPS.map((s, i) => (
          <li key={s.id} className={cn("flex items-center gap-1.5 text-[11px] transition-colors duration-300", i < index ? "text-fg-3" : i === index ? "text-fg" : "text-fg-3/60")}>
            {i < index ? <Check className="size-3" /> : <span className={cn("size-1.5 rounded-full", i === index ? "bg-fg" : "bg-fg/20")} />}
            {s.label}
          </li>
        ))}
      </ol>
    </div>
  );
}

function periodOptions(reportType?: ReportType) {
  if (reportType === "budget") return ["2026-12", "2027-12"];
  return ALL_MONTHS.slice(-12).reverse();
}

function Review({ job, onChange, onImported }: { job: Job; onChange: (p: Partial<Job>) => void; onImported?: () => void }) {
  const { orgId } = useApp();
  const toast = useToast();
  const { data: properties } = useData(() => listProperties(orgId), [orgId]);
  const [saving, setSaving] = useState<"confirm" | "review" | null>(null);
  const draft = job.draft!;
  const mappings = job.mappings ?? [];
  const flagged = mappings.filter(isFlagged);
  const unresolved = flagged.filter((m) => !m.confirmed_by_user).length;
  const ready = Boolean(job.propertyId && job.period && job.reportType);
  const superseded = ready ? findSupersededImport(job.propertyId!, job.reportType!, job.period!) : null;
  const property = properties?.find((p) => p.property.id === job.propertyId)?.property;

  const detectionLine = draft.detected_source_format
    ? `Looks like ${/^[aeiou]/i.test(SYSTEM_LABELS[draft.detected_source_format]) ? "an" : "a"} ${SYSTEM_LABELS[draft.detected_source_format]} ${draft.report_type ? REPORT_TYPE_SHORT[draft.report_type] : "report"} export`
    : draft.report_type
      ? `Looks like a ${REPORT_TYPE_SHORT[draft.report_type]} from an unrecognized system`
      : "We couldn't identify this report on our own";

  const submit = async (saveForReview: boolean) => {
    if (!ready) return;
    setSaving(saveForReview ? "review" : "confirm");
    try {
      const res = await confirmUpload({ draft, property_id: job.propertyId!, period: job.period!, report_type: job.reportType!, mappings, saveForReview });
      const changed = res.data_through !== res.previous_data_through;
      const label = `${res.property.name} ${REPORT_TYPE_SHORT[res.import.report_type]}`;
      if (res.import.status === "needs_review") {
        toast(`${label} saved for review`, { detail: `${unresolved} flagged ${unresolved === 1 ? "line" : "lines"} to confirm before it posts`, tone: "warning" });
        onChange({ phase: "done", result: `Saved to Needs review. Confirm ${unresolved} flagged ${unresolved === 1 ? "line" : "lines"} from Import history to post it.` });
      } else {
        toast(`${label} imported`, {
          detail: changed ? `Data through moved from ${formatDate(res.previous_data_through)} to ${formatDate(res.data_through)}` : `${res.property.name} data through ${formatDate(res.data_through)}`,
        });
        onChange({
          phase: "done",
          result: `${REPORT_TYPE_LABELS[res.import.report_type]} for ${res.property.name}, ${formatMonth(res.import.period)}. ${changed ? `Data through is now ${formatDate(res.data_through)}.` : `Data through ${formatDate(res.data_through)}.`}`,
        });
      }
      onImported?.();
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="border-t border-border">
      <div className="px-3.5 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-fg">{detectionLine}</span>
          {draft.needs_input && <Badge tone="warning">Needs your input</Badge>}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label="Report type">
            {(id) => (
              <Select id={id} value={job.reportType ?? ""} onChange={(e) => onChange({ reportType: e.target.value as ReportType })}>
                {!job.reportType && <option value="">Choose a report type</option>}
                {(Object.keys(REPORT_TYPE_LABELS) as ReportType[]).map((t) => (
                  <option key={t} value={t}>
                    {REPORT_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Property" hint={!draft.property_id ? "Not found in the file name. Choose one." : undefined}>
            {(id) => (
              <Select id={id} value={job.propertyId ?? ""} onChange={(e) => onChange({ propertyId: e.target.value })}>
                {!job.propertyId && <option value="">Choose a property</option>}
                {properties?.map(({ property: p }) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={job.reportType === "budget" ? "Fiscal year" : "Period ending"} hint={!draft.period ? "Not found in the file name. Choose one." : undefined}>
            {(id) => (
              <Select id={id} value={job.period ?? ""} onChange={(e) => onChange({ period: e.target.value })}>
                {!job.period && <option value="">Choose a period</option>}
                {periodOptions(job.reportType).map((m) => (
                  <option key={m} value={m}>
                    {job.reportType === "budget" ? `FY${m.slice(0, 4)}` : formatMonth(m, "long")}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        {property && job.reportType === "t12" && job.period && (
          <p className="mt-2 text-[11px] text-fg-3">
            {property.name} currently has data through {formatDate(property.data_through)}.
            {job.period > property.data_through.slice(0, 7) && job.period <= LATEST_MONTH ? ` Confirming moves it to ${formatDate(monthEnd(job.period))}.` : ""}
            {superseded ? ` Replaces ${superseded.file_name}, uploaded ${formatDate(superseded.uploaded_at.slice(0, 10))}.` : ""}
          </p>
        )}
      </div>

      <div className="mt-4 px-3.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="eyebrow">Mapping preview</span>
          <span className="text-[11px] text-fg-3">
            {flagged.length === 0 ? "All rows mapped with high confidence" : unresolved ? `${unresolved} of ${flagged.length} flagged ${flagged.length === 1 ? "row needs" : "rows need"} a look` : "Flagged rows confirmed"}
          </span>
        </div>
        <MappingTable
          mappings={mappings}
          reportType={job.reportType ?? "t12"}
          editable
          onChange={(id, p) => onChange({ mappings: mappings.map((m) => (m.id === id ? { ...m, ...p } : m)) })}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-border px-3.5 py-2.5">
        {!ready && <span className="mr-auto text-[11px] text-fg-3">Choose the report type, property, and period to continue.</span>}
        {ready && unresolved > 0 && <span className="mr-auto text-[11px] text-fg-3">Confirm or change the flagged rows, or save this for later.</span>}
        {unresolved > 0 && (
          <Button disabled={!ready} loading={saving === "review"} onClick={() => submit(true)}>
            Save for review
          </Button>
        )}
        <Button variant="primary" disabled={!ready || unresolved > 0} loading={saving === "confirm"} onClick={() => submit(false)}>
          Confirm import
        </Button>
      </div>
    </div>
  );
}
