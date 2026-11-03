"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import { EstimateTag } from "@/components/insights/evidence";
import { IssueStatusBadge } from "@/components/issues/issue-list";
import { useApp } from "@/components/shell/app-context";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/empty-state";
import { Variance } from "@/components/ui/metric";
import { FadeIn } from "@/components/ui/motion";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { formatDate } from "@/lib/dates";
import { REPORT_KINDS, getDecisions, getOwnerViewSettings, getPortfolioSummary, listIssues, sharedReports } from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import { formatCurrencyShort, formatPercent, formatSignedPercent } from "@/lib/format";
import { LeadKpis } from "./lead-kpis";

/** What the owner sees: portfolio health, results achieved, and the reports Jordan shared. Read-only. */
export function OwnerOverview() {
  const { orgId } = useApp();
  const { data } = useData(async () => {
    const [summary, decisions, issues] = await Promise.all([getPortfolioSummary(orgId, "qtd"), getDecisions(orgId), listIssues(orgId)]);
    return { summary, decisions, issues, settings: getOwnerViewSettings(), shared: sharedReports() };
  }, [orgId]);

  if (!data) {
    return (
      <>
        <PageHeader title="Portfolio" />
        <PageBody>
          <Skeleton className="h-80 rounded-lg" />
        </PageBody>
      </>
    );
  }
  const { summary, decisions, issues, settings, shared } = data;
  const inProgress = issues.filter((i) => i.status === "acting");
  const reports = REPORT_KINDS.filter((k) => shared[k.id]);

  return (
    <>
      <PageHeader title="Portfolio" subtitle={`Alder Peak Capital · ${summary.period_label}`} />
      <PageBody>
        <div className="flex flex-col gap-3">
          <FadeIn>
            <LeadKpis summary={summary} />
          </FadeIn>

          <FadeIn delay={0.05}>
            <Card>
              <CardHeader
                title="Results achieved"
                description={
                  <>
                    <span className="num text-favorable">+{formatCurrencyShort(decisions.results_this_year)}</span> NOI a year from issues resolved this year
                    <EstimateTag />
                  </>
                }
              />
              <ul className="border-t border-border">
                {decisions.resolved.map((i) => (
                  <li key={i.id} className="px-4 py-3">
                    <div className="text-xs text-fg">
                      {i.scope_label} · {i.headline}
                    </div>
                    {i.note && <p className="mt-0.5 text-[11px] text-fg-3">Decision: {i.note}</p>}
                    {i.result && (
                      <p className="mt-1 text-xs text-fg-2">
                        {i.result.sentence}
                        {i.result.is_estimate && <EstimateTag />}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          </FadeIn>

          {settings.show_in_progress && inProgress.length > 0 && (
            <FadeIn delay={0.08}>
              <Card>
                <CardHeader title="In progress" description="Issues Jordan is acting on now." />
                <ul className="border-t border-border">
                  {inProgress.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <span className="min-w-0">
                        <span className="block truncate text-xs text-fg">{i.headline}</span>
                        <span className="block text-[11px] text-fg-3">
                          {i.scope_label}
                          {i.note ? ` · ${i.note}` : ""}
                        </span>
                      </span>
                      <IssueStatusBadge status={i.status} />
                    </li>
                  ))}
                </ul>
              </Card>
            </FadeIn>
          )}

          {settings.show_properties && (
            <FadeIn delay={0.1}>
              <Card>
                <CardHeader title="Properties" description={summary.period_label} />
                <Table>
                  <THead>
                    <Th>Property</Th>
                    <Th align="right">NOI</Th>
                    <Th align="right">Vs budget</Th>
                    <Th align="right">%</Th>
                    <Th align="right">Occupancy</Th>
                  </THead>
                  <tbody>
                    {summary.properties.map((p) => (
                      <Tr key={p.property.id}>
                        <Td className="text-fg">{p.property.name}</Td>
                        <Td align="right" mono>
                          {formatCurrencyShort(p.financials.noi.actual)}
                        </Td>
                        <Td align="right">
                          <Variance value={p.financials.noi.actual - p.financials.noi.budget} short />
                        </Td>
                        <Td align="right" mono className="text-fg-3">
                          {formatSignedPercent(p.financials.noi.actual / p.financials.noi.budget - 1)}
                        </Td>
                        <Td align="right" mono>
                          {formatPercent(p.occupancy.physical)}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            </FadeIn>
          )}

          <FadeIn delay={0.12}>
            <Card>
              <CardHeader title="Reports shared with you" />
              {reports.length ? (
                <ul className="border-t border-border">
                  {reports.map((k) => (
                    <li key={k.id}>
                      <Link href={`/app/reports?type=${k.id}`} className="flex items-center gap-2 px-4 py-2.5 text-xs text-fg hover:bg-fg/[0.025]">
                        <FileText className="size-3.5 text-fg-3" strokeWidth={1.75} />
                        {k.label}
                        <span className="text-[11px] text-fg-3">
                          {k.period} · shared {formatDate(shared[k.id].slice(0, 10))}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 pb-4 text-xs text-fg-3">No reports shared yet.</p>
              )}
            </Card>
          </FadeIn>
        </div>
      </PageBody>
    </>
  );
}
