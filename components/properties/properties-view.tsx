"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/shell/app-context";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/empty-state";
import { Variance } from "@/components/ui/metric";
import { FadeIn } from "@/components/ui/motion";
import { PeriodSelector } from "@/components/ui/period-selector";
import { Table, Td, Th, THead, Tr, useSort } from "@/components/ui/table";
import { LATEST_MONTH, formatDate } from "@/lib/dates";
import { listFreshness, listIssues, listProperties } from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import { formatPercent, formatSignedPercent } from "@/lib/format";
import type { Period } from "@/lib/types";

/** Every property, how it's doing, and how current its numbers are. */
export function PropertiesView() {
  const { orgId } = useApp();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("qtd");
  const { data } = useData(async () => {
    const [rows, issues, fresh] = await Promise.all([listProperties(orgId, period), listIssues(orgId), listFreshness(orgId)]);
    return { rows, issues, fresh };
  }, [orgId, period]);

  const rows = data?.rows ?? [];
  const openIssues = (id: string) => data?.issues.filter((i) => i.status !== "resolved" && i.property_ids.includes(id)).length ?? 0;
  const { sorted, sort, onSort } = useSort(
    rows,
    {
      name: (r) => r.property.name,
      manager: (r) => r.property.property_manager.name,
      units: (r) => r.property.units,
      physical: (r) => r.occupancy.physical,
      economic: (r) => r.occupancy.economic,
      noi: (r) => r.financials.noi.actual / r.financials.noi.budget - 1,
      issues: (r) => openIssues(r.property.id),
    },
    { key: "noi", dir: "asc" },
  );
  const current = (date: string | null) => Boolean(date?.startsWith(LATEST_MONTH));

  return (
    <>
      <PageHeader title="Properties" subtitle={data ? `${rows.length} properties · ${rows.reduce((s, r) => s + r.property.units, 0).toLocaleString("en-US")} units` : " "} actions={<PeriodSelector value={period} onChange={setPeriod} />} />
      <PageBody>
        <FadeIn>
          {!data ? (
            <Skeleton className="h-96 rounded-lg" />
          ) : (
            <Card>
              <Table>
                <THead>
                  <Th sortKey="name" sort={sort} onSort={onSort}>
                    Property
                  </Th>
                  <Th sortKey="manager" sort={sort} onSort={onSort}>
                    Manager
                  </Th>
                  <Th align="right" sortKey="units" sort={sort} onSort={onSort}>
                    Units
                  </Th>
                  <Th>Class</Th>
                  <Th align="right" sortKey="physical" sort={sort} onSort={onSort}>
                    Physical
                  </Th>
                  <Th align="right" sortKey="economic" sort={sort} onSort={onSort}>
                    Economic
                  </Th>
                  <Th align="right" sortKey="noi" sort={sort} onSort={onSort}>
                    NOI vs budget
                  </Th>
                  <Th align="right" sortKey="issues" sort={sort} onSort={onSort}>
                    Open issues
                  </Th>
                  <Th>Data</Th>
                </THead>
                <tbody>
                  {sorted.map((r) => {
                    const f = data.fresh[r.property.id];
                    const v = r.financials.noi.actual - r.financials.noi.budget;
                    const n = openIssues(r.property.id);
                    return (
                      <Tr key={r.property.id} onClick={() => router.push(`/app/properties/${r.property.id}`)}>
                        <Td className="text-fg">
                          {r.property.name}
                          <span className="ml-1.5 text-[11px] text-fg-3">{r.property.city}, {r.property.state}</span>
                        </Td>
                        <Td className="text-fg-2">{r.property.property_manager.name}</Td>
                        <Td align="right" mono>
                          {r.property.units}
                        </Td>
                        <Td className="text-fg-2">{r.property.class}</Td>
                        <Td align="right" mono>
                          {formatPercent(r.occupancy.physical)}
                        </Td>
                        <Td align="right" mono>
                          {formatPercent(r.occupancy.economic)}
                        </Td>
                        <Td align="right">
                          <Variance value={v} short /> <span className="num ml-1 text-[11px] text-fg-3">{formatSignedPercent(v / r.financials.noi.budget)}</span>
                        </Td>
                        <Td align="right" mono className={n ? "text-fg" : "text-fg-3"}>
                          {n || "—"}
                        </Td>
                        <Td className="text-[11px]">
                          {current(f?.t12_through) && current(f?.ar_through) ? (
                            <span className="num text-fg-3">Through {formatDate(f.t12_through)}</span>
                          ) : (
                            <span className="num text-warning">
                              {!current(f?.t12_through) ? `Through ${formatDate(f.t12_through)}` : `AR through ${f?.ar_through ? formatDate(f.ar_through) : "—"}`}
                            </span>
                          )}
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card>
          )}
        </FadeIn>
      </PageBody>
    </>
  );
}
