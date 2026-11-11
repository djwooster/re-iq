"use client";

import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { fmt } from "./metrics";
import { PILOT, kpis, unit, unitNumbers } from "./numbers";
import { STEP_NAMES, projectStage, fmtDate, property, stepName, type Project } from "./seed";
import { href, Page } from "./shell";
import { useWf } from "./store";
import { A, Button, Card, Chip, Empty, Log, Row, Select, StageChip, Table, Td, Tabs, type Tone } from "./ui";

/** Budgets, spend, and underwriting for the seeded projects. New projects start without them. */
export const PROJECT_BUDGET: Record<string, { budget: number; spent: number }> = {
  "a-hvac": { budget: 486_000, spent: 0 },
  "b-interior": { budget: 708_000, spent: 98_200 },
  "j-roof": { budget: 1_240_000, spent: 712_500 },
};

interface Underwriting {
  cost: number;
  /** Interior: premium per unit per month. Exterior: annual benefit. */
  benefit: number;
  perUnit?: boolean;
  downtime: string;
}

const UW: Record<string, Underwriting> = {
  "a-hvac": { cost: 486_000, benefit: 79_000, downtime: "2 buildings · 3 weeks" },
  "b-interior": { cost: 11_800, benefit: 185, perUnit: true, downtime: "21 days per unit" },
  "j-roof": { cost: 1_240_000, benefit: 192_000, downtime: "3 buildings · 9 weeks" },
};

const roc = (u: Underwriting, benefit = u.benefit) => (u.perUnit ? (benefit * 12) / u.cost : benefit / u.cost);
const payback = (u: Underwriting, benefit = u.benefit) => (u.perUnit ? u.cost / benefit / 12 : u.cost / benefit);
const years = (v: number) => `${v.toFixed(1)} years`;

