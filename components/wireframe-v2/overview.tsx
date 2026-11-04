"use client";

import Link from "next/link";
import { ForceLight } from "@/components/theme/theme-provider";
import { cn } from "@/lib/cn";
import { PRODUCT_NAME } from "@/lib/labels";
import { blocker, cycle } from "./derive";
import { CLOSE_MONTH, PROPERTIES, STAGES, TODAY, daysBetween, fmtLongDate, managerOf, property, type Exception } from "./seed";
import { href, Page } from "./shell";
import { isOverdue, openExceptions, useWf } from "./store";
import { A, Bar, barW, Button, Card, Chip, RagChip, Row, Stat, StageChip, Table, Td } from "./ui";

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

const STEP_TONE = { Done: "green", "In progress": "amber", "Not started": "neutral" } as const;

/** Most urgent first: overdue, then by stage, oldest first. */
export const byUrgency = (a: Exception, b: Exception) => Number(isOverdue(b)) - Number(isOverdue(a)) || STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage) || a.opened.localeCompare(b.opened);

export function Overview() {
  const { state } = useWf();
  const steps = cycle(state);
  const top = openExceptions(state).sort(byUrgency).slice(0, 5);

  return (
    <Page title="Overview" subtitle={`${fmtLongDate(TODAY)} · ${CLOSE_MONTH} close in progress`} controls>
      <section aria-label={`${CLOSE_MONTH} close`} className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold">{CLOSE_MONTH} close</h2>
        <ol className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
          {steps.map((s, i) => (
            <li key={s.name}>
              <Link href={s.href} className="group flex h-full flex-col gap-1.5 rounded-md border border-fg/15 p-2.5 transition-colors hover:border-fg/40">
                <span className="text-[10px] text-fg-3">Step {i + 1}</span>
                <span className="text-xs font-medium text-[var(--wf-accent)] group-hover:underline">{s.name}</span>
                <Chip tone={STEP_TONE[s.status]}>{s.status}</Chip>
                <span className="text-[11px] leading-snug text-fg-3">{s.line}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Portfolio KPIs" className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="NOI vs. budget" target="Alert below budget by 3%+" href="/wireframe-v2/financials" />
        <Stat label="Physical occupancy" target="Target 93–96%" href="/wireframe-v2/leasing" />
        <Stat label="Economic occupancy" target="Within 5 points of physical" href="/wireframe-v2/leasing" />
        <Stat label="Leased % / 60-day exposure" target="Exposure under 8%" href="/wireframe-v2/leasing" />
        <Stat label="Collection rate" target="Target 97%+" href="/wireframe-v2/operations" />
        <Stat label="DSCR" target="Covenant 1.25x" href="/wireframe-v2/capital" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Card title="Properties" action={<A href="/wireframe-v2/properties" className="text-[11px]">All properties</A>}>
          <PropertyTable />
        </Card>
        <Card title="Exceptions" action={<A href="/wireframe-v2/exceptions" className="text-[11px]">All exceptions</A>}>
          <ul className="flex flex-col">
            {top.map((e) => (
              <li key={e.id} className="border-b border-fg/10 py-2.5 first:pt-0 last:border-b-0 last:pb-0">
                <Link href={href.exception(e.id)} className="group flex flex-col gap-1">
                  <span className="text-xs font-medium text-[var(--wf-accent)] group-hover:underline">{e.trigger}</span>
                  <span className="flex flex-wrap items-center gap-2 text-[11px] text-fg-3">
                    {property(e.property)!.name} · {daysBetween(e.opened, TODAY)}d
                    <StageChip e={e} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Page>
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
            <Td className="whitespace-nowrap text-fg-2">{managerOf(p.id).name}</Td>
            <Td>
              <RagChip rag={p.rag} />
            </Td>
            {[0, 1, 2, 3].map((j) => (
              <Td key={j}>
                <Bar w={barW(i + j * 3)} />
              </Td>
            ))}
            <Td className="whitespace-nowrap text-fg-2">{project ? `Step ${project.step} of 6` : <span className="text-fg-3">None</span>}</Td>
            <Td className={cn(open ? "text-fg" : "text-fg-3")}>{open || "None"}</Td>
            <Td>{block ? <span className="text-[11px] whitespace-nowrap text-fg-3">{block}</span> : <Chip tone="green">Ready for owner report</Chip>}</Td>
          </Row>
        );
      })}
    </Table>
  );
}
