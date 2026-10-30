import { ArrowDown, FileSpreadsheet, FileText, ListChecks, Sparkles, SplitSquareHorizontal, TextSearch } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatCurrencyShort } from "@/lib/format";

/*
 * Hero diagram: September's mismatched packages from four managers' systems
 * flow into one ranked list of what needs attention (the sample portfolio's
 * real issues), and out to what you do with each one.
 */

const FILES = [
  { name: "Brookstone_T12_Sep2026.xlsx", system: "Yardi", tilt: "-rotate-1" },
  { name: "PeachtreeLanding_IncomeStatement_2026-09.csv", system: "Entrata", tilt: "rotate-[0.6deg]" },
  { name: "magnolia-court-rent-roll-2026-09-30.pdf", system: "AppFolio", tilt: "-rotate-[0.4deg]" },
  { name: "Mesa Verde - 12 Month Income Statement - Sep 2026.xlsx", system: "Rent Manager", tilt: "rotate-1" },
  { name: "WillowBend_Delinquency_Sep26.xlsx", system: "ResMan", tilt: "-rotate-[0.8deg]" },
];

const ISSUES = [
  { property: "Lakeline Flats", title: "Vacancy and concessions behind budget", impact: 280_430 },
  { property: "Mesa Verde", title: "Repeat HVAC failures in R&M", impact: 57_153 },
  { property: "Willow Bend", title: "Contract labor in payroll", impact: 28_547 },
  { property: "Peachtree Landing", title: "Utilities 25.9% over budget", impact: 24_715 },
];
const MAX = Math.max(...ISSUES.map((i) => i.impact));

const OUTPUTS = [
  { icon: TextSearch, label: "The cause, with its source line" },
  { icon: SplitSquareHorizontal, label: "Variance by driver and property" },
  { icon: ListChecks, label: "A next step to assign" },
];

export function HeroFlow() {
  return (
    <figure aria-label="Manager packages in, a ranked list of what needs attention out (sample portfolio)" className="mx-auto w-full max-w-[1120px]">
      {/* Desktop: files → ranked list → what you get, joined by connectors */}
      <div className="hidden grid-cols-[minmax(0,0.95fr)_88px_minmax(0,1.25fr)_88px_minmax(0,0.75fr)] lg:grid">
        <ul className="grid grid-rows-5 gap-2 py-2">
          {FILES.map((f) => (
            <li key={f.name} className="flex items-center">
              <FileCard {...f} />
            </li>
          ))}
        </ul>
        <Connector from={FILES.length} to={1} label="Read" />
        <div className="self-center">
          <RankedCard />
        </div>
        <Connector from={1} to={OUTPUTS.length} label="Rank" />
        <ul className="grid grid-rows-3 gap-2 py-10">
          {OUTPUTS.map((o) => (
            <li key={o.label} className="flex items-center">
              <OutputChip {...o} />
            </li>
          ))}
        </ul>
      </div>

      {/* Mobile and tablet: the same story, stacked */}
      <div className="flex flex-col items-center gap-3 lg:hidden">
        <ul className="flex w-full flex-col gap-1.5">
          {FILES.slice(0, 3).map((f) => (
            <li key={f.name}>
              <FileCard {...f} tilt="" />
            </li>
          ))}
        </ul>
        <ArrowDown className="size-4 text-fg-3" strokeWidth={1.75} aria-hidden />
        <RankedCard />
        <ul className="flex w-full flex-wrap justify-center gap-1.5">
          {OUTPUTS.map((o) => (
            <li key={o.label}>
              <OutputChip {...o} />
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="mt-4 text-center text-[11px] text-fg-3">September packages from the sample portfolio&apos;s four managers</figcaption>
    </figure>
  );
}

function FileCard({ name, system, tilt }: { name: string; system: string; tilt: string }) {
  const Icon = name.endsWith(".pdf") ? FileText : FileSpreadsheet;
  return (
    <div className={cn("flex w-full min-w-0 items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-2 text-left", tilt)}>
      <Icon className="size-3.5 shrink-0 text-fg-3" strokeWidth={1.75} aria-hidden />
      <span className="num min-w-0 flex-1 truncate text-[10.5px] text-fg-2">{name}</span>
      <span className="shrink-0 rounded border border-border px-1.5 py-px text-[9.5px] text-fg-3">{system}</span>
    </div>
  );
}

function RankedCard() {
  return (
    <div className="w-full rounded-xl border border-border bg-surface p-2 text-left">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2">
        <Sparkles className="size-3.5 shrink-0 text-data" strokeWidth={1.75} aria-hidden />
        <span className="truncate text-[11.5px] text-fg-2">
          September close · <span className="text-fg">34 reports read</span>, 5 issues ranked by dollar impact
        </span>
      </div>
      <div className="eyebrow mt-3 px-1.5">Needs attention</div>
      <ol className="mt-1.5 flex flex-col">
        {ISSUES.map((issue, i) => (
          <li key={issue.property} className={cn("px-1.5 py-2", i > 0 && "border-t border-border")}>
            <div className="flex items-baseline gap-2">
              <span className="num shrink-0 text-[10px] text-fg-3">0{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-[11.5px] text-fg">
                <span className="font-medium">{issue.property}</span>
                <span className="text-fg-3"> · {issue.title}</span>
              </span>
              <span className="num shrink-0 text-[11.5px] text-unfavorable">-{formatCurrencyShort(issue.impact)}</span>
            </div>
            <div className="mt-1.5 ml-[22px] h-0.5 rounded-full bg-fg/[0.06]">
              <div className="h-full rounded-full bg-unfavorable/70" style={{ width: `${(issue.impact / MAX) * 100}%` }} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function OutputChip({ icon: Icon, label }: { icon: typeof ListChecks; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-surface py-1.5 pr-3 pl-2 text-[11px] text-fg-2">
      <span className="grid size-5 shrink-0 place-items-center rounded-full border border-border bg-bg">
        <Icon className="size-3 text-fg-3" strokeWidth={1.75} aria-hidden />
      </span>
      {label}
    </div>
  );
}

/** Curved lines from `from` evenly spaced points on one side to `to` points on the other, with a label in the middle. */
function Connector({ from, to, label }: { from: number; to: number; label: string }) {
  const ys = (n: number) => Array.from({ length: n }, (_, i) => ((i + 0.5) / n) * 100);
  const pairs = from > 1 ? ys(from).map((y) => [y, 50]) : ys(to).map((y) => [50, y]);
  return (
    <div className="relative" aria-hidden>
      <svg className="absolute inset-0 size-full text-border-strong" viewBox="0 0 100 100" preserveAspectRatio="none">
        {pairs.map(([a, b], i) => (
          <path key={i} d={`M0 ${a} C 50 ${a}, 50 ${b}, 100 ${b}`} fill="none" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-bg px-2 py-0.5 text-[10.5px] font-medium text-fg">
        {label}
      </span>
    </div>
  );
}
