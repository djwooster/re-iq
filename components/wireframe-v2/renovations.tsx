"use client";

import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { STEP_NAMES, projectStage, fmtDate, property, stepName, unitNumbers, unitStatus, type Project } from "./seed";
import { href, Page } from "./shell";
import { useWf } from "./store";
import { A, Bar, barW, Button, Card, Chart, Chip, Empty, Log, Row, Select, StageChip, Table, Td, Tabs, type Tone } from "./ui";

/** Chip color for a project's stage: amber when a gate waits on you. */
export function projectStatus(p: Project): [Tone, string] {
  const label = projectStage(p);
  if (p.status !== "Active") return [p.status === "Complete" ? "green" : "neutral", label];
  return [label.startsWith("Gate") ? "amber" : p.step === 5 ? "blue" : "neutral", label];
}

// ---- List ----

const PIPELINE = ["Classic, selected", "In renovation", "Renovated vacant", "Renovated leased"] as const;

export function Renovations() {
  const { state } = useWf();
  const [tab, setTab] = useState<"projects" | "pipeline">("projects");
  const units = unitNumbers();
  return (
    <Page title="Renovations">
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "projects", label: "Projects", count: state.projects.length },
          { id: "pipeline", label: "Unit pipeline" },
        ]}
      />
      {tab === "projects" ? (
        <Table columns={["Project", "Property", "Type", "Stage", "Budget", "Spent"]}>
          {state.projects.map((p, i) => {
            const [tone, label] = projectStatus(p);
            return (
              <Row key={p.id} href={href.project(p.id)}>
                <Td className="font-medium text-[var(--wf-accent)]">{p.name}</Td>
                <Td className="whitespace-nowrap">{property(p.property)!.name}</Td>
                <Td className="text-fg-2">{p.type}</Td>
                <Td>
                  <Chip tone={tone}>{label}</Chip>
                </Td>
                <Td>
                  <Bar w={barW(i, 10)} />
                </Td>
                <Td>
                  <Bar w={p.step < 3 ? 2 : barW(i + 1, 4)} />
                </Td>
              </Row>
            );
          })}
        </Table>
      ) : (
        <div className="grid gap-3 md:grid-cols-4">
          {PIPELINE.map((col, c) => {
            const cards = units.filter((u) => {
              const s = unitStatus("b", u);
              return c === 0 ? s === "Classic" && Number(u) % 3 === 0 : s === col;
            });
            return (
              <div key={col} className="flex flex-col gap-2 rounded-md bg-fg/[0.03] p-2.5">
                <span className="flex items-center justify-between text-[11px] font-medium text-fg-2">
                  {col} <span className="text-fg-3">{cards.length}</span>
                </span>
                {cards.map((u) => (
                  <Link key={u} href={href.unit("b", u)} className="rounded border border-fg/15 bg-bg px-2.5 py-2 text-xs transition-colors hover:border-fg/40">
                    <span className="font-medium text-[var(--wf-accent)]">Unit {u}</span>
                    <span className="block text-[11px] text-fg-3">Property B · Interior upgrade</span>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </Page>
  );
}

// ---- Project page ----

export function ProjectPage({ id }: { id: string }) {
  const { state } = useWf();
  const p = state.projects.find((x) => x.id === id);
  const [view, setView] = useState<number>();
  if (!p) {
    return (
      <Page title="Project not found" crumbs={[{ label: "Renovations", href: "/wireframe-v2/renovations" }]}>
        <Empty>This project doesn&apos;t exist.</Empty>
      </Page>
    );
  }
  const step = view ?? p.step;
  const exception = state.exceptions.find((e) => e.id === p.exceptionId);
  const [tone, label] = projectStatus(p);
  return (
    <Page
      title={`${property(p.property)!.name} · ${p.name}`}
      subtitle={`${p.type} project`}
      crumbs={[{ label: "Renovations", href: "/wireframe-v2/renovations" }, { label: p.name }]}
      actions={<Chip tone={tone}>{label}</Chip>}
    >
      <Progress p={p} view={step} onView={setView} />
      {exception && (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-fg/[0.03] px-3 py-2 text-xs">
          <span className="text-[11px] text-fg-3">Linked exception</span>
          <A href={href.exception(exception.id)}>{exception.trigger}</A>
          <StageChip e={exception} />
        </div>
      )}
      <Card
        title={
          <span className="flex items-center gap-2">
            Step {step} · {stepName(p.type, step)}
            {step < p.step && <Chip tone="green">Done</Chip>}
            {step > p.step && <Chip>Not started</Chip>}
          </span>
        }
      >
        <div className={cn(step > p.step && "pointer-events-none opacity-50")}>
          <StepPanel p={p} step={step} live={step === p.step && p.status === "Active"} />
        </div>
      </Card>
      <Card title="Log" action={<A href="/wireframe-v2/decisions" className="text-[11px]">Decision log</A>}>
        <Log entries={p.log} />
      </Card>
    </Page>
  );
}

function Progress({ p, view, onView }: { p: Project; view: number; onView: (n: number) => void }) {
  const gateAfter = (n: number) => (n === 2 ? "Gate A" : n === 4 && p.type === "Interior" ? "Gate B" : null);
  return (
    <ol className="flex flex-wrap items-stretch gap-1">
      {STEP_NAMES.map((_, i) => {
        const n = i + 1;
        const gate = gateAfter(n);
        const done = n < p.step;
        const current = n === p.step;
        return (
          <li key={n} className="flex min-w-[130px] flex-1 items-stretch gap-1">
            <button
              type="button"
              onClick={() => onView(n)}
              className={cn(
                "flex flex-1 cursor-pointer flex-col gap-1.5 rounded-md border p-2.5 text-left transition-colors",
                view === n ? "border-[var(--wf-accent)]" : "border-fg/15 hover:border-fg/40",
              )}
            >
              <span className={cn("h-1 rounded-full", done ? "bg-[var(--wf-accent)]" : current ? "bg-[var(--wf-accent)]/50" : "bg-fg/10")} />
              <span className="text-[10px] text-fg-3">Step {n}</span>
              <span className="text-xs font-medium">{stepName(p.type, n)}</span>
            </button>
            {gate && (
              <span className={cn("flex items-center rounded px-1 text-[10px] font-medium [writing-mode:vertical-rl]", n < p.step ? "text-favorable" : n === p.step ? "text-warning" : "text-fg-3")} title={`${gate} after step ${n}`}>
                {gate}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Metric({ label, formula, w = 10, tone }: { label: string; formula?: string; w?: number; tone?: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-fg/15 p-3">
      <span className="text-[11px] font-medium text-fg-2">{label}</span>
      <Bar w={w} className={cn("h-3", tone)} />
      {formula && <span className="text-[10px] text-fg-3">{formula}</span>}
    </div>
  );
}

function Gate({ title, rule, children }: { title: string; rule: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-warning/40 bg-warning/[0.05] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="amber">{title}</Chip>
        <span className="text-xs font-medium">{rule}</span>
      </div>
      {children}
    </div>
  );
}

function StepPanel({ p, step, live }: { p: Project; step: number; live: boolean }) {
  const { state, act } = useWf();
  const toast = useToast();
  const [funding, setFunding] = useState("Reserves");
  const interior = p.type === "Interior";
  const exception = state.exceptions.find((e) => e.id === p.exceptionId);

  if (step === 1) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-[11px] text-fg-3">What triggered it</span>
          <div className="flex flex-wrap gap-1.5">
            {["Linked exception", "Loss to lease", "Rent comps", "Inspection", "Repeat work orders"].map((t) => (
              <Chip key={t} tone={p.triggers.includes(t) ? "blue" : "neutral"}>
                {p.triggers.includes(t) ? "✓ " : ""}
                {t}
              </Chip>
            ))}
          </div>
        </div>
        {exception && (
          <div className="rounded-md bg-fg/[0.03] px-3 py-2.5 text-xs">
            <span className="text-[11px] text-fg-3">Evidence carried from the exception</span>
            <p className="mt-1">{exception.drill.map((d) => d.label).join(" → ")}</p>
            {exception.question?.reply && <p className="mt-1 text-fg-2">PM: “{exception.question.reply.text}”</p>}
          </div>
        )}
        <Table columns={["Target", "Why", "Source"]}>
          {(interior ? ["Floor plan 1B · classic units", "Floor plan 2A · classic units"] : ["Building 2", "Building 3"]).map((t, i) => (
            <Row key={t}>
              <Td>{t}</Td>
              <Td className="text-fg-2">{interior ? "Widest gap to renovated comps" : i ? "Same system age, fewer calls so far" : "Most repeat work orders"}</Td>
              <Td className="text-fg-2">{interior ? "Rent roll, rent comps" : "Work orders, inspection"}</Td>
            </Row>
          ))}
        </Table>
        {live && (
          <div>
            <Button onClick={() => act.advance(p.id, "Opportunity confirmed; moved to scope and underwrite")}>Move to scope and underwrite</Button>
          </div>
        )}
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {interior ? (
            <>
              <Metric label="Cost per unit" />
              <Metric label="Expected premium" formula="per unit per month, from comps" w={6} />
              <Metric label="Return on cost" formula="(Monthly premium × 12) ÷ Cost per unit" w={8} />
              <Metric label="Payback" formula="Cost per unit ÷ Monthly premium" w={7} />
              <Metric label="Downtime" formula="Days offline per unit" w={5} />
            </>
          ) : (
            <>
              <Metric label="Total cost" />
              <Metric label="Repairs avoided" formula="per year, from T-12 and work orders" w={7} />
              <Metric label="Return on cost" formula="Annual benefit ÷ Total cost" w={8} />
              <Metric label="Payback" formula="Total cost ÷ Annual benefit" w={7} />
              <Metric label="Disruption" formula="Buildings and weeks affected" w={5} />
            </>
          )}
        </div>
        <div className="w-56">
          <span className="mb-1.5 block text-[11px] font-medium text-fg-2">Funding source</span>
          <Select value={funding} onChange={setFunding} options={["Reserves", "Loan holdback", "Equity"]} />
        </div>
        <Gate title="Gate A" rule="Return on cost clears hurdle (15%+)">
          <div className="grid max-w-sm grid-cols-2 gap-3 text-[11px] text-fg-3">
            <span className="flex flex-col gap-1.5">
              Return on cost <Bar w={8} />
            </span>
            <span className="flex flex-col gap-1.5">
              Hurdle <span className="text-xs text-fg">15%+</span>
            </span>
          </div>
          {live ? (
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  act.gate(p.id, "A", "approve");
                  toast("Gate A approved");
                }}
              >
                Approve and fund
              </Button>
              <Button variant="secondary" onClick={() => act.gate(p.id, "A", "rescope")}>
                Re-scope
              </Button>
              <Button variant="secondary" onClick={() => act.gate(p.id, "A", "drop")}>
                Drop
              </Button>
            </div>
          ) : (
            step < p.step && <span className="text-xs text-favorable">Approved and funded</span>
          )}
        </Gate>
      </div>
    );
  }

  if (step === 3) {
    const lines = interior ? ["Demo", "Cabinets and counters", "Flooring", "Fixtures and lighting", "Appliances", "Paint"] : ["Tear-off", "Equipment or materials", "Labor", "Permits", "Disposal", "Warranty"];
    return (
      <div className="flex flex-col gap-3">
        <span className="text-[11px] text-fg-3">Bid leveling · contractors side by side, line by line</span>
        <Table columns={["Line item", "Contractor 1", "Contractor 2", "Contractor 3"]}>
          {lines.map((l, i) => (
            <Row key={l}>
              <Td className="text-fg-2">{l}</Td>
              {[0, 1, 2].map((c) => (
                <Td key={c}>{c === 2 && i === 3 ? <Chip tone="amber">Missing scope</Chip> : <Bar w={barW(i + c * 2, 6, 8)} />}</Td>
              ))}
            </Row>
          ))}
          <Row>
            <Td className="font-medium">Total</Td>
            {[0, 1, 2].map((c) => (
              <Td key={c}>
                <Bar w={barW(c, 12, 4)} className="bg-fg/25" />
              </Td>
            ))}
          </Row>
          <Row>
            <Td className="font-medium">Schedule</Td>
            {[0, 1, 2].map((c) => (
              <Td key={c}>
                <Bar w={barW(c + 1, 5, 4)} />
              </Td>
            ))}
          </Row>
        </Table>
        {live && (
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((c) => (
              <Button key={c} variant={c === 1 ? "primary" : "secondary"} onClick={() => act.advance(p.id, `Awarded to Contractor ${c}`)}>
                Award Contractor {c}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (step === 4 && interior) {
    const pilot = unitNumbers().filter((u) => unitStatus(p.property, u).startsWith("Renovated")).slice(0, 8);
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-[11px] text-fg-3">Pilot units · 5–10 units</span>
          <div className="flex flex-wrap gap-1.5">
            {pilot.map((u) => (
              <Link key={u} href={href.unit(p.property, u)} className="rounded border border-fg/15 px-2 py-1 text-[11px] font-medium text-[var(--wf-accent)] hover:border-fg/40">
                Unit {u}
              </Link>
            ))}
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <Compare label="Premium" a="Achieved" b="Underwritten" wa={7} wb={11} flag />
          <Compare label="Lease-up speed" a="Renovated" b="Classic" wa={9} wb={8} />
          <Compare label="Days offline" a="Actual" b="Plan" wa={9} wb={8} />
        </div>
        <Gate title="Gate B" rule="Premium within 10% of underwriting">
          {live ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => act.gate(p.id, "B", "approve")}>Scale</Button>
              <Button variant="secondary" onClick={() => act.gate(p.id, "B", "rescope")}>
                Re-scope
              </Button>
            </div>
          ) : (
            step < p.step && <span className="text-xs text-favorable">Passed · scaled</span>
          )}
        </Gate>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="flex flex-col gap-4">
        <Table columns={["Building / area", "Need", "Season window", "Start", "Status"]}>
          {[
            ["Building 1", "Worst condition", "Spring–fall", "Sep 15", "Scheduled"],
            ["Building 2", "Active leaks", "Spring–fall", "Oct 6", "Scheduled"],
            ["Building 3", "End of useful life", "Spring–fall", "Spring 2027", "Not scheduled"],
          ].map(([b, n, s, d, st]) => (
            <Row key={b}>
              <Td>{b}</Td>
              <Td className="text-fg-2">{n}</Td>
              <Td className="text-fg-2">{s}</Td>
              <Td className="text-fg-2">{d}</Td>
              <Td>
                <Chip>{st}</Chip>
              </Td>
            </Row>
          ))}
        </Table>
        <Table columns={["Resident notice", "Audience", "Send", "Status"]}>
          {[
            ["30-day notice", "Buildings 1–2", "Aug 1", "Sent"],
            ["Week-of reminder", "Buildings 1–2", "Sep 8", "Sent"],
            ["30-day notice", "Building 3", "Spring 2027", "Draft"],
          ].map(([n, a, d, st]) => (
            <Row key={n + a}>
              <Td>{n}</Td>
              <Td className="text-fg-2">{a}</Td>
              <Td className="text-fg-2">{d}</Td>
              <Td>
                <Chip tone={st === "Sent" ? "green" : "neutral"}>{st}</Chip>
              </Td>
            </Row>
          ))}
        </Table>
        {live && (
          <div>
            <Button onClick={() => act.advance(p.id, "Work started")}>Start work</Button>
          </div>
        )}
      </div>
    );
  }

  if (step === 5) {
    const approvals = state.approvals.filter((a) => a.projectId === p.id);
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 rounded-md border border-warning/40 bg-warning/[0.05] p-3">
          <span className="text-xs font-medium">Watch: units offline pushing occupancy or DSCR toward covenant</span>
          <div className="grid gap-3 text-[11px] text-fg-3 md:grid-cols-3">
            <span className="flex flex-col gap-1.5">
              Physical occupancy · target 93–96% <Bar w={11} />
            </span>
            <span className="flex flex-col gap-1.5">
              DSCR · covenant 1.25x <Bar w={9} />
            </span>
            <span className="flex flex-col gap-1.5">
              {interior ? "Units offline" : "Units affected"} <Bar w={5} />
            </span>
          </div>
        </div>
        {interior ? (
          <>
            <div className="grid gap-2 md:grid-cols-3">
              <Compare label="Cost per unit" a="Actual" b="Budget" wa={10} wb={9} />
              <Metric label="Days offline" w={6} />
              <Metric label="Trade-out" formula="(New rent − Prior rent) ÷ Prior rent" w={7} />
            </div>
            <div className="grid gap-2 md:grid-cols-6">
              {["Not started", "Demo", "In progress", "Punch list", "Ready", "Leased"].map((col, c) => (
                <div key={col} className="flex flex-col gap-1.5 rounded-md bg-fg/[0.03] p-2">
                  <span className="text-[11px] font-medium text-fg-2">{col}</span>
                  {unitNumbers()
                    .filter((_, i) => i % 6 === c)
                    .slice(0, 3)
                    .map((u) => (
                      <Link key={u} href={href.unit(p.property, u)} className="rounded border border-fg/15 bg-bg px-2 py-1.5 text-[11px] font-medium text-[var(--wf-accent)] hover:border-fg/40">
                        Unit {u}
                      </Link>
                    ))}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <Chart label="Timeline · Gantt by building" />
            <Table columns={["Change order", "Reason", "Amount", "Status"]}>
              {[
                ["Change order 1", "Rotted decking, Building 1"],
                ["Change order 2", "Added gutters, Building 2"],
              ].map(([c, r]) => (
                <Row key={c}>
                  <Td>{c}</Td>
                  <Td className="text-fg-2">{r}</Td>
                  <Td>
                    <Bar w={6} />
                  </Td>
                  <Td>
                    <Chip tone="green">Approved</Chip>
                  </Td>
                </Row>
              ))}
              {approvals
                .filter((a) => a.kind === "Change order")
                .map((a) => (
                  <ApprovalRow key={a.id} id={a.id} cells={[a.title.split(" · ")[0], "Flashing replacement, Building 2"]} />
                ))}
            </Table>
            <Table columns={["Lender draw", "Work completed", "Lien waivers", "Requested", "Status"]}>
              <Row>
                <Td>Draw 1</Td>
                <Td className="text-fg-2">Building 1</Td>
                <Td>
                  <Chip tone="green">Received</Chip>
                </Td>
                <Td>
                  <Bar w={9} />
                </Td>
                <Td>
                  <Chip tone="green">Funded</Chip>
                </Td>
              </Row>
              {approvals
                .filter((a) => a.kind === "Lender draw")
                .map((a) => (
                  <ApprovalRow key={a.id} id={a.id} cells={["Draw 2", "Building 2"]} waivers />
                ))}
            </Table>
          </>
        )}
        {live && (
          <div>
            <Button onClick={() => act.advance(p.id, "Work complete; measuring results")}>Move to measure and decide</Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 md:grid-cols-3">
        <Metric label="Return on cost" formula="(Monthly premium × 12) ÷ Cost per unit" w={8} />
        <Metric label="Payback" formula="Cost per unit ÷ Monthly premium" w={7} />
        <Metric label="Value created vs. plan" formula="(Added NOI ÷ Cap rate) − Capex spent" w={11} />
      </div>
      <Table columns={["", "Rent", "Occupancy", "Days to lease", "Trade-out"]}>
        {["Classic", "Renovated"].map((r, i) => (
          <Row key={r}>
            <Td className="text-fg-2">{r}</Td>
            {[0, 1, 2, 3].map((j) => (
              <Td key={j}>
                <Bar w={barW(i + j, 6, 8)} />
              </Td>
            ))}
          </Row>
        ))}
      </Table>
      {live && (
        <div className="flex flex-wrap items-center gap-2">
          {(["Continue", "Pause", "Stop"] as const).map((c) => (
            <Button key={c} variant={c === "Continue" ? "primary" : "secondary"} onClick={() => act.projectDecision(p.id, c)}>
              {c}
            </Button>
          ))}
          <Button variant="secondary" onClick={() => act.projectDecision(p.id, "Refinance or sell")}>
            Refinance or sell
          </Button>
          <A href="/wireframe-v2/capital" className="text-[11px]">
            Valuation / hold-sell
          </A>
        </div>
      )}
    </div>
  );
}

function Compare({ label, a, b, wa, wb, flag }: { label: string; a: string; b: string; wa: number; wb: number; flag?: boolean }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-fg/15 p-3">
      <span className="text-[11px] font-medium text-fg-2">{label}</span>
      <span className="grid grid-cols-[84px_1fr] items-center gap-x-2 gap-y-1.5 text-[11px] text-fg-3">
        {a} <Bar w={wa} className={flag ? "bg-unfavorable/35" : undefined} />
        {b} <Bar w={wb} />
      </span>
    </div>
  );
}

function ApprovalRow({ id, cells, waivers }: { id: string; cells: string[]; waivers?: boolean }) {
  const { state, act } = useWf();
  const a = state.approvals.find((x) => x.id === id)!;
  return (
    <Row>
      <Td>{cells[0]}</Td>
      <Td className="text-fg-2">{cells[1]}</Td>
      {waivers && (
        <Td>
          <Chip tone="amber">1 missing</Chip>
        </Td>
      )}
      <Td>
        <Bar w={7} />
      </Td>
      <Td className="whitespace-nowrap">
        {a.status === "Waiting" ? (
          <span className="inline-flex items-center gap-1.5">
            <Chip tone="amber">Waiting · {fmtDate(a.submitted)}</Chip>
            <Button onClick={() => act.decideApproval(id, "Approved")}>Approve</Button>
            <Button variant="secondary" onClick={() => act.decideApproval(id, "Declined")}>
              Decline
            </Button>
          </span>
        ) : (
          <Chip tone={a.status === "Approved" ? "green" : "red"}>{a.status}</Chip>
        )}
      </Td>
    </Row>
  );
}
