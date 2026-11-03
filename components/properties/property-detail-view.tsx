"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { StandardStatementTable } from "@/components/financials/standard-statement";
import { IssueList } from "@/components/issues/issue-list";
import { useApp } from "@/components/shell/app-context";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { useOpenSource } from "@/components/sources/source-drawer";
import { Card, CardHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/controls";
import { EmptyState, Skeleton } from "@/components/ui/empty-state";
import { Metric, PointsDelta, Variance } from "@/components/ui/metric";
import { FadeIn } from "@/components/ui/motion";
import { PeriodSelector } from "@/components/ui/period-selector";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { LATEST_MONTH, PERIODS, formatDate, monthOf } from "@/lib/dates";
import {
  EXPIRY_WINDOW_DAYS,
  getDelinquency,
  getMaintenance,
  getPropertyPerformance,
  getRentRoll,
  getStandardStatement,
  isBelowMarketExpiring,
  listIssues,
  listLoans,
  REPEAT_CALLS,
} from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import { formatCurrency, formatCurrencyShort, formatPercent, formatSignedPercent } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/labels";
import type { GlCategory, Period } from "@/lib/types";

type Tab = "financials" | "rent-roll" | "delinquency" | "maintenance";

export function PropertyDetailView({ id }: { id: string }) {
  const { orgId } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = (params.get("tab") as Tab) ?? "financials";
  const [period, setPeriod] = useState<Period>("qtd");
  const { data, loading } = useData(async () => {
    const [perf, issues, loans] = await Promise.all([getPropertyPerformance(id, period), listIssues(orgId), listLoans(orgId)]);
    return { perf, issues: issues.filter((i) => i.property_ids.includes(id)), loan: loans.find((l) => l.property.id === id) ?? null };
  }, [id, orgId, period]);

  if (!data?.perf) {
    return (
      <>
        <PageHeader title="Property" />
        <PageBody>{loading ? <Skeleton className="h-80 rounded-lg" /> : <Card><EmptyState title="Property not found" /></Card>}</PageBody>
      </>
    );
  }
  const { perf, issues, loan } = data;
  const p = perf.property;
  const f = perf.financials;
  const o = perf.occupancy;
  const label = PERIODS.find((x) => x.id === period)!.label;
  const stale = !p.data_through.startsWith(LATEST_MONTH);

  return (
    <>
      <PageHeader
        title={p.name}
        subtitle={`${p.city}, ${p.state} · ${p.property_manager.name} · Class ${p.class}, built ${p.year_built} · ${p.units} units`}
        actions={
          <>
            <Link href="/app/properties" className="flex items-center gap-1 text-[11px] text-fg-3 hover:text-fg">
              <ArrowLeft className="size-3" /> Properties
            </Link>
            <PeriodSelector value={period} onChange={setPeriod} />
          </>
        }
      />
      <PageBody>
        <div className="flex flex-col gap-3">
          {stale && <p className="text-[11px] text-warning">Data through {formatDate(p.data_through, true)}. The latest reports from {p.property_manager.name} haven&apos;t arrived.</p>}
          <FadeIn>
            <Card className="grid grid-cols-2 lg:grid-cols-4">
              <Metric label={`NOI vs budget · ${label}`} value={f.noi.actual - f.noi.budget} format={(v) => (v > 0 ? `+${formatCurrencyShort(v)}` : formatCurrencyShort(v))} sub={`${formatSignedPercent((f.noi.actual - f.noi.budget) / f.noi.budget)} · ${formatCurrencyShort(f.noi.actual)} actual`} />
              <Metric className="border-l border-border" label="Physical occupancy" value={o.physical} format={(v) => formatPercent(v)} sub={<><PointsDelta delta={o.physical - o.physical_budget} /> vs budget</>} />
              <Metric className="border-t border-border lg:border-t-0 lg:border-l" label={`Economic occupancy · ${label}`} value={o.economic} format={(v) => formatPercent(v)} sub={<><PointsDelta delta={o.economic - o.economic_budget} /> vs budget</>} />
              {loan && (
                <Metric
                  className="border-t border-l border-border lg:border-t-0"
                  label="DSCR · T12"
                  value={loan.dscr}
                  format={(v) => `${v.toFixed(2)}x`}
                  sub={
                    <span className={loan.headroom < 0 ? "text-unfavorable" : undefined}>
                      {loan.covenant.toFixed(2)}x covenant · {loan.headroom >= 0 ? "+" : ""}
                      {loan.headroom.toFixed(2)}x · {loan.lender}
                    </span>
                  }
                />
              )}
            </Card>
          </FadeIn>

          {issues.length > 0 && (
            <FadeIn delay={0.04}>
              <Card>
                <CardHeader title="Issues" />
                <IssueList issues={issues} />
              </Card>
            </FadeIn>
          )}

          <Tabs
            className="mt-2"
            value={tab}
            onChange={(t) => router.replace(t === "financials" ? pathname : `${pathname}?tab=${t}`, { scroll: false })}
            tabs={[
              { id: "financials", label: "Financials" },
              { id: "rent-roll", label: "Rent roll & renewals" },
              { id: "delinquency", label: "Delinquency" },
              { id: "maintenance", label: "Maintenance & capex" },
            ]}
          />
          <FadeIn key={tab}>
            {tab === "financials" && <Financials id={p.id} through={monthOf(p.data_through)} period={period} />}
            {tab === "rent-roll" && <RentRoll id={p.id} />}
            {tab === "delinquency" && <DelinquencyTab id={p.id} />}
            {tab === "maintenance" && <MaintenanceTab id={p.id} />}
          </FadeIn>
        </div>
      </PageBody>
    </>
  );
}

function Financials({ id, through, period }: { id: string; through: string; period: Period }) {
  const open = useOpenSource();
  const { data } = useData(async () => {
    const [statement, perf] = await Promise.all([getStandardStatement(id, through), getPropertyPerformance(id, period)]);
    return { statement, perf };
  }, [id, through, period]);
  if (!data?.perf) return <Skeleton className="h-96 rounded-lg" />;
  const f = data.perf.financials;
  const source = (category: GlCategory) => open({ kind: "t12", property_id: id, category });
  const rows = [...data.statement.revenue, ...data.statement.expenses].map((r) => r.category);
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader title="Budget vs actual" description={`${PERIODS.find((x) => x.id === period)!.long}. Select a line to open it in the manager's report.`} />
        <Table>
          <THead>
            <Th>Account</Th>
            <Th align="right">Actual</Th>
            <Th align="right">Budget</Th>
            <Th align="right">Vs budget</Th>
          </THead>
          <tbody>
            {rows.map((c) => {
              const { actual, budget } = f.byCategory[c];
              const revenue = data.statement.revenue.some((r) => r.category === c);
              return (
                <Tr key={c} onClick={() => source(c)}>
                  <Td className="text-fg-2">{CATEGORY_LABELS[c]}</Td>
                  <Td align="right" mono>
                    {formatCurrency(actual)}
                  </Td>
                  <Td align="right" mono className="text-fg-3">
                    {formatCurrency(budget)}
                  </Td>
                  <Td align="right">
                    <Variance value={revenue ? actual - budget : budget - actual} />
                  </Td>
                </Tr>
              );
            })}
            <Tr>
              <Td className="font-medium text-fg">Net operating income</Td>
              <Td align="right" mono className="font-medium">
                {formatCurrency(f.noi.actual)}
              </Td>
              <Td align="right" mono className="text-fg-3">
                {formatCurrency(f.noi.budget)}
              </Td>
              <Td align="right">
                <Variance value={f.noi.actual - f.noi.budget} className="font-medium" />
              </Td>
            </Tr>
          </tbody>
        </Table>
      </Card>
      <Card>
        <CardHeader title="Standardized T12" description="The manager's T12 in the standard chart of accounts. Expand a line for the lines behind it." />
        <StandardStatementTable statement={data.statement} onSource={source} />
      </Card>
    </div>
  );
}

