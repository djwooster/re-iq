"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChartLegend, TrendChart } from "@/components/charts/trend-chart";
import { IssueList } from "@/components/issues/issue-list";
import { useApp } from "@/components/shell/app-context";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/empty-state";
import { FadeIn } from "@/components/ui/motion";
import { PeriodSelector } from "@/components/ui/period-selector";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { LATEST_MONTH, formatDate } from "@/lib/dates";
import { getManagerDetail } from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import { formatPercent, formatSignedPercent } from "@/lib/format";
import { SYSTEM_LABELS } from "@/lib/labels";
import type { Period } from "@/lib/types";
import { ScoreCell } from "./score-cell";

export function ManagerView({ id }: { id: string }) {
  const { orgId } = useApp();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("qtd");
  const { data, loading } = useData(() => getManagerDetail(orgId, id, period), [orgId, id, period]);

  if (!data) {
    return (
      <>
        <PageHeader title="Manager" />
        <PageBody>{loading ? <Skeleton className="h-80 rounded-lg" /> : <Card><EmptyState title="Manager not found" /></Card>}</PageBody>
      </>
    );
  }
  const { score } = data;
  const m = score.measures;
  return (
    <>
      <PageHeader
        title={score.manager.name}
        subtitle={`${SYSTEM_LABELS[score.manager.system]} · ${score.manager.contact_name} · ${score.property_ids.length} properties, ${score.context.units.toLocaleString("en-US")} units`}
        actions={
          <>
            <Link href="/app/performance?tab=managers" className="flex items-center gap-1 text-[11px] text-fg-3 hover:text-fg">
              <ArrowLeft className="size-3" /> Scorecards
            </Link>
            <PeriodSelector value={period} onChange={setPeriod} />
          </>
        }
      />
      <PageBody>
        <div className="flex flex-col gap-3">
          <FadeIn>
            <Card className="grid grid-cols-2 gap-px overflow-hidden bg-border lg:grid-cols-4">
              {[
                ["NOI vs budget", <ScoreCell key="a" value={m.noi_vs_budget} text={formatSignedPercent(m.noi_vs_budget)} />],
                ["Controllable vs budget", <ScoreCell key="b" value={m.controllable_vs_budget} text={formatSignedPercent(m.controllable_vs_budget)} />],
                ["6-month trend", <ScoreCell key="c" value={m.trend} text={m.trend_label} />],
                ["Physical / economic", <span key="d" className="num text-fg">{formatPercent(m.physical)} / {formatPercent(m.economic)}</span>],
              ].map(([label, value]) => (
                <div key={label as string} className="bg-surface px-4 py-3">
                  <div className="eyebrow mb-1">{label}</div>
                  <div className="text-[15px]">{value}</div>
                </div>
              ))}
            </Card>
          </FadeIn>

          <FadeIn delay={0.05}>
            <Card>
              <CardHeader
                title="NOI vs budget by month"
                description="This manager's properties against the whole portfolio, trailing 12 months."
                action={<ChartLegend series={[{ key: "m", label: score.manager.name, style: "data" }, { key: "p", label: "Portfolio", style: "reference" }]} />}
              />
              <div className="px-2 pb-3">
                <TrendChart
                  data={data.trend}
                  series={[
                    { key: "manager", label: score.manager.name, style: "data" },
                    { key: "portfolio", label: "Portfolio", style: "reference" },
                  ]}
                  format={(v) => formatSignedPercent(v)}
                  height={200}
                />
              </div>
            </Card>
          </FadeIn>

          <FadeIn delay={0.08}>
            <Card>
              <CardHeader title="Properties" description="The same measures, property by property, with the context to read them." />
              <Table>
                <THead>
                  <Th>Property</Th>
                  <Th>Class · built</Th>
                  <Th>Market</Th>
                  <Th align="right">NOI vs budget</Th>
                  <Th align="right">Controllable</Th>
                  <Th align="right">Trend</Th>
                  <Th align="right">Physical</Th>
                  <Th align="right">Economic</Th>
                  <Th align="right">Delinquency</Th>
                  <Th align="right">Renewals</Th>
                  <Th align="right">Through</Th>
                </THead>
                <tbody>
                  {data.properties.map(({ property: p, measures: x }) => (
                    <Tr key={p.id} onClick={() => router.push(`/app/properties/${p.id}`)}>
                      <Td className="text-fg">{p.name}</Td>
                      <Td className="text-fg-3">
                        {p.class} · {p.year_built}
                      </Td>
                      <Td className="text-fg-3">{p.market}</Td>
                      <Td align="right">
                        <ScoreCell value={x.noi_vs_budget} text={formatSignedPercent(x.noi_vs_budget)} />
                      </Td>
                      <Td align="right">
                        <ScoreCell value={x.controllable_vs_budget} text={formatSignedPercent(x.controllable_vs_budget)} />
                      </Td>
                      <Td align="right">
                        <ScoreCell value={x.trend} text={x.trend_label} />
                      </Td>
                      <Td align="right" mono>
                        {formatPercent(x.physical)}
                      </Td>
                      <Td align="right" mono>
                        {formatPercent(x.economic)}
                      </Td>
                      <Td align="right" mono>
                        {formatPercent(x.delinquency)}
                      </Td>
                      <Td align="right" mono>
                        {formatPercent(x.renewal_rate, 0)}
                      </Td>
                      <Td align="right" mono className={p.data_through.startsWith(LATEST_MONTH) ? "text-fg-3" : "text-warning"}>
                        {formatDate(p.data_through)}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          </FadeIn>

          <FadeIn delay={0.11}>
            <Card>
              <CardHeader title="Issues at their properties" />
              <IssueList issues={data.issues} empty="No issues at this manager's properties." />
            </Card>
          </FadeIn>
        </div>
      </PageBody>
    </>
  );
}
