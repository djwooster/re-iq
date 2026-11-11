"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Input } from "@/components/ui/controls";
import { cn } from "@/lib/cn";
import { PRODUCT_NAME } from "@/lib/labels";
import { TrendChart } from "./chart";
import { blocker, monthStatus } from "./derive";
import { fmt, noiTrend, noiVs, portfolioKpis, portfolioNoi, reporting, type Compare } from "./metrics";
import { LAST, kpis, month, profile, reported } from "./numbers";
import { CLOSE_MONTH, PROPERTIES, STAGES, STAGE_LABEL, TODAY, fmtDate, fmtLongDate, managerOf, projectStage, property, type Exception } from "./seed";
import { href, Page } from "./shell";
import { isOverdue, openExceptions, useWf } from "./store";
import { A, Card, Chip, Delta, Kpi, Meter, PlanChip, Row, Table, Td } from "./ui";

/**
 * The way in. A new account creates the workspace and goes to setup; signing
 * in goes to the Overview only once setup has finished.
 */
export function Login() {
  const router = useRouter();
  const { state, act, hydrated } = useWf();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  // Filled in so a demo clicks straight through.
  const [name, setName] = useState("Sam Taylor");
  const [email, setEmail] = useState("sam@ownerfirm.com");
  const [org, setOrg] = useState("Owner firm");
  const [password, setPassword] = useState("prototype-demo");
  const signup = mode === "signup";
  const valid = /.+@.+\..+/.test(email) && password.length >= 8 && (!signup || (name.trim() && org.trim()));
  const field = (label: string, input: React.ReactNode) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-fg-2">{label}</span>
      {input}
    </label>
  );
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-10">
      <div className="flex w-full max-w-[360px] flex-col gap-6">
        <Timesaver />
        <h1 className="mb-6 self-center text-center text-[32px] leading-tight font-semibold tracking-[-0.03em] text-fg sm:text-[44px] sm:whitespace-nowrap">Let&apos;s save you some time.</h1>
        <form
          className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (signup) {
              act.signUp({ name: name.trim(), email: email.trim() }, org.trim());
              router.push("/prototype/setup/properties");
            } else {
              router.push(state.setupDone ? "/prototype/overview" : "/prototype/setup/properties");
            }
          }}
        >
          <div>
            <h1 className="text-[15px] font-semibold">{signup ? "Create your account" : "Sign in"}</h1>
            <p className="mt-0.5 text-xs text-fg-3">{signup ? "Then add your properties and last month's reports. Most portfolios are set up in about ten minutes." : "Use your work email."}</p>
          </div>
          {signup && field("Your name", <Input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />)}
          {field("Work email", <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />)}
          {signup && field("Firm", <Input autoComplete="organization" value={org} onChange={(e) => setOrg(e.target.value)} placeholder="As your owners know it" />)}
          {field(signup ? "Password · 8 characters or more" : "Password", <Input type="password" autoComplete={signup ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} />)}
          <button type="submit" disabled={!valid || !hydrated} className="h-8 rounded-md bg-inverted text-xs font-medium text-inverted-fg transition-opacity hover:opacity-90 disabled:opacity-50">
            {signup ? "Create account" : "Sign in"}
          </button>
        </form>
        <p className="text-center text-xs text-fg-3">
          {signup ? "Already have an account? " : `New to ${PRODUCT_NAME}? `}
          <button type="button" onClick={() => setMode(signup ? "signin" : "signup")} className="font-medium text-fg underline decoration-fg/20 underline-offset-[3px] hover:decoration-fg/60">
            {signup ? "Sign in" : "Create one"}
          </button>
        </p>
      </div>
    </div>
  );
}

