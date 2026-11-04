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
import { A, Bar, barW, Button, Card, Chart, Chip, Empty, Field, Input, Log, Row, Segmented, Select, StageChip, Table, Tabs, Td, TextArea } from "./ui";

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
      <Tabs
        value={status}
        onChange={setStatus}
        tabs={(["open", ...STAGES] as StatusTab[]).map((t) => ({ id: t, label: t === "open" ? "All open" : STAGE_LABEL[t], count: state.exceptions.filter((e) => inTab(e, t)).length }))}
      />
      <div className="flex flex-wrap gap-2">
        <div className="w-40">
          <Select value={prop} onChange={setProp} options={["All properties", ...PROPERTIES.map((p) => p.name)]} />
        </div>
        <div className="w-40">
          <Select value={mgr} onChange={setMgr} options={["All managers", ...MANAGERS.map((m) => m.name)]} />
        </div>
      </div>
      {rows.length ? (
        <Table columns={["Trigger", "Property", "Manager", "Source report", "Status", "Age"]}>
          {rows.map((e) => (
            <Row key={e.id} href={href.exception(e.id)}>
              <Td className="font-medium text-[var(--wf-accent)]">{e.trigger}</Td>
              <Td className="whitespace-nowrap">{property(e.property)!.name}</Td>
              <Td className="whitespace-nowrap">
                <A href={href.manager(managerOf(e.property).id)}>{managerOf(e.property).name}</A>
              </Td>
              <Td className="text-fg-2">{e.source}</Td>
              <Td>
                <StageChip e={e} />
              </Td>
              <Td className="whitespace-nowrap text-fg-2">{days(daysBetween(e.opened, TODAY))}</Td>
            </Row>
          ))}
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
      <Page title="Exception not found" crumbs={[{ label: "Exceptions", href: "/wireframe-v2/exceptions" }]}>
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
      crumbs={[{ label: "Exceptions", href: "/wireframe-v2/exceptions" }, { label: p.name, href: href.property(p.id) }, { label: e.trigger }]}
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
            <Bar w={10} className="bg-unfavorable/35" />
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
      <Card title="Log" action={<A href="/wireframe-v2/decisions" className="text-[11px]">Decision log</A>}>
        <Log entries={e.log} />
      </Card>
    </Page>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[11px] text-fg-3">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function StageProgress({ stage }: { stage: Stage }) {
  const i = STAGES.indexOf(stage);
  return (
    <span className="flex items-center gap-1" title={STAGES.map((s) => STAGE_LABEL[s]).join(" → ")}>
      {STAGES.map((s, j) => (
        <span key={s} className={cn("h-1.5 w-4 rounded-full", j <= i ? "bg-[var(--wf-accent)]" : "bg-fg/10")} />
      ))}
      <span className="ml-1 text-[11px] text-fg-2">{STAGE_LABEL[stage]}</span>
    </span>
  );
}

function Section({ n, title, state, note, children }: { n: number; title: string; state: SectionState; note?: string; children: React.ReactNode }) {
  if (state === "upcoming") {
    return (
      <section className="flex items-center gap-3 rounded-md border border-dashed border-fg/20 px-4 py-3">
        <StepNum n={n} state={state} />
        <span className="text-xs font-medium text-fg-3">{title}</span>
        <span className="text-[11px] text-fg-3">· {note}</span>
      </section>
    );
  }
  return (
    <section className={cn("rounded-md border bg-bg", state === "current" ? "border-[var(--wf-accent)]/50" : "border-fg/15")}>
      <header className="flex items-center gap-3 border-b border-fg/10 px-4 py-2.5">
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
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
        state === "current" ? "bg-[var(--wf-accent)] text-white" : state === "done" ? "bg-favorable/15 text-favorable" : "border border-fg/20 text-fg-3",
      )}
    >
      {state === "done" ? "✓" : n}
    </span>
  );
}

// ---- Step 4: drill path ----

const MONTHS = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];

