"use client";

import { Paperclip } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { byUrgency } from "./overview";
import { ACTION_SUGGESTIONS, CAPITAL_PROJECT, MANAGERS, PROPERTIES, STAGES, STAGE_LABEL, TEAM, TODAY, days, daysBetween, fmtDate, managerOf, property, projectStage, type Exception, type Stage } from "./seed";
import { href, Page } from "./shell";
import { isOverdue, useWf } from "./store";
import { TrendChart } from "./chart";
import { drillUnits, evidence } from "./evidence";
import { fmt } from "./metrics";
import { A, Button, Card, Chip, Delta, Empty, Field, Input, Log, Row, Segmented, Select, StageChip, Table, Tabs, Td, TextArea } from "./ui";

const TONE_TEXT = { favorable: "text-favorable", unfavorable: "text-unfavorable", warning: "text-warning" } as const;

// ---- Exceptions list ----

type StatusTab = "open" | Stage;

export function Exceptions({ initialStatus }: { initialStatus?: string }) {
  const { state } = useWf();
  const [status, setStatus] = useState<StatusTab>(STAGES.find((s) => s === initialStatus) ?? "open");
  const [prop, setProp] = useState("All properties");
  const [mgr, setMgr] = useState("All managers");

  const inTab = (e: Exception, t: StatusTab) => (t === "open" ? e.stage !== "closed" : e.stage === t);
  const rows = state.exceptions
    .filter((e) => inTab(e, status))
    .filter((e) => prop === "All properties" || property(e.property)!.name === prop)
    .filter((e) => mgr === "All managers" || managerOf(e.property).name === mgr)
    .sort(byUrgency);

  return (
    <Page title="Exceptions">
      <div className="flex flex-wrap gap-2">
        <div className="w-40">
          <Select value={prop} onChange={setProp} options={["All properties", ...PROPERTIES.map((p) => p.name)]} />
        </div>
        <div className="w-40">
          <Select value={mgr} onChange={setMgr} options={["All managers", ...MANAGERS.map((m) => m.name)]} />
        </div>
      </div>
      <Tabs
        value={status}
        onChange={setStatus}
        tabs={(["open", ...STAGES] as StatusTab[]).map((t) => ({ id: t, label: t === "open" ? "All open" : STAGE_LABEL[t], count: state.exceptions.filter((e) => inTab(e, t)).length }))}
      />
      {rows.length ? (
        <Table columns={["Trigger", "Property", "Manager", { label: "Actual", num: true }, "Threshold", "Source report", "Status", { label: "Age", num: true }]}>
          {rows.map((e) => {
            const ev = evidence(e.id);
            return (
              <Row key={e.id} href={href.exception(e.id)}>
                <Td className="font-medium">{e.trigger}</Td>
                <Td className="whitespace-nowrap">{property(e.property)!.name}</Td>
                <Td className="whitespace-nowrap">
                  <A href={href.manager(managerOf(e.property).id)} className="font-normal text-fg-2">
                    {managerOf(e.property).name}
                  </A>
                </Td>
                <Td num className={TONE_TEXT[ev.metric.tone]}>
                  {ev.metric.format(ev.metric.actual)}
                </Td>
                <Td className="whitespace-nowrap text-fg-3">{e.threshold}</Td>
                <Td className="text-fg-2">{e.source}</Td>
                <Td>
                  <StageChip e={e} />
                </Td>
                <Td num className="text-fg-2">
                  {days(daysBetween(e.opened, TODAY))}
                </Td>
              </Row>
            );
          })}
        </Table>
      ) : (
        <Empty>No exceptions match these filters.</Empty>
      )}
    </Page>
  );
}

// ---- Exception detail: steps 4–7 on one page ----

type SectionState = "done" | "current" | "upcoming";
const at = (e: Exception) => STAGES.indexOf(e.stage);