function RentRoll({ id }: { id: string }) {
  const [filter, setFilter] = useState(false);
  const [all, setAll] = useState(false);
  const { data } = useData(() => getRentRoll(id), [id]);
  if (!data) return <Skeleton className="h-96 rounded-lg" />;
  const target = data.filter(isBelowMarketExpiring);
  const rows = [...(filter ? target : data)].sort((a, b) => (a.unit.unit_number < b.unit.unit_number ? -1 : 1));
  const shown = all ? rows : rows.slice(0, 60);
  const leased = data.filter((r) => r.lease);
  const gapAll = leased.reduce((s, r) => s + Math.max(0, r.gap), 0);
  return (
    <div className="flex flex-col gap-3">
      <Card className="grid grid-cols-2 gap-px overflow-hidden bg-border lg:grid-cols-4">
        {[
          ["Leased units", `${leased.length} of ${data.length}`],
          ["Average rent / market", `${formatCurrency(leased.reduce((s, r) => s + r.lease!.rent, 0) / leased.length)} / ${formatCurrency(data.reduce((s, r) => s + r.unit.market_rent, 0) / data.length)}`],
          ["Gap to market, all leases", `${formatCurrency(gapAll)}/mo`],
          [`Below market, expiring in ${EXPIRY_WINDOW_DAYS} days`, `${target.length} · ${formatCurrency(target.reduce((s, r) => s + r.gap, 0))}/mo`],
        ].map(([k, v]) => (
          <div key={k} className="bg-surface px-4 py-3">
            <div className="text-[11px] text-fg-3">{k}</div>
            <div className="num mt-0.5 text-[13px] text-fg">{v}</div>
          </div>
        ))}
      </Card>
      <Card>
        <CardHeader
          title="Rent roll"
          description="Lease-level only. Residents are never named."
          action={
            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-fg-2">
              <input type="checkbox" checked={filter} onChange={(e) => setFilter(e.target.checked)} className="accent-current" />
              Below market, expiring in {EXPIRY_WINDOW_DAYS} days
            </label>
          }
        />
        <Table>
          <THead>
            <Th>Unit</Th>
            <Th>Type</Th>
            <Th align="right">Rent</Th>
            <Th align="right">Market</Th>
            <Th align="right">Gap</Th>
            <Th align="right">Lease end</Th>
            <Th>Status</Th>
          </THead>
          <tbody>
            {shown.map((r) => (
              <Tr key={r.unit.id}>
                <Td mono>{r.unit.unit_number}</Td>
                <Td className="text-fg-3">{r.unit.floorplan}</Td>
                <Td align="right" mono>
                  {r.lease ? formatCurrency(r.lease.rent) : "—"}
                </Td>
                <Td align="right" mono className="text-fg-3">
                  {formatCurrency(r.unit.market_rent)}
                </Td>
                <Td align="right" mono className={r.lease && r.gap / r.unit.market_rent >= 0.05 ? "text-fg" : "text-fg-3"}>
                  {r.lease ? formatCurrency(r.gap) : "—"}
                </Td>
                <Td align="right" mono className={(r.days_to_expiry ?? 999) <= EXPIRY_WINDOW_DAYS ? "text-fg" : "text-fg-3"}>
                  {r.lease ? formatDate(r.lease.end_date, true) : "—"}
                </Td>
                <Td className="text-fg-3">{r.unit.status === "vacant" ? "Vacant" : r.lease?.status === "notice" ? "Notice" : "Occupied"}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {rows.length > shown.length && (
          <button type="button" onClick={() => setAll(true)} className="w-full cursor-pointer border-t border-border py-2 text-[11px] text-fg-3 hover:text-fg">
            Show all {rows.length} units
          </button>
        )}
      </Card>
    </div>
  );
}

function DelinquencyTab({ id }: { id: string }) {
  const open = useOpenSource();
  const { data } = useData(() => getDelinquency(id), [id]);
  if (!data) return <Skeleton className="h-80 rounded-lg" />;
  const max = Math.max(...data.buckets.map((b) => b.amount));
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader
          title="AR aging"
          description={`${formatCurrency(data.total)} past due at ${formatDate(data.as_of, true)}, ${formatPercent(data.total / data.billed)} of monthly charges.`}
          action={
            <button type="button" onClick={() => open({ kind: "ar_aging", property_id: id })} className="cursor-pointer text-[11px] text-fg-3 underline decoration-border underline-offset-2 hover:text-fg">
              Source
            </button>
          }
        />
        <ul className="flex flex-col gap-2 px-4 pb-4">
          {data.buckets.map((b) => (
            <li key={b.label} className="grid grid-cols-[64px_1fr_80px] items-center gap-3 text-xs">
              <span className="num text-fg-2">{b.label}</span>
              <span className="h-2 rounded-sm bg-fg/[0.06]">
                <span className={cn("block h-2 rounded-sm", b.label === "90+" || b.label === "61–90" ? "bg-unfavorable/70" : "bg-fg/30")} style={{ width: `${(b.amount / max) * 100}%` }} />
              </span>
              <span className="num text-right text-fg">{formatCurrency(b.amount)}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <CardHeader title="Largest balances" description="By unit. Residents are never named." />
        <Table>
          <THead>
            <Th>Unit</Th>
            <Th>Days past due</Th>
            <Th align="right">Balance</Th>
          </THead>
          <tbody>
            {data.balances.slice(0, 12).map((b) => (
              <Tr key={`${b.unit_number}-${b.bucket}`}>
                <Td mono>{b.unit_number}</Td>
                <Td mono className="text-fg-3">
                  {b.bucket}
                </Td>
                <Td align="right" mono>
                  {formatCurrency(b.balance)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

function MaintenanceTab({ id }: { id: string }) {
  const { data } = useData(() => getMaintenance(id), [id]);
  if (!data) return <Skeleton className="h-96 rounded-lg" />;
  const money = (v: number) => (v ? formatCurrency(v) : "In-house");
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card>
        <CardHeader title="Work orders by category" description={`Trailing 12 months · ${data.open} open now`} />
        <Table>
          <THead>
            <Th>Category</Th>
            <Th align="right">Calls</Th>
            <Th align="right">Vendor cost</Th>
          </THead>
          <tbody>
            {data.by_category.map((c) => (
              <Tr key={c.category}>
                <Td className="text-fg-2">{CATEGORY_NAMES[c.category]}</Td>
                <Td align="right" mono>
                  {c.count}
                </Td>
                <Td align="right" mono className="text-fg-2">
                  {money(c.cost)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <Card>
        <CardHeader title="Units with repeat calls" description={`${REPEAT_CALLS} or more calls in 12 months`} />
        {data.repeat_units.length ? (
          <Table>
            <THead>
              <Th>Unit</Th>
              <Th align="right">Calls</Th>
              <Th>Categories</Th>
              <Th align="right">Vendor cost</Th>
            </THead>
            <tbody>
              {data.repeat_units.slice(0, 10).map((u) => (
                <Tr key={u.unit_number}>
                  <Td mono>{u.unit_number}</Td>
                  <Td align="right" mono>
                    {u.calls}
                  </Td>
                  <Td className="text-fg-3">{u.categories}</Td>
                  <Td align="right" mono className="text-fg-2">
                    {money(u.cost)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="px-4 pb-4 text-xs text-fg-3">No unit had {REPEAT_CALLS} or more calls.</p>
        )}
      </Card>
      <Card>
        <CardHeader title="Vendor spend" description="Invoiced on work orders, trailing 12 months" />
        <Table>
          <THead>
            <Th>Vendor</Th>
            <Th align="right">Jobs</Th>
            <Th align="right">Spend</Th>
          </THead>
          <tbody>
            {data.vendors.map((v) => (
              <Tr key={v.name}>
                <Td className="text-fg-2">{v.name}</Td>
                <Td align="right" mono>
                  {v.jobs}
                </Td>
                <Td align="right" mono>
                  {formatCurrency(v.cost)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <Card>
        <CardHeader title="Capital projects" description="Planned budget against spend to date" />
        {data.capex.length ? (
          <ul className="flex flex-col gap-3 px-4 pb-4">
            {data.capex.map((c) => (
              <li key={c.id} className="text-xs">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-fg">{c.name}</span>
                  <span className="num shrink-0 text-fg-2">
                    {formatCurrency(c.spent)} / {formatCurrency(c.planned)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-sm bg-fg/[0.06]">
                  <div className={cn("h-1.5 rounded-sm", c.spent > c.planned ? "bg-unfavorable/70" : "bg-fg/30")} style={{ width: `${Math.min(100, (c.spent / c.planned) * 100)}%` }} />
                </div>
                <div className="mt-0.5 text-[11px] text-fg-3">
                  {c.status === "complete" ? `Complete ${formatDate(c.completed_at!, true)}` : c.status === "in_progress" ? "In progress" : "Planned"}
                  {c.spent > c.planned && ` · ${formatCurrency(c.spent - c.planned)} over`}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 pb-4 text-xs text-fg-3">No capital projects.</p>
        )}
      </Card>
    </div>
  );
}

const CATEGORY_NAMES: Record<string, string> = {
  hvac: "HVAC",
  plumbing: "Plumbing",
  electrical: "Electrical",
  appliance: "Appliance",
  make_ready: "Make-ready",
  grounds: "Grounds",
  pest: "Pest",
  general: "General",
};
