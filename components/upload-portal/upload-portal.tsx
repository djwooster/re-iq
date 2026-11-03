"use client";

import { Check, UploadCloud } from "lucide-react";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { formatDate, formatMonth } from "@/lib/dates";
import { getUploadPage } from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import { PRODUCT_NAME } from "@/lib/labels";

/**
 * What a property manager sees at their link. No login, no app chrome: what's
 * due, what's in, and a place to drop files. Anything wrong with a file shows
 * up for the asset manager, never here.
 */
export function UploadPortal({ token }: { token: string }) {
  const { data, loading } = useData(() => getUploadPage(token), [token]);
  const [sent, setSent] = useState<string[]>([]);
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (files) => setSent((s) => [...files.map((f) => f.name), ...s]),
    noClick: true,
    multiple: true,
  });

  if (!data) {
    return (
      <div className="mx-auto max-w-[640px] px-4 py-12">
        {loading ? <Skeleton className="h-80 rounded-lg" /> : <EmptyState title="This link isn't active" description="Ask the asset manager who sent it for a new one." />}
      </div>
    );
  }

  const month = formatMonth(data.month, "long");
  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto flex max-w-[640px] flex-col gap-5 px-4 py-10">
        <header>
          <div className="eyebrow">{data.organization_name}</div>
          <h1 className="mt-1 text-[17px] font-semibold text-fg">{month} reports from {data.manager.name}</h1>
          <p className="mt-1 text-xs text-fg-3">
            Due {formatDate(data.due_date, true)}. Drop the files your system exports, in any format. No account needed.
          </p>
        </header>

        <div
          {...getRootProps()}
          className={cn(
            "flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center transition-colors",
            isDragActive ? "border-fg-3 bg-fg/[0.03]" : "border-border-strong bg-surface",
          )}
        >
          <input {...getInputProps()} />
          <UploadCloud className="size-5 text-fg-3" strokeWidth={1.5} />
          <p className="text-xs text-fg-2">Drag files here, or</p>
          <button type="button" onClick={open} className="cursor-pointer rounded-md bg-inverted px-3 py-1.5 text-xs font-medium text-inverted-fg hover:opacity-90">
            Choose files
          </button>
          <p className="text-[11px] text-fg-3">Excel, CSV, or PDF. Several at once is fine.</p>
        </div>

        {sent.length > 0 && (
          <Card className="px-4 py-3">
            <div className="eyebrow mb-1.5">Received just now</div>
            <ul className="flex flex-col gap-1">
              {sent.map((name, i) => (
                <li key={`${name}-${i}`} className="flex items-center gap-2 text-xs text-fg">
                  <Check className="size-3 text-favorable" /> <span className="num truncate">{name}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <div className="border-b border-border px-4 py-2.5">
            <div className="eyebrow">What&apos;s due for {month}</div>
          </div>
          <ul>
            {data.properties.map((p) => (
              <li key={p.name} className="border-b border-border/70 px-4 py-3 last:border-b-0">
                <div className="text-xs font-medium text-fg">{p.name}</div>
                <ul className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
                  {p.reports.map((r) => (
                    <li key={r.report_type} className="flex items-center gap-1.5 text-[11px]">
                      {r.received_at ? <Check className="size-3 text-favorable" /> : <span className="size-3 rounded-full border border-border-strong" />}
                      <span className={r.received_at ? "text-fg-2" : "text-fg"}>{r.label}</span>
                      {r.received_at && <span className="num text-fg-3">{formatDate(r.received_at.slice(0, 10))}</span>}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Card>

        <p className="text-center text-[11px] text-fg-3">
          Sent to {data.organization_name} through {PRODUCT_NAME}. Questions about this request go to your asset manager.
        </p>
      </div>
    </div>
  );
}
