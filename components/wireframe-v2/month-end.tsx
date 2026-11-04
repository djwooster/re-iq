"use client";

import { useToast } from "@/components/ui/toast";
import { blocker, readyProperties } from "./derive";
import { CLOSE_MONTH, PROPERTIES, STAGE_LABEL, fmtDate, managerOf, property, stepName } from "./seed";
import { href, Page } from "./shell";
import { isOverdue, useWf } from "./store";
import { A, Bar, barW, Button, Card, Chart, Chip, Empty, Row, Segmented, StageChip, Table, Td } from "./ui";

export function Questions() {
  const { state } = useWf();
  const rows = state.exceptions.filter((e) => e.question).sort((a, b) => b.question!.sent.localeCompare(a.question!.sent));
  return (
    <Page title="Questions" subtitle="Everything asked of the property managers. Questions go by email; replies are recorded on the exception.">
      {rows.length ? (
        <Table columns={["Property", "Manager", "Question", "Sent", "Due", "Status"]}>
          {rows.map((e) => {
            const q = e.question!;
            return (
              <Row key={e.id} href={href.exception(e.id)}>
                <Td className="font-medium whitespace-nowrap text-[var(--wf-accent)]">{property(e.property)!.name}</Td>
                <Td className="whitespace-nowrap text-fg-2">{managerOf(e.property).name}</Td>
                <Td className="max-w-md">
                  <span className="line-clamp-2">{q.text}</span>
                  <span className="text-[11px] text-fg-3">{e.trigger}</span>
                </Td>
                <Td className="whitespace-nowrap text-fg-2">{fmtDate(q.sent)}</Td>
                <Td className="whitespace-nowrap text-fg-2">{fmtDate(q.due)}</Td>
                <Td>{q.reply ? <Chip tone="green">Answered</Chip> : isOverdue(e) ? <Chip tone="red">Overdue</Chip> : <Chip tone="amber">Waiting</Chip>}</Td>
              </Row>
            );
          })}
        </Table>
      ) : (
        <Empty>No questions sent yet.</Empty>
      )}
    </Page>
  );
}

export function Tasks() {
  const { state, act } = useWf();
  const toast = useToast();
  const gates = state.projects.filter((p) => p.status === "Active" && (p.step === 2 || (p.step === 4 && p.type === "Interior")));
  const approvals = state.approvals.filter((a) => a.status === "Waiting");
  return (
    <Page title="Tasks" subtitle="Actions assigned from exceptions, and approvals waiting on you.">
      <Card title="Tasks">
        <Table columns={["Task", "Property", "Owner", "Due", "Status", "From"]}>
          {state.tasks.map((t) => {
            const e = state.exceptions.find((x) => x.id === t.exceptionId);
            return (
              <Row key={t.id}>
                <Td>{t.title}</Td>
                <Td className="whitespace-nowrap">
                  <A href={href.property(t.property)}>{property(t.property)!.name}</A>
                </Td>
                <Td className="whitespace-nowrap text-fg-2">{t.owner}</Td>
                <Td className="whitespace-nowrap text-fg-2">{fmtDate(t.due)}</Td>
                <Td>
                  <Segmented label="" value={t.status} options={["Open", "In progress", "Done"] as const} onChange={(s) => act.setTaskStatus(t.id, s)} />
                </Td>
                <Td className="text-[11px]">{e && <A href={href.exception(e.id)}>{e.trigger}</A>}</Td>
              </Row>
            );
          })}
        </Table>
      </Card>

      <Card title="Approvals">
        {approvals.length || gates.length ? (
          <Table columns={["Approval", "Type", "Property", "From", "Submitted", ""]}>
            {gates.map((p) => (
              <Row key={p.id} href={href.project(p.id)}>
                <Td className="font-medium text-[var(--wf-accent)]">
                  {p.step === 2 ? "Gate A" : "Gate B"} · {p.name}
                </Td>
                <Td>
                  <Chip tone="blue">Renovation gate</Chip>
                </Td>
                <Td className="whitespace-nowrap">{property(p.property)!.name}</Td>
                <Td className="text-fg-2">Renovations</Td>
                <Td className="text-fg-2">{stepName(p.type, p.step)}</Td>
                <Td className="text-right text-[11px] text-fg-3">Decide on the project →</Td>
              </Row>
            ))}
            {approvals.map((a) => (
              <Row key={a.id}>
                <Td>{a.projectId ? <A href={href.project(a.projectId)}>{a.title}</A> : a.title}</Td>
                <Td>
                  <Chip>{a.kind}</Chip>
                </Td>
                <Td className="whitespace-nowrap">{property(a.property)!.name}</Td>
                <Td className="whitespace-nowrap text-fg-2">{a.from}</Td>
                <Td className="whitespace-nowrap text-fg-2">{fmtDate(a.submitted)}</Td>
                <Td className="text-right whitespace-nowrap">
                  <span className="inline-flex gap-1.5">
                    <Button
                      onClick={() => {
                        act.decideApproval(a.id, "Approved");
                        toast(`Approved: ${a.title}`);
                      }}
                    >
                      Approve
                    </Button>
                    <Button variant="secondary" onClick={() => act.decideApproval(a.id, "Declined")}>
                      Decline
                    </Button>
                  </span>
                </Td>
              </Row>
            ))}
          </Table>
        ) : (
          <Empty>Nothing waiting on you.</Empty>
        )}
      </Card>
    </Page>
  );
}