const WINDOWS = [16, 26, 36, 46].flatMap((y) => [16, 25, 34].map((x) => ({ x, y })));
const LOOP = 3;
const HAND = { x1: "49", y1: "47", x2: "49", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", style: { transformOrigin: "49px 47px", transformBox: "view-box" } } as const;

/** A building whose windows light up fast while a clock hand sweeps: a month's reports, done quickly. */
function Timesaver() {
  const still = useReducedMotion();
  return (
    <svg viewBox="0 0 64 64" className="size-16 self-center text-fg" aria-hidden>
      <rect x="10" y="8" width="36" height="50" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {WINDOWS.map((w, i) => (
        <motion.rect
          key={i}
          x={w.x}
          y={w.y}
          width="6"
          height="6"
          rx="1"
          fill="currentColor"
          initial={{ opacity: still ? 1 : 0.12 }}
          animate={still ? undefined : { opacity: [0.12, 1, 1, 0.12] }}
          transition={{ duration: LOOP, times: [0, 0.08, 0.85, 1], delay: i * 0.08, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
      <circle cx="49" cy="47" r="13" fill="var(--bg)" stroke="currentColor" strokeWidth="1.5" />
      {[0, 90, 180, 270].map((deg) => (
        <line key={deg} x1="49" y1="36.5" x2="49" y2="38.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" transform={`rotate(${deg} 49 47)`} />
      ))}
      <motion.line {...HAND} y2="42" initial={{ rotate: -60 }} animate={still ? undefined : { rotate: 300 }} transition={{ duration: LOOP * 12, ease: "linear", repeat: Infinity }} />
      <motion.line {...HAND} y2="38.5" animate={still ? undefined : { rotate: 360 }} transition={{ duration: LOOP, ease: "linear", repeat: Infinity }} />
      <circle cx="49" cy="47" r="1.25" fill="currentColor" />
    </svg>
  );
}

/** Most urgent first: overdue, then by stage, oldest first. */
export const byUrgency = (a: Exception, b: Exception) => Number(isOverdue(b)) - Number(isOverdue(a)) || STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage) || a.opened.localeCompare(b.opened);

export function Overview() {
  const { state } = useWf();
  const m = monthStatus(state);
  const k = portfolioKpis();
  const noi = portfolioNoi(state.period, state.compare);
  const missing = PROPERTIES.filter((p) => !reported(p.id, LAST));

  return (
    <Page
      title="Overview"
      subtitle={
        <>
          {fmtLongDate(TODAY)} · {CLOSE_MONTH} figures from {reporting().length} of {PROPERTIES.length} properties
          {missing.length > 0 && <> · {missing.map((p) => p.name).join(", ")} not received</>}
        </>
      }
      controls
    >
      <section aria-label={`${CLOSE_MONTH} close`} className="grid gap-3 lg:grid-cols-[1fr_2fr_1fr]">
        <Panel title="Close" to="/prototype/close" chip={m.close.done ? <Chip tone="green">Closed</Chip> : <Chip tone="amber">In progress</Chip>}>
          <Meter value={m.close.managersIn} total={m.close.managers} label={`${m.close.managersIn} of ${m.close.managers} managers in`} />
          <span className="text-xs text-fg-3">{m.close.notes.join(" · ") || "Every package in and reconciled"}</span>
        </Panel>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
          <span className="flex items-center justify-between">
            <Link href="/prototype/exceptions" className="text-xs font-medium hover:underline">
              Exceptions
            </Link>
            <span className="flex gap-1.5">
              {m.exceptions.overdue > 0 && <Chip tone="red">{m.exceptions.overdue} overdue</Chip>}
              {m.exceptions.replied > 0 && <Chip tone="green">{m.exceptions.replied} replied</Chip>}
            </span>
          </span>
          <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {m.exceptions.stages.map(({ stage, count }) => (
              <li key={stage}>
                <Link href={`/prototype/exceptions?status=${stage}`} className={cn("flex flex-col gap-0.5 rounded-md px-2.5 py-2 transition-colors hover:bg-fg/[0.05]", count ? "bg-fg/[0.03]" : "")}>
                  <span className={cn("num text-lg leading-tight font-medium", count ? "text-fg" : "text-fg-3")}>{count}</span>
                  <span className="text-xs text-fg-2">{STAGE_LABEL[stage]}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>

        <Panel title="Owner report" to="/prototype/owner-report" chip={m.report.sent ? <Chip tone="green">Sent {fmtDate(m.report.sent)}</Chip> : <Chip>Draft</Chip>}>
          <Meter value={m.report.ready} total={m.report.total} label={`${m.report.ready} of ${m.report.total} properties ready`} />
          <span className="text-xs text-fg-3">The rest show what&apos;s holding them</span>
        </Panel>
      </section>

      <section aria-label="Portfolio KPIs" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi
          label={`NOI · ${state.period === "Month" ? CLOSE_MONTH : state.period}`}
          value={fmt.usdShort(noi.actual)}
          sub={
            <>
              <Delta value={noi.pct} format={fmt.signedPct} /> <span className="text-fg-3">vs. {state.compare.toLowerCase()}</span>
            </>
          }
          status={noi.pct < -0.03 ? "breach" : "ok"}
          target="Alert below budget by 3%+"
          href="/prototype/financials"
        />
        <Kpi label="Physical occupancy" value={fmt.pct(k.occupancy.value)} trend={k.occupancy.trend} status={k.occupancy.status} target="Target 93–96%" href="/prototype/leasing" />
        <Kpi label="Economic occupancy" value={fmt.pct(k.economic.value)} sub={<span className="num text-fg-3">{fmt.pts(-k.economic.gap)} vs. physical</span>} status={k.economic.status} target="Within 5 points of physical" href="/prototype/leasing" />
        <Kpi label="Leased %" value={fmt.pct(k.leased.value)} sub={<span className="num text-fg-3">{fmt.pct(k.leased.exposure)} 60-day exposure</span>} trend={k.leased.trend} status={k.leased.status} target="Exposure under 8%" href="/prototype/leasing" />
        <Kpi
          label="Collection rate"
          value={fmt.pct(k.collection.value)}
          sub={k.collection.excluded.length > 0 && <span className="text-fg-3">Excludes {k.collection.excluded.map((id) => property(id)!.name).join(", ")}</span>}
          status={k.collection.status}
          target="Target 97%+"
          href="/prototype/operations"
        />
        <Kpi label="DSCR · T-12" value={fmt.x(k.dscr.value)} sub={<span className="text-fg-3">Lowest {fmt.x(k.dscr.lowest.dscr)}, {property(k.dscr.lowest.id)!.name}</span>} status={k.dscr.status} target="Covenant 1.25x" href="/prototype/capital" />
      </section>

      <div className="grid gap-3 xl:grid-cols-[2fr_1fr]">
        <Card title="Portfolio NOI by month" action={<span className="num text-xs text-fg-3">Dec 2025 – Nov 2026</span>}>
          <TrendChart
            data={noiTrend(state.compare)}
            series={[
              { key: "actual", label: "Actual", style: "data" },
              { key: "plan", label: state.compare, style: "reference" },
            ]}
            format={fmt.usd}
            axisFormat={fmt.usdShort}
            height={220}
          />
        </Card>
        <WaitingOnYou />
      </div>

      <Card title="Properties" flush action={<A href="/prototype/properties" className="text-xs">All properties</A>}>
        <PropertyTable bare />
      </Card>
    </Page>
  );
}

/** What's waiting on the asset manager right now. Facts only; they decide. */
function WaitingOnYou() {
  const { state } = useWf();
  const replied = state.exceptions.filter((e) => e.stage === "waiting" && e.question?.reply);
  const overdue = state.exceptions.filter(isOverdue);
  const fresh = state.exceptions.filter((e) => e.stage === "new");
  const gates = state.projects.filter((p) => p.status === "Active" && (p.step === 2 || (p.step === 4 && p.type === "Interior")));
  const approvals = state.approvals.filter((a) => a.status === "Waiting");
  const rows: { key: string; label: React.ReactNode; meta: string; href: string }[] = [
    ...overdue.map((e) => ({ key: e.id, label: e.trigger, meta: `${property(e.property)!.name} · overdue since ${fmtDate(e.question!.due)}`, href: href.exception(e.id) })),
    ...replied.map((e) => ({ key: e.id, label: e.trigger, meta: `${property(e.property)!.name} · PM replied`, href: href.exception(e.id) })),
    ...fresh.map((e) => ({ key: e.id, label: e.trigger, meta: `${property(e.property)!.name} · new ${fmtDate(e.opened)}`, href: href.exception(e.id) })),
    ...gates.map((p) => ({ key: p.id, label: `${projectStage(p)} · ${p.name}`, meta: property(p.property)!.name, href: href.project(p.id) })),
    ...approvals.map((a) => ({ key: a.id, label: a.title, meta: `${property(a.property)!.name} · from ${a.from}`, href: a.projectId ? href.project(a.projectId) : "/prototype/tasks" })),
  ];
  return (
    <Card title="Waiting on you" action={<span className="num text-xs text-fg-3">{rows.length}</span>}>
      <ul className="-mx-1 flex flex-col">
        {rows.slice(0, 7).map((r) => (
          <li key={r.key}>
            <Link href={r.href} className="group flex items-center gap-3 rounded-md px-1 py-1.5 transition-colors hover:bg-fg/[0.03]">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">{r.label}</span>
                <span className="block truncate text-xs text-fg-3">{r.meta}</span>
              </span>
              <ArrowRight className="size-3 shrink-0 text-fg-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </li>
        ))}
      </ul>
      {rows.length > 7 && (
        <Link href="/prototype/tasks" className="mt-2 block text-xs text-fg-3 hover:text-fg">
          {rows.length - 7} more
        </Link>
      )}
    </Card>
  );
}

function Panel({ title, to, chip, children }: { title: string; to: string; chip: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={to} className="group flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-border-strong">
      <span className="flex items-center justify-between">
        <span className="text-xs font-medium group-hover:underline">{title}</span>
        {chip}
      </span>
      {children}
    </Link>
  );
}

/** NOI for the last month a property reported, against the comparison. */
function latestNoi(id: string, compare: Compare) {
  const m = profile(id).through;
  const a = month(id, m).noi;
  const b = month(id, m, compare).noi;
  return { actual: a, plan: b, variance: a - b, pct: a / b - 1 };
}

/** All twelve properties, shared by Overview and Properties. */
export function PropertyTable({ bare }: { bare?: boolean }) {
  const { state } = useWf();
  return (
    <Table
      bare={bare}
      columns={[
        "Property",
        "Manager",
        "Status",
        { label: "Units", num: true },
        { label: "NOI", num: true },
        { label: `vs. ${state.compare}`, num: true },
        { label: "Occupancy", num: true },
        { label: "Leased", num: true },
        { label: "Collections", num: true },
        "Renovation",
        { label: "Exceptions", num: true },
        "Owner report",
      ]}
    >
      {PROPERTIES.map((p) => {
        const open = openExceptions(state, p.id).length;
        const project = state.projects.find((x) => x.property === p.id && x.status === "Active");
        const block = blocker(state, p.id);
        const late = !reported(p.id, LAST);
        const n = late && state.period === "Month" ? latestNoi(p.id, state.compare) : noiVs(p.id, state.period, state.compare);
        const k = kpis(p.id);
        return (
          <Row key={p.id} href={href.property(p.id)}>
            <Td className="font-medium whitespace-nowrap">{p.name}</Td>
            <Td className="whitespace-nowrap">
              <A href={href.manager(managerOf(p.id).id)} className="font-normal text-fg-2">
                {managerOf(p.id).name}
              </A>
            </Td>
            <Td>
              <PlanChip off={open > 0} />
            </Td>
            <Td num className="text-fg-2">
              {profile(p.id).units}
            </Td>
            <Td num>{n ? fmt.usd(n.actual) : "–"}</Td>
            <Td num>
              {n && <Delta value={n.pct} format={fmt.signedPct} />}
              {late && state.period === "Month" && <span className="ml-1.5 text-[11px] text-fg-3">Oct</span>}
            </Td>
            <Td num>{fmt.pct(k.occupancy)}</Td>
            <Td num>{fmt.pct(k.leased)}</Td>
            <Td num className={cn(k.collection !== null && k.collection < 0.97 && "text-unfavorable")}>
              {k.collection === null ? <span className="text-fg-3">Not received</span> : fmt.pct(k.collection)}
            </Td>
            <Td className="whitespace-nowrap text-fg-2">{project ? projectStage(project) : <span className="text-fg-3">None</span>}</Td>
            <Td num className={cn(open ? "text-fg" : "text-fg-3")}>
              {open || "–"}
            </Td>
            <Td>{block ? <span className="text-xs whitespace-nowrap text-fg-3">{block}</span> : <Chip tone="green">Ready</Chip>}</Td>
          </Row>
        );
      })}
    </Table>
  );
}
