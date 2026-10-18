"use client";

import { Building2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ChartLegend, TrendChart, type SeriesDef } from "@/components/charts/trend-chart";
import { VarianceBars } from "@/components/charts/variance-bars";
import { ImportStatusBadge } from "@/components/data-sources/import-history";
import { UploadReportButton } from "@/components/data-sources/upload-button";
import { AiSummary } from "@/components/insights/ai-summary";
import { InsightDrawer } from "@/components/insights/insight-drawer";
import { InsightList } from "@/components/insights/insight-list";
import { useApp } from "@/components/shell/app-context";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/controls";
import { EmptyState, Skeleton } from "@/components/ui/empty-state";
import { Metric, PointsDelta, Variance } from "@/components/ui/metric";
import { FadeIn } from "@/components/ui/motion";
import { PeriodSelector } from "@/components/ui/period-selector";
import { Table, Td, Th, THead, Tr, useSort } from "@/components/ui/table";
import { formatDate, formatDateTime, PERIODS } from "@/lib/dates";
import {
  BELOW_MARKET_THRESHOLD,
  describePeriod,
  getBelowMarketUnits,
  getPropertyPerformance,
  getPropertySources,
  getPropertySummary,
  getPropertyTrend,
  getTopVendors,
  getUpcomingRenewals,
  getWorkOrders,
  listInsights,
  listMembers,
  RENEWAL_CAPTURE,
  RENEWAL_WINDOW_DAYS,
  type RentRollUnit,
} from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import { formatCurrency, formatCurrencyShort, formatPercent } from "@/lib/format";
import { DRIVER_LABELS, REPORT_TYPE_SHORT, SOURCE_LABELS } from "@/lib/labels";
import type { Insight, Period, WorkOrder } from "@/lib/types";

type Tab = "overview" | "leasing" | "vendors" | "work_orders" | "sources";

const NOI_SERIES: SeriesDef[] = [
  { key: "noi", label: "NOI, actual", style: "data" },
  { key: "noi_budget", label: "NOI, budget", style: "reference" },
];
const OCC_SERIES: SeriesDef[] = [
  { key: "physical", label: "Physical", style: "data" },
  { key: "economic", label: "Economic", style: "data-secondary" },
  { key: "physical_budget", label: "Physical, budget", style: "reference" },
];

