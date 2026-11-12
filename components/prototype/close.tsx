"use client";

import { Check, ChevronDown, Copy, FileSpreadsheet, Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { mappingPending, managerState, monthStatus, packageCell, reconChecks, reconSummary } from "./derive";
import { fmt } from "./metrics";
import { LAST, month, type Line } from "./numbers";
import { CHART_OF_ACCOUNTS, CLOSE_MONTH, FILES, MANAGERS, MAPPING, PACKAGE, PACKAGE_HISTORY, PAST_CLOSES, PROPERTIES, RECON_CHECKS, REPORT_DUE, TODAY, daysBetween, fmtDate, manager, managerOf, property, type CheckState, type FileRow, type ManagerId, type PastClose } from "./seed";
import { href, Page } from "./shell";
import { useWf } from "./store";
import { A, Button, Card, Chip, Row, Select, Table, Tabs, Td, type Tone } from "./ui";

type Tab = "tracker" | "mapping" | "reconciliation" | "files";
const TABS: Tab[] = ["tracker", "mapping", "reconciliation", "files"];

export function Close({ initialTab, month }: { initialTab?: string; month?: string }) {
  const past = PAST_CLOSES.find((c) => c.month.toLowerCase() === month);
  return past ? <PastCloseView close={past} initialTab={initialTab} /> : <CurrentClose initialTab={initialTab} />;
}

function CurrentClose({ initialTab }: { initialTab?: string }) {
  const { state } = useWf();
  const [tab, setTab] = useState<Tab>(TABS.includes(initialTab as Tab) ? (initialTab as Tab) : "tracker");
  const r = reconSummary(state);
  const late = MANAGERS.filter((m) => managerState(m.id) !== "All received").length;
  const overdue = daysBetween(REPORT_DUE, TODAY);
  const ms = monthStatus(state);
  return (
    <Page
      title={<MonthPicker month={CLOSE_MONTH} />}
      subtitle={`Due ${fmtDate(REPORT_DUE)}${overdue > 0 ? ` · ${overdue} days late` : ""} · ${ms.close.managersIn} of ${ms.close.managers} managers in`}
      tabs={
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
      }>
      {tab === "tracker" && <Tracker />}
      {tab === "mapping" && <Mapping />}
      {tab === "reconciliation" && <Reconciliation />}
      {tab === "files" && <Files />}
    </Page>
  );
}

const closeHref = (month: string) => (month === CLOSE_MONTH ? "/prototype/close" : `/prototype/close?month=${month.toLowerCase()}`);
const lateIn = (month: string) => MANAGERS.filter((m) => PACKAGE_HISTORY[m.id].find((h) => h.month === month)?.status !== "On time").length;

/** The page title doubles as the way to earlier closes. */
function MonthPicker({ month }: { month: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  const items = [{ month: CLOSE_MONTH, note: "In progress" }, ...PAST_CLOSES.map((c) => ({ month: c.month, note: `Closed ${c.closed}${lateIn(c.month) ? ` · ${lateIn(c.month)} late` : ""}` }))];
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu" className="-mx-1.5 flex items-center gap-1.5 rounded-md px-1.5 transition-colors hover:bg-fg/[0.04]">
        {month} close
        <ChevronDown className={cn("size-4 text-fg-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="menu" className="absolute top-full left-0 z-30 mt-1.5 w-64 rounded-lg border border-border bg-bg p-1 text-xs font-normal tracking-normal shadow-overlay">
          {items.map((it) => (
            <Link
              key={it.month}
              role="menuitem"
              href={closeHref(it.month)}
              onClick={() => setOpen(false)}
              aria-current={it.month === month ? "page" : undefined}
              className={cn("flex items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-fg/[0.04]", it.month === month && "bg-fg/[0.04]")}
            >
              <span className="font-medium text-fg">{it.month}</span>
              <span className={cn("num", it.note === "In progress" ? "text-warning" : "text-fg-3")}>{it.note}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

type PastTab = "tracker" | "reconciliation" | "files";
const HISTORY_TONE = { "On time": "green", Partial: "amber", Late: "red" } as const;

/** A closed month: what arrived and when, read-only. */
function PastCloseView({ close, initialTab }: { close: PastClose; initialTab?: string }) {
  const [tab, setTab] = useState<PastTab>((["tracker", "reconciliation", "files"] as const).find((t) => t === initialTab) ?? "tracker");
  const late = lateIn(close.month);
  const files = MANAGERS.flatMap((m) => {
    const h = PACKAGE_HISTORY[m.id].find((x) => x.month === close.month)!;
    const pkg = { id: `${m.id}-pkg`, manager: m.id, title: `${close.month} package`, when: h.received, version: "v1", size: `${(3.6 + Number(m.id.slice(1)) * 0.4).toFixed(1)} MB` };
    return h.rest ? [pkg, { id: `${m.id}-rest`, manager: m.id, title: "AR aging", when: h.rest, version: "v1", size: "184 KB" }] : [pkg];
  });
  return (
    <Page
      title={<MonthPicker month={close.month} />}
      subtitle={`Closed ${close.closed} · Due ${close.due} · ${late ? `${late} of ${MANAGERS.length} managers late` : "every package on time"}`}
      tabs={
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "tracker", label: "Close tracker" },
            { id: "reconciliation", label: "Reconciliation" },
            { id: "files", label: "All files", count: files.length },
          ]}
        />
      }
    >
      {tab === "tracker" && (
        <div className="flex flex-col gap-4">
          {MANAGERS.map((m) => {
            const h = PACKAGE_HISTORY[m.id].find((x) => x.month === close.month)!;
            const props = PROPERTIES.filter((p) => p.manager === m.id);
            return (
              <Card
                key={m.id}
                flush
                title={
                  <span className="flex items-center gap-2">
                    <A href={href.manager(m.id)}>{m.name}</A> <Chip tone={HISTORY_TONE[h.status]}>{h.status}</Chip>
                    <span className="num text-xs font-normal text-fg-3">Received {h.received}</span>
                  </span>
                }
              >
                <Table bare columns={["Property", ...PACKAGE]}>
                  {props.map((p, i) => (
                    <Row key={p.id}>
                      <Td className="whitespace-nowrap">
                        <A href={href.property(p.id)}>{p.name}</A>
                      </Td>
                      {PACKAGE.map((rep) => {
                        // A partial package's missing report came later, for the first property.
                        const later = h.rest && i === 0 && rep === "AR aging";
                        return (
                          <Td key={rep} className="whitespace-nowrap">
                            <span className={cn("inline-flex items-center gap-1 text-xs", later ? "text-warning" : "text-fg-2")} title={later ? "Arrived after the package" : undefined}>
                              <Check className={cn("size-3", later ? "text-warning" : "text-favorable")} /> <span className="num">{later ? h.rest : h.received}</span>
                            </span>
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
      )}
      {tab === "reconciliation" && (
        <Table columns={["Property", "Manager", ...RECON_CHECKS]}>
          {PROPERTIES.map((p) => (
            <Row key={p.id}>
              <Td className="whitespace-nowrap">
                <A href={href.property(p.id)}>{p.name}</A>
              </Td>
              <Td className="whitespace-nowrap text-fg-2">{manager(p.manager).name}</Td>
              {RECON_CHECKS.map((c) => (
                <Td key={c}>
                  <Chip tone="green">Pass</Chip>
                </Td>
              ))}
            </Row>
          ))}
        </Table>
      )}
      {tab === "files" && (
        <Table columns={["File", "Manager", "Received", { label: "Size", num: true }, "Version"]}>
          {files.map((f) => (
            <Row key={f.id}>
              <Td>
                <span className="flex items-center gap-2">
                  <FileSpreadsheet className="size-3.5 shrink-0 text-file-xls" />
                  <span className="num text-xs">{f.title === "AR aging" ? `AR aging · ${propertiesOf(f.manager).split(", ")[0]}` : `${f.title} · ${propertiesOf(f.manager)}`}</span>
                </span>
              </Td>
              <Td className="whitespace-nowrap text-fg-2">{manager(f.manager).name}</Td>
              <Td className="num whitespace-nowrap text-xs text-fg-2">{f.when}</Td>
              <Td num className="text-fg-3">
                {f.size}
              </Td>
              <Td>
                <Chip>{f.version}</Chip>
              </Td>
            </Row>
          ))}
        </Table>
      )}
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
