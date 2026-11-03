"use client";

import Link from "next/link";
import { EstimateTag } from "@/components/insights/evidence";
import { IssueStatusBadge } from "@/components/issues/issue-list";
import { useApp } from "@/components/shell/app-context";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/empty-state";
import { Variance } from "@/components/ui/metric";
import { FadeIn } from "@/components/ui/motion";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { actingEvent, getDecisions, type Issue } from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import { formatCurrencyShort } from "@/lib/format";
import { RESOLVE_REASON_LABELS } from "@/lib/labels";

/** What Jordan is acting on, and what came of what's resolved. Decisions are Jordan's; RE-IQ only records them. */
export function ActionsView() {
  const { orgId } = useApp();
  const { data } = useData(() => getDecisions(orgId), [orgId]);

  return (
    <>
      <PageHeader title="Actions" subtitle="Issues you're acting on, and the results of the ones you've resolved" />
      <PageBody>
        <div className="flex flex-col gap-3">
          <FadeIn>
            <Card className="flex flex-wrap items-baseline justify-between gap-3 px-4 py-4">
              <div>
                <div className="eyebrow">Results this year</div>
                {data ? (
                  <div className="mt-1 text-xl font-medium text-fg">
                    <span className="num text-favorable">+{formatCurrencyShort(data.results_this_year)}</span>
                    <span className="text-[13px] font-normal text-fg-3"> NOI a year from resolved issues</span>
                    <EstimateTag />
                  </div>
                ) : (
                  <Skeleton className="mt-1 h-6 w-48" />
                )}
              </div>
              {data && (
                <span className="text-[11px] text-fg-3">
                  {data.acting.length} acting · {data.resolved.length} resolved
                </span>
              )}
            </Card>
          </FadeIn>

          <FadeIn delay={0.05}>
            <Card>
              <CardHeader title="Acting" description="Moved to Acting, with the note you recorded." />
              {!data ? <Skeleton className="mx-4 mb-4 h-16" /> : data.acting.length ? <Rows issues={data.acting} kind="acting" /> : <p className="px-4 pb-4 text-xs text-fg-3">Nothing in Acting. Move an issue to Acting from its page.</p>}
            </Card>
          </FadeIn>

          <FadeIn delay={0.08}>
            <Card>
              <CardHeader title="Resolved" description="What was decided, and what it earned." />
              {!data ? <Skeleton className="mx-4 mb-4 h-16" /> : data.resolved.length ? <Rows issues={data.resolved} kind="resolved" /> : <p className="px-4 pb-4 text-xs text-fg-3">Nothing resolved yet.</p>}
            </Card>
          </FadeIn>
        </div>
      </PageBody>
    </>
  );
}

function Rows({ issues, kind }: { issues: Issue[]; kind: "acting" | "resolved" }) {
  return (
    <ul className="border-t border-border">
      {issues.map((i, n) => {
        const acted = actingEvent(i);
        return (
          <li key={i.id} className={cn(n > 0 && "border-t border-border/70")}>
            <Link href={`/app/issues/${i.id}`} className="grid gap-3 px-4 py-3 transition-colors hover:bg-fg/[0.025] md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_120px]">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <IssueStatusBadge status={i.status} />
                  <span className="truncate text-xs text-fg">{i.headline}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-fg-3">{i.scope_label}</div>
              </div>
              <div className="min-w-0 text-xs">
                {i.note ? <p className="text-fg-2">&ldquo;{i.note}&rdquo;</p> : <p className="text-fg-3">No decision note</p>}
                <p className="mt-0.5 text-[11px] text-fg-3">
                  {acted ? `Acting since ${formatDate(acted.at, true)}` : null}
                  {kind === "resolved" && ` · Resolved ${formatDate(i.status_at, true)}${i.reason ? `, ${RESOLVE_REASON_LABELS[i.reason].toLowerCase()}` : ""}`}
                </p>
                {kind === "resolved" && i.result && (
                  <p className="mt-1 text-fg">
                    {i.result.sentence}
                    {i.result.is_estimate && <EstimateTag />}
                  </p>
                )}
              </div>
              <div className="text-right">
                {kind === "resolved" && i.result ? (
                  <>
                    <div className="num text-xs text-favorable">+{formatCurrencyShort(i.result.annual)}/yr</div>
                    <div className="text-[10px] text-fg-3">Outcome</div>
                  </>
                ) : (
                  <>
                    <Variance value={i.impact} short className="text-xs" />
                    <div className="text-[10px] text-fg-3">{i.window_label}</div>
                  </>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
