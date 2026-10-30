import { Check, Flag, Mail, TriangleAlert, FileSpreadsheet, CircleCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { SectionCta } from "./section-cta";

/*
 * "What RE-IQ does": three cards, each a small diagram of one job (read,
 * check, rank) above a title and a sentence. Amounts are the sample
 * portfolio's issues and opportunities.
 */

export function WhatWeDo() {
  return (
    <section id="what-it-does" className="scroll-mt-12 border-t border-border">
      <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-[640px] text-center">
          <div className="eyebrow">What RE-IQ does</div>
          <h2 className="mt-3 text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-balance text-fg sm:text-[40px]">From monthly package to next step.</h2>
          <p className="mx-auto mt-4 max-w-[520px] text-[15px] leading-[1.6] text-fg-2">
            RE-IQ does the work between a manager&apos;s report landing and your decision: reading it, checking it, and telling you what matters.
          </p>
        </div>
        <ul className="mt-12 grid gap-3 md:grid-cols-3">
          <Card title="Reads every package" body="T-12s, rent rolls, and budgets from any manager's system, mapped to one chart of accounts. You confirm only what it isn't sure about.">
            <ReadDiagram />
          </Card>
          <Card title="Checks the math" body="Totals are checked against the manager's own statements, and any break is flagged before it reaches you.">
            <CheckDiagram />
          </Card>
          <Card title="Ranks what needs you" body="Issues and opportunities ordered by dollars, each with its cause and a next step you can assign.">
            <RankDiagram />
          </Card>
        </ul>
        <SectionCta className="mt-10 justify-center" />
      </div>
    </section>
  );
}

function Card({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <div className="relative grid h-[220px] place-items-center px-5" aria-hidden>
        {children}
      </div>
      <div className="px-6 pt-2 pb-6">
        <h3 className="text-[15px] font-semibold text-fg">{title}</h3>
        <p className="mt-2 text-[13px] leading-[1.6] text-fg-2">{body}</p>
      </div>
    </li>
  );
}

function Chip({ icon: Icon, tone = "neutral", className, children }: { icon: typeof Check; tone?: "neutral" | "good" | "warn" | "bad"; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] whitespace-nowrap",
        tone === "neutral" && "border-border bg-bg text-fg",
        tone === "good" && "border-favorable/20 bg-favorable/10 text-favorable",
        tone === "warn" && "border-warning/20 bg-warning/10 text-warning",
        tone === "bad" && "border-unfavorable/20 bg-unfavorable/10 text-unfavorable",
        className,
      )}
    >
      <Icon className="size-3 shrink-0" strokeWidth={2} />
      {children}
    </span>
  );
}

function Stem({ faded }: { faded?: boolean }) {
  return (
    <span className={cn("flex flex-col items-center", faded && "opacity-40")}>
      <span className="size-1 rounded-full bg-fg-3" />
      <span className="h-4 w-px bg-border-strong" />
      <span className="size-1 rounded-full bg-fg-3" />
    </span>
  );
}

/** Package in, accounts mapped, posted. */
function ReadDiagram() {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Chip icon={Mail}>T-12 received</Chip>
      <Stem />
      <div className="w-[220px] rounded-lg border border-border bg-bg text-center">
        <div className="px-3 py-2 text-[12px] font-medium text-fg">Map 46 accounts</div>
        <div className="flex items-center justify-center gap-1.5 border-t border-border px-3 py-1.5 text-[10.5px] text-fg-3">
          44 mapped
          <span className="size-1 rounded-full bg-fg-3" />
          <span className="text-warning">2 to confirm</span>
        </div>
      </div>
      <Stem faded />
      <Chip icon={CircleCheck} className="opacity-40">
        Posted
      </Chip>
    </div>
  );
}

/** The manager's T-12 checked line by line, with one break flagged. */
function CheckDiagram() {
  const rows: { label: string; tone: "good" | "warn"; icon: typeof Check }[] = [
    { label: "Revenue ties out", tone: "good", icon: Check },
    { label: "NOI ties out", tone: "good", icon: Check },
    { label: "Rent roll off $1,240", tone: "warn", icon: TriangleAlert },
  ];
  return (
    <div className="flex items-center">
      <Chip icon={FileSpreadsheet}>Manager&apos;s T-12</Chip>
      <svg width="36" height="96" viewBox="0 0 36 96" className="shrink-0 text-border-strong">
        <path d="M0 48 H12 M12 14 V82 M12 14 H36 M12 48 H36 M12 82 H36" fill="none" stroke="currentColor" strokeWidth={1} />
      </svg>
      <div className="flex flex-col gap-[18px]">
        {rows.map((r) => (
          <Chip key={r.label} icon={r.icon} tone={r.tone}>
            {r.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

/** Scattered findings converge into one ranked list. */
function RankDiagram() {
  const findings = [
    { label: "-$280K", x: 14, y: 16, tone: "bad" as const },
    { label: "+$66K", x: 70, y: 10, tone: "good" as const },
    { label: "-$57K", x: 8, y: 52, tone: "bad" as const },
    { label: "+$53K", x: 82, y: 46, tone: "good" as const },
    { label: "-$29K", x: 30, y: 30, tone: "bad" as const },
    { label: "-$25K", x: 62, y: 30, tone: "bad" as const },
  ];
  const target = { x: 50, y: 80 };
  return (
    <div className="absolute inset-0">
      <svg className="absolute inset-0 size-full text-border-strong" viewBox="0 0 100 100" preserveAspectRatio="none">
        {findings.map((f) => (
          <path
            key={f.label}
            d={`M${f.x} ${f.y} C ${f.x} ${(f.y + target.y) / 2}, ${target.x} ${(f.y + target.y) / 2}, ${target.x} ${target.y}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {findings.map((f) => (
        <span key={f.label} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${f.x}%`, top: `${f.y}%` }}>
          <span
            className={cn(
              "num inline-block rounded-md border bg-bg px-1.5 py-0.5 text-[10.5px]",
              f.tone === "bad" ? "border-unfavorable/25 text-unfavorable" : "border-favorable/25 text-favorable",
            )}
          >
            {f.label}
          </span>
        </span>
      ))}
      <span className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${target.x}%`, top: `${target.y}%` }}>
        <Chip icon={Flag} className="border-border-strong">
          Ranked by dollar impact
        </Chip>
      </span>
    </div>
  );
}
