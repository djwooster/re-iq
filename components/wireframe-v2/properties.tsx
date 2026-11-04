"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { ExceptionLink } from "./exceptions";
import { PropertyTable } from "./overview";
import { FLOORS, SCORECARD, UNITS_PER_FLOOR, UNIT_STATUSES, fmtLongDate, managerOf, property, stepName, unitStatus, type UnitStatus } from "./seed";
import { href, Page } from "./shell";
import { openExceptions, useWf } from "./store";
import { A, Bar, barW, Card, Chip, Empty, RagChip, Row, Sparkline, Table, Td } from "./ui";

export function Properties() {
  return (
    <Page title="Properties" controls>
      <PropertyTable />
    </Page>
  );
}

const UNIT_COLOR: Record<UnitStatus, string> = {
  Classic: "bg-fg/[0.08] text-fg-2",
  "In renovation": "bg-warning/25 text-fg",
  "Renovated vacant": "bg-[var(--wf-accent)]/20 text-fg",
  "Renovated leased": "bg-favorable/25 text-fg",
};

export function Scorecard({ id }: { id: string }) {
  const { state } = useWf();
  const p = property(id);
  if (!p) return <NotFound />;
  const exceptions = openExceptions(state, id);
  const projects = state.projects.filter((x) => x.property === id);
  return (
    <Page
      title={
        <span className="flex items-center gap-2">
          {p.name} <RagChip rag={p.rag} />
        </span>
      }
      subtitle={managerOf(id).name}
      crumbs={[{ label: "Properties", href: "/wireframe-v2/properties" }, { label: p.name }]}
      controls
    >
      <section aria-label="KPIs" className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
        {SCORECARD.map((k, i) => (
          <div key={k.kpi} className="flex flex-col gap-2 rounded-md border border-fg/15 p-3">
            <span className="text-[11px] leading-tight font-medium text-fg-2">{k.kpi}</span>
            <Sparkline />
            <span className="grid grid-cols-[40px_1fr] items-center gap-x-2 gap-y-1 text-[10px] text-fg-3">
              Plan <Bar w={barW(i, 6, 8)} />
              Actual <Bar w={barW(i + 3, 6, 8)} />
            </span>
            <span className="text-[10px] leading-snug text-fg-3">{k.target}</span>
          </div>
        ))}
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Open exceptions" action={<A href="/wireframe-v2/exceptions" className="text-[11px]">All exceptions</A>}>
          {exceptions.length ? exceptions.map((e) => <ExceptionLink key={e.id} e={e} />) : <Empty>Nothing off plan.</Empty>}
        </Card>
        <Card title="Renovation projects" action={<A href="/wireframe-v2/renovations" className="text-[11px]">Renovations</A>}>
          {projects.length ? (
            projects.map((x) => (
              <Link key={x.id} href={href.project(x.id)} className="group flex items-center justify-between gap-2 border-b border-fg/10 py-2 last:border-b-0">
                <span className="text-xs font-medium text-[var(--wf-accent)] group-hover:underline">{x.name}</span>
                <span className="text-[11px] text-fg-3">
                  {x.type} · Step {x.step} · {stepName(x.type, x.step)}
                </span>
              </Link>
            ))
          ) : (
            <Empty>No projects.</Empty>
          )}
        </Card>
      </div>

      <Card
        title="Unit stacking plan"
        action={
          <span className="flex flex-wrap gap-3">
            {UNIT_STATUSES.map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-[11px] text-fg-3">
                <span className={cn("h-2.5 w-2.5 rounded-sm", UNIT_COLOR[s])} />
                {s}
              </span>
            ))}
          </span>
        }
      >
        <div className="flex flex-col gap-1.5">
          {FLOORS.map((f) => (
            <div key={f} className="flex items-center gap-1.5">
              <span className="w-12 text-[11px] text-fg-3">Floor {f}</span>
              <div className="grid flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${UNITS_PER_FLOOR}, minmax(0, 1fr))` }}>
                {Array.from({ length: UNITS_PER_FLOOR }, (_, i) => {
                  const u = `${f}${String(i + 1).padStart(2, "0")}`;
                  const s = unitStatus(id, u);
                  return (
                    <Link key={u} href={href.unit(id, u)} title={`Unit ${u} · ${s}`} className={cn("rounded py-2 text-center text-[11px] transition-opacity hover:opacity-70", UNIT_COLOR[s])}>
                      {u}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </Page>
  );
}

export function Unit({ propertyId, unit }: { propertyId: string; unit: string }) {
  const { state } = useWf();
  const p = property(propertyId);
  if (!p) return <NotFound />;
  const status = unitStatus(propertyId, unit);
  const flagged = state.exceptions.filter((e) => e.property === propertyId && e.drill[3].rows?.includes(`Unit ${unit}`));
  const renovated = status !== "Classic";
  const project = state.projects.find((x) => x.property === propertyId && x.type === "Interior");
  const n = Number(unit);
  const start = `2026-${String((n % 12) + 1).padStart(2, "0")}-01`;
  const end = `2027-${String((n % 12) + 1).padStart(2, "0")}-01`;

  return (
    <Page
      title={`Unit ${unit}`}
      subtitle={`${p.name} · ${managerOf(propertyId).name}`}
      crumbs={[{ label: "Properties", href: "/wireframe-v2/properties" }, { label: p.name, href: href.property(propertyId) }, { label: `Unit ${unit}` }]}
      actions={<Chip tone={renovated ? "blue" : "neutral"}>{status}</Chip>}
    >
      {flagged.length > 0 && (
        <Card title="In open exceptions">
          {flagged.map((e) => (
            <ExceptionLink key={e.id} e={e} />
          ))}
        </Card>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Lease">
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <Item label="Status">{status === "In renovation" || status === "Renovated vacant" ? "Vacant" : "Occupied"}</Item>
            <Item label="Floor plan">{["1A", "1B", "2A", "2B"][n % 4]}</Item>
            <Item label="Lease start">{status === "In renovation" ? "None" : fmtLongDate(start)}</Item>
            <Item label="Lease end">{status === "In renovation" ? "None" : fmtLongDate(end)}</Item>
          </dl>
        </Card>
        <Card title="Rent and balance">
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <Item label="Lease rent">
              <Bar w={12} />
            </Item>
            <Item label="Market rent">
              <Bar w={14} />
            </Item>
            <Item label="Loss to lease">
              <Bar w={4} />
            </Item>
            <Item label="Balance">
              <span className="flex items-center gap-2">
                <Bar w={flagged.some((e) => e.id === "e-delinquency") ? 9 : 2} />
                {flagged.some((e) => e.id === "e-delinquency") && <Chip tone="red">61–90 days</Chip>}
              </span>
            </Item>
          </dl>
        </Card>
      </div>
      <Card title="Work orders">
        <Table columns={["Opened", "Category", "Description", "Status", "Days open"]}>
          {[
            ["Nov 18, 2026", "HVAC", "No cooling, rooftop unit", "Completed"],
            ["Sep 2, 2026", "Plumbing", "Kitchen sink leak", "Completed"],
            ["Jun 11, 2026", "Appliance", "Dishwasher not draining", "Completed"],
          ].map(([d, c, t, s], i) => (
            <Row key={d}>
              <Td className="whitespace-nowrap text-fg-2">{d}</Td>
              <Td>{c}</Td>
              <Td className="text-fg-2">{t}</Td>
              <Td>
                <Chip tone="green">{s}</Chip>
              </Td>
              <Td>
                <Bar w={barW(i, 3, 4)} />
              </Td>
            </Row>
          ))}
        </Table>
      </Card>
      <Card title="Renovation">
        {renovated ? (
          <dl className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
            <Item label="Status">{status}</Item>
            <Item label="Program">{project ? <A href={href.project(project.id)}>{project.name}</A> : "Interior upgrade"}</Item>
            <Item label="Scope tier">Full</Item>
            <Item label="Pre-reno rent → post-reno rent">
              <span className="flex items-center gap-1.5">
                <Bar w={8} /> → <Bar w={11} />
              </span>
            </Item>
            <Item label="Started">Sep 8, 2026</Item>
            <Item label="Finished">{status === "In renovation" ? "In progress" : "Oct 20, 2026"}</Item>
            <Item label="Days offline">
              <Bar w={5} />
            </Item>
            <Item label="Cost">
              <Bar w={9} />
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
    <Page title="Not found" crumbs={[{ label: "Properties", href: "/wireframe-v2/properties" }]}>
      <Empty>This property doesn&apos;t exist.</Empty>
    </Page>
  );
}
