"use client";

import { Check, LayoutGrid, Upload } from "lucide-react";
import { useState } from "react";
import { MappingLines } from "@/components/data-sources/mapping-review";
import { StandardStatementTable } from "@/components/financials/standard-statement";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/empty-state";
import { FadeIn } from "@/components/ui/motion";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";
import {
  FIRST_RUN_STEPS,
  REVIEW_THRESHOLD,
  confirmUpload,
  getStandardStatement,
  loadSamplePortfolio,
  readFirstReport,
  type UploadDraft,
} from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import { SYSTEM_LABELS } from "@/lib/labels";
import type { AccountMapping, MappingTarget } from "@/lib/types";

type Phase = { kind: "start" } | { kind: "reading"; step: number; detail: string } | { kind: "mapping"; draft: UploadDraft } | { kind: "statement"; draft: UploadDraft };

/**
 * First run: one T12 in, a clean standard statement out. Upload is simulated:
 * it reads Brookstone Park's November T12 so the demo is the same every time.
 */
export function FirstRun() {
  const [phase, setPhase] = useState<Phase>({ kind: "start" });
  const [mappings, setMappings] = useState<AccountMapping[]>([]);
  const [saving, setSaving] = useState(false);

  const read = async () => {
    setPhase({ kind: "reading", step: 0, detail: "" });
    const draft = await readFirstReport((step, detail) => setPhase({ kind: "reading", step, detail }));
    setMappings(draft.mappings);
    setPhase({ kind: "mapping", draft });
  };

  const change = (m: AccountMapping, target: MappingTarget) =>
    setMappings((list) => list.map((x) => (x.id === m.id ? { ...x, target, confirmed_by_user: true } : x)));

  const finish = async (draft: UploadDraft) => {
    setSaving(true);
    // Adding the file brings Brookstone into the portfolio, and the Overview takes over from here.
    await confirmUpload({ draft, property_id: draft.property_id!, period: draft.period!, report_type: "t12", mappings });
  };

  const unsure = mappings.filter((m) => m.confidence < REVIEW_THRESHOLD && !m.confirmed_by_user).length;

  return (
    <>
      <PageHeader title="Overview" subtitle="Start with one property's T12" />
      <PageBody>
        {phase.kind === "start" && (
          <FadeIn>
            <Card>
              <EmptyState
                className="py-20"
                icon={<LayoutGrid className="size-3.5" strokeWidth={1.75} />}
                title="Start with one property's T12"
                description="Upload the trailing 12-month income statement your property manager sends, in whatever format it comes in. RE-IQ reads it, maps every line to a standard chart of accounts, and checks the totals."
                action={
                  <Button variant="primary" icon={<Upload className="size-3" />} onClick={read}>
                    Upload report
                  </Button>
                }
              />
              <p className="-mt-12 pb-8 text-center text-[11px] text-fg-3">
                Exploring?{" "}
                <button type="button" onClick={loadSamplePortfolio} className="cursor-pointer text-fg-2 underline decoration-border underline-offset-2 hover:text-fg">
                  Load sample portfolio
                </button>
              </p>
            </Card>
          </FadeIn>
        )}

        {phase.kind === "reading" && (
          <FadeIn>
            <Card className="mx-auto max-w-[520px] px-5 py-6">
              <div className="num mb-1 text-xs text-fg">Brookstone_T12_Nov2026.xlsx</div>
              <p className="mb-4 text-[11px] text-fg-3">{phase.detail}</p>
              <ol className="mb-4 flex flex-col gap-2">
                {FIRST_RUN_STEPS.map((label, i) => (
                  <li key={label} className={cn("flex items-center gap-2 text-xs", i <= phase.step ? "text-fg" : "text-fg-3")}>
                    {i < phase.step ? <Check className="size-3 text-favorable" /> : <span className={cn("size-1.5 rounded-full", i === phase.step ? "bg-fg" : "bg-fg/20")} />}
                    {label}
                  </li>
                ))}
              </ol>
              <Progress indeterminate />
            </Card>
          </FadeIn>
        )}

        {phase.kind === "mapping" && (
          <FadeIn>
            <Card>
              <CardHeader
                eyebrow="Step 1 of 2 · Mapping review"
                title={phase.draft.file_name}
                description={`Brookstone Park · ${SYSTEM_LABELS.yardi} export from Northgate Residential · ${mappings.length} lines. ${unsure ? `${unsure} ${unsure === 1 ? "line needs" : "lines need"} a look; the rest matched confidently.` : "Every line is mapped."}`}
                action={
                  <Button variant="primary" size="xs" onClick={() => setPhase({ kind: "statement", draft: phase.draft })}>
                    {unsure ? "Approve and continue" : "Continue"}
                  </Button>
                }
              />
              <MappingLines mappings={mappings} onChange={change} />
            </Card>
          </FadeIn>
        )}

        {phase.kind === "statement" && (
          <FadeIn>
            <StatementCard mappings={mappings} onDone={() => finish(phase.draft)} saving={saving} />
          </FadeIn>
        )}
      </PageBody>
    </>
  );
}

function StatementCard({ mappings, onDone, saving }: { mappings: AccountMapping[]; onDone: () => void; saving: boolean }) {
  const { data } = useData(() => getStandardStatement("prop_brookstone", undefined, mappings), [mappings.map((m) => m.target).join()]);
  if (!data) return <Skeleton className="h-96 rounded-lg" />;
  return (
    <Card>
      <CardHeader
        eyebrow="Step 2 of 2 · Standardized T12"
        title="Brookstone Park, 12 months through November 2026"
        description="Northgate's report in the standard chart of accounts. Totals tie to their statement. Select any line to see the lines it came from."
        action={
          <Button variant="primary" size="xs" loading={saving} onClick={onDone}>
            Add Brookstone Park
          </Button>
        }
      />
      <StandardStatementTable statement={data} />
    </Card>
  );
}
