"use client";

import { Building2, ChevronDown, FileSpreadsheet, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import { confirmReportRead, retryReportRead } from "@/lib/workspace/actions";
import { monthLabel } from "@/lib/workspace/format";
import { CHART_OF_ACCOUNTS } from "@/lib/workspace/kpis";
import type { Property, ReportRead } from "@/lib/workspace/queries";
import { Button, Empty } from "./ui";

/**
 * Setup's Review step: what RE-IQ read from each report, by property. Each report shows its
 * figures, any check that failed, Claude's notes, and the lines it wasn't sure how to map; the
 * reviewer fixes accounts and confirms. Nothing counts toward the app's numbers until confirmed.
 * While anything is still being read, the page refreshes itself.
 */

const TYPE_LABEL: Record<string, string> = { income_statement: "Monthly P&L", t12: "T-12", ar_aging: "AR aging", other: "Other report" };

export function Review({ properties, reads }: { properties: Property[]; reads: ReportRead[] }) {
  const router = useRouter();
  const reading = reads.some((r) => r.status === "reading");
  useEffect(() => {
    if (!reading) return;
    const t = window.setInterval(() => router.refresh(), 3000);
    return () => window.clearInterval(t);
  }, [reading, router]);

  if (!reads.length) return <Empty>No reports to read yet. Excel and CSV P&Ls, T-12s and AR agings are read as they arrive.</Empty>;

  const confirmed = reads.filter((r) => r.status === "confirmed").length;
  return (
    <div className="flex flex-col gap-8">
      <p className="num text-xs text-fg-2">
        {confirmed} of {reads.length} confirmed
        {reading && (
          <span className="ml-3 inline-flex items-center gap-1.5 text-fg-3">
            <Loader2 className="size-3 animate-spin" /> Reading {reads.filter((r) => r.status === "reading").length}
          </span>
        )}
      </p>
      {properties
        .filter((p) => reads.some((r) => r.property_id === p.id))
        .map((p) => (
          <section key={p.id} className="flex flex-col gap-2">
            <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-property">
              <Building2 className="size-3.5" strokeWidth={1.75} />
              {p.name}
            </h2>
            {reads
              .filter((r) => r.property_id === p.id)
              .map((r) => (
                <ReadCard key={r.id} read={r} />
              ))}
          </section>
        ))}
    </div>
  );
}

function StatusBadge({ status }: { status: ReportRead["status"] }) {
  if (status === "reading") return <Badge tone="neutral">Reading</Badge>;
  if (status === "failed") return <Badge tone="unfavorable">Couldn&apos;t read</Badge>;
  if (status === "confirmed") return <Badge tone="favorable">Confirmed</Badge>;
  return <Badge tone="warning">To review</Badge>;
}

function ReadCard({ read }: { read: ReportRead }) {
  const router = useRouter();
  const [overrides, setOverrides] = useState<Record<string, string>>(read.overrides ?? {});
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const result = read.result;
  const file = read.uploads?.file_name ?? "Report";
  const lines = (result?.lines ?? []).filter((l) => l.kind === "line" && l.section !== "other");
  const unsure = lines.filter((l) => l.confidence === "low");
  const failing = (result?.checks ?? []).filter((c) => !c.ok);
  const accountOf = (row: number, fallback: string) => overrides[String(row)] ?? fallback;

  const confirm = () =>
    start(async () => {
      setError(null);
      const res = await confirmReportRead(read.id, overrides);
      if (!res.ok) return setError(res.message);
      router.refresh();
    });

  const lineRow = (l: (typeof lines)[number]) => (
    <div key={l.row} className="grid grid-cols-[1fr_auto_200px] items-center gap-3 border-b border-border/70 px-4 py-2 text-xs last:border-b-0">
      <span className="truncate" title={l.label}>
        {l.label}
      </span>
      <span className="num text-fg-2">{l.amount === null ? "—" : formatCurrency(l.amount)}</span>
      <select
        aria-label={`Account for ${l.label}`}
        value={accountOf(l.row, l.account)}
        onChange={(e) => setOverrides((o) => ({ ...o, [String(l.row)]: e.target.value }))}
        className="h-7 rounded-md border border-border bg-surface px-2 text-xs text-fg"
      >
        {CHART_OF_ACCOUNTS.map((a) => (
          <option key={a}>{a}</option>
        ))}
        <option value="none">Not an operating line</option>
      </select>
    </div>
  );

  return (
    <div className="rounded-lg border border-border bg-surface">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pt-3 pb-2.5">
        <FileSpreadsheet className="size-3.5 shrink-0 text-fg-3" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium" title={file}>
          {file}
        </span>
        {read.report_type && (
          <span className="text-xs text-fg-2">
            {TYPE_LABEL[read.report_type] ?? read.report_type}
            {read.period && ` · ${monthLabel(read.period)}`}
          </span>
        )}
        <StatusBadge status={read.status} />
      </header>

      {read.status === "failed" && (
        <div className="flex items-center justify-between gap-3 px-4 pb-3">
          <p className="text-xs text-unfavorable">{error ?? read.error}</p>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await retryReportRead(read.upload_id);
                if (!res.ok) setError(res.message);
                router.refresh();
              })
            }
          >
            {pending ? "Reading…" : "Try again"}
          </Button>
        </div>
      )}

      {result && (read.status === "read" || read.status === "confirmed") && (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
          <Figures result={result} />
          {failing.length > 0 && (
            <ul className="flex flex-col gap-1 text-xs text-unfavorable">
              {failing.map((c) => (
                <li key={c.name + c.detail}>
                  {c.name}: {c.detail}
                </li>
              ))}
            </ul>
          )}
          {result.layout.notes.length > 0 && (
            <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-fg-2">
              {result.layout.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {result && lines.length > 0 && (read.status === "read" || read.status === "confirmed") && (
        <div className="border-t border-border">
          {unsure.length > 0 && !showAll && (
            <>
              <p className="px-4 pt-3 pb-1 text-xs font-medium">Check {unsure.length === 1 ? "this account" : `these ${unsure.length} accounts`}</p>
              {unsure.map(lineRow)}
            </>
          )}
          {showAll && lines.map(lineRow)}
          <button type="button" onClick={() => setShowAll((v) => !v)} className="flex w-full items-center gap-1 px-4 py-2 text-xs text-fg-2 hover:text-fg">
            <ChevronDown className={cn("size-3 transition-transform", showAll && "rotate-180")} />
            {showAll ? "Show fewer lines" : `All ${lines.length} lines`}
          </button>
        </div>
      )}

      {(read.status === "read" || read.status === "confirmed") && (
        <footer className="flex items-center justify-end gap-3 border-t border-border px-4 py-2.5">
          {error && <span className="mr-auto text-xs text-unfavorable">{error}</span>}
          <Button variant={read.status === "confirmed" ? "secondary" : "primary"} disabled={pending} onClick={confirm}>
            {read.status === "confirmed" ? "Save changes" : "Confirm"}
          </Button>
        </footer>
      )}
    </div>
  );
}

function Figures({ result }: { result: NonNullable<ReportRead["result"]> }) {
  const { figures, aging } = result;
  const items =
    result.layout.report_type === "ar_aging"
      ? [{ label: "Owed", value: aging?.owed ?? aging?.total ?? null }, ...(aging?.buckets ?? []).map((b) => ({ label: b.label, value: b.amount }))]
      : [
          { label: "Total income", value: figures.totalIncome },
          { label: "Total expenses", value: figures.totalExpenses },
          { label: "NOI", value: figures.noi },
        ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((i) => (
        <div key={i.label} className="flex flex-col gap-0.5">
          <dt className="text-xs text-fg-3">{i.label}</dt>
          <dd className="num text-[13px] font-medium">{i.value === null ? "—" : formatCurrency(i.value)}</dd>
        </div>
      ))}
    </dl>
  );
}