/** Units selected for the next phase of Property B's program. */
const SELECTED = unitNumbers("b")
  .filter((u) => !PILOT[u] && ["1B", "2A"].includes(unit("b", u).plan.name))
  .slice(0, 6);

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
        <Table columns={["Project", "Property", "Type", "Stage", { label: "Budget", num: true }, { label: "Spent", num: true }]}>
          {state.projects.map((p) => {
            const [tone, label] = projectStatus(p);
            return (
              <Row key={p.id} href={href.project(p.id)}>
                <Td className="font-medium">{p.name}</Td>
                <Td className="whitespace-nowrap">{property(p.property)!.name}</Td>
                <Td className="text-fg-2">{p.type}</Td>
                <Td>
                  <Chip tone={tone}>{label}</Chip>
                </Td>
                <Td num>{PROJECT_BUDGET[p.id] ? fmt.usd(PROJECT_BUDGET[p.id].budget) : <span className="text-fg-3">Not set</span>}</Td>
                <Td num>{PROJECT_BUDGET[p.id] ? fmt.usd(PROJECT_BUDGET[p.id].spent) : "$0"}</Td>
              </Row>
            );
          })}
        </Table>
      ) : (
        <div className="grid gap-3 md:grid-cols-4">
          {PIPELINE.map((col, c) => {
            const cards = c === 0 ? SELECTED : Object.keys(PILOT).filter((u) => PILOT[u] === col);
            return (
              <div key={col} className="flex flex-col gap-2 rounded-lg bg-fg/[0.035] p-2.5">
                <span className="flex items-center justify-between text-xs font-medium text-fg-2">
                  {col} <span className="text-fg-3">{cards.length}</span>
                </span>
                {cards.map((u) => (
                  <Link key={u} href={href.unit("b", u)} className="rounded-md border border-border bg-bg px-2.5 py-2 text-xs transition-colors hover:border-border-strong">
                    <span className="flex items-center justify-between">
                      <span className="font-medium">Unit {u}</span>
                      <span className="num text-[11px] text-fg-3">{unit("b", u).plan.name}</span>
                    </span>
                    <span className="block text-xs text-fg-3">{property("b")!.name} · Interior upgrade</span>
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
      <Page title="Project not found" crumbs={[{ label: "Renovations", href: "/prototype/renovations" }]}>
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
      crumbs={[{ label: "Renovations", href: "/prototype/renovations" }, { label: p.name }]}
      actions={<Chip tone={tone}>{label}</Chip>}
    >
      <Progress p={p} view={step} onView={setView} />
      {exception && (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-fg/[0.035] px-3 py-2 text-xs">
          <span className="text-xs text-fg-3">Linked exception</span>
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
      <Card title="Log" action={<A href="/prototype/decisions" className="text-xs">Decision log</A>}>
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
                view === n ? "border-fg/60 bg-surface" : "border-border hover:border-border-strong",
              )}
            >
              <span className={cn("h-1 rounded-full", done ? "bg-fg/70" : current ? "bg-warning" : "bg-fg/10")} />
              <span className="text-[11px] text-fg-3">Step {n}</span>
              <span className="text-xs font-medium">{stepName(p.type, n)}</span>
            </button>
            {gate && (
              <span className={cn("flex items-center rounded px-1 text-[11px] font-medium [writing-mode:vertical-rl]", n < p.step ? "text-favorable" : n === p.step ? "text-warning" : "text-fg-3")} title={`${gate} after step ${n}`}>
                {gate}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Metric({ label, formula, value, tone }: { label: string; formula?: string; value: React.ReactNode; tone?: "favorable" | "unfavorable" }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-bg p-3">
      <span className="text-xs font-medium text-fg-2">{label}</span>
      <span className={cn("num text-base", tone === "favorable" && "text-favorable", tone === "unfavorable" && "text-unfavorable")}>{value}</span>
      {formula && <span className="text-[11px] text-fg-3">{formula}</span>}
    </div>
  );
}

function Gate({ title, rule, children }: { title: string; rule: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/[0.05] p-3">
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
  const uw = UW[p.id];

  if (step === 1) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs text-fg-3">What triggered it</span>
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
          <div className="rounded-md bg-fg/[0.035] px-3 py-2.5 text-xs">
            <span className="text-xs text-fg-3">Evidence carried from the exception</span>
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
        {uw ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {interior ? (
              <>
                <Metric label="Cost per unit" value={fmt.usd(uw.cost)} />
                <Metric label="Expected premium" formula="Per unit per month, from comps" value={fmt.usd(uw.benefit)} />
                <Metric label="Return on cost" formula="(Monthly premium × 12) ÷ Cost per unit" value={fmt.pct(roc(uw))} />
                <Metric label="Payback" formula="Cost per unit ÷ Monthly premium" value={years(payback(uw))} />
                <Metric label="Downtime" formula="Days offline per unit" value={uw.downtime} />
              </>
            ) : (
              <>
                <Metric label="Total cost" value={fmt.usd(uw.cost)} />
                <Metric label="Annual benefit" formula="Repairs avoided and utility savings, from T-12 and work orders" value={fmt.usd(uw.benefit)} />
                <Metric label="Return on cost" formula="Annual benefit ÷ Total cost" value={fmt.pct(roc(uw))} />
                <Metric label="Payback" formula="Total cost ÷ Annual benefit" value={years(payback(uw))} />
                <Metric label="Disruption" formula="Buildings and weeks affected" value={uw.downtime} />
              </>
            )}
          </div>
        ) : (
          <Empty>Add scope and contractor pricing to underwrite this project.</Empty>
        )}
        <div className="w-56">
          <span className="mb-1.5 block text-xs font-medium text-fg-2">Funding source</span>
          <Select value={funding} onChange={setFunding} options={["Reserves", "Loan holdback", "Equity"]} />
        </div>
        <Gate title="Gate A" rule="Return on cost clears hurdle (15%+)">
          <div className="grid max-w-sm grid-cols-2 gap-3 text-xs text-fg-3">
            <span className="flex flex-col gap-1">
              Return on cost <span className={cn("num text-sm", uw && (roc(uw) >= 0.15 ? "text-favorable" : "text-unfavorable"))}>{uw ? fmt.pct(roc(uw)) : "Not underwritten"}</span>
            </span>
            <span className="flex flex-col gap-1">
              Hurdle <span className="num text-sm text-fg">15.0%</span>
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
    const base = uw?.cost ?? (interior ? 11_800 : 480_000);
    const SHARE = [0.06, 0.34, 0.24, 0.12, 0.17, 0.07];
    const FACTOR = [1, 0.94, 1.07];
    const bid = (i: number, c: number) => Math.round((base * SHARE[i] * FACTOR[c] * (1 + ((i * 3 + c * 5) % 7) / 100)) / 10) * 10;
    const total = (c: number) => lines.reduce((s, _, i) => s + (c === 2 && i === 3 ? 0 : bid(i, c)), 0);
    const low = [0, 1, 2].reduce((best, c) => (total(c) < total(best) && c !== 2 ? c : best), 0);
    return (
      <div className="flex flex-col gap-3">
        <span className="text-xs text-fg-3">Bid leveling{interior ? " · per unit" : ""}</span>
        <Table columns={["Line item", { label: "Contractor 1", num: true }, { label: "Contractor 2", num: true }, { label: "Contractor 3", num: true }]}>
          {lines.map((l, i) => (
            <Row key={l}>
              <Td className="text-fg-2">{l}</Td>
              {[0, 1, 2].map((c) => (
                <Td key={c} num>
                  {c === 2 && i === 3 ? <Chip tone="amber">Missing scope</Chip> : fmt.usd(bid(i, c))}
                </Td>
              ))}
            </Row>
          ))}
          <Row>
            <Td className="font-medium">Total</Td>
            {[0, 1, 2].map((c) => (
              <Td key={c} num className="font-medium">
                {fmt.usd(total(c))}
                {c === low && <span className="ml-1.5 text-[11px] font-normal text-favorable">Lowest complete</span>}
              </Td>
            ))}
          </Row>
          <Row>
            <Td className="font-medium">Schedule</Td>
            {[0, 1, 2].map((c) => (
              <Td key={c} num className="text-fg-2">
                {interior ? `${[24, 19, 22][c]} days per unit` : `${[11, 9, 13][c]} weeks`}
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
    const pilot = Object.keys(PILOT);
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs text-fg-3">Pilot units · 5–10 units</span>
          <div className="flex flex-wrap gap-1.5">
            {pilot.map((u) => (
              <Link key={u} href={href.unit(p.property, u)} className="rounded-md border border-border bg-bg px-2 py-1 text-xs font-medium hover:border-border-strong">
                Unit {u} <span className="font-normal text-fg-3">· {PILOT[u].replace("Renovated ", "")}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <Compare label="Premium per unit per month" a="Achieved" b="Underwritten" va={fmt.usd(142)} vb={fmt.usd(185)} flag />
          <Compare label="Days to lease" a="Renovated" b="Classic" va="11" vb="16" />
          <Compare label="Days offline per unit" a="Actual" b="Plan" va="42" vb="21" flag />
        </div>
        <Gate title="Gate B" rule="Premium within 10% of underwriting">
          <p className="text-xs text-fg-2">
            Achieved premium is <span className="num text-unfavorable">{fmt.signedPct(142 / 185 - 1)}</span> vs. underwriting. Return on cost at the achieved premium: <span className="num">{uw ? fmt.pct(roc(uw, 142)) : "–"}</span> (hurdle 15.0%).
          </p>
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
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-bg p-3">
          <span className="text-xs font-medium">Units offline vs. occupancy and DSCR covenant</span>
          <div className="grid gap-3 text-xs text-fg-3 md:grid-cols-3">
            <span className="flex flex-col gap-1">
              Physical occupancy · target 93–96% <span className="num text-sm text-fg">{fmt.pct(kpis(p.property).occupancy)}</span>
            </span>
            <span className="flex flex-col gap-1">
              DSCR · covenant 1.25x <span className="num text-sm text-fg">{fmt.x(kpis(p.property).dscr)}</span>
            </span>
            <span className="flex flex-col gap-1">
              {interior ? "Units offline" : "Units affected"} <span className="num text-sm text-fg">{interior ? 3 : 68}</span>
            </span>
          </div>
        </div>
        {interior ? (
          <>
            <div className="grid gap-2 md:grid-cols-3">
              <Compare label="Cost per unit" a="Actual" b="Budget" va={fmt.usd(12_275)} vb={fmt.usd(11_800)} flag />
              <Metric label="Days offline" value="42" />
              <Metric label="Trade-out" formula="(New rent − Prior rent) ÷ Prior rent" value={fmt.signedPct(0.087)} />
            </div>
            <div className="grid gap-2 md:grid-cols-6">
              {["Not started", "Demo", "In progress", "Punch list", "Ready", "Leased"].map((col, c) => (
                <div key={col} className="flex flex-col gap-1.5 rounded-lg bg-fg/[0.035] p-2">
                  <span className="text-xs font-medium text-fg-2">{col}</span>
                  {unitNumbers(p.property)
                    .filter((_, i) => i % 6 === c)
                    .slice(0, 3)
                    .map((u) => (
                      <Link key={u} href={href.unit(p.property, u)} className="rounded-md border border-border bg-bg px-2 py-1.5 text-xs font-medium hover:border-border-strong">
                        Unit {u}
                      </Link>
                    ))}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <Gantt />
            <Table columns={["Change order", "Reason", { label: "Amount", num: true }, "Status"]}>
              {[
                ["Change order 1", "Rotted decking, Building 1", 18_400],
                ["Change order 2", "Added gutters, Building 2", 9_750],
              ].map(([c, r, amt]) => (
                <Row key={c}>
                  <Td>{c}</Td>
                  <Td className="text-fg-2">{r}</Td>
                  <Td num>{fmt.usd(amt as number)}</Td>
                  <Td>
                    <Chip tone="green">Approved</Chip>
                  </Td>
                </Row>
              ))}
              {approvals
                .filter((a) => a.kind === "Change order")
                .map((a) => (
                  <ApprovalRow key={a.id} id={a.id} cells={[a.title.split(" · ")[0], "Flashing replacement, Building 2"]} amount={14_200} />
                ))}
            </Table>
            <Table columns={["Lender draw", "Work completed", "Lien waivers", { label: "Requested", num: true }, "Status"]}>
              <Row>
                <Td>Draw 1</Td>
                <Td className="text-fg-2">Building 1</Td>
                <Td>
                  <Chip tone="green">Received</Chip>
                </Td>
                <Td num>{fmt.usd(310_000)}</Td>
                <Td>
                  <Chip tone="green">Funded</Chip>
                </Td>
              </Row>
              {approvals
                .filter((a) => a.kind === "Lender draw")
                .map((a) => (
                  <ApprovalRow key={a.id} id={a.id} cells={["Draw 2", "Building 2"]} amount={265_000} waivers />
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
        <Metric label="Return on cost" formula={interior ? "(Monthly premium × 12) ÷ Cost per unit" : "Annual benefit ÷ Total cost"} value={uw ? fmt.pct(roc(uw, uw.benefit * 0.94)) : "–"} />
        <Metric label="Payback" formula={interior ? "Cost per unit ÷ Monthly premium" : "Total cost ÷ Annual benefit"} value={uw ? years(payback(uw, uw.benefit * 0.94)) : "–"} />
        <Metric label="Value created vs. plan" formula="(Added NOI ÷ Cap rate) − Capex spent" value={uw ? fmt.deltaShort((interior ? uw.benefit * 12 * 60 : uw.benefit) * 0.94 / 0.055 - (interior ? uw.cost * 60 : uw.cost)) : "–"} />
      </div>
      <Table columns={["", { label: "Rent", num: true }, { label: "Occupancy", num: true }, { label: "Days to lease", num: true }, { label: "Trade-out", num: true }]}>
        {[
          ["Classic", 1_540, 0.936, 16, 0.021],
          ["Renovated", 1_682, 0.958, 11, 0.087],
        ].map(([r, rent, occ, dtl, to]) => (
          <Row key={r as string}>
            <Td className="text-fg-2">{r}</Td>
            <Td num>{fmt.usd(rent as number)}</Td>
            <Td num>{fmt.pct(occ as number)}</Td>
            <Td num>{dtl}</Td>
            <Td num>{fmt.signedPct(to as number)}</Td>
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
          <A href="/prototype/capital" className="text-xs">
            Valuation / hold-sell
          </A>
        </div>
      )}
    </div>
  );
}

function Compare({ label, a, b, va, vb, flag }: { label: string; a: string; b: string; va: string; vb: string; flag?: boolean }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-bg p-3">
      <span className="text-xs font-medium text-fg-2">{label}</span>
      <span className="grid grid-cols-[84px_1fr] items-center gap-x-2 gap-y-1 text-xs text-fg-3">
        {a} <span className={cn("num text-sm", flag ? "text-unfavorable" : "text-fg")}>{va}</span>
        {b} <span className="num text-sm text-fg-2">{vb}</span>
      </span>
    </div>
  );
}

const GANTT = [
  { label: "Building 1", start: 0, weeks: 5, done: 5 },
  { label: "Building 2", start: 3, weeks: 6, done: 4 },
  { label: "Building 3", start: 12, weeks: 5, done: 0 },
];

/** Work by building across the season, in weeks from Sep 15. */
function Gantt() {
  const span = 18;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-bg p-3">
      <div className="ml-24 flex justify-between text-[11px] text-fg-3">
        {["Sep", "Oct", "Nov", "Dec", "Spring 2027"].map((m) => (
          <span key={m} className="num">
            {m}
          </span>
        ))}
      </div>
      {GANTT.map((g) => (
        <div key={g.label} className="flex items-center gap-2">
          <span className="w-22 shrink-0 text-xs text-fg-2">{g.label}</span>
          <div className="relative h-4 flex-1 rounded-sm bg-fg/[0.04]">
            <span className="absolute inset-y-0 rounded-sm bg-data-soft" style={{ left: `${(g.start / span) * 100}%`, width: `${(g.weeks / span) * 100}%` }} />
            <span className="absolute inset-y-0 rounded-sm bg-data" style={{ left: `${(g.start / span) * 100}%`, width: `${(g.done / span) * 100}%` }} />
          </div>
        </div>
      ))}
      <span className="text-[11px] text-fg-3">Filled: complete · Light: scheduled</span>
    </div>
  );
}

function ApprovalRow({ id, cells, waivers, amount }: { id: string; cells: string[]; waivers?: boolean; amount: number }) {
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
      <Td num>{fmt.usd(amount)}</Td>
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
