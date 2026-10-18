"use client";

import { useState } from "react";
import { useOpenUpload, UploadReportButton } from "@/components/data-sources/upload-button";
import { AiSummary } from "@/components/insights/ai-summary";
import { InsightDrawer } from "@/components/insights/insight-drawer";
import { InsightList } from "@/components/insights/insight-list";
import { useApp } from "@/components/shell/app-context";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/empty-state";
import { FadeIn } from "@/components/ui/motion";
import { addMonths, formatDate, formatMonth, periodMonths } from "@/lib/dates";
import {
  estimatedCashFlow,
  getDataHealth,
  getExecutiveSummary,
  getManagerScorecard,
  getMarketExposure,
  getPortfolioSummary,
  getPortfolioTrend,
  listImports,
  listInsights,
} from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import { formatCurrencyShort, joinList } from "@/lib/format";
import type { Insight } from "@/lib/types";
import { DataHealthNote } from "./data-health-note";
import { HeadlineMetrics } from "./headline-metrics";
import { ManagerScorecardCard, MarketExposureCard, NoiTrendCard, VarianceBreakdownCard } from "./role-panels";

const SUBTITLE = {
  asset_manager: "How the portfolio is tracking against budget, and what needs you this week",
  owner: "Returns, cash flow, and how each property manager is performing",
  executive: "Portfolio rollup, trends, and where the firm is exposed",
};

export function OverviewView() {
  const { orgId, role } = useApp();
  const openUpload = useOpenUpload();
  const [selected, setSelected] = useState<Insight | null>(null);

  const { data } = useData(async () => {
    const [qtd, t12, insights, health, imports, summary, trend] = await Promise.all([
      getPortfolioSummary(orgId, "qtd"),
      getPortfolioSummary(orgId, "t12"),
      listInsights(orgId),
      getDataHealth(orgId),
      listImports(orgId),
      getExecutiveSummary(orgId, role),
      getPortfolioTrend(orgId, 12),
    ]);
    const [scores, markets] = await Promise.all([
      role === "owner" ? getManagerScorecard(orgId, "qtd") : Promise.resolve(null),
      role === "executive" ? getMarketExposure(orgId, "qtd") : Promise.resolve(null),
    ]);
    return { qtd, t12, insights, health, imports, summary, trend, scores, markets };
  }, [orgId, role]);

  const properties = data?.qtd.properties.map((p) => p.property);
  const issues = data?.insights.filter((i) => i.type === "issue");
  const opportunities = data?.insights.filter((i) => i.type === "opportunity");
  const priorMonth = addMonths(periodMonths("qtd")[0], -1);
  const prior = data?.trend.find((t) => t.month === priorMonth);
  const lagging = data?.summary.lagging ?? [];
  const names = Object.fromEntries((properties ?? []).map((p) => [p.id, p.name]));
  const oppTotal = opportunities?.reduce((s, i) => s + i.impact, 0) ?? 0;
  const issueLimit = role === "asset_manager" ? undefined : 3;

  return (
    <>
      <PageHeader title="Overview" subtitle={SUBTITLE[role]} actions={<UploadReportButton />} />
      <PageBody>
        <div className="flex flex-col gap-3">
          <FadeIn>
            <AiSummary
              sentences={data?.summary.sentences}
              dataThrough={data?.summary.data_through}
              freshnessNote={
                lagging.length
                  ? `${joinList(lagging.map((p) => p.short_name))} through ${formatDate(lagging[0].data_through)}; everything else through ${formatDate(data!.summary.data_through)}.`
                  : undefined
              }
            />
          </FadeIn>

          {data && properties && (
            <FadeIn delay={0.05}>
              <DataHealthNote issues={data.health} properties={properties} imports={data.imports} onUpload={openUpload} />
            </FadeIn>
          )}

          <FadeIn delay={0.08}>
            {data ? (
              <HeadlineMetrics
                role={role}
                qtd={data.qtd}
                t12={data.t12}
                cashFlow={estimatedCashFlow(data.qtd).cash_flow}
                priorDelinquency={prior?.delinquency ?? data.qtd.occupancy.delinquency}
                priorLabel={formatMonth(priorMonth, "tiny")}
              />
            ) : (
              <Skeleton className="h-[86px] w-full rounded-lg" />
            )}
          </FadeIn>

          <FadeIn delay={0.12} className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Needs attention"
                description={issues ? `${issues.length} issues ranked by dollars at stake against budget` : " "}
              />
              <InsightList insights={issues} properties={properties} onSelect={setSelected} loading={!data} limit={issueLimit} />
            </Card>
            <Card>
              <CardHeader
                title="Opportunities"
                description={opportunities ? `Estimated ${formatCurrencyShort(oppTotal)} a year in additional NOI` : " "}
              />
              <InsightList insights={opportunities} properties={properties} onSelect={setSelected} loading={!data} />
            </Card>
          </FadeIn>

          {data && (
            <FadeIn delay={0.16} className="flex flex-col gap-3">
              {role === "asset_manager" && <VarianceBreakdownCard summary={data.qtd} />}
              {role === "owner" && data.scores && <ManagerScorecardCard scores={data.scores} periodLabel={data.qtd.period_label} />}
              {role === "executive" && data.markets && (
                <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
                  <NoiTrendCard trend={data.trend} names={names} />
                  <MarketExposureCard markets={data.markets} totalUnits={data.qtd.units} periodLabel={data.qtd.period_label} />
                </div>
              )}
            </FadeIn>
          )}
        </div>
      </PageBody>
      <InsightDrawer insight={selected} property={properties?.find((p) => p.id === selected?.property_id)} onClose={() => setSelected(null)} />
    </>
  );
}
