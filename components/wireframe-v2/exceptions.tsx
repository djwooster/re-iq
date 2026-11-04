"use client";

import { Paperclip } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { byUrgency } from "./overview";
import { ACTIONS, MANAGERS, PROPERTIES, STAGES, STAGE_LABEL, TEAM, TODAY, daysBetween, fmtDate, managerOf, property, stepName, type Exception, type Stage } from "./seed";
import { href, Page } from "./shell";
import { isOverdue, useWf } from "./store";
import { A, Bar, barW, Button, Card, Chart, Chip, Empty, Field, Input, Log, Row, Segmented, Select, StageChip, Table, Td, TextArea } from "./ui";

// ---- Exceptions list ----

const ALL = "All open";

export function Exceptions({ initialStatus }: { initialStatus?: string }) {
  const { state } = useWf();
  const start = STAGES.find((s) => s === initialStatus);
  const [status, setStatus] = useState<string>(start ? STAGE_LABEL[start] : ALL);
  const [prop, setProp] = useState("All properties");
  const [mgr, setMgr] = useState("All managers");

  const rows = state.exceptions
    .filter((e) => (status === ALL ? e.stage !== "closed" : STAGE_LABEL[e.stage] === status))
    .filter((e) => prop === "All properties" || property(e.property)!.name === prop)
    .filter((e) => mgr === "All managers" || managerOf(e.property).name === mgr)
    .sort(byUrgency);

  return (
    <Page title="Exceptions" subtitle="Every metric outside its threshold, across properties. This is where the month's work starts.">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Field label="Status">
            <Select value={status} onChange={setStatus} options={[ALL, ...STAGES.map((s) => STAGE_LABEL[s])]} />
          </Field>
        </div>
        <div className="w-40">
          <Field label="Property">
            <Select value={prop} onChange={setProp} options={["All properties", ...PROPERTIES.map((p) => p.name)]} />
          </Field>
        </div>
        <div className="w-40">
          <Field label="Manager">
            <Select value={mgr} onChange={setMgr} options={["All managers", ...MANAGERS.map((m) => m.name)]} />
          </Field>
        </div>
        <StageStrip counts={STAGES.map((s) => state.exceptions.filter((e) => e.stage === s).length)} onPick={(s) => setStatus(STAGE_LABEL[s])} />
      </div>
      {rows.length ? (
        <Table columns={["Trigger", "Property", "Manager", "Source report", "Status", "Age"]}>
          {rows.map((e) => (
            <Row key={e.id} href={href.exception(e.id)}>
              <Td className="font-medium text-[var(--wf-accent)]">{e.trigger}</Td>
              <Td className="whitespace-nowrap">{property(e.property)!.name}</Td>
              <Td className="whitespace-nowrap text-fg-2">{managerOf(e.property).name}</Td>
              <Td className="text-fg-2">{e.source}</Td>
              <Td>
                <StageChip e={e} />
              </Td>
              <Td className="whitespace-nowrap text-fg-2">{daysBetween(e.opened, TODAY)} days</Td>
            </Row>
          ))}
        </Table>
      ) : (
        <Empty>No exceptions match these filters.</Empty>
      )}
    </Page>
  );
}