function Diagnose({ e }: { e: Exception }) {
  const { act } = useWf();
  const [level, setLevel] = useState(0);
  const pick = (n: number) => {
    setLevel(n);
    if (e.stage === "new") act.startDiagnosis(e.id);
  };
  const d = e.drill[level];
  const last = e.drill[3];

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
                n === level ? "border-[var(--wf-accent)] bg-[var(--wf-accent)]/[0.06]" : "border-fg/15 hover:border-fg/40",
              )}
            >
              <span className="text-[10px] text-fg-3">{lv.kind}</span>
              <span className="text-xs font-medium">{lv.label}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="rounded-md border border-fg/10 p-3">
        {level === 0 && (
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <Chart label={`${d.label} · last 12 months vs. threshold`} />
            <div className="flex flex-col gap-3 text-xs">
              <span className="flex flex-col gap-1">
                <span className="text-[11px] text-fg-3">Threshold</span>
                {e.threshold}
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-[11px] text-fg-3">Actual</span>
                <Bar w={10} className="bg-unfavorable/35" />
              </span>
              <Button variant="secondary" onClick={() => pick(1)}>
                Open {e.drill[1].label.split(" · ")[0]} →
              </Button>
            </div>
          </div>
        )}
        {level === 1 && (
          <Table columns={[d.label, "Actual", "Plan", "Variance"]}>
            {(d.rows ?? []).map((r, n) => {
              const hit = r === e.drill[2].label;
              return (
                <Row key={r} highlight={hit}>
                  <Td>{hit ? <button type="button" onClick={() => pick(2)} className="cursor-pointer font-medium text-[var(--wf-accent)] hover:underline">{r}</button> : <span className="text-fg-2">{r}</span>}</Td>
                  {[0, 1, 2].map((j) => (
                    <Td key={j}>
                      <Bar w={barW(n + j)} className={hit && j === 2 ? "bg-unfavorable/35" : undefined} />
                    </Td>
                  ))}
                </Row>
              );
            })}
          </Table>
        )}
        {level === 2 && (
          <div className="flex flex-col gap-3">
            <Table columns={["", ...MONTHS]}>
              {["Actual", "Plan"].map((r, n) => (
                <Row key={r}>
                  <Td className="text-fg-2">{r}</Td>
                  {MONTHS.map((mo, j) => (
                    <Td key={mo}>
                      <Bar w={barW(n + j, 6, 6)} className={n === 0 && j >= 3 ? "bg-unfavorable/35" : undefined} />
                    </Td>
                  ))}
                </Row>
              ))}
            </Table>
            <p className="text-[11px] text-fg-3">Manager commentary: none in the package.</p>
            <div>
              <Button variant="secondary" onClick={() => pick(3)}>
                Open {last.kind === "Units" ? "units" : "GL transactions"} →
              </Button>
            </div>
          </div>
        )}
        {level === 3 &&
          (last.kind === "Units" ? (
            <Table columns={["Unit", "Status", "Rent", "Balance"]}>
              {(last.rows ?? []).map((u, n) => {
                const num = u.replace("Unit ", "");
                return (
                  <Row key={u} href={href.unit(e.property, num)}>
                    <Td className="font-medium text-[var(--wf-accent)]">{u}</Td>
                    <Td className="text-fg-2">{e.trigger.startsWith("60-day") ? "Notice to vacate" : e.trigger.startsWith("Days") ? "Vacant, not ready" : "Occupied"}</Td>
                    <Td>
                      <Bar w={barW(n)} />
                    </Td>
                    <Td>
                      <Bar w={barW(n + 2, 4, 6)} />
                    </Td>
                  </Row>
                );
              })}
            </Table>
          ) : (
            <Table columns={["Date", "Vendor / description", "GL account", "Invoice", "Amount"]}>
              {(last.rows ?? []).map((t, n) => (
                <Row key={t}>
                  <Td className="whitespace-nowrap text-fg-2">{["Nov 4", "Nov 11", "Nov 19", "Nov 26"][n]}</Td>
                  <Td>{t}</Td>
                  <Td className="text-fg-2">{e.drill[2].label}</Td>
                  <Td className="num text-[11px] text-fg-3">INV-{4100 + n * 37}</Td>
                  <Td>
                    <Bar w={barW(n)} />
                  </Td>
                </Row>
              ))}
            </Table>
          ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1 rounded-md bg-fg/[0.03] px-3 py-2.5">
          <span className="text-[11px] text-fg-3">Likely cause to check</span>
          <span className="text-xs">{e.cause}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md bg-fg/[0.03] px-3 py-2.5">
          <span className="text-[11px] text-fg-3">Is this one-time or ongoing?</span>
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
    <div className="flex rounded-md border border-fg/15 p-0.5">
      {opts.map((o) => (
        <button key={o} type="button" onClick={() => act.setNature(e.id, o)} className={cn("cursor-pointer rounded px-2 py-1 text-[11px]", e.nature === o ? "bg-fg/[0.08] font-medium text-fg" : "text-fg-3 hover:text-fg")}>
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
        <p className="text-[11px] text-fg-3">
          <A href={href.manager(m.id)}>{m.name}</A> · {m.contact}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md bg-fg/[0.03] px-3 py-2.5">
        <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] text-fg-3">
          <span>
            Waiting on <A href={href.manager(m.id)}>{m.name}</A> since {fmtDate(q.sent)}
          </span>
          {!q.reply && (isOverdue(e) ? <Chip tone="red">Overdue · due {fmtDate(q.due)}</Chip> : <Chip tone="amber">Due {fmtDate(q.due)}</Chip>)}
          {q.reply && <Chip tone="green">Answered {fmtDate(q.reply.received)}</Chip>}
        </div>
        {q.text ? <p className="text-xs">{q.text}</p> : <p className="text-xs text-fg-3">No note</p>}
      </div>
      {q.reply ? (
        <div className="rounded-md border border-fg/15 px-3 py-2.5">
          <span className="mb-1.5 block text-[11px] text-fg-3">{m.name}&apos;s answer</span>
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
        <div className="flex flex-col gap-3 border-t border-fg/10 pt-3">
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
            className={cn("cursor-pointer rounded-full border px-2.5 py-1 text-[11px] transition-colors", action === a ? "border-[var(--wf-accent)] text-fg" : "border-fg/15 text-fg-2 hover:border-fg/40")}
          >
            {a}
            {n === 0 && <span className="ml-1 text-fg-3">· typical for this trigger</span>}
          </button>
        ))}
      </div>
      {capital && (
        <div className="grid gap-3 rounded-md border border-fg/15 p-3 md:grid-cols-[1fr_200px]">
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
    <Link href={href.exception(e.id)} className="group flex flex-wrap items-center justify-between gap-2 border-b border-fg/10 py-2 last:border-b-0">
      <span className="text-xs font-medium text-[var(--wf-accent)] group-hover:underline">{e.trigger}</span>
      <StageChip e={e} />
    </Link>
  );
}