export function ExceptionDetail({ id }: { id: string }) {
  const { state } = useWf();
  const [actNow, setActNow] = useState(false);
  const e = state.exceptions.find((x) => x.id === id);
  if (!e) {
    return (
      <Page title="Exception not found" crumbs={[{ label: "Exceptions", href: "/prototype/exceptions" }]}>
        <Empty>This exception doesn&apos;t exist.</Empty>
      </Page>
    );
  }
  const p = property(e.property)!;
  const m = managerOf(e.property);
  const i = at(e);
  const replied = !!e.question?.reply;
  const ask: SectionState = i < 1 ? "upcoming" : replied || i >= 3 ? "done" : "current";
  const act: SectionState = i === 4 ? "done" : i === 3 || replied || actNow ? "current" : "upcoming";
  return (
    <Page
      title={e.trigger}
      crumbs={[{ label: "Exceptions", href: "/prototype/exceptions" }, { label: p.name, href: href.property(p.id) }, { label: e.trigger }]}
      subtitle={`Opened ${fmtDate(e.opened)} · ${days(daysBetween(e.opened, TODAY))}`}
      actions={<StageChip e={e} />}
    >
      <Card>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Meta label="Property">
            <A href={href.property(p.id)}>{p.name}</A>
          </Meta>
          <Meta label="Manager">
            <A href={href.manager(m.id)}>{m.name}</A>
          </Meta>
          <Meta label="Source report">{e.source}</Meta>
          <Meta label="Threshold">{e.threshold}</Meta>
          <Meta label="Actual">
            <span className={cn("num text-sm", TONE_TEXT[evidence(e.id).metric.tone])}>{evidence(e.id).metric.format(evidence(e.id).metric.actual)}</span>
          </Meta>
          <Meta label="Status">
            <StageProgress stage={e.stage} />
          </Meta>
        </dl>
      </Card>

      <Section n={4} title="Diagnose" state={i <= 1 ? "current" : "done"}>
        <Diagnose e={e} />
      </Section>
      <Section n={5} title="Waiting on PM" state={ask} note="Opens once you start diagnosing">
        <WaitPm e={e} onActNow={() => setActNow(true)} actNow={actNow} />
      </Section>
      <Section n={6} title="Act" state={act} note="Opens once the PM replies">
        <Act e={e} />
      </Section>
      <Card title="Log" action={<A href="/prototype/decisions" className="text-xs">Decision log</A>}>
        <Log entries={e.log} />
      </Card>
    </Page>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-fg-3">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function StageProgress({ stage }: { stage: Stage }) {
  const i = STAGES.indexOf(stage);
  return (
    <span className="flex items-center gap-1" title={STAGES.map((s) => STAGE_LABEL[s]).join(" → ")}>
      {STAGES.map((s, j) => (
        <span key={s} className={cn("h-1 w-4 rounded-full", j <= i ? "bg-fg/70" : "bg-fg/10")} />
      ))}
      <span className="ml-1 text-xs text-fg-2">{STAGE_LABEL[stage]}</span>
    </span>
  );
}

function Section({ n, title, state, note, children }: { n: number; title: string; state: SectionState; note?: string; children: React.ReactNode }) {
  if (state === "upcoming") {
    return (
      <section className="flex items-center gap-3 rounded-lg border border-dashed border-border px-4 py-3">
        <StepNum n={n} state={state} />
        <span className="text-xs font-medium text-fg-3">{title}</span>
        <span className="text-xs text-fg-3">· {note}</span>
      </section>
    );
  }
  return (
    <section className={cn("rounded-lg border bg-surface", state === "current" ? "border-border-strong" : "border-border")}>
      <header className="flex items-center gap-3 px-4 pt-3 pb-1">
        <StepNum n={n} state={state} />
        <h2 className="text-[13px] font-semibold text-fg">{title}</h2>
        {state === "done" && <Chip tone="green">Done</Chip>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function StepNum({ n, state }: { n: number; state: SectionState }) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
        state === "current" ? "bg-inverted text-inverted-fg" : state === "done" ? "bg-favorable/15 text-favorable" : "border border-border text-fg-3",
      )}
    >
      {state === "done" ? "✓" : n}
    </span>
  );
}

// ---- Step 4: drill path ----

