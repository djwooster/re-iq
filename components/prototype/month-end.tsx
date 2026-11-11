"use client";

import { useToast } from "@/components/ui/toast";
import { blocker, readyProperties } from "./derive";
import { CLOSE_MONTH, MANAGERS, PROPERTIES, STAGE_LABEL, fmtDate, property, projectStage } from "./seed";
import { href, Page } from "./shell";
import { useWf } from "./store";
import { Download, Send } from "lucide-react";
import { TrendChart } from "./chart";
import { fmt, noiTrend, noiVs, portfolioNoi } from "./metrics";
import { debt, kpis, periodTotal, profile } from "./numbers";
import { PROJECT_BUDGET } from "./renovations";
import { A, Button, Card, Chip, Delta, Dl, Empty, Row, Segmented, StageChip, Table, Td } from "./ui";

export function Tasks() {
  const { state, act } = useWf();
  const toast = useToast();
  const gates = state.projects.filter((p) => p.status === "Active" && (p.step === 2 || (p.step === 4 && p.type === "Interior")));
  const approvals = state.approvals.filter((a) => a.status === "Waiting");
  return (
    <Page title="Tasks">
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
                <Td className="whitespace-nowrap text-fg-2">{MANAGERS.some((m) => m.name === t.owner) ? <A href={href.manager(MANAGERS.find((m) => m.name === t.owner)!.id)}>{t.owner}</A> : t.owner}</Td>
                <Td className="num text-xs whitespace-nowrap text-fg-2">{fmtDate(t.due)}</Td>
                <Td>
                  <Segmented label="" value={t.status} options={["Open", "In progress", "Done"] as const} onChange={(s) => act.setTaskStatus(t.id, s)} />
                </Td>
                <Td className="text-xs">{e && <A href={href.exception(e.id)}>{e.trigger}</A>}</Td>
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
                <Td className="font-medium">
                  {p.step === 2 ? "Gate A" : "Gate B"} · {p.name}
                </Td>
                <Td>
                  <Chip tone="amber">Renovation gate</Chip>
                </Td>
                <Td className="whitespace-nowrap">{property(p.property)!.name}</Td>
                <Td className="text-fg-2">Renovations</Td>
                <Td className="text-fg-2">{projectStage(p)}</Td>
                <Td className="text-right text-xs text-fg-3">Decide on the project →</Td>
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
                <Td className="num text-xs whitespace-nowrap text-fg-2">{fmtDate(a.submitted)}</Td>
                <Td className="text-right whitespace-nowrap">
                  <span className="inline-flex gap-1.5">
                    <Button
                      onClick={() => {
                        act.decideApproval(a.id, "Approved");
                        toast(`Approved: ${a.title}`, { detail: "Added to the decision log." });
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
  const total = portfolioNoi(state.period, state.compare);
  const nov = portfolioNoi("Month", "Budget");
  const ids = PROPERTIES.map((p) => p.id);
  const service = ids.reduce((s, id) => s + debt(id).service, 0) / 12;
  const reserves = ids.reduce((s, id) => s + profile(id).units * 25, 0);
  const cash = nov.actual - service;
  const noi12 = ids.reduce((s, id) => s + debt(id).noi12, 0);
  const value = ids.reduce((s, id) => s + debt(id).value, 0);
  const planValue = ids.reduce((s, id) => s + (periodTotal(id, "T-12", "Underwriting")?.noi ?? 0) / profile(id).cap, 0);
  return (
    <Page
      title={`Owner report · ${CLOSE_MONTH}`}
      controls
      actions={
        <>
          {sent ? <Chip tone="green">Sent {fmtDate(sent)}</Chip> : <Chip>Draft</Chip>}
          <Button variant="secondary" icon={<Download className="size-3" />} onClick={() => toast("Exported", { detail: `${state.org} · Owner report · ${CLOSE_MONTH} 2026.pdf` })}>
            Export PDF
          </Button>
          {!sent && (
            <Button
              icon={<Send className="size-3" />}
              onClick={() => {
                act.sendOwnerReport();
                toast("Owner report sent", { detail: `${ready.length} properties on plan, ${held.length} explained.` });
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
            <span className="w-28 text-xs text-fg-3">Ready</span>
            {ready.map((p) => (
              <Chip key={p.id} tone="green">
                {p.name}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <span className="w-28 text-xs text-fg-3">Explained below</span>
            <span className="flex flex-1 flex-wrap gap-x-4 gap-y-1">
              {held.map((p) => (
                <span key={p.id} className="text-fg-2">
                  <A href={href.property(p.id)}>{p.name}</A> <span className="text-xs text-fg-3">· {blocker(state, p.id)}</span>
                </span>
              ))}
            </span>
          </div>
        </div>
      </Card>

      <Card title={`Summary financials · ${state.period === "Month" ? CLOSE_MONTH : state.period} vs. ${state.compare.toLowerCase()}`}>
        <Table columns={["Property", { label: "EGI", num: true }, { label: "Operating expenses", num: true }, { label: "NOI", num: true }, { label: `vs. ${state.compare}`, num: true }, { label: "Occupancy", num: true }]}>
          {PROPERTIES.map((p) => {
            const t = periodTotal(p.id, state.period);
            const n = noiVs(p.id, state.period, state.compare);
            return (
              <Row key={p.id}>
                <Td className="whitespace-nowrap">
                  {p.name}
                  {profile(p.id).through < 11 && <span className="ml-1.5 text-[11px] text-fg-3">through October</span>}
                </Td>
                <Td num>{t ? fmt.usd(t.egi) : "–"}</Td>
                <Td num>{t ? fmt.usd(t.opex) : "–"}</Td>
                <Td num>{t ? fmt.usd(t.noi) : "–"}</Td>
                <Td num>{n ? <Delta value={n.variance} format={fmt.delta} /> : "–"}</Td>
                <Td num>{fmt.pct(kpis(p.id).occupancy)}</Td>
              </Row>
            );
          })}
          <Row>
            <Td className="font-medium">Portfolio</Td>
            <Td num className="font-medium">
              {fmt.usd(total.egi)}
            </Td>
            <Td num className="font-medium">
              {fmt.usd(total.opex)}
            </Td>
            <Td num className="font-medium">
              {fmt.usd(total.actual)}
            </Td>
            <Td num className="font-medium">
              <Delta value={total.variance} format={fmt.delta} />
            </Td>
            <Td />
          </Row>
        </Table>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card title="Distributions · November">
          <Dl
            items={[
              { label: "Cash available", value: fmt.usd(cash) },
              { label: "Reserves held back", value: fmt.usd(-reserves) },
              { label: "Proposed distribution", value: <span className="font-medium">{fmt.usd(cash - reserves)}</span> },
            ]}
          />
        </Card>
        <Card title="Valuation">
          <Dl
            items={[
              { label: "NOI (T-12)", value: fmt.usd(noi12) },
              { label: "Blended cap rate", value: fmt.pct(noi12 / value, 2) },
              { label: "Value", value: fmt.usdShort(value) },
              { label: "Value vs. plan", value: <Delta value={value - planValue} format={fmt.deltaShort} /> },
            ]}
          />
        </Card>
      </div>

      <Card title="Exceptions and actions taken">
        <Table columns={["Property", "What happened", "Action", "Status"]}>
          {[...acted, ...open].map((e) => (
            <Row key={e.id} href={href.exception(e.id)}>
              <Td className="whitespace-nowrap">{property(e.property)!.name}</Td>
              <Td className="font-medium">{e.trigger}</Td>
              <Td className="text-fg-2">{e.action ?? "Under review"}</Td>
              <Td>{e.action ? <Chip>{STAGE_LABEL[e.stage]}</Chip> : <StageChip e={e} />}</Td>
            </Row>
          ))}
        </Table>
      </Card>

      <Card title="Project updates">
        <Table columns={["Project", "Property", "Type", "Step", { label: "Budget", num: true }, { label: "Spent", num: true }]}>
          {state.projects.map((p) => (
            <Row key={p.id} href={href.project(p.id)}>
              <Td className="font-medium">{p.name}</Td>
              <Td className="whitespace-nowrap">{property(p.property)!.name}</Td>
              <Td className="text-fg-2">{p.type}</Td>
              <Td className="whitespace-nowrap text-fg-2">
                {projectStage(p)}
              </Td>
              <Td num>{PROJECT_BUDGET[p.id] ? fmt.usd(PROJECT_BUDGET[p.id].budget) : <span className="text-fg-3">Not set</span>}</Td>
              <Td num>{PROJECT_BUDGET[p.id] ? fmt.usd(PROJECT_BUDGET[p.id].spent) : "$0"}</Td>
            </Row>
          ))}
        </Table>
      </Card>
      <Card title={`Portfolio NOI · actual vs. ${state.compare.toLowerCase()}`}>
        <TrendChart
          data={noiTrend(state.compare)}
          series={[
            { key: "actual", label: "Actual", style: "data" },
            { key: "plan", label: state.compare, style: "reference" },
          ]}
          format={fmt.usd}
          axisFormat={fmt.usdShort}
        />
      </Card>
    </Page>
  );
}

export function DecisionLog() {
  const { state } = useWf();
  return (
    <Page title="Decision log">
      <Table columns={["Date", "Property", "Decision", "Who", "Why", "Linked"]}>
        {state.decisions.map((d, i) => {
          const e = state.exceptions.find((x) => x.id === d.exceptionId);
          const p = state.projects.find((x) => x.id === d.projectId);
          return (
            <Row key={i}>
              <Td className="num text-xs whitespace-nowrap text-fg-2">{fmtDate(d.date)}</Td>
              <Td className="whitespace-nowrap">{property(d.property)!.name}</Td>
              <Td className="font-medium">{d.decision}</Td>
              <Td className="whitespace-nowrap text-fg-2">{d.who}</Td>
              <Td className="max-w-sm text-fg-2">{d.why}</Td>
              <Td className="text-xs">
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
