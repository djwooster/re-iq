"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { mappingPending, managerState, packageCell, reconChecks, reconSummary } from "./derive";
import { CHART_OF_ACCOUNTS, CLOSE_MONTH, FILES, MANAGERS, MAPPING, MAPPING_FILE, PACKAGE, PROPERTIES, REPORT_DUE, fmtDate, manager, managerOf, type CheckState } from "./seed";
import { href, Page } from "./shell";
import { useWf } from "./store";
import { A, Bar, Button, Card, Chip, Row, Select, Table, Tabs, Td, type Tone } from "./ui";

type Tab = "tracker" | "mapping" | "reconciliation" | "files";
const TABS: Tab[] = ["tracker", "mapping", "reconciliation", "files"];

export function Close({ initialTab }: { initialTab?: string }) {
  const { state } = useWf();
  const [tab, setTab] = useState<Tab>(TABS.includes(initialTab as Tab) ? (initialTab as Tab) : "tracker");
  const r = reconSummary(state);
  const late = MANAGERS.filter((m) => managerState(m.id) !== "All received").length;
  return (
    <Page title={`Close · ${CLOSE_MONTH}`} subtitle={`Packages due ${fmtDate(REPORT_DUE)} · checked against each other before anything reaches the owner report`}>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "tracker", label: "Close tracker", count: late },
          { id: "mapping", label: "Mapping review", count: mappingPending(state) },
          { id: "reconciliation", label: "Reconciliation", count: r.breaks },
          { id: "files", label: "All files", count: FILES.length },
        ]}
      />
      {tab === "tracker" && <Tracker />}
      {tab === "mapping" && <Mapping />}
      {tab === "reconciliation" && <Reconciliation />}
      {tab === "files" && <Files />}
    </Page>
  );
}

const MANAGER_TONE = { "All received": "green", Partial: "amber", Late: "red" } as const;

function Tracker() {
  const toast = useToast();
  const copy = (token: string) => {
    try {
      void navigator.clipboard?.writeText(`https://re-iq.app/upload/${token}`);
    } catch {}
    toast("Upload link copied");
  };
  return (
    <div className="flex flex-col gap-4">
      {MANAGERS.map((m) => {
        const props = PROPERTIES.filter((p) => p.manager === m.id);
        const st = managerState(m.id);
        return (
          <Card
            key={m.id}
            title={
              <span className="flex items-center gap-2">
                {m.name} <Chip tone={MANAGER_TONE[st]}>{st}</Chip>
              </span>
            }
            action={
              <span className="flex items-center gap-2 text-[11px] text-fg-3">
                <span className="num hidden md:inline">re-iq.app/upload/{m.token}</span>
                <Button variant="secondary" onClick={() => copy(m.token)}>
                  Copy
                </Button>
              </span>
            }
          >
            <p className="mb-3 text-[11px] text-fg-3">{m.contact}</p>
            <Table columns={["Property", ...PACKAGE]}>
              {props.map((p) => (
                <Row key={p.id}>
                  <Td className="whitespace-nowrap">
                    <A href={href.property(p.id)}>{p.name}</A>
                  </Td>
                  {PACKAGE.map((rep) => {
                    const c = packageCell(p.id, rep);
                    return (
                      <Td key={rep} className="whitespace-nowrap">
                        {c.state === "Received" ? <span className="text-[11px] text-fg-2">Received {fmtDate(c.date)}</span> : <Chip tone={c.state === "Late" ? "red" : "amber"}>{c.state}</Chip>}
                      </Td>
                    );
                  })}
                </Row>
              ))}
            </Table>
          </Card>
        );
      })}
    </div>
  );
}

