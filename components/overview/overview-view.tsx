"use client";

import { useState } from "react";
import { IssueList } from "@/components/issues/issue-list";
import { useApp } from "@/components/shell/app-context";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/empty-state";
import { FadeIn } from "@/components/ui/motion";
import { PeriodSelector } from "@/components/ui/period-selector";
import { LATEST_MONTH, formatDate, formatMonth } from "@/lib/dates";
import { getCloseSummary, getPortfolioSummary, listIssues } from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import { joinList } from "@/lib/format";
import type { IssueStatus, Period } from "@/lib/types";
import { CloseLine } from "./close-line";
import { LeadKpis } from "./lead-kpis";

type Filter = "all" | IssueStatus;

/** Jordan's home: where the close stands, how the portfolio is tracking, and every open issue by dollars. */
export function OverviewView() {
  const { orgId } = useApp();
  const [period, setPeriod] = useState<Period>("qtd");
  const [filter, setFilter] = useState<Filter>("all");

  const { data: summary } = useData(() => getPortfolioSummary(orgId, period), [orgId, period]);
  const { data } = useData(async () => {
    const [close, issues] = await Promise.all([getCloseSummary(orgId), listIssues(orgId)]);
    return { close, issues };
  }, [orgId]);

  const issues = data?.issues;
  const count = (s: IssueStatus) => issues?.filter((i) => i.status === s).length;
  const shown = issues?.filter((i) => filter === "all" || i.status === filter);
  const lagging = summary?.properties.filter((p) => summary.lagging_property_ids.includes(p.property.id)).map((p) => p.property) ?? [];

  return (
    <>
      <PageHeader title="Overview" subtitle={summary ? `${summary.period_label} · ${summary.properties.length} properties, ${summary.units.toLocaleString("en-US")} units` : " "} actions={<PeriodSelector value={period} onChange={setPeriod} />} />
      <PageBody>
        <div className="flex flex-col gap-3">
          <FadeIn>
            <CloseLine close={data?.close} />
          </FadeIn>

          <FadeIn delay={0.05}>
            {summary ? <LeadKpis summary={summary} /> : <Skeleton className="h-[86px] w-full rounded-lg" />}
            {lagging.length > 0 && (
              <p className="mt-1.5 px-1 text-[11px] text-warning">
                {joinList(lagging.map((p) => p.name))} through {formatDate(lagging[0].data_through)}; {formatMonth(LATEST_MONTH, "long").split(" ")[0]} reports not received. Budget covers the same months.
              </p>
            )}
          </FadeIn>

          <FadeIn delay={0.1}>
            <Card>
              <CardHeader title="Issues" description="Ranked by dollars against budget. Open one for the driver, trend, and source of every number." />
              <Tabs
                className="px-4"
                value={filter}
                onChange={setFilter}
                tabs={[
                  { id: "all", label: "All", count: issues?.length },
                  { id: "open", label: "Open", count: count("open") },
                  { id: "acting", label: "Acting", count: count("acting") },
                  { id: "resolved", label: "Resolved", count: count("resolved") },
                ]}
              />
              <div className="pt-3">
                <IssueList issues={shown} empty="Nothing with this status." />
              </div>
            </Card>
          </FadeIn>
        </div>
      </PageBody>
    </>
  );
}