export function PropertyDetailView({ id }: { id: string }) {
  const { orgId } = useApp();
  const [period, setPeriod] = useState<Period>("qtd");
  const [tab, setTab] = useState<Tab>("overview");
  const [selected, setSelected] = useState<Insight | null>(null);

  const { data, loading } = useData(async () => {
    const [perf, trend, summary, insights, below, renewals, vendors, workOrders, sources, members] = await Promise.all([
      getPropertyPerformance(id, period),
      getPropertyTrend(id, 12),
      getPropertySummary(id, period),
      listInsights(orgId, { propertyId: id }),
      getBelowMarketUnits(id),
      getUpcomingRenewals(id),
      getTopVendors(id),
      getWorkOrders(id),
      getPropertySources(id),
      listMembers(orgId),
    ]);
    return { perf, trend, summary, insights, below, renewals, vendors, workOrders, sources, members };
  }, [id, period, orgId]);

  if (!loading && data && !data.perf) {
    return (
      <>
        <PageHeader title="Property not found" />
        <PageBody>
          <Card>
            <EmptyState
              icon={<Building2 className="size-3.5" strokeWidth={1.75} />}
              title="We couldn't find that property"
              description="It may have been removed, or the link is out of date."
              action={
                <Link href="/app/properties" className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg hover:border-border-strong">
                  All properties
                </Link>
              }
            />
          </Card>
        </PageBody>
      </>
    );
  }

  const perf = data?.perf;
  const p = perf?.property;
  const f = perf?.financials;
  const periodShort = PERIODS.find((x) => x.id === period)!.label;

  return (
    <>
      <PageHeader
        title={p?.name ?? " "}
        subtitle={
          p ? (
            <>
              <Link href="/app/properties" className="hover:text-fg-2">
                Properties
              </Link>{" "}
              · {p.city}, {p.state} · Class {p.class} · {p.units} units · built {p.year_built} · {p.property_manager.name}
            </>
          ) : (
            " "
          )
        }
        actions={
          <>
            <PeriodSelector value={period} onChange={setPeriod} />
            <UploadReportButton variant="secondary" />
          </>
        }
      />
      <PageBody>
        {!data || !perf || !p || !f ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-28 w-full rounded-lg" />
            <Skeleton className="h-[86px] w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { id: "overview", label: "Overview" },
                { id: "leasing", label: "Renewals & rents", count: data.renewals.length },
                { id: "vendors", label: "Vendors" },
                { id: "work_orders", label: "Work orders", count: data.workOrders.length },
                { id: "sources", label: "Sources", count: data.sources?.imports.length },
              ]}
            />

            {tab === "overview" && (
              <div className="flex flex-col gap-3">
                <FadeIn>
                  <AiSummary sentences={data.summary} dataThrough={p.data_through} />
                </FadeIn>
                <FadeIn delay={0.05}>
                  <Card className="grid grid-cols-2 lg:grid-cols-4">
                    <Metric
                      label={`NOI · ${periodShort}`}
                      value={f.noi.actual}
                      format={formatCurrencyShort}
                      sub={
                        <>
                          <Variance value={f.noi.actual - f.noi.budget} short /> vs {formatCurrencyShort(f.noi.budget)}
                        </>
                      }
                    />
                    <Metric
                      className="border-l border-border"
                      label="Physical occupancy"
                      value={perf.occupancy.physical}
                      format={(v) => formatPercent(v)}
                      sub={
                        <>
                          <PointsDelta delta={perf.occupancy.physical - perf.occupancy.physical_budget} /> vs {formatPercent(perf.occupancy.physical_budget)}
                        </>
                      }
                    />
                    <Metric
                      className="border-t border-border lg:border-t-0 lg:border-l"
                      label={`Economic occupancy · ${periodShort}`}
                      value={perf.occupancy.economic}
                      format={(v) => formatPercent(v)}
                      sub={
                        <>
                          <PointsDelta delta={perf.occupancy.economic - perf.occupancy.economic_budget} /> vs {formatPercent(perf.occupancy.economic_budget)}
                        </>
                      }
                    />
                    <Metric
                      className="border-t border-l border-border lg:border-t-0"
                      label="Delinquency"
                      value={perf.occupancy.delinquency}
                      format={(v) => formatPercent(v)}
                      sub={<span className="num">{formatCurrency(perf.occupancy.delinquent_balance)} past due</span>}
                    />
                  </Card>
                </FadeIn>
                <FadeIn delay={0.1} className="grid gap-3 lg:grid-cols-2">
                  <Card>
                    <CardHeader eyebrow="Last 12 months" title="NOI" action={<ChartLegend series={NOI_SERIES} />} />
                    <div className="px-2 pb-2">
                      <TrendChart data={data.trend} series={NOI_SERIES} format={formatCurrency} axisFormat={formatCurrencyShort} />
                    </div>
                  </Card>
                  <Card>
                    <CardHeader eyebrow="Last 12 months" title="Occupancy" action={<ChartLegend series={OCC_SERIES} />} />
                    <div className="px-2 pb-2">
                      <TrendChart data={data.trend} series={OCC_SERIES} format={(v) => formatPercent(v)} axisFormat={(v) => formatPercent(v, 0)} />
                    </div>
                  </Card>
                </FadeIn>
                <FadeIn delay={0.14} className="grid gap-3 lg:grid-cols-2">
                  <Card>
                    <CardHeader title="Variance by driver" description={`NOI impact against budget · ${periodShort}`} />
                    <div className="px-3 pb-4">
                      <VarianceBars rows={perf.drivers.map((d) => ({ id: d.driver, label: DRIVER_LABELS[d.driver], value: d.variance }))} />
                    </div>
                  </Card>
                  <Card>
                    <CardHeader title="Issues and opportunities" description={data.insights.length ? `${data.insights.length} for this property` : "Nothing flagged for this property"} />
                    {data.insights.length ? (
                      <InsightList insights={data.insights} properties={[p]} onSelect={setSelected} />
                    ) : (
                      <p className="px-4 pb-4 text-xs text-fg-3">Performance is within normal range of budget on every driver.</p>
                    )}
                  </Card>
                </FadeIn>
              </div>
            )}

            {tab === "leasing" && <LeasingTab below={data.below} renewals={data.renewals} />}

            {tab === "vendors" && (
              <FadeIn>
                <Card>
                  <CardHeader title="Top vendors by spend" description="Trailing 12 months, allocated from the general ledger" />
                  <Table>
                    <THead>
                      <Th>Vendor</Th>
                      <Th>Category</Th>
                      <Th align="right">Spend, T12</Th>
                      <Th align="right">Per unit</Th>
                      <Th align="right">Benchmark</Th>
                    </THead>
                    <tbody>
                      {data.vendors.map((v) => {
                        const over = v.benchmark_per_unit ? v.per_unit / v.benchmark_per_unit - 1 : null;
                        return (
                          <Tr key={v.vendor.id}>
                            <Td className="text-fg">{v.vendor.name}</Td>
                            <Td className="text-fg-2">{v.vendor.category}</Td>
                            <Td align="right" mono>
                              {formatCurrency(v.spend_t12)}
                            </Td>
                            <Td align="right" mono>
                              {formatCurrency(v.per_unit)}
                            </Td>
                            <Td align="right">
                              {v.benchmark_per_unit ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="num text-fg-3">{formatCurrency(v.benchmark_per_unit)}</span>
                                  {over !== null && over > 0.1 && <Badge tone="warning">{formatPercent(over, 0)} over</Badge>}
                                </span>
                              ) : (
                                <span className="text-fg-3">—</span>
                              )}
                            </Td>
                          </Tr>
                        );
                      })}
                    </tbody>
                  </Table>
                  <CardFooter>Benchmarks are market medians per unit per year for comparable properties. Estimates.</CardFooter>
                </Card>
              </FadeIn>
            )}

            {tab === "work_orders" && <WorkOrdersTab workOrders={data.workOrders} />}

            {tab === "sources" && data.sources && (
              <FadeIn className="flex flex-col gap-3">
                <Card className="p-4 text-xs">
                  <div className="eyebrow mb-1.5">Primary source</div>
                  {p.primary_source.type === "upload" ? (
                    <p className="text-fg-2">
                      Monthly reports uploaded from {p.property_manager.name}&apos;s {SOURCE_LABELS[p.property_manager.system]} exports. Data through{" "}
                      <span className="num text-fg">{formatDate(p.data_through, true)}</span>, set by the latest processed T12.
                    </p>
                  ) : (
                    <p className="text-fg-2">
                      {p.primary_source.name}. Last sync <span className="num text-fg">{formatDateTime(p.primary_source.last_sync_at!)}</span>; data through{" "}
                      <span className="num text-fg">{formatDate(p.data_through, true)}</span>.
                    </p>
                  )}
                </Card>
                <Card>
                  <CardHeader title="Reports behind these numbers" />
                  {data.sources.imports.length === 0 ? (
                    <EmptyState title="No uploads for this property" description="Its numbers come from the connector. You can still upload reports to fill gaps." />
                  ) : (
                    <Table>
                      <THead>
                        <Th>File</Th>
                        <Th>Type</Th>
                        <Th>Period</Th>
                        <Th>Uploaded</Th>
                        <Th>Status</Th>
                      </THead>
                      <tbody>
                        {data.sources.imports.map((i) => (
                          <Tr key={i.id}>
                            <Td className="max-w-[340px]">
                              <Link href={`/app/data-sources?import=${i.id}`} className="num block truncate text-[11px] text-fg hover:underline">
                                {i.file_name}
                              </Link>
                            </Td>
                            <Td className="text-fg-2">{REPORT_TYPE_SHORT[i.report_type]}</Td>
                            <Td mono className="text-[11px] text-fg-2">
                              {describePeriod(i.report_type, i.period)}
                            </Td>
                            <Td className="text-[11px] text-fg-3">
                              <span className="num">{formatDateTime(i.uploaded_at)}</span> · {data.members.find((m) => m.id === i.uploaded_by)?.name}
                            </Td>
                            <Td>
                              <ImportStatusBadge status={i.status} />
                            </Td>
                          </Tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card>
              </FadeIn>
            )}
          </div>
        )}
      </PageBody>
      <InsightDrawer insight={selected} property={p} onClose={() => setSelected(null)} />
    </>
  );
}

function LeasingTab({ below, renewals }: { below: RentRollUnit[]; renewals: RentRollUnit[] }) {
  const belowRenewing = renewals.filter((r) => r.gap_pct >= BELOW_MARKET_THRESHOLD);
  const uplift = belowRenewing.reduce((s, r) => s + r.gap * 12 * RENEWAL_CAPTURE, 0);
  const { sorted, sort, onSort } = useSort(
    renewals,
    {
      unit: (r) => r.unit.unit_number,
      plan: (r) => r.unit.floorplan,
      end: (r) => r.lease?.end_date ?? "",
      rent: (r) => r.lease?.rent ?? 0,
      market: (r) => r.unit.market_rent,
      gap: (r) => r.gap_pct,
    },
    { key: "end", dir: "asc" },
  );
  return (
    <FadeIn className="flex flex-col gap-3">
      <Card className="grid grid-cols-2 lg:grid-cols-4">
        <Metric label={`Expiring in ${RENEWAL_WINDOW_DAYS} days`} value={renewals.length} format={(v) => Math.round(v).toString()} sub="Current leases" />
        <Metric className="border-l border-border" label="Of those, below market" value={belowRenewing.length} format={(v) => Math.round(v).toString()} sub={`${formatPercent(BELOW_MARKET_THRESHOLD, 0)} or more under market rent`} />
        <Metric
          className="border-t border-border lg:border-t-0 lg:border-l"
          label="Renewal upside"
          value={uplift}
          format={formatCurrencyShort}
          sub={`Estimate · ${formatPercent(RENEWAL_CAPTURE, 0)} of gap, annualized`}
        />
        <Metric className="border-t border-l border-border lg:border-t-0" label="All below-market leases" value={below.length} format={(v) => Math.round(v).toString()} sub="Across the rent roll" />
      </Card>
      <Card>
        <CardHeader title="Upcoming renewals" description="Lease-level only. Resident details are not stored." />
        {renewals.length === 0 ? (
          <EmptyState title="No leases expire in the next 90 days" />
        ) : (
          <Table>
            <THead>
              <Th sortKey="unit" sort={sort} onSort={onSort}>
                Unit
              </Th>
              <Th sortKey="plan" sort={sort} onSort={onSort}>
                Floorplan
              </Th>
              <Th sortKey="end" sort={sort} onSort={onSort}>
                Lease ends
              </Th>
              <Th align="right" sortKey="rent" sort={sort} onSort={onSort}>
                Lease rent
              </Th>
              <Th align="right" sortKey="market" sort={sort} onSort={onSort}>
                Market rent
              </Th>
              <Th align="right" sortKey="gap" sort={sort} onSort={onSort}>
                Gap
              </Th>
            </THead>
            <tbody>
              {sorted.map((r) => (
                <Tr key={r.unit.id}>
                  <Td mono>{r.unit.unit_number}</Td>
                  <Td className="text-fg-2">{r.unit.floorplan}</Td>
                  <Td>
                    <span className="num text-fg-2">{formatDate(r.lease!.end_date, true)}</span>
                    {r.lease!.status === "notice" && (
                      <Badge tone="muted" className="ml-2">
                        Notice given
                      </Badge>
                    )}
                  </Td>
                  <Td align="right" mono>
                    {formatCurrency(r.lease!.rent)}
                  </Td>
                  <Td align="right" mono className="text-fg-2">
                    {formatCurrency(r.unit.market_rent)}
                  </Td>
                  <Td align="right" mono className={r.gap_pct >= BELOW_MARKET_THRESHOLD ? "text-warning" : "text-fg-3"}>
                    {r.gap > 0 ? `${formatCurrency(r.gap)} · ${formatPercent(r.gap_pct)}` : "At market"}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </FadeIn>
  );
}

const WO_LABELS: Record<WorkOrder["category"], string> = {
  hvac: "HVAC",
  plumbing: "Plumbing",
  electrical: "Electrical",
  appliance: "Appliance",
  make_ready: "Make-ready",
  grounds: "Grounds",
  pest: "Pest",
  general: "General",
};

const WO_STATUS: Record<WorkOrder["status"], string> = { open: "Open", in_progress: "In progress", on_hold: "On hold", completed: "Completed" };

function WorkOrdersTab({ workOrders }: { workOrders: WorkOrder[] }) {
  const { sorted, sort, onSort } = useSort(
    workOrders,
    {
      number: (w) => w.number,
      unit: (w) => w.unit_number ?? "",
      category: (w) => WO_LABELS[w.category],
      opened: (w) => w.opened_at,
      priority: (w) => ["low", "normal", "high", "emergency"].indexOf(w.priority),
      status: (w) => w.status,
    },
    { key: "opened", dir: "desc" },
  );
  const counts = Object.entries(
    workOrders.reduce<Record<string, number>>((acc, w) => ((acc[WO_LABELS[w.category]] = (acc[WO_LABELS[w.category]] ?? 0) + 1), acc), {}),
  ).sort((a, b) => b[1] - a[1]);
  return (
    <FadeIn>
      <Card>
        <CardHeader
          title="Open work orders"
          description={counts.length ? counts.slice(0, 4).map(([k, v]) => `${v} ${k}`).join(" · ") : "None open"}
        />
        {workOrders.length === 0 ? (
          <EmptyState title="No open work orders" />
        ) : (
          <Table>
            <THead>
              <Th sortKey="number" sort={sort} onSort={onSort}>
                Number
              </Th>
              <Th sortKey="unit" sort={sort} onSort={onSort}>
                Unit
              </Th>
              <Th sortKey="category" sort={sort} onSort={onSort}>
                Category
              </Th>
              <Th>Description</Th>
              <Th sortKey="priority" sort={sort} onSort={onSort}>
                Priority
              </Th>
              <Th sortKey="opened" sort={sort} onSort={onSort}>
                Opened
              </Th>
              <Th sortKey="status" sort={sort} onSort={onSort}>
                Status
              </Th>
            </THead>
            <tbody>
              {sorted.map((w) => (
                <Tr key={w.id}>
                  <Td mono className="text-[11px] text-fg-2">
                    {w.number}
                  </Td>
                  <Td mono>{w.unit_number ?? <span className="text-fg-3">Common</span>}</Td>
                  <Td className="text-fg-2">{WO_LABELS[w.category]}</Td>
                  <Td className="max-w-[280px] truncate">
                    {w.description}
                    {w.repeat && (
                      <Badge tone="warning" className="ml-2">
                        Repeat
                      </Badge>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={w.priority === "emergency" ? "unfavorable" : w.priority === "high" ? "warning" : "muted"}>{w.priority}</Badge>
                  </Td>
                  <Td mono className="text-[11px] text-fg-2">
                    {formatDate(w.opened_at)}
                  </Td>
                  <Td className="text-fg-2">{WO_STATUS[w.status]}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </FadeIn>
  );
}
