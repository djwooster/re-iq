"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/shell/app-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/empty-state";
import { ConfidenceIndicator } from "@/components/ui/metric";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import {
  ALL_GL_CATEGORIES,
  REVIEW_THRESHOLD,
  approveConfident,
  getCrosswalk,
  getReviewDetail,
  listReviewFiles,
  saveMapping,
} from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import { formatCurrency } from "@/lib/format";
import { CATEGORY_LABELS, SYSTEM_LABELS } from "@/lib/labels";
import type { AccountMapping, GlCategory, MappingTarget } from "@/lib/types";

const label = (t: MappingTarget) => (t === "ignore" ? "Not imported" : CATEGORY_LABELS[t as GlCategory] ?? t);

/** Pick a file, see every line it maps, confirm what RE-IQ wasn't sure of. */
export function MappingReview() {
  const { orgId } = useApp();
  const { data: files } = useData(() => listReviewFiles(orgId), [orgId]);
  const [selected, setSelected] = useState<string | null>(null);
  const current = selected ?? files?.[0]?.import.id ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader title="Latest T12s" description="Files with lines to confirm come first." />
          {!files ? (
            <Skeleton className="mx-4 mb-4 h-40" />
          ) : (
            <ul className="pb-2">
              {files.map((f) => (
                <li key={f.import.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(f.import.id)}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-1.5 text-left transition-colors",
                      current === f.import.id ? "bg-fg/[0.05]" : "hover:bg-fg/[0.025]",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs text-fg">{f.property.name}</span>
                      <span className="block truncate text-[10px] text-fg-3">{f.property.property_manager.name}</span>
                    </span>
                    {f.pending > 0 ? (
                      <span className="num shrink-0 text-[10px] text-warning">{f.pending} to confirm</span>
                    ) : (
                      <Check className="size-3 shrink-0 text-fg-3" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {current ? <FileReview importId={current} /> : <Skeleton className="h-96 rounded-lg" />}
      </div>
      <CrosswalkCard />
    </div>
  );
}

function FileReview({ importId }: { importId: string }) {
  const toast = useToast();
  const { data } = useData(() => getReviewDetail(importId), [importId]);
  if (!data) return <Skeleton className="h-96 rounded-lg" />;
  const { file, mappings } = data;
  const unapproved = mappings.filter((m) => m.confidence >= REVIEW_THRESHOLD && !m.confirmed_by_user).length;
  const manager = file.property.property_manager;

  const change = async (m: AccountMapping, target: MappingTarget) => {
    await saveMapping(m, target, manager.id);
    toast(`Saved for ${manager.name}: ${m.source_code} ${m.source_label} → ${label(target)} on every future file`);
  };

  return (
    <Card>
      <CardHeader
        title={file.import.file_name}
        description={`${file.property.name} · ${SYSTEM_LABELS[manager.system]} export from ${manager.name} · ${mappings.length} lines`}
        action={
          unapproved > 0 ? (
            <Button
              size="xs"
              variant="primary"
              onClick={async () => {
                const n = await approveConfident(mappings);
                toast(`Approved ${n} confident lines`);
              }}
            >
              Approve all confident ({unapproved})
            </Button>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-fg-3">
              <Check className="size-3" /> Confident lines approved
            </span>
          )
        }
      />
      <MappingLines mappings={mappings} onChange={change} />
      <p className="border-t border-border px-4 py-2.5 text-[11px] text-fg-3">
        Changing an account remembers it for {manager.name}: the same line maps the same way on every file they send.
      </p>
    </Card>
  );
}

/**
 * Every line in a file: their label and amount, the standard account, and how
 * sure RE-IQ is. Uncertain lines sit at the top, highlighted until confirmed.
 */
export function MappingLines({ mappings, onChange }: { mappings: AccountMapping[]; onChange: (m: AccountMapping, target: MappingTarget) => void }) {
  const change = onChange;
  const ordered = [...mappings.filter((m) => m.confidence < REVIEW_THRESHOLD), ...mappings.filter((m) => m.confidence >= REVIEW_THRESHOLD)];
  return (
    <>
      <div className="eyebrow grid grid-cols-[18px_minmax(0,1.2fr)_96px_minmax(0,1fr)_64px] items-center gap-3 border-y border-border px-4 py-2">
        <span />
        <span>Their line</span>
        <span className="text-right">T12 amount</span>
        <span>Standard account</span>
        <span className="text-right">Confidence</span>
      </div>
      <ul>
        {ordered.map((m) => {
          const flagged = m.confidence < REVIEW_THRESHOLD;
          const checked = m.confirmed_by_user || !flagged;
          return (
            <li
              key={m.id}
              className={cn(
                "grid grid-cols-[18px_minmax(0,1.2fr)_96px_minmax(0,1fr)_64px] items-center gap-3 border-b border-border/60 px-4 py-1.5 last:border-b-0",
                flagged && !m.confirmed_by_user && "bg-warning/[0.07]",
              )}
            >
              <button
                type="button"
                aria-label={checked ? "Confirmed" : `Confirm ${m.source_label}`}
                onClick={() => flagged && !m.confirmed_by_user && change(m, m.target)}
                className={cn(
                  "flex size-3.5 items-center justify-center rounded-[3px] border",
                  checked ? "border-fg bg-fg text-bg" : "cursor-pointer border-fg-3 hover:border-fg",
                  m.confidence >= REVIEW_THRESHOLD && !m.confirmed_by_user && "opacity-50",
                )}
              >
                {checked && <Check className="size-2.5" strokeWidth={3} />}
              </button>
              <span className="min-w-0 truncate text-xs text-fg">
                <span className="num mr-1.5 text-[10px] text-fg-3">{m.source_code}</span>
                {m.source_label}
              </span>
              <span className="num text-right text-[11px] text-fg-2">{m.amount !== null ? formatCurrency(m.amount) : ""}</span>
              <Select dense value={m.target} aria-label={`Standard account for ${m.source_label}`} onChange={(e) => change(m, e.target.value as MappingTarget)}>
                {[...ALL_GL_CATEGORIES, "ignore" as const].map((o) => (
                  <option key={o} value={o}>
                    {label(o)}
                  </option>
                ))}
              </Select>
              <span className="text-right">
                <ConfidenceIndicator value={m.confidence} threshold={REVIEW_THRESHOLD} />
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function CrosswalkCard() {
  const { orgId } = useApp();
  const { data } = useData(() => getCrosswalk(orgId), [orgId]);
  if (!data) return null;
  return (
    <Card>
      <CardHeader
        eyebrow="One chart of accounts"
        title={`Four managers, one ${data.label.toLowerCase()} line`}
        description="Each manager labels it differently. RE-IQ maps them all to the same standard account, so properties compare."
      />
      <div className="grid gap-px border-t border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {data.managers.map((m) => (
          <div key={m.manager.id} className="bg-surface px-4 py-3">
            <div className="text-[11px] text-fg-3">
              {m.manager.name} · {SYSTEM_LABELS[m.manager.system]}
            </div>
            <ul className="mt-1.5 flex flex-col gap-0.5">
              {m.lines.map((l) => (
                <li key={l.code} className="text-xs text-fg">
                  <span className="num mr-1.5 text-[10px] text-fg-3">{l.code}</span>
                  {l.label}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="border-t border-border px-4 py-2.5 text-xs text-fg-2">
        → <span className="font-medium text-fg">{data.label}</span>
      </p>
    </Card>
  );
}

