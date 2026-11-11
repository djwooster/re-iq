"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { TrendChart } from "./chart";
import { ExceptionLink } from "./exceptions";
import { fmt, noiVs, scorecard } from "./metrics";
import { EXPENSE_LINES, LAST, MONTHS, MONTH_LONG, REVENUE_LINES, month, periodTotal, profile, reported, unit, unitNumbers, type Occupancy, type UnitStatus } from "./numbers";
import { PropertyTable } from "./overview";
import { fmtLongDate, managerOf, property, projectStage } from "./seed";
import { href, Page } from "./shell";
import { openExceptions, useWf } from "./store";
import { A, Card, Chip, Delta, Empty, Kpi, PlanChip, Row, Segmented, Table, Td } from "./ui";

export function Properties() {
  return (
    <Page title="Properties" controls>
      <PropertyTable />
    </Page>
  );
}

const OCC_COLOR: Record<Occupancy, string> = {
  Occupied: "bg-fg/[0.09]",
  "Notice to vacate": "bg-warning/40",
  Vacant: "bg-transparent ring-1 ring-inset ring-fg/25",
  "Vacant, not ready": "bg-unfavorable/35",
};
const RENO_COLOR: Record<UnitStatus, string> = {
  Classic: "bg-fg/[0.09]",
  "In renovation": "bg-warning/40",
  "Renovated vacant": "bg-data/30",
  "Renovated leased": "bg-data",
};