function Diagnose({ e }: { e: Exception }) {
  const { act } = useWf();
  const [level, setLevel] = useState(0);
  const pick = (n: number) => {
    setLevel(n);
    if (e.stage === "new") act.startDiagnosis(e.id);
  };
  const d = e.drill[level];
  const last = e.drill[3];
  const ev = evidence(e.id);

  return (
    <div className="flex flex-col gap-4">
      {e.stage === "new" && (
        <div>
          <Button onClick={() => act.startDiagnosis(e.id)}>Start diagnosing</Button>
        </div>
      )}
      <ol className="flex flex-wrap items-center gap-1.5">
        {e.drill.map((lv, n) => (
          <li key={lv.kind} className="flex items-center gap-1.5">
            {n > 0 && <span className="text-xs text-fg-3">→</span>}
            <button
              type="button"
              onClick={() => pick(n)}
              className={cn(
                "flex cursor-pointer flex-col items-start rounded-md border px-2.5 py-1.5 text-left transition-colors",
                n === level ? "border-fg/60 bg-bg" : "border-border hover:border-border-strong",
              )}
            >
              <span className="text-[11px] text-fg-3">{lv.kind}</span>
              <span className="text-xs font-medium">{lv.label}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="rounded-md border border-border bg-bg p-3">
        {level === 0 && (
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <TrendChart
              data={ev.metric.series}
              series={[{ key: "value", label: d.label, style: "data" }]}
              format={ev.metric.format}
              threshold={{ value: ev.metric.threshold, label: ev.metric.thresholdLabel }}
              height={180}
            />
            <div className="flex flex-col gap-3 text-xs">
              <span className="flex flex-col gap-1">
                <span className="text-xs text-fg-3">Threshold</span>
                {e.threshold}
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-xs text-fg-3">Actual</span>
                <span className={cn("num text-base", TONE_TEXT[ev.metric.tone])}>{ev.metric.format(ev.metric.actual)}</span>
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-xs text-fg-3">Source</span>
                {e.source}
              </span>
              <div>
                <Button variant="secondary" onClick={() => pick(1)}>
                  Open {e.drill[1].label.split(" · ")[0]} →
                </Button>
              </div>
            </div>
          </div>
        )}
        {level === 1 && (
          <Table bare columns={[d.label, { label: "Actual", num: true }, { label: "Plan", num: true }, { label: "Variance", num: true }]}>
            {(d.rows ?? []).map((r, n) => {
              const hit = r === e.drill[2].label;
              const row = ev.report[n];
              return (
                <Row key={r} highlight={hit} onClick={hit ? () => pick(2) : undefined}>
                  <Td>{hit ? <span className="font-medium underline decoration-fg/30 underline-offset-[3px]">{r}</span> : <span className="text-fg-2">{r}</span>}</Td>
                  <Td num>{row.actual === null ? <span className="text-fg-3">None</span> : row.format(row.actual)}</Td>
                  <Td num className="text-fg-2">
                    {row.plan === null ? <span className="text-fg-3">None</span> : row.format(row.plan)}
                  </Td>
                  <Td num>{row.actual !== null && row.plan !== null ? <Delta value={row.actual - row.plan} format={(v) => (v > 0 ? "+" : "") + row.format(v)} good={row.good} /> : <span className="text-fg-3">–</span>}</Td>
                </Row>
              );
            })}
          </Table>
        )}
        {level === 2 && (
          <div className="flex flex-col gap-3">
            <Table bare columns={["", ...ev.line.months.map((mo) => ({ label: mo, num: true }))]}>
              {(["Actual", "Plan"] as const).map((r) => (
                <Row key={r}>
                  <Td className="text-fg-2">{r}</Td>
                  {ev.line.months.map((mo, j) => {
                    const v = r === "Actual" ? ev.line.actual[j] : ev.line.plan[j];
                    const off = r === "Actual" && v !== null && (ev.line.good === "down" ? v > ev.line.plan[j] * 1.05 : v < ev.line.plan[j] * 0.95);
                    return (
                      <Td key={mo} num className={off ? "text-unfavorable" : r === "Plan" ? "text-fg-3" : undefined}>
                        {v === null ? "–" : ev.line.format(v)}
                      </Td>
                    );
                  })}
                </Row>
              ))}
            </Table>
            <p className="text-xs text-fg-3">Manager commentary: none in the package.</p>
            <div>
              <Button variant="secondary" onClick={() => pick(3)}>
                Open {last.kind === "Units" ? "units" : "GL transactions"} →
              </Button>
            </div>
          </div>
        )}
        {level === 3 &&
          (last.kind === "Units" ? (
            <Table bare columns={["Unit", "Floor plan", "Status", { label: "Lease rent", num: true }, { label: "Market rent", num: true }, { label: "Balance", num: true }]}>
              {drillUnits(e.property, last.rows ?? []).map((u) => (
                <Row key={u.num} href={href.unit(e.property, u.num)}>
                  <Td className="font-medium">Unit {u.num}</Td>
                  <Td className="text-fg-2">{u.plan.name}</Td>
                  <Td className="text-fg-2">{u.occupancy}</Td>
                  <Td num>{u.leaseRent === null ? <span className="text-fg-3">Vacant</span> : fmt.usd(u.leaseRent)}</Td>
                  <Td num className="text-fg-2">
                    {fmt.usd(u.market)}
                  </Td>
                  <Td num className={u.balance > 1000 ? "text-unfavorable" : "text-fg-3"}>
                    {u.balance ? fmt.usd(u.balance) : "$0"}
                  </Td>
                </Row>
              ))}
            </Table>
          ) : (
            <Table bare columns={["Date", "Vendor / description", "GL account", "Invoice", { label: "Amount", num: true }]}>
              {(ev.gl ?? []).map((t) => (
                <Row key={t.invoice}>
                  <Td className="num whitespace-nowrap text-xs text-fg-2">{t.date}</Td>
                  <Td>{t.vendor}</Td>
                  <Td className="text-fg-2">{e.drill[2].label}</Td>
                  <Td className="num text-xs text-fg-3">{t.invoice}</Td>
                  <Td num>{fmt.usd(t.amount)}</Td>
                </Row>
              ))}
            </Table>
          ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1 rounded-md bg-fg/[0.035] px-3 py-2.5">
          <span className="text-xs text-fg-3">Likely cause to check</span>
          <span className="text-xs">{e.cause}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md bg-fg/[0.035] px-3 py-2.5">
          <span className="text-xs text-fg-3">Is this one-time or ongoing?</span>
          <NatureToggle e={e} />
        </div>
      </div>
    </div>
  );
}

function NatureToggle({ e }: { e: Exception }) {
  const { act } = useWf();
  const opts = ["One-time", "Ongoing"] as const;
  return (
    <div className="flex rounded-md border border-border bg-surface p-0.5">
      {opts.map((o) => (
        <button key={o} type="button" aria-pressed={e.nature === o} onClick={() => act.setNature(e.id, o)} className={cn("cursor-pointer rounded px-2 py-1 text-xs", e.nature === o ? "bg-bg font-medium text-fg shadow-[0_0_0_1px_var(--border)]" : "text-fg-3 hover:text-fg")}>
          {o}
        </button>
      ))}
    </div>
  );
}

// ---- Step 5: waiting on the PM (the conversation happens by phone or email) ----

function WaitPm({ e, onActNow, actNow }: { e: Exception; onActNow: () => void; actNow: boolean }) {
  const { act } = useWf();
  const m = managerOf(e.property);
  const [note, setNote] = useState("");
  const [due, setDue] = useState("2026-12-18");
  const [answer, setAnswer] = useState("");
  const [file, setFile] = useState<string>();
  const q = e.question;

  if (!q) {
    if (at(e) >= 3 || actNow) return <p className="text-xs text-fg-3">Not waiting on {m.name}.</p>;
    return (
      <div className="flex flex-col gap-3">
        <Field label={`What you asked ${m.name} (optional)`}>
          <TextArea rows={2} value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="e.g. Called the regional manager; they'll send a fix plan" />
        </Field>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <Field label="Expect an answer by">
              <Input type="date" value={due} onChange={(ev) => setDue(ev.target.value)} />
            </Field>
          </div>
          <Button onClick={() => act.markWaiting(e.id, note.trim(), due)}>Mark waiting on PM</Button>
          <Button variant="secondary" onClick={onActNow}>
            Act without the PM
          </Button>
        </div>
        <p className="text-xs text-fg-3">
          <A href={href.manager(m.id)}>{m.name}</A> · {m.email}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md bg-fg/[0.035] px-3 py-2.5">
        <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-fg-3">
          <span>
            Waiting on <A href={href.manager(m.id)}>{m.name}</A> since {fmtDate(q.sent)}
          </span>
          {!q.reply && (isOverdue(e) ? <Chip tone="red">Overdue · due {fmtDate(q.due)}</Chip> : <Chip tone="amber">Due {fmtDate(q.due)}</Chip>)}
          {q.reply && <Chip tone="green">Answered {fmtDate(q.reply.received)}</Chip>}
        </div>
        {q.text ? <p className="text-xs">{q.text}</p> : <p className="text-xs text-fg-3">No note</p>}
      </div>
      {q.reply ? (
        <div className="rounded-md border border-border px-3 py-2.5">
          <span className="mb-1.5 block text-xs text-fg-3">{m.name}&apos;s answer</span>
          <p className="text-xs">{q.reply.text}</p>
          {q.reply.file && (
            <span className="mt-2 inline-block">
              <Chip>
                <Paperclip size={11} /> {q.reply.file}
              </Chip>
            </span>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <Field label="Their answer">
            <TextArea rows={2} value={answer} onChange={(ev) => setAnswer(ev.target.value)} placeholder="What they said, including any fix plan" />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            {file ? (
              <Chip>
                <Paperclip size={11} /> {file}
              </Chip>
            ) : (
              <Button variant="secondary" onClick={() => setFile(`${e.trigger.split(" ")[0]} fix plan.pdf`)}>
                Attach file
              </Button>
            )}
            <Button disabled={!answer.trim() && !file} onClick={() => act.recordReply(e.id, answer.trim() || "See attached.", file)}>
              Save answer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Step 6: act (what, who, by when), then track it ----

function Act({ e }: { e: Exception }) {
  const { act } = useWf();
  const toast = useToast();
  const m = managerOf(e.property);
  const [action, setAction] = useState("");
  const [why, setWhy] = useState("");
  const [assignee, setAssignee] = useState(`${m.name} (PM)`);
  const [due, setDue] = useState("2027-01-15");
  const [name, setName] = useState(`${property(e.property)!.name} capital project`);
  const [type, setType] = useState<"Interior" | "Exterior">("Exterior");

  if (e.action) return <Tracking e={e} />;

  const suggestions = [e.typical, ...ACTION_SUGGESTIONS.filter((a) => a !== e.typical)];
  const capital = action.trim() === CAPITAL_PROJECT;
  const submit = () => {
    act.assign(e.id, { action: action.trim(), why: why.trim(), assignee: assignee.replace(" (PM)", ""), due, project: capital ? { name: name.trim() || "Capital project", type } : undefined });
    toast(capital ? "Project created" : "Action assigned");
  };

  return (
    <div className="flex flex-col gap-4">
      <Field label="Action">
        <Input value={action} onChange={(ev) => setAction(ev.target.value)} placeholder="What you'll do about it" />
      </Field>
      <div className="-mt-2 flex flex-wrap items-center gap-1.5">
        {suggestions.map((a, n) => (
          <button
            key={a}
            type="button"
            onClick={() => setAction(a)}
            className={cn("cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors", action === a ? "border-fg/60 text-fg" : "border-border text-fg-2 hover:border-border-strong")}
          >
            {a}
            {n === 0 && <span className="ml-1 text-fg-3">· typical for this trigger</span>}
          </button>
        ))}
      </div>
      {capital && (
        <div className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[1fr_200px]">
          <Field label="Project name">
            <Input value={name} onChange={(ev) => setName(ev.target.value)} />
          </Field>
          <Field label="Type">
            <Select value={type} onChange={(v) => setType(v as "Interior" | "Exterior")} options={["Exterior", "Interior"]} />
          </Field>
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Field label="Owner">
            <Select value={assignee} onChange={setAssignee} options={[`${m.name} (PM)`, ...TEAM]} />
          </Field>
        </div>
        <div className="w-40">
          <Field label="Due">
            <Input type="date" value={due} onChange={(ev) => setDue(ev.target.value)} />
          </Field>
        </div>
        <div className="min-w-56 flex-1">
          <Field label="Why (optional)">
            <Input value={why} onChange={(ev) => setWhy(ev.target.value)} placeholder="Kept in the decision log" />
          </Field>
        </div>
        <Button disabled={!action.trim()} onClick={submit}>
          {capital ? "Create project and assign" : "Assign"}
        </Button>
      </div>
    </div>
  );
}

function Tracking({ e }: { e: Exception }) {
  const { state, act } = useWf();
  const tasks = state.tasks.filter((t) => t.exceptionId === e.id);
  const project = state.projects.find((p) => p.id === e.projectId && p.exceptionId === e.id);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs">
        <span className="text-fg-3">Action:</span> {e.action}
        {project && (
          <span className="ml-3">
            <span className="text-fg-3">Project:</span> <A href={href.project(project.id)}>{project.name}</A> · {projectStage(project)}
          </span>
        )}
      </p>
      <Table columns={["Task", "Owner", "Due", "Status"]}>
        {tasks.map((t) => (
          <Row key={t.id}>
            <Td>{t.title}</Td>
            <Td className="whitespace-nowrap text-fg-2">{t.owner}</Td>
            <Td className="whitespace-nowrap text-fg-2">{fmtDate(t.due)}</Td>
            <Td className="w-40">
              <Segmented label="" value={t.status} options={["Open", "In progress", "Done"] as const} onChange={(s) => act.setTaskStatus(t.id, s)} />
            </Td>
          </Row>
        ))}
      </Table>
      {e.stage === "assigned" ? (
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => act.closeException(e.id)}>
            Close exception
          </Button>
        </div>
      ) : (
        <p className="text-xs text-fg-3">Closed.</p>
      )}
    </div>
  );
}

export function ExceptionLink({ e }: { e: Exception }) {
  return (
    <Link href={href.exception(e.id)} className="group flex flex-wrap items-center justify-between gap-2 border-b border-border/70 py-2 last:border-b-0">
      <span className="text-xs font-medium group-hover:underline">{e.trigger}</span>
      <StageChip e={e} />
    </Link>
  );
}
