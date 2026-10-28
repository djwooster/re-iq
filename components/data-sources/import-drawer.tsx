"use client";

import { AlertTriangle, ArrowUpRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/empty-state";
import { Drawer, Modal } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatDateTime } from "@/lib/dates";
import { confirmImportReview, deleteImport, describePeriod, getImport, listMembers } from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import { formatFileSize, formatNumber } from "@/lib/format";
import { REPORT_TYPE_LABELS, SYSTEM_LABELS } from "@/lib/labels";
import type { AccountMapping, MappingTarget } from "@/lib/types";
import { useApp } from "@/components/shell/app-context";
import { useOpenUpload } from "./upload-button";
import { isFlagged, MappingTable } from "./mapping-table";
import { ImportStatusBadge } from "./import-history";

export function ImportDrawer({ importId, onClose }: { importId: string | null; onClose: () => void }) {
  const { orgId } = useApp();
  const toast = useToast();
  const openUpload = useOpenUpload();
  const [lastId, setLastId] = useState(importId);
  if (importId && importId !== lastId) setLastId(importId);
  const id = importId ?? lastId;
  const { data: loaded } = useData(() => (id ? getImport(id) : Promise.resolve(null)), [id]);
  // Ignore the previous import's data while the next one loads.
  const data = loaded && loaded.import.id === id ? loaded : undefined;
  const { data: members } = useData(() => listMembers(orgId), [orgId]);
  const [edits, setEdits] = useState<Record<string, Partial<AccountMapping>>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const imp = data?.import;
  const mappings = (data?.mappings ?? []).map((m) => ({ ...m, ...edits[m.id] }));
  const reviewing = imp?.status === "needs_review";
  const unresolved = mappings.filter((m) => isFlagged(m) && !m.confirmed_by_user).length;
  const uploader = members?.find((m) => m.id === imp?.uploaded_by)?.name ?? "A teammate";

  const close = () => {
    setEdits({});
    onClose();
  };

  const post = async () => {
    if (!imp) return;
    setSaving(true);
    const targets: Record<string, MappingTarget> = {};
    for (const m of mappings) if (isFlagged(m)) targets[m.id] = m.target;
    const res = await confirmImportReview(imp.id, targets);
    setSaving(false);
    setEdits({});
    toast(`${res.property.name} ${REPORT_TYPE_LABELS[imp.report_type]} posted`, {
      detail: res.added_to_portfolio
        ? `${res.property.name} is now in your portfolio`
        : res.data_through !== res.previous_data_through
          ? `Data through moved from ${formatDate(res.previous_data_through)} to ${formatDate(res.data_through)}`
          : undefined,
    });
  };

  const remove = async () => {
    if (!imp) return;
    setDeleting(true);
    const res = await deleteImport(imp.id);
    setDeleting(false);
    setConfirmDelete(false);
    close();
    toast(`Deleted ${imp.file_name}`, { detail: `${res.property.name} data through ${formatDate(res.property.data_through)}` });
  };

  return (
    <>
      <Drawer
        open={Boolean(importId)}
        onClose={close}
        width={480}
        eyebrow={imp ? REPORT_TYPE_LABELS[imp.report_type] : "Import"}
        title={<span className="num block truncate text-[13px]">{imp?.file_name ?? " "}</span>}
        footer={
          imp && (
            <>
              <Button variant="ghost" className="mr-auto" icon={<Trash2 className="size-3" />} onClick={() => setConfirmDelete(true)}>
                Delete import
              </Button>
              {reviewing && (
                <Button variant="primary" disabled={unresolved > 0} loading={saving} onClick={post}>
                  {unresolved > 0 ? `Confirm ${unresolved} flagged ${unresolved === 1 ? "row" : "rows"}` : "Post import"}
                </Button>
              )}
              {imp.status === "failed" && (
                <Button
                  variant="primary"
                  onClick={() => {
                    close();
                    openUpload();
                  }}
                >
                  Upload a replacement
                </Button>
              )}
            </>
          )
        }
      >
        {!data || !imp ? (
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="flex flex-col gap-5 p-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <Meta label="Status">
                <ImportStatusBadge status={imp.status} />
              </Meta>
              <Meta label="Property">
                <Link href={`/app/properties/${data.property.id}`} className="inline-flex items-center gap-1 text-fg hover:underline">
                  {data.property.name} <ArrowUpRight className="size-3 text-fg-3" />
                </Link>
              </Meta>
              <Meta label="Period">{describePeriod(imp.report_type, imp.period)}</Meta>
              <Meta label="Source format">{imp.detected_source_format ? `${SYSTEM_LABELS[imp.detected_source_format]} export` : "Unrecognized"}</Meta>
              <Meta label="Uploaded">
                {formatDateTime(imp.uploaded_at)} · {uploader}
              </Meta>
              <Meta label="File">
                <span className="num">
                  {imp.file_format.toUpperCase()} · {formatFileSize(imp.file_size)}
                  {imp.row_count > 0 && ` · ${formatNumber(imp.row_count)} rows`}
                </span>
              </Meta>
            </dl>

            {imp.status === "failed" && (
              <div className="flex gap-2 rounded-md border border-unfavorable/25 bg-unfavorable/[0.06] px-3 py-2.5 text-xs text-fg-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-unfavorable" strokeWidth={1.75} />
                <span>{imp.status_detail}</span>
              </div>
            )}
            {reviewing && (
              <div className="flex gap-2 rounded-md border border-warning/25 bg-warning/[0.06] px-3 py-2.5 text-xs text-fg-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" strokeWidth={1.75} />
                <span>
                  {imp.status_detail}. Until it posts, {data.property.name} shows data through {formatDate(data.property.data_through)}.
                </span>
              </div>
            )}

            {mappings.length > 0 && (
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <span className="eyebrow">Mapping</span>
                  {!reviewing && <Badge tone="muted">{mappings.filter((m) => m.confirmed_by_user).length} confirmed by a person</Badge>}
                </div>
                <MappingTable
                  mappings={mappings}
                  reportType={imp.report_type}
                  editable={reviewing}
                  initialVisible={reviewing ? 6 : 10}
                  onChange={(mid, p) => setEdits((e) => ({ ...e, [mid]: { ...e[mid], ...p } }))}
                />
              </section>
            )}
          </div>
        )}
      </Drawer>
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this import?"
        description={
          imp?.report_type === "t12" && imp.status === "processed"
            ? `Its numbers come out of ${data?.property.name}. If it is the latest T12, data through moves back to the previous month. This can't be undone.`
            : "The file and its mapping are removed. This can't be undone."
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={remove}>
              Delete import
            </Button>
          </>
        }
      />
    </>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-fg-3">{label}</dt>
      <dd className="mt-0.5 truncate text-fg">{children}</dd>
    </div>
  );
}