export function Scorecard({ id }: { id: string }) {
  const { state } = useWf();
  const [view, setView] = useState<"Occupancy" | "Renovation">("Occupancy");
  const p = property(id);
  if (!p) return <NotFound />;
  const exceptions = openExceptions(state, id);
  const projects = state.projects.filter((x) => x.property === id);
  const pr = profile(id);
  const late = !reported(id, LAST);
  const n = noiVs(id, state.period, state.compare);
  const a = periodTotal(id, state.period);
  const b = periodTotal(id, state.period, state.compare);
  const units = unitNumbers(id).map((u) => unit(id, u));
  const perFloor = pr.units / pr.floors;
  const colors = view === "Occupancy" ? OCC_COLOR : RENO_COLOR;
  const legend = Object.keys(colors) as (keyof typeof colors)[];

  return (
    <Page
      title={
        <span className="flex items-center gap-2">
          {p.name} <PlanChip off={exceptions.length > 0} />
        </span>
      }
      subtitle={
        <>
          <A href={href.manager(managerOf(id).id)} className="font-normal text-fg-3">
            {managerOf(id).name}
          </A>{" "}
          · {pr.units} units · Figures through {MONTH_LONG[pr.through]}
          {late && " · November package not received"}
        </>
      }
      crumbs={[{ label: "Properties", href: "/prototype/properties" }, { label: p.name }]}
      controls
    >
      <section aria-label="Scorecard" className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {scorecard(id).map((k) => (
          <Kpi key={k.kpi} label={k.kpi} value={k.value} sub={k.sub} status={k.status} trend={k.trend} />
        ))}
      </section>

      <div className="grid gap-3 xl:grid-cols-[3fr_2fr]">
        <Card title="NOI by month">
          <TrendChart
            data={MONTHS.map((label, m) => ({ month: label, actual: reported(id, m) ? month(id, m).noi : null, plan: month(id, m, state.compare).noi }))}
            series={[
              { key: "actual", label: "Actual", style: "data" },
              { key: "plan", label: state.compare, style: "reference" },
            ]}
            format={fmt.usd}
            axisFormat={fmt.usdShort}
          />
        </Card>
        <Card title={`Income statement · ${state.period === "Month" ? MONTH_LONG[pr.through] : state.period}`} flush>
          {a && b && n ? (
            <Table bare columns={["", { label: "Actual", num: true }, { label: state.compare, num: true }, { label: "Variance", num: true }]}>
              {[...REVENUE_LINES, "Effective gross income", ...EXPENSE_LINES, "Net operating income"].map((l) => {
                const total = l === "Effective gross income" || l === "Net operating income";
                const av = l === "Effective gross income" ? a.egi : l === "Net operating income" ? a.noi : a.lines[l as keyof typeof a.lines];
                const bv = l === "Effective gross income" ? b.egi : l === "Net operating income" ? b.noi : b.lines[l as keyof typeof b.lines];
                const expense = (EXPENSE_LINES as readonly string[]).includes(l);
                return (
                  <Row key={l}>
                    <Td className={cn("whitespace-nowrap", total ? "font-medium" : "text-fg-2")}>{l}</Td>
                    <Td num className={total ? "font-medium" : undefined}>
                      {fmt.usd(av)}
                    </Td>
                    <Td num className="text-fg-3">
                      {fmt.usd(bv)}
                    </Td>
                    <Td num>
                      <Delta value={av - bv} format={fmt.delta} good={expense ? "down" : "up"} />
                    </Td>
                  </Row>
                );
              })}
            </Table>
          ) : (
            <div className="p-4">
              <Empty>No figures for this period yet.</Empty>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card title="Open exceptions" action={<A href="/prototype/exceptions" className="text-[11px] font-normal text-fg-3">All exceptions</A>}>
          {exceptions.length ? exceptions.map((e) => <ExceptionLink key={e.id} e={e} />) : <Empty>Nothing off plan.</Empty>}
        </Card>
        <Card title="Renovation projects" action={<A href="/prototype/renovations" className="text-[11px] font-normal text-fg-3">Renovations</A>}>
          {projects.length ? (
            projects.map((x) => (
              <Link key={x.id} href={href.project(x.id)} className="group flex items-center justify-between gap-2 border-b border-border/70 py-2 last:border-b-0">
                <span className="text-xs font-medium group-hover:underline">{x.name}</span>
                <span className="text-[11px] text-fg-3">
                  {x.type} · {projectStage(x)}
                </span>
              </Link>
            ))
          ) : (
            <Empty>No projects.</Empty>
          )}
        </Card>
      </div>

      <Card title="Stacking plan" action={<Segmented label="" value={view} options={["Occupancy", "Renovation"] as const} onChange={setView} />}>
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
          {legend.map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-[11px] text-fg-3">
              <span className={cn("size-2.5 rounded-sm", colors[s as never])} />
              {s}
              <span className="num text-fg-3">{units.filter((u) => (view === "Occupancy" ? u.occupancy : u.status) === s).length}</span>
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-1 overflow-x-auto">
          {Array.from({ length: pr.floors }, (_, i) => pr.floors - i).map((f) => (
            <div key={f} className="flex items-center gap-2">
              <span className="num w-10 shrink-0 text-[10px] text-fg-3">Fl {f}</span>
              <div className="grid flex-1 gap-[3px]" style={{ gridTemplateColumns: `repeat(${perFloor}, minmax(10px, 1fr))` }}>
                {units
                  .filter((u) => u.num.startsWith(String(f)))
                  .map((u) => (
                    <Link
                      key={u.num}
                      href={href.unit(id, u.num)}
                      title={`Unit ${u.num} · ${u.plan.name} · ${u.occupancy}${u.status !== "Classic" ? ` · ${u.status}` : ""}`}
                      aria-label={`Unit ${u.num}`}
                      className={cn("h-5 rounded-[3px] transition-opacity hover:opacity-60", (view === "Occupancy" ? OCC_COLOR[u.occupancy] : RENO_COLOR[u.status]))}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </Page>
  );
}

const WORK_ORDERS = [
  ["Nov 18, 2026", "HVAC", "No cooling, rooftop unit", 2],
  ["Sep 2, 2026", "Plumbing", "Kitchen sink leak", 1],
  ["Jun 11, 2026", "Appliance", "Dishwasher not draining", 3],
] as const;

export function Unit({ propertyId, unit: num }: { propertyId: string; unit: string }) {
  const { state } = useWf();
  const p = property(propertyId);
  if (!p || !unitNumbers(propertyId).includes(num)) return <NotFound />;
  const u = unit(propertyId, num);
  const flagged = state.exceptions.filter((e) => e.property === propertyId && e.drill[3].rows?.includes(`Unit ${num}`));
  const renovated = u.status !== "Classic";
  const project = state.projects.find((x) => x.property === propertyId && x.type === "Interior");
  const ltl = u.leaseRent === null ? null : (u.market - u.leaseRent) / u.market;

  return (
    <Page
      title={`Unit ${num}`}
      subtitle={`${p.name} · ${u.plan.name} · ${u.plan.beds} · ${u.plan.sf.toLocaleString("en-US")} sq ft`}
      crumbs={[{ label: "Properties", href: "/prototype/properties" }, { label: p.name, href: href.property(propertyId) }, { label: `Unit ${num}` }]}
      actions={
        <span className="flex gap-1.5">
          <Chip tone={u.occupancy === "Vacant, not ready" ? "red" : u.occupancy === "Notice to vacate" ? "amber" : "neutral"}>{u.occupancy}</Chip>
          {renovated && <Chip tone="blue">{u.status}</Chip>}
        </span>
      }
    >
      {flagged.length > 0 && (
        <Card title="In open exceptions">
          {flagged.map((e) => (
            <ExceptionLink key={e.id} e={e} />
          ))}
        </Card>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <Card title="Lease">
          <dl className="grid grid-cols-2 gap-4 text-xs">
            <Item label="Status">{u.occupancy}</Item>
            <Item label="Floor plan">
              {u.plan.name} · {u.plan.beds}
            </Item>
            <Item label="Lease start">{u.leaseStart ? fmtLongDate(u.leaseStart) : "None"}</Item>
            <Item label="Lease end">{u.leaseEnd ? fmtLongDate(u.leaseEnd) : "None"}</Item>
          </dl>
        </Card>
        <Card title="Rent and balance">
          <dl className="grid grid-cols-2 gap-4 text-xs">
            <Item label="Lease rent">
              <span className="num">{u.leaseRent === null ? "Vacant" : fmt.usd(u.leaseRent)}</span>
            </Item>
            <Item label="Market rent">
              <span className="num">{fmt.usd(u.market)}</span>
            </Item>
            <Item label="Loss to lease">
              <span className={cn("num", ltl !== null && ltl > 0.05 && "text-unfavorable")}>{ltl === null ? "–" : fmt.pct(ltl)}</span>
            </Item>
            <Item label="Balance">
              <span className="flex items-center gap-2">
                <span className={cn("num", u.balance > 1000 && "text-unfavorable")}>{fmt.usd(u.balance)}</span>
                {u.balance > 1000 && <Chip tone="red">61–90 days</Chip>}
              </span>
            </Item>
          </dl>
        </Card>
      </div>
      <Card title="Work orders" flush>
        <Table bare columns={["Opened", "Category", "Description", "Status", { label: "Days open", num: true }]}>
          {WORK_ORDERS.map(([d, c, t, n]) => (
            <Row key={d}>
              <Td className="num text-[11px] whitespace-nowrap text-fg-2">{d}</Td>
              <Td>{c}</Td>
              <Td className="text-fg-2">{t}</Td>
              <Td>
                <Chip tone="green">Completed</Chip>
              </Td>
              <Td num>{n}</Td>
            </Row>
          ))}
        </Table>
      </Card>
      <Card title="Renovation">
        {renovated ? (
          <dl className="grid grid-cols-2 gap-4 text-xs md:grid-cols-4">
            <Item label="Status">{u.status}</Item>
            <Item label="Program">{project ? <A href={href.project(project.id)}>{project.name}</A> : "Interior upgrade"}</Item>
            <Item label="Scope tier">Full</Item>
            <Item label="Rent before → after">
              <span className="num">
                {fmt.usd(u.market - 142)} → {fmt.usd(u.market)}
              </span>
            </Item>
            <Item label="Started">Sep 8, 2026</Item>
            <Item label="Finished">{u.status === "In renovation" ? "In progress" : "Oct 20, 2026"}</Item>
            <Item label="Days offline">
              <span className="num">{u.status === "In renovation" ? "38 so far" : "42"}</span>
            </Item>
            <Item label="Cost">
              <span className="num">{fmt.usd(11_800)}</span>
            </Item>
          </dl>
        ) : (
          <p className="text-xs text-fg-3">Classic unit. Never renovated.</p>
        )}
      </Card>
    </Page>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[11px] text-fg-3">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function NotFound() {
  return (
    <Page title="Not found" crumbs={[{ label: "Properties", href: "/prototype/properties" }]}>
      <Empty>This property or unit doesn&apos;t exist.</Empty>
    </Page>
  );
}
