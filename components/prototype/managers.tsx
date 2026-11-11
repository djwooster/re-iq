"use client";

import { managerState } from "./derive";
import { profile } from "./numbers";
import { CLOSE_MONTH, MANAGERS, PACKAGE_HISTORY, PROPERTIES, RECEIVED, TODAY, days, daysBetween, fmtDate, property, type ManagerId } from "./seed";
import { href, Page } from "./shell";
import { isOverdue, openExceptions, useWf } from "./store";
import { Copy } from "lucide-react";
import { useCopyLink, uploadUrl } from "./close";
import { fmt, noiVs } from "./metrics";
import { kpis } from "./numbers";
import { Button, Card, Chip, Delta, Empty, PlanChip, Row, StageChip, Table, Td, type Tone } from "./ui";

const propsOf = (id: ManagerId) => PROPERTIES.filter((p) => p.manager === id);

/** This close plus the five before it. */
function history(id: ManagerId) {
  const now = managerState(id);
  const nov = { month: CLOSE_MONTH, status: now === "All received" ? "On time" : now, received: RECEIVED[id] ? fmtDate(RECEIVED[id]!) : "Not yet" };
  return [...PACKAGE_HISTORY[id], nov];
}

const HISTORY_TONE: Record<string, Tone> = { "On time": "green", Late: "red", Partial: "amber" };

export function Managers() {
  const { state } = useWf();
  return (
    <Page title="Managers">
      <Table columns={["Manager", "Properties", { label: "Units", num: true }, { label: "Open exceptions", num: true }, { label: "Waiting on them", num: true }, "Overdue", "Packages on time", CLOSE_MONTH]}>
        {MANAGERS.map((m) => {
          const open = state.exceptions.filter((e) => e.stage !== "closed" && property(e.property)!.manager === m.id);
          const waiting = open.filter((e) => e.stage === "waiting" && !e.question?.reply);
          const h = history(m.id);
          const st = managerState(m.id);
          return (
            <Row key={m.id} href={href.manager(m.id)}>
              <Td className="font-medium whitespace-nowrap">
                {m.name}
                <span className="block text-xs font-normal text-fg-3">{m.email}</span>
              </Td>
              <Td className="text-fg-2">{propsOf(m.id).map((p) => p.name).join(", ")}</Td>
              <Td num className="text-fg-2">
                {propsOf(m.id).reduce((s, p) => s + profile(p.id).units, 0)}
              </Td>
              <Td num>{open.length || <span className="text-fg-3">–</span>}</Td>
              <Td num>{waiting.length || <span className="text-fg-3">–</span>}</Td>
              <Td>{waiting.filter(isOverdue).length ? <Chip tone="red">{waiting.filter(isOverdue).length}</Chip> : <span className="text-fg-3">None</span>}</Td>
              <Td className="whitespace-nowrap text-fg-2">
                {h.filter((x) => x.status === "On time").length} of {h.length}
              </Td>
              <Td>
                <Chip tone={st === "All received" ? "green" : st === "Late" ? "red" : "amber"}>{st}</Chip>
              </Td>
            </Row>
          );
        })}
      </Table>
    </Page>
  );
}

