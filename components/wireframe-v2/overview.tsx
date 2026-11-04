"use client";

import Link from "next/link";
import { ForceLight } from "@/components/theme/theme-provider";
import { cn } from "@/lib/cn";
import { PRODUCT_NAME } from "@/lib/labels";
import { blocker, monthStatus } from "./derive";
import { CLOSE_MONTH, PROPERTIES, STAGES, STAGE_LABEL, TODAY, fmtDate, fmtLongDate, managerOf, projectStage, type Exception } from "./seed";
import { href, Page } from "./shell";
import { isOverdue, openExceptions, useWf } from "./store";
import { A, Bar, barW, Button, Card, Chip, PlanChip, Row, Stat, Table, Td } from "./ui";

export function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <ForceLight />
      <div className="flex w-full max-w-[320px] flex-col gap-3">
        <Link href="/" className="num mb-2 text-center text-[15px] font-semibold tracking-[0.06em] text-fg hover:opacity-70">
          {PRODUCT_NAME}
        </Link>
        <Prefilled label="Email" type="email" value="am@ownerfirm.com" />
        <Prefilled label="Password" type="password" value="wireframe-demo" />
        <Button href="/wireframe-v2/overview">Sign in</Button>
      </div>
    </div>
  );
}

function Prefilled({ label, type, value }: { label: string; type: string; value: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-fg-2">{label}</span>
      <input type={type} value={value} disabled readOnly className="h-9 cursor-not-allowed rounded-md border border-fg/15 bg-fg/[0.035] px-3 text-xs text-fg-2" />
    </label>
  );
}

/** Most urgent first: overdue, then by stage, oldest first. */
export const byUrgency = (a: Exception, b: Exception) => Number(isOverdue(b)) - Number(isOverdue(a)) || STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage) || a.opened.localeCompare(b.opened);

export function Overview() {
  const { state } = useWf();
  const m = monthStatus(state);

  return (
    <Page title="Overview" subtitle={`${fmtLongDate(TODAY)} · ${CLOSE_MONTH} close in progress`} controls>
      <section aria-label={`${CLOSE_MONTH} close`} className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold">{CLOSE_MONTH} close</h2>
        <div className="grid gap-2 lg:grid-cols-[1fr_2fr_1fr]">
          <Panel title="Close" href="/wireframe-v2/close" chip={m.close.done ? <Chip tone="green">Closed</Chip> : null}>
            <Progress value={m.close.managersIn} total={m.close.managers} label={`${m.close.managersIn} of ${m.close.managers} managers in`} />
            <span className="text-[11px] text-fg-3">{m.close.notes.join(" · ") || "Every package in and reconciled"}</span>
          </Panel>

          <div className="flex flex-col gap-3 rounded-md border border-fg/15 p-3">
            <span className="flex items-center justify-between">
              <Link href="/wireframe-v2/exceptions" className="text-xs font-medium text-[var(--wf-accent)] hover:underline">
                Exceptions
              </Link>
              <span className="flex gap-1.5">
                {m.exceptions.overdue > 0 && <Chip tone="red">{m.exceptions.overdue} overdue</Chip>}
                {m.exceptions.replied > 0 && <Chip tone="green">{m.exceptions.replied} replied</Chip>}
              </span>
            </span>
            <ol className="flex flex-wrap items-stretch gap-1.5">
              {m.exceptions.stages.map(({ stage, count }, i) => (
                <li key={stage} className="flex flex-1 items-center gap-1.5">
                  {i > 0 && <span className="text-xs text-fg-3">→</span>}
                  <Link href={`/wireframe-v2/exceptions?status=${stage}`} className={cn("flex min-w-[88px] flex-1 flex-col gap-0.5 rounded-md px-2.5 py-2 transition-colors hover:bg-fg/[0.06]", count ? "bg-fg/[0.035]" : "")}>
                    <span className={cn("text-lg leading-tight font-semibold", count ? "text-fg" : "text-fg-3")}>{count}</span>
                    <span className="text-[11px] text-fg-2">{STAGE_LABEL[stage]}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>

          <Panel title="Owner report" href="/wireframe-v2/owner-report" chip={m.report.sent ? <Chip tone="green">Sent {fmtDate(m.report.sent)}</Chip> : <Chip>Draft</Chip>}>
            <Progress value={m.report.ready} total={m.report.total} label={`${m.report.ready} of ${m.report.total} properties ready`} />
          </Panel>
        </div>
      </section>

      <section aria-label="Portfolio KPIs" className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="NOI vs. budget" target="Alert below budget by 3%+" href="/wireframe-v2/financials" />
        <Stat label="Physical occupancy" target="Target 93–96%" href="/wireframe-v2/leasing" />
        <Stat label="Economic occupancy" target="Within 5 points of physical" href="/wireframe-v2/leasing" />
        <Stat label="Leased % / 60-day exposure" target="Exposure under 8%" href="/wireframe-v2/leasing" />
        <Stat label="Collection rate" target="Target 97%+" href="/wireframe-v2/operations" />
        <Stat label="DSCR" target="Covenant 1.25x" href="/wireframe-v2/capital" />
      </section>

      <Card title="Properties" action={<A href="/wireframe-v2/properties" className="text-[11px]">All properties</A>}>
        <PropertyTable />
      </Card>
    </Page>
  );
}

function Panel({ title, href: to, chip, children }: { title: string; href: string; chip: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={to} className="group flex flex-col gap-3 rounded-md border border-fg/15 p-3 transition-colors hover:border-fg/40">
      <span className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--wf-accent)] group-hover:underline">{title}</span>
        {chip}
      </span>
      {children}
    </Link>
  );
}

function Progress({ value, total, label }: { value: number; total: number; label: string }) {
  return (
    <span className="flex flex-col gap-1.5">
      <span className="text-xs">{label}</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-fg/10">
        <span className="block h-full rounded-full bg-[var(--wf-accent)]" style={{ width: `${(value / total) * 100}%` }} />
      </span>
    </span>
  );
}

/** All twelve properties, shared by Overview and Properties. */
export function PropertyTable() {
  const { state } = useWf();
  return (
    <Table columns={["Property", "Manager", "Status", "NOI vs. budget", "Occupancy", "Leased %", "Collections", "Renovation", "Open exceptions", "Owner report"]}>
      {PROPERTIES.map((p, i) => {
        const open = openExceptions(state, p.id).length;
        const project = state.projects.find((x) => x.property === p.id && x.status === "Active");
        const block = blocker(state, p.id);
        return (
          <Row key={p.id} href={href.property(p.id)}>
            <Td className="font-medium whitespace-nowrap text-[var(--wf-accent)]">{p.name}</Td>
            <Td className="whitespace-nowrap">
              <A href={href.manager(managerOf(p.id).id)}>{managerOf(p.id).name}</A>
            </Td>
            <Td>
              <PlanChip off={open > 0} />
            </Td>
            {[0, 1, 2, 3].map((j) => (
              <Td key={j}>
                <Bar w={barW(i + j * 3)} />
              </Td>
            ))}
            <Td className="whitespace-nowrap text-fg-2">{project ? projectStage(project) : <span className="text-fg-3">None</span>}</Td>
            <Td className={cn(open ? "text-fg" : "text-fg-3")}>{open || "None"}</Td>
            <Td>{block ? <span className="text-[11px] whitespace-nowrap text-fg-3">{block}</span> : <Chip tone="green">Ready for owner report</Chip>}</Td>
          </Row>
        );
      })}
    </Table>
  );
}
