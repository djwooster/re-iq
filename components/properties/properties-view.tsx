"use client";

import { ArrowUpRight, Building2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { UploadReportButton } from "@/components/data-sources/upload-button";
import { VarianceBars } from "@/components/charts/variance-bars";
import { AiSummary } from "@/components/insights/ai-summary";
import { useApp } from "@/components/shell/app-context";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/empty-state";
import { FadeIn } from "@/components/ui/motion";
import { Drawer } from "@/components/ui/overlay";
import { PeriodSelector } from "@/components/ui/period-selector";
import { PointsDelta, Variance } from "@/components/ui/metric";
import { Table, Td, Th, THead, Tr, useSort } from "@/components/ui/table";
import { formatDate, PERIODS } from "@/lib/dates";
import { getPropertySummary, isLagging, listProperties } from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import { formatCurrency, formatPercent, formatSignedPercent } from "@/lib/format";
import { DRIVER_LABELS, SOURCE_LABELS } from "@/lib/labels";
import type { Period, PropertyPerformance } from "@/lib/types";

export function SourceLabel({ perf }: { perf: PropertyPerformance }) {
  const s = perf.property.primary_source;
  return <span className="text-fg-2">{s.type === "upload" ? `Uploads · ${perf.property.property_manager.name.split(" ")[0]}` : `${SOURCE_LABELS[s.type]} connector`}</span>;
}

export function PropertiesView() {
  const { orgId } = useApp();
  const [period, setPeriod] = useState<Period>("qtd");
  const [selected, setSelected] = useState<string | null>(null);
  const { data } = useData(() => listProperties(orgId, period), [orgId, period]);
  const rows = data ?? [];
  const noiVar = (p: PropertyPerformance) => p.financials.noi.actual - p.financials.noi.budget;
  const { sorted, sort, onSort } = useSort(
    rows,
    {
      name: (p) => p.property.name,
      units: (p) => p.property.units,
      physical: (p) => p.occupancy.physical,
      economic: (p) => p.occupancy.economic,
      noi: (p) => p.financials.noi.actual,
      variance: noiVar,
      delinquency: (p) => p.occupancy.delinquency,
      source: (p) => p.property.primary_source.type,
      through: (p) => p.property.data_through,
    },
    { key: "variance", dir: "asc" },
  );
  const periodShort = PERIODS.find((p) => p.id === period)!.label;

  return (
    <>
      <PageHeader
        title="Properties"
        subtitle={data ? `${data.length} properties · ${data.reduce((s, p) => s + p.property.units, 0).toLocaleString("en-US")} units` : " "}
        actions={
          <>
            <PeriodSelector value={period} onChange={setPeriod} />
            <UploadReportButton />
          </>
        }
      />
      <PageBody>
        <FadeIn>
          <Card>
            {!data ? (
              <div className="flex flex-col gap-2 p-4">
                {Array.from({ length: 8 }, (_, i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </div>
            ) : data.length === 0 ? (
              <EmptyState
                icon={<Building2 className="size-3.5" strokeWidth={1.75} />}
                title="No properties yet"
                description="Upload a rent roll or T12 for any property and it appears here, whichever system its manager runs."
                action={<UploadReportButton />}
              />
            ) : (
              <Table>
                <THead>
                  <Th sortKey="name" sort={sort} onSort={onSort}>
                    Property
                  </Th>
                  <Th align="right" sortKey="units" sort={sort} onSort={onSort}>
                    Units
                  </Th>
                  <Th align="right" sortKey="physical" sort={sort} onSort={onSort}>
                    Physical occ.
                  </Th>
                  <Th align="right" sortKey="economic" sort={sort} onSort={onSort}>
                    Economic occ.
                  </Th>
                  <Th align="right" sortKey="noi" sort={sort} onSort={onSort}>
                    NOI {periodShort}
                  </Th>
                  <Th align="right" sortKey="variance" sort={sort} onSort={onSort}>
                    vs budget
                  </Th>
                  <Th align="right" sortKey="delinquency" sort={sort} onSort={onSort}>
                    Delinquency
                  </Th>
                  <Th sortKey="source" sort={sort} onSort={onSort} className="hidden lg:table-cell">
                    Data source
                  </Th>
                  <Th sortKey="through" sort={sort} onSort={onSort}>
                    Data through
                  </Th>
                </THead>
                <tbody>
                  {sorted.map((p) => {
                    const empty = p.financials.months.length === 0;
                    return (
                      <Tr key={p.property.id} onClick={() => setSelected(p.property.id)} selected={selected === p.property.id}>
                        <Td>
                          <div className="text-xs text-fg">{p.property.name}</div>
                          <div className="text-[11px] text-fg-3">
                            {p.property.market} · Class {p.property.class}
                          </div>
                        </Td>
                        <Td align="right" mono>
                          {p.property.units}
                        </Td>
                        <Td align="right">
                          <div className="num">{formatPercent(p.occupancy.physical)}</div>
                          <PointsDelta delta={p.occupancy.physical - p.occupancy.physical_budget} className="text-[10px]" />
                        </Td>
                        <Td align="right" mono>
                          {empty ? <span className="text-fg-3">—</span> : formatPercent(p.occupancy.economic)}
                        </Td>
                        <Td align="right" mono>
                          {empty ? <span className="text-fg-3">No data</span> : formatCurrency(p.financials.noi.actual)}
                        </Td>
                        <Td align="right">
                          {!empty && (
                            <>
                              <Variance value={noiVar(p)} />
                              <div className="num text-[10px] text-fg-3">{formatSignedPercent(noiVar(p) / p.financials.noi.budget)}</div>
                            </>
                          )}
                        </Td>
                        <Td align="right" mono>
                          {formatPercent(p.occupancy.delinquency)}
                        </Td>
                        <Td className="hidden lg:table-cell">
                          <SourceLabel perf={p} />
                        </Td>
                        <Td>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="num text-[11px] text-fg-2">{formatDate(p.property.data_through)}</span>
                            {isLagging(p.property) && <Badge tone="warning">Late</Badge>}
                          </span>
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card>
        </FadeIn>
      </PageBody>
      <PropertyDrawer perf={data?.find((p) => p.property.id === selected) ?? null} period={period} onClose={() => setSelected(null)} />
    </>
  );
}

function PropertyDrawer({ perf: current, period, onClose }: { perf: PropertyPerformance | null; period: Period; onClose: () => void }) {
  const [last, setLast] = useState(current);
  if (current && current !== last) setLast(current);
  const perf = current ?? last;
  const id = perf?.property.id;
  const { data: sentences } = useData(() => (id ? getPropertySummary(id, period) : Promise.resolve([])), [id, period]);
  const f = perf?.financials;

  return (
    <Drawer
      open={Boolean(current)}
      onClose={onClose}
      eyebrow={perf ? `${perf.property.market} · Class ${perf.property.class} · ${perf.property.units} units` : undefined}
      title={perf?.property.name ?? ""}
      footer={
        perf && (
          <Link
            href={`/app/properties/${perf.property.id}`}
            className="inline-flex items-center gap-1 rounded-md bg-inverted px-3 py-1.5 text-xs font-medium text-inverted-fg transition-opacity hover:opacity-90"
          >
            Open full page <ArrowUpRight className="size-3" />
          </Link>
        )
      }
    >
      {perf && f && (
        <div className="flex flex-col gap-4 p-4">
          <AiSummary sentences={sentences} dataThrough={perf.property.data_through} />
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border">
            {[
              { label: `NOI · ${PERIODS.find((p) => p.id === period)!.label}`, value: formatCurrency(f.noi.actual), sub: <Variance value={f.noi.actual - f.noi.budget} short /> },
              { label: "Physical occupancy", value: formatPercent(perf.occupancy.physical), sub: <PointsDelta delta={perf.occupancy.physical - perf.occupancy.physical_budget} /> },
              { label: "Economic occupancy", value: formatPercent(perf.occupancy.economic), sub: <PointsDelta delta={perf.occupancy.economic - perf.occupancy.economic_budget} /> },
              { label: "Delinquency", value: formatPercent(perf.occupancy.delinquency), sub: <span className="num text-fg-3">{formatCurrency(perf.occupancy.delinquent_balance)}</span> },
            ].map((m) => (
              <div key={m.label} className="bg-surface px-3 py-2.5">
                <dt className="eyebrow">{m.label}</dt>
                <dd className="num mt-1 text-sm text-fg">{m.value}</dd>
                <dd className="mt-0.5 text-[11px]">{m.sub}</dd>
              </div>
            ))}
          </dl>
          <section>
            <div className="eyebrow mb-1.5">Variance by driver</div>
            <VarianceBars compact rows={perf.drivers.map((d) => ({ id: d.driver, label: DRIVER_LABELS[d.driver], value: d.variance }))} />
          </section>
          <section className="flex items-center justify-between border-t border-border pt-3 text-[11px] text-fg-3">
            <span>
              {perf.property.property_manager.name} · <SourceLabel perf={perf} />
            </span>
            <span className="num">Through {formatDate(perf.property.data_through)}</span>
          </section>
        </div>
      )}
    </Drawer>
  );
}