function Mapping() {
  const { state, act } = useWf();
  const toast = useToast();
  const [accounts, setAccounts] = useState<Record<string, string>>({});
  const lines = [...MAPPING].sort((a, b) => Number(a.sure) - Number(b.sure));
  const pending = lines.filter((l) => !l.sure && !state.mapped.includes(l.id));
  return (
    <Card
      title={MAPPING_FILE}
      action={
        <Button
          disabled={!pending.length}
          onClick={() => {
            act.approveMapping(pending.map((l) => l.id));
            toast("Mapping saved", { detail: "Manager 3's labels will map this way next month too." });
          }}
        >
          Approve all
        </Button>
      }
    >
      <p className="mb-3 text-[11px] text-fg-3">Each manager codes the GL differently. Their label on the left, the owner&apos;s chart of accounts on the right. Uncertain lines first.</p>
      <Table columns={["Manager's label", "Standard account", "Confidence", "Amount", ""]}>
        {lines.map((l) => {
          const done = l.sure || state.mapped.includes(l.id);
          return (
            <Row key={l.id} highlight={!done}>
              <Td className="num text-[11px]">{l.label}</Td>
              <Td className="w-56">{done ? <span className="text-fg-2">{accounts[l.id] ?? l.account}</span> : <Select value={accounts[l.id] ?? l.account} onChange={(v) => setAccounts((a) => ({ ...a, [l.id]: v }))} options={CHART_OF_ACCOUNTS} />}</Td>
              <Td>{l.sure ? <Chip tone="green">Confident</Chip> : <Chip tone="amber">Check</Chip>}</Td>
              <Td>
                <Bar w={10} />
              </Td>
              <Td className="text-right">{done ? <span className="text-[11px] text-fg-3">Mapped</span> : <Button variant="secondary" onClick={() => act.approveMapping([l.id])}>Approve</Button>}</Td>
            </Row>
          );
        })}
      </Table>
    </Card>
  );
}

const CHECK_TONE: Record<CheckState, Tone> = { Pass: "green", Break: "red", Waiting: "neutral" };

function Reconciliation() {
  const { state } = useWf();
  const toast = useToast();
  const rows = PROPERTIES.map((p) => ({ p, checks: reconChecks(state, p.id) }));
  const breaks = rows.flatMap(({ p, checks }) => checks.filter((c) => c.state === "Break").map((c) => ({ p, c })));
  return (
    <div className="flex flex-col gap-4">
      {breaks.map(({ p, c }) => (
        <Card key={p.id + c.check} title={<span className="flex items-center gap-2"><Chip tone="red">Break</Chip> {p.name} · {c.check}</span>}>
          <p className="mb-3 text-xs text-fg-2">{c.note}.</p>
          <div className="mb-4 grid max-w-md grid-cols-3 gap-3 text-[11px] text-fg-3">
            <span className="flex flex-col gap-1.5">Rent roll total <Bar w={14} /></span>
            <span className="flex flex-col gap-1.5">P&L rental income <Bar w={12} /></span>
            <span className="flex flex-col gap-1.5">Difference <Bar w={5} className="bg-unfavorable/40" /></span>
          </div>
          <Button variant="secondary" onClick={() => toast(`Request sent to ${managerOf(p.id).name}`, { detail: "Asked for a corrected rent roll by email." })}>
            Request corrected rent roll
          </Button>
        </Card>
      ))}
      <Table columns={["Property", "Manager", "Rent roll ties to P&L", "Cash ties to bank", "GL mapped", "Totals match statements"]}>
        {rows.map(({ p, checks }) => (
          <Row key={p.id} highlight={checks.some((c) => c.state === "Break")}>
            <Td className="whitespace-nowrap">
              <A href={href.property(p.id)}>{p.name}</A>
            </Td>
            <Td className="whitespace-nowrap text-fg-2">{manager(p.manager).name}</Td>
            {checks.map((c) => (
              <Td key={c.check} className="whitespace-nowrap">
                <span title={c.note}>
                  <Chip tone={CHECK_TONE[c.state]}>{c.state}</Chip>
                </span>
              </Td>
            ))}
          </Row>
        ))}
      </Table>
      <p className="text-[11px] text-fg-3">Waiting: the package hasn&apos;t arrived, or lines still need confirming in Mapping review.</p>
    </div>
  );
}

function Files() {
  return (
    <Table columns={["File", "Manager", "Uploaded by", "When", "Version"]}>
      {FILES.map((f) => (
        <Row key={f.id}>
          <Td className="num text-[11px]">{f.name}</Td>
          <Td className="whitespace-nowrap text-fg-2">{manager(f.manager).name}</Td>
          <Td className="whitespace-nowrap text-fg-2">{f.by}</Td>
          <Td className="whitespace-nowrap text-fg-2">{f.when}</Td>
          <Td>
            <Chip tone={f.version === "v1" ? "neutral" : "blue"}>{f.version}</Chip>
          </Td>
        </Row>
      ))}
    </Table>
  );
}