export function ManagerPage({ id }: { id: string }) {
  const { state } = useWf();
  const copy = useCopyLink();
  const m = MANAGERS.find((x) => x.id === id);
  if (!m) {
    return (
      <Page title="Manager not found" crumbs={[{ label: "Managers", href: "/prototype/managers" }]}>
        <Empty>This manager doesn&apos;t exist.</Empty>
      </Page>
    );
  }
  const props = propsOf(m.id);
  const open = state.exceptions.filter((e) => e.stage !== "closed" && property(e.property)!.manager === m.id);
  const waiting = open.filter((e) => e.stage === "waiting");
  const other = open.filter((e) => e.stage !== "waiting");
  const tasks = state.tasks.filter((t) => t.owner === m.name);
  const approvals = state.approvals.filter((a) => a.from === m.name);

  return (
    <Page
      title={m.name}
      subtitle={`${m.email} · ${props.length} properties · ${props.reduce((s, p) => s + profile(p.id).units, 0).toLocaleString("en-US")} units`}
      crumbs={[{ label: "Managers", href: "/prototype/managers" }, { label: m.name }]}
      actions={
        <span className="flex items-center gap-2 text-xs text-fg-3">
          <span className="num hidden md:inline">{uploadUrl(m.token)}</span>
          <Button variant="secondary" icon={<Copy className="size-3" />} onClick={() => copy(m.token)}>
            Copy upload link
          </Button>
        </span>
      }
    >
      <Card title={`Waiting on ${m.name}`}>
        {waiting.length ? (
          <Table columns={["Property", "Exception", "Waiting since", "Due", "Status"]}>
            {waiting.map((e) => (
              <Row key={e.id} href={href.exception(e.id)}>
                <Td className="whitespace-nowrap">{property(e.property)!.name}</Td>
                <Td>
                  <span className="font-medium">{e.trigger}</span>
                  {e.question?.text && <span className="block text-xs text-fg-3">{e.question.text}</span>}
                </Td>
                <Td className="whitespace-nowrap text-fg-2">
                  {fmtDate(e.question!.sent)} · {days(daysBetween(e.question!.sent, TODAY))}
                </Td>
                <Td className="whitespace-nowrap text-fg-2">{fmtDate(e.question!.due)}</Td>
                <Td>
                  <StageChip e={e} />
                </Td>
              </Row>
            ))}
          </Table>
        ) : (
          <Empty>Nothing waiting on {m.name}.</Empty>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Packages">
          <Table columns={["Close", "Status", "Received"]}>
            {[...history(m.id)].reverse().map((h) => (
              <Row key={h.month}>
                <Td>{h.month}</Td>
                <Td>
                  <Chip tone={HISTORY_TONE[h.status] ?? "neutral"}>{h.status}</Chip>
                </Td>
                <Td className="text-fg-2">{h.received}</Td>
              </Row>
            ))}
          </Table>
        </Card>
        <Card title="Properties">
          <Table bare columns={["Property", "Status", { label: "NOI vs. budget", num: true }, { label: "Occupancy", num: true }, { label: "Exceptions", num: true }]}>
            {props.map((p) => {
              const n = noiVs(p.id, "Month", "Budget");
              return (
                <Row key={p.id} href={href.property(p.id)}>
                  <Td className="font-medium whitespace-nowrap">{p.name}</Td>
                  <Td>
                    <PlanChip off={openExceptions(state, p.id).length > 0} />
                  </Td>
                  <Td num>{n ? <Delta value={n.pct} format={fmt.signedPct} /> : "–"}</Td>
                  <Td num>{fmt.pct(kpis(p.id).occupancy)}</Td>
                  <Td num>{openExceptions(state, p.id).length || <span className="text-fg-3">–</span>}</Td>
                </Row>
              );
            })}
          </Table>
        </Card>
      </div>

      <Card title="Other open exceptions">
        {other.length ? (
          <Table columns={["Property", "Exception", "Status"]}>
            {other.map((e) => (
              <Row key={e.id} href={href.exception(e.id)}>
                <Td className="whitespace-nowrap">{property(e.property)!.name}</Td>
                <Td className="font-medium">{e.trigger}</Td>
                <Td>
                  <StageChip e={e} />
                </Td>
              </Row>
            ))}
          </Table>
        ) : (
          <Empty>None.</Empty>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Tasks assigned to them">
          {tasks.length ? (
            <Table columns={["Task", "Property", "Due", "Status"]}>
              {tasks.map((t) => (
                <Row key={t.id} href={t.exceptionId ? href.exception(t.exceptionId) : undefined}>
                  <Td>{t.title}</Td>
                  <Td className="whitespace-nowrap">{property(t.property)!.name}</Td>
                  <Td className="whitespace-nowrap text-fg-2">{fmtDate(t.due)}</Td>
                  <Td>
                    <Chip>{t.status}</Chip>
                  </Td>
                </Row>
              ))}
            </Table>
          ) : (
            <Empty>None.</Empty>
          )}
        </Card>
        <Card title="Approvals they submitted">
          {approvals.length ? (
            <Table columns={["Approval", "Property", "Submitted", "Status"]}>
              {approvals.map((a) => (
                <Row key={a.id} href={a.projectId ? href.project(a.projectId) : "/prototype/tasks"}>
                  <Td>{a.title}</Td>
                  <Td className="whitespace-nowrap">{property(a.property)!.name}</Td>
                  <Td className="whitespace-nowrap text-fg-2">{fmtDate(a.submitted)}</Td>
                  <Td>
                    <Chip tone={a.status === "Waiting" ? "amber" : a.status === "Approved" ? "green" : "red"}>{a.status}</Chip>
                  </Td>
                </Row>
              ))}
            </Table>
          ) : (
            <Empty>None.</Empty>
          )}
        </Card>
      </div>
    </Page>
  );
}