function StageStrip({ counts, onPick }: { counts: number[]; onPick: (s: Stage) => void }) {
  return (
    <ol className="ml-auto flex flex-wrap items-center gap-1 text-[11px]">
      {STAGES.map((s, i) => (
        <li key={s} className="flex items-center gap-1">
          {i > 0 && <span className="text-fg-3">→</span>}
          <button type="button" onClick={() => onPick(s)} className="cursor-pointer rounded px-1.5 py-1 text-fg-2 hover:bg-fg/[0.05] hover:text-fg">
            {STAGE_LABEL[s]} <span className="text-fg-3">{counts[i]}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

// ---- Exception detail: steps 4–7 on one page ----

type SectionState = "done" | "current" | "upcoming";
const at = (e: Exception) => STAGES.indexOf(e.stage);

export function ExceptionDetail({ id }: { id: string }) {
  const { state } = useWf();
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
  return (
    <Page
      title={e.trigger}
      crumbs={[{ label: "Exceptions", href: "/wireframe-v2/exceptions" }, { label: p.name, href: href.property(p.id) }, { label: e.trigger }]}
      subtitle={`Opened ${fmtDate(e.opened)} · ${daysBetween(e.opened, TODAY)} days`}
      actions={<StageChip e={e} />}
    >
      <Card>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Meta label="Property">
            <A href={href.property(p.id)}>{p.name}</A>
          </Meta>
          <Meta label="Manager">{m.name}</Meta>
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
      <Section n={5} title="Ask the PM" state={i < 1 ? "upcoming" : i <= 2 ? "current" : "done"} note="Opens once you start diagnosing.">
        <AskPm e={e} />
      </Section>
      <Section n={6} title="Choose action" state={i < 3 ? "upcoming" : i === 3 ? "current" : "done"} note="Opens once the PM replies, or when you decide without asking.">
        <ChooseAndAssign e={e} />
      </Section>
      <Section n={7} title="Assign and track" state={i < 4 ? "upcoming" : i === 4 ? "current" : "done"} note="Choosing an action above assigns it and creates a task.">
        <Track e={e} />
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
        <h2 className="text-xs font-semibold">{title}</h2>
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
        <div className="flex items-center justify-between gap-3 rounded-md bg-[var(--wf-accent)]/[0.06] px-3 py-2.5 text-xs">
          <span>Drill from the KPI to the source. Three clicks or fewer.</span>
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

// ---- Step 5: ask the PM ----

function AskPm({ e }: { e: Exception }) {
  const { act } = useWf();
  const toast = useToast();
  const m = managerOf(e.property);
  const [text, setText] = useState("");
  const [due, setDue] = useState("2026-12-18");
  const [reply, setReply] = useState("");
  const [file, setFile] = useState<string>();
  const q = e.question;

  if (!q) {
    if (at(e) >= 3) return <p className="text-xs text-fg-3">Not asked. Moved to decide without a question to {m.name}.</p>;
    return (
      <div className="flex flex-col gap-3">
        <Field label={`Question to ${m.name}`}>
          <TextArea value={text} onChange={(ev) => setText(ev.target.value)} placeholder={`What would explain "${e.trigger.toLowerCase()}" at ${property(e.property)!.name}?`} />
        </Field>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <Field label="Due">
              <Input type="date" value={due} onChange={(ev) => setDue(ev.target.value)} />
            </Field>
          </div>
          <Button
            disabled={!text.trim()}
            onClick={() => {
              act.sendQuestion(e.id, text.trim(), due);
              toast(`Sent to ${m.name}`, { detail: "By email. Their reply comes back outside RE-IQ." });
            }}
          >
            Send
          </Button>
          <Button variant="secondary" onClick={() => act.skipToDecide(e.id)}>
            Decide without asking
          </Button>
        </div>
        <p className="text-[11px] text-fg-3">Goes by email to {m.contact.split(" · ")[1]}. The PM replies outside RE-IQ; record their answer here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md bg-fg/[0.03] px-3 py-2.5">
        <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] text-fg-3">
          <span>
            Sent {fmtDate(q.sent)} by email to {m.name}
          </span>
          {!q.reply && (isOverdue(e) ? <Chip tone="red">Overdue · due {fmtDate(q.due)}</Chip> : <Chip tone="amber">Waiting on PM · due {fmtDate(q.due)}</Chip>)}
          {q.reply && <Chip tone="green">Answered {fmtDate(q.reply.received)}</Chip>}
        </div>
        <p className="text-xs">{q.text}</p>
      </div>
      {q.reply ? (
        <div className="rounded-md border border-fg/15 px-3 py-2.5">
          <span className="mb-1.5 block text-[11px] text-fg-3">Reply from {m.name}</span>
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
          <Field label="Record reply">
            <TextArea value={reply} onChange={(ev) => setReply(ev.target.value)} placeholder="Paste the PM's answer, including their fix plan" />
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
            <Button disabled={!reply.trim() && !file} onClick={() => act.recordReply(e.id, reply.trim() || "See attached.", file)}>
              Save reply
            </Button>
            <span className="ml-auto">
              <Button
                variant="secondary"
                onClick={() => {
                  act.remind(e.id);
                  toast(`Reminder sent to ${m.name}`);
                }}
              >
                Send reminder
              </Button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Steps 6–7: choose, assign, track ----

function ChooseAndAssign({ e }: { e: Exception }) {
  const { state, act } = useWf();
  const toast = useToast();
  const m = managerOf(e.property);
  const [action, setAction] = useState<string>();
  const [why, setWhy] = useState("");
  const [assignee, setAssignee] = useState(`${m.name} (PM)`);
  const [due, setDue] = useState("2027-01-15");
  const [name, setName] = useState(`${property(e.property)!.name} capital project`);
  const [type, setType] = useState<"Interior" | "Exterior">("Exterior");

  if (e.action) {
    const project = state.projects.find((p) => p.id === e.projectId && p.exceptionId === e.id);
    return (
      <div className="flex flex-col gap-2 text-xs">
        <span>
          <span className="text-fg-3">Decided:</span> {e.action}
        </span>
        {project && (
          <span>
            <span className="text-fg-3">Project:</span> <A href={href.project(project.id)}>{project.name}</A> · Step {project.step} of 6 · {stepName(project.type, project.step)}
          </span>
        )}
      </div>
    );
  }

  const capital = action === "Start a capital project";
  const submit = () => {
    if (!action) return;
    act.assign(e.id, { action, why: why.trim(), assignee: assignee.replace(" (PM)", ""), due, project: capital ? { name: name.trim() || "Capital project", type } : undefined });
    toast(capital ? "Project created in Renovations" : "Task created", { detail: "Decision written to the decision log." });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md bg-fg/[0.03] px-3 py-2.5 text-xs">
        <span className="text-[11px] text-fg-3">Typical decision for this trigger</span>
        <p className="mt-0.5">{e.typical}</p>
        <p className="mt-1 text-[11px] text-fg-3">From your thresholds table. You decide.</p>
      </div>
      <fieldset className="grid gap-1.5 md:grid-cols-2">
        <legend className="mb-1.5 text-[11px] font-medium text-fg-2">Action</legend>
        {ACTIONS.map((a) => (
          <label key={a} className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-xs transition-colors", action === a ? "border-[var(--wf-accent)] bg-[var(--wf-accent)]/[0.05]" : "border-fg/15 hover:border-fg/40")}>
            <input type="radio" name={`action-${e.id}`} checked={action === a} onChange={() => setAction(a)} className="accent-[var(--wf-accent)]" />
            {a}
          </label>
        ))}
      </fieldset>
      {capital && (
        <div className="grid gap-3 rounded-md border border-fg/15 p-3 md:grid-cols-[1fr_200px]">
          <Field label="Project name">
            <Input value={name} onChange={(ev) => setName(ev.target.value)} />
          </Field>
          <Field label="Type">
            <Select value={type} onChange={(v) => setType(v as "Interior" | "Exterior")} options={["Exterior", "Interior"]} />
          </Field>
          <p className="text-[11px] text-fg-3 md:col-span-2">Creates a renovation project at step 1, Find the opportunity, carrying this exception and its evidence.</p>
        </div>
      )}
      <Field label="Why">
        <TextArea rows={2} value={why} onChange={(ev) => setWhy(ev.target.value)} placeholder="Goes in the decision log" />
      </Field>
      <div className="flex flex-wrap items-end gap-3 border-t border-fg/10 pt-3">
        <div className="w-48">
          <Field label="Assign to">
            <Select value={assignee} onChange={setAssignee} options={[`${m.name} (PM)`, ...TEAM]} />
          </Field>
        </div>
        <div className="w-40">
          <Field label="Due">
            <Input type="date" value={due} onChange={(ev) => setDue(ev.target.value)} />
          </Field>
        </div>
        <Button disabled={!action} onClick={submit}>
          {capital ? "Create project and assign" : "Assign"}
        </Button>
      </div>
    </div>
  );
}

function Track({ e }: { e: Exception }) {
  const { state, act } = useWf();
  const tasks = state.tasks.filter((t) => t.exceptionId === e.id);
  if (!tasks.length) return <p className="text-xs text-fg-3">No task yet.</p>;
  return (
    <div className="flex flex-col gap-3">
      <Table columns={["Task", "Owner", "Due", "Status"]}>
        {tasks.map((t) => (
          <Row key={t.id}>
            <Td>
              {t.title}
              {t.projectId && (
                <span className="ml-2 text-[11px]">
                  <A href={href.project(t.projectId)}>Open project</A>
                </span>
              )}
            </Td>
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
          <span className="text-[11px] text-fg-3">Close once the action is done and the metric is back inside its threshold.</span>
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