export function OwnerReport() {
  const { state, act } = useWf();
  const toast = useToast();
  const sent = state.ownerReport.sent;
  const ready = readyProperties(state);
  const held = PROPERTIES.filter((p) => !ready.includes(p));
  const acted = state.exceptions.filter((e) => e.action);
  const open = state.exceptions.filter((e) => !e.action && e.stage !== "closed");
  return (
    <Page
      title={`Owner report · ${CLOSE_MONTH}`}
      subtitle="Monthly report to the owner. On-plan properties come straight here from the scorecard."
      controls
      actions={
        <>
          {sent ? <Chip tone="green">Sent {fmtDate(sent)}</Chip> : <Chip>Draft</Chip>}
          <Button variant="secondary" onClick={() => toast("Exported", { detail: `Owner report · ${CLOSE_MONTH}.pdf` })}>
            Export
          </Button>
          {!sent && (
            <Button
              onClick={() => {
                act.sendOwnerReport();
                toast("Owner report sent", { detail: "Logged with today's date." });
              }}
            >
              Send to owner
            </Button>
          )}
        </>
      }
    >
      <Card title="Properties in this report">
        <div className="flex flex-col gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-28 text-[11px] text-fg-3">On plan</span>
            {ready.map((p) => (
              <Chip key={p.id} tone="green">
                {p.name}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <span className="w-28 text-[11px] text-fg-3">Explained below</span>
            <span className="flex flex-1 flex-wrap gap-x-4 gap-y-1">
              {held.map((p) => (
                <span key={p.id} className="text-fg-2">
                  <A href={href.property(p.id)}>{p.name}</A> <span className="text-[11px] text-fg-3">· {blocker(state, p.id)}</span>
                </span>
              ))}
            </span>
          </div>
        </div>
      </Card>

      <Card title="Summary financials">
        <Table columns={["Property", "EGI", "Operating expenses", "NOI", "NOI vs. budget", "Occupancy"]}>
          {PROPERTIES.map((p, i) => (
            <Row key={p.id}>
              <Td className="whitespace-nowrap">{p.name}</Td>
              {[0, 1, 2, 3, 4].map((j) => (
                <Td key={j}>
                  <Bar w={barW(i + j)} />
                </Td>
              ))}
            </Row>
          ))}
        </Table>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Distributions">
          <dl className="flex flex-col gap-2.5 text-xs">
            {["Cash available", "Reserves held back", "Proposed distribution"].map((l, i) => (
              <div key={l} className="flex items-center justify-between">
                <dt className="text-fg-2">{l}</dt>
                <dd>
                  <Bar w={barW(i)} />
                </dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card title="Valuation">
          <dl className="flex flex-col gap-2.5 text-xs">
            {["NOI (T-12)", "Market cap rate", "Value vs. plan"].map((l, i) => (
              <div key={l} className="flex items-center justify-between">
                <dt className="text-fg-2">{l}</dt>
                <dd>
                  <Bar w={barW(i + 2)} />
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <Card title="Exceptions and actions taken">
        <Table columns={["Property", "What happened", "Action", "Status"]}>
          {[...acted, ...open].map((e) => (
            <Row key={e.id} href={href.exception(e.id)}>
              <Td className="whitespace-nowrap">{property(e.property)!.name}</Td>
              <Td className="font-medium text-[var(--wf-accent)]">{e.trigger}</Td>
              <Td className="text-fg-2">{e.action ?? "Under review"}</Td>
              <Td>{e.action ? <Chip>{STAGE_LABEL[e.stage]}</Chip> : <StageChip e={e} />}</Td>
            </Row>
          ))}
        </Table>
      </Card>

      <Card title="Project updates">
        <Table columns={["Project", "Property", "Type", "Step", "Budget", "Spent"]}>
          {state.projects.map((p, i) => (
            <Row key={p.id} href={href.project(p.id)}>
              <Td className="font-medium text-[var(--wf-accent)]">{p.name}</Td>
              <Td className="whitespace-nowrap">{property(p.property)!.name}</Td>
              <Td className="text-fg-2">{p.type}</Td>
              <Td className="whitespace-nowrap text-fg-2">
                {p.step} · {stepName(p.type, p.step)}
              </Td>
              <Td>
                <Bar w={barW(i, 10)} />
              </Td>
              <Td>
                <Bar w={barW(i + 1, 4)} />
              </Td>
            </Row>
          ))}
        </Table>
      </Card>
      <Chart label="NOI trend · portfolio vs. plan" />
    </Page>
  );
}

export function DecisionLog() {
  const { state } = useWf();
  return (
    <Page title="Decision log" subtitle="Who decided what, when, and why. Written automatically when an exception is decided or a project passes a gate.">
      <Table columns={["Date", "Property", "Decision", "Who", "Why", "Linked"]}>
        {state.decisions.map((d, i) => {
          const e = state.exceptions.find((x) => x.id === d.exceptionId);
          const p = state.projects.find((x) => x.id === d.projectId);
          return (
            <Row key={i}>
              <Td className="whitespace-nowrap text-fg-2">{fmtDate(d.date)}</Td>
              <Td className="whitespace-nowrap">{property(d.property)!.name}</Td>
              <Td className="font-medium">{d.decision}</Td>
              <Td className="whitespace-nowrap text-fg-2">{d.who}</Td>
              <Td className="max-w-xs text-fg-2">{d.why}</Td>
              <Td className="text-[11px]">
                <span className="flex flex-col gap-0.5">
                  {e && <A href={href.exception(e.id)}>Exception</A>}
                  {p && <A href={href.project(p.id)}>Project: {p.name}</A>}
                </span>
              </Td>
            </Row>
          );
        })}
      </Table>
    </Page>
  );
}
