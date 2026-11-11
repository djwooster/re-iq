"use client";

import { Check, Copy, FileSpreadsheet, Send } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { mappingPending, managerState, packageCell, reconChecks, reconSummary } from "./derive";
import { fmt } from "./metrics";
import { LAST, month, type Line } from "./numbers";
import { CHART_OF_ACCOUNTS, CLOSE_MONTH, FILES, MANAGERS, MAPPING, PACKAGE, PROPERTIES, REPORT_DUE, TODAY, daysBetween, fmtDate, manager, managerOf, property, type CheckState, type FileRow, type ManagerId } from "./seed";
import { href, Page } from "./shell";
import { useWf } from "./store";
import { A, Button, Card, Chip, Row, Select, Table, Tabs, Td, type Tone } from "./ui";

type Tab = "tracker" | "mapping" | "reconciliation" | "files";
const TABS: Tab[] = ["tracker", "mapping", "reconciliation", "files"];

export function Close({ initialTab }: { initialTab?: string }) {
  const { state } = useWf();
  const [tab, setTab] = useState<Tab>(TABS.includes(initialTab as Tab) ? (initialTab as Tab) : "tracker");
  const r = reconSummary(state);
  const late = MANAGERS.filter((m) => managerState(m.id) !== "All received").length;
  const overdue = daysBetween(REPORT_DUE, TODAY);
  return (
    <Page title={`${CLOSE_MONTH} close`} subtitle={`Packages were due ${fmtDate(REPORT_DUE)}${overdue > 0 ? ` · ${overdue} days ago` : ""}`}>
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

export const uploadUrl = (token: string) => `re-iq.app/upload/${token}`;

export function useCopyLink() {
  const toast = useToast();
  return (token: string) => {
    try {
      void navigator.clipboard?.writeText(`https://${uploadUrl(token)}`);
    } catch {}
    toast("Upload link copied", { detail: uploadUrl(token) });
  };
}

function Tracker() {
  const toast = useToast();
  const copy = useCopyLink();
  return (
    <div className="flex flex-col gap-4">
      {MANAGERS.map((m) => {
        const props = PROPERTIES.filter((p) => p.manager === m.id);
        const st = managerState(m.id);
        return (
          <Card
            key={m.id}
            flush
            title={
              <span className="flex items-center gap-2">
                <A href={href.manager(m.id)}>{m.name}</A> <Chip tone={MANAGER_TONE[st]}>{st}</Chip>
                <span className="text-xs font-normal text-fg-3">{m.email}</span>
              </span>
            }
            action={
              <span className="flex items-center gap-2">
                {st === "Late" && (
                  <Button variant="secondary" icon={<Send className="size-3" />} onClick={() => toast(`Reminder sent to ${m.name}`, { detail: m.email })}>
                    Send reminder
                  </Button>
                )}
                <Button variant="ghost" icon={<Copy className="size-3" />} onClick={() => copy(m.token)}>
                  Upload link
                </Button>
              </span>
            }
          >
            <Table bare columns={["Property", ...PACKAGE]}>
              {props.map((p) => (
                <Row key={p.id}>
                  <Td className="whitespace-nowrap">
                    <A href={href.property(p.id)}>{p.name}</A>
                  </Td>
                  {PACKAGE.map((rep) => {
                    const c = packageCell(p.id, rep);
                    return (
                      <Td key={rep} className="whitespace-nowrap">
                        {c.state === "Received" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-fg-2" title={`Received ${fmtDate(c.date)}`}>
                            <Check className="size-3 text-favorable" /> <span className="num">{fmtDate(c.date)}</span>
                          </span>
                        ) : (
                          <Chip tone={c.state === "Late" ? "red" : "amber"}>{c.state}</Chip>
                        )}
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

/** Manager 3's November GL lines, sized from their three properties. */
const M3 = PROPERTIES.filter((p) => p.manager === "m3").map((p) => p.id);
const m3 = (line: Line, share = 1) => Math.abs(M3.reduce((s, id) => s + month(id, LAST).lines[line], 0)) * share;
const AMOUNT: Record<string, number> = {
  ml1: m3("Repairs & maintenance", 0.31),
  ml2: m3("Marketing", 0.18),
  ml3: m3("Other income", 0.41),
  ml4: m3("Gross potential rent"),
  ml5: m3("Vacancy"),
  ml6: m3("Concessions"),
  ml7: m3("Payroll"),
  ml8: m3("Utilities", 0.46),
};
export const GL_LINES = 186;

function Mapping() {
  const { state, act } = useWf();
  const toast = useToast();
  const [accounts, setAccounts] = useState<Record<string, string>>({});
  const lines = [...MAPPING].sort((a, b) => Number(a.sure) - Number(b.sure));
  const pending = lines.filter((l) => !l.sure && !state.mapped.includes(l.id));
  const unsure = MAPPING.filter((l) => !l.sure).length;
  return (
    <Card
      flush
      title={
        <span className="flex items-center gap-2">
          <FileSpreadsheet className="size-3.5 text-file-xls" />
          {manager("m3").name} · GL · {CLOSE_MONTH}
          <span className="num text-xs font-normal text-fg-3">
            {GL_LINES} lines · {GL_LINES - unsure} matched from earlier months
          </span>
        </span>
      }
      action={
        <Button
          disabled={!pending.length}
          onClick={() => {
            act.approveMapping(pending.map((l) => l.id));
            toast("Mapping saved", { detail: `${manager("m3").name}'s labels will map the same way next month.` });
          }}
        >
          {pending.length ? `Approve ${pending.length}` : "All approved"}
        </Button>
      }
    >
      <Table bare columns={["Manager's label", "Owner's account", "Confidence", { label: "November", num: true }, ""]}>
        {lines.map((l) => {
          const done = l.sure || state.mapped.includes(l.id);
          return (
            <Row key={l.id} highlight={!done}>
              <Td className="num text-xs">{l.label}</Td>
              <Td className="w-56">
                {done ? (
                  <span className="text-fg-2">{accounts[l.id] ?? l.account}</span>
                ) : (
                  <Select label={`Account for ${l.label}`} value={accounts[l.id] ?? l.account} onChange={(v) => setAccounts((a) => ({ ...a, [l.id]: v }))} options={CHART_OF_ACCOUNTS} />
                )}
              </Td>
              <Td>{l.sure ? <Chip tone="green">Matched</Chip> : <Chip tone="amber">New label</Chip>}</Td>
              <Td num>{fmt.usd(AMOUNT[l.id])}</Td>
              <Td className="text-right">
                {done ? (
                  <span className="text-xs text-fg-3">Mapped</span>
                ) : (
                  <Button variant="secondary" onClick={() => act.approveMapping([l.id])}>
                    Approve
                  </Button>
                )}
              </Td>
            </Row>
          );
        })}
      </Table>
    </Card>
  );
}

const CHECK_TONE: Record<CheckState, Tone> = { Pass: "green", Break: "red", Waiting: "neutral" };

/** Property C's rent roll doesn't tie to the P&L by this much. */
export function rentRollBreak(id: string) {
  const l = month(id, LAST).lines;
  const pl = l["Gross potential rent"] + l.Vacancy + l["Loss to lease"] + l.Concessions;
  return { pl, rentRoll: pl + 4_385, diff: 4_385 };
}

function Reconciliation() {
  const { state } = useWf();
  const toast = useToast();
  const rows = PROPERTIES.map((p) => ({ p, checks: reconChecks(state, p.id) }));
  const breaks = rows.flatMap(({ p, checks }) => checks.filter((c) => c.state === "Break").map((c) => ({ p, c })));
  return (
    <div className="flex flex-col gap-4">
      {breaks.map(({ p, c }) => {
        const b = rentRollBreak(p.id);
        return (
          <Card
            key={p.id + c.check}
            title={
              <span className="flex items-center gap-2">
                <Chip tone="red">Break</Chip> {p.name} · {c.check}
              </span>
            }
          >
            <p className="mb-4 text-xs text-fg-2">{c.note}.</p>
            <dl className="mb-4 grid max-w-lg grid-cols-3 gap-4">
              <div>
                <dt className="text-xs text-fg-3">Rent roll total</dt>
                <dd className="num mt-1 text-sm">{fmt.usd(b.rentRoll)}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-3">P&amp;L rental income</dt>
                <dd className="num mt-1 text-sm">{fmt.usd(b.pl)}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-3">Difference</dt>
                <dd className="num mt-1 text-sm text-unfavorable">{fmt.usd(b.diff)}</dd>
              </div>
            </dl>
            <Button variant="secondary" icon={<Send className="size-3" />} onClick={() => toast(`Request sent to ${managerOf(p.id).name}`, { detail: "Asked for a corrected rent roll by email." })}>
              Request corrected rent roll
            </Button>
          </Card>
        );
      })}
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
    </div>
  );
}

/** A file's name, written with the names the workspace uses today. */
export function fileName(f: FileRow) {
  if (f.property) return `${f.title.replace(" (", ` · ${property(f.property)!.name} (`)}`;
  return `${f.title} · ${propertiesOf(f.manager)}`;
}
const propertiesOf = (id: ManagerId) =>
  PROPERTIES.filter((p) => p.manager === id)
    .map((p) => p.name)
    .join(", ");

function Files() {
  return (
    <Table columns={["File", "Manager", "Received by", "When", { label: "Size", num: true }, "Version"]}>
      {FILES.map((f) => (
        <Row key={f.id}>
          <Td>
            <span className="flex items-center gap-2">
              <FileSpreadsheet className="size-3.5 shrink-0 text-file-xls" />
              <span className="num text-xs">{fileName(f)}</span>
            </span>
          </Td>
          <Td className="whitespace-nowrap text-fg-2">{manager(f.manager).name}</Td>
          <Td className="whitespace-nowrap text-fg-2">{f.via === "email" ? "Email" : "Upload link"}</Td>
          <Td className="num whitespace-nowrap text-xs text-fg-2">{f.when}</Td>
          <Td num className="text-fg-3">
            {f.size}
          </Td>
          <Td>
            <Chip tone={f.version === "v1" ? "neutral" : "blue"}>{f.version}</Chip>
          </Td>
        </Row>
      ))}
    </Table>
  );
}
