import { ArrowDown, ChartColumnBig, CircleCheck, Database, FileSpreadsheet, FileText, Files, Flag, Mail, Printer, ScrollText, Sheet, Sparkles, Table2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatCurrencyShort } from "@/lib/format";

/*
 * Hero diagram, read left to right: every manager's package arrives in a
 * different form (tangled), RE-IQ reads it, ranks what costs the most, and
 * hands back three clean next steps. The four amounts are the sample
 * portfolio's top issues.
 *
 * Desktop draws on a fixed 1200×400 canvas: nodes are absolutely positioned
 * by percentage and the SVG shares the same coordinates, so lines meet nodes
 * at any width. Smaller screens get a stacked version.
 */

const W = 1200;
const H = 400;

const FILES = [
  { icon: Sheet, x: 70, y: 92 },
  { icon: FileText, x: 205, y: 70, tilt: 6 },
  { icon: Files, x: 352, y: 104 },
  { icon: ScrollText, x: 52, y: 218, tilt: -8 },
  { icon: FileSpreadsheet, x: 190, y: 212 },
  { icon: Mail, x: 325, y: 238, tilt: 4 },
  { icon: Printer, x: 228, y: 336 },
  { icon: Table2, x: 386, y: 330, tilt: -5 },
];

const READ = { x: 520, y: 200 };
const CARD = { left: 590, right: 900 };
const ACT = { x: 978, y: 200 };
const OUTPUTS = [
  { icon: CircleCheck, y: 108 },
  { icon: Flag, y: 200 },
  { icon: ChartColumnBig, y: 292 },
];
const OUTPUT_X = 1134;

const ISSUES = [280_430, 57_153, 28_547, 24_715];
const MAX = ISSUES[0];

/** Each file's line into Read wanders on the way: control points pulled off the direct path by a fixed offset. */
const WANDER = [
  [70, -60],
  [-50, 90],
  [40, -70],
  [110, 40],
  [-80, -90],
  [60, 70],
  [-40, -110],
  [90, 30],
];

/** Stray strands between files, so the left side reads as tangled rather than merely scattered. */
const STRANDS = [
  [0, 5],
  [1, 3],
  [6, 2],
  [3, 7],
  [4, 1],
];

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

type Point = [number, number];

/** The cubic curve from a file node into the Read pill: start, two control points, end. */
function fileLine(f: { x: number; y: number }, i: number): [Point, Point, Point, Point] {
  const [dx, dy] = WANDER[i];
  return [
    [f.x, f.y],
    [f.x + 60 + dx, f.y + dy],
    [READ.x - 70, READ.y - dy * 0.6],
    [READ.x - 30, READ.y],
  ];
}

/** Point halfway along a cubic Bézier. */
function midpoint([a, b, c, d]: [Point, Point, Point, Point]): Point {
  return [(a[0] + 3 * b[0] + 3 * c[0] + d[0]) / 8, (a[1] + 3 * b[1] + 3 * c[1] + d[1]) / 8];
}

export function HeroFlow() {
  return (
    <figure aria-label="Every manager's reports in, ranked issues and next steps out (sample)" className="mx-auto w-full max-w-[1120px]">
      <div className="relative hidden aspect-[1200/400] lg:block">
        <svg className="absolute inset-0 size-full" viewBox={`0 0 ${W} ${H}`} aria-hidden>
          <g fill="none" stroke="currentColor" strokeWidth={1} className="text-border-strong">
            {STRANDS.map(([a, b], i) => {
              const p = FILES[a];
              const q = FILES[b];
              return <path key={`s${i}`} d={`M${p.x} ${p.y} C ${p.x + 90} ${q.y - 40}, ${q.x - 90} ${p.y + 50}, ${q.x} ${q.y}`} opacity={0.7} />;
            })}
            {FILES.map((f, i) => {
              const [p0, p1, p2, p3] = fileLine(f, i);
              return <path key={`f${i}`} d={`M${p0} C ${p1}, ${p2}, ${p3}`} />;
            })}
            <path d={`M${READ.x + 30} ${READ.y} L${CARD.left} ${READ.y}`} />
            <path d={`M${CARD.right} ${ACT.y} L${ACT.x - 28} ${ACT.y}`} />
            {OUTPUTS.map((o) => (
              <path
                key={o.y}
                d={`M${ACT.x + 28} ${ACT.y} C ${ACT.x + 70} ${ACT.y}, ${ACT.x + 70} ${o.y}, ${ACT.x + 112} ${o.y} L${OUTPUT_X - 26} ${o.y}`}
              />
            ))}
          </g>
          {/* A dot halfway along every other line, like data in transit */}
          <g className="fill-fg-3" opacity={0.7}>
            {FILES.filter((_, i) => i % 2 === 0).map((f) => {
              const [x, y] = midpoint(fileLine(f, FILES.indexOf(f)));
              return <circle key={`${f.x}-${f.y}`} cx={x} cy={y} r={2.5} />;
            })}
            <circle cx={CARD.left - 4} cy={READ.y} r={2.5} />
            <circle cx={CARD.right + 4} cy={ACT.y} r={2.5} />
          </g>
        </svg>

        {FILES.map(({ icon: Icon, x, y, tilt }) => (
          <Node key={`${x}-${y}`} x={x} y={y} tilt={tilt}>
            <Icon className="size-5 text-fg-2" strokeWidth={1.5} />
          </Node>
        ))}
        <Pill x={READ.x} y={READ.y}>
          Read
        </Pill>
        <div className="absolute top-1/2 -translate-y-1/2" style={{ left: pct(CARD.left, W), width: pct(CARD.right - CARD.left, W) }}>
          <RankedCard />
        </div>
        <Pill x={ACT.x} y={ACT.y}>
          Act
        </Pill>
        {OUTPUTS.map(({ icon: Icon, y }) => (
          <Node key={y} x={OUTPUT_X} y={y}>
            <Icon className="size-5 text-fg" strokeWidth={1.75} />
          </Node>
        ))}
      </div>

      {/* Stacked for smaller screens */}
      <div className="flex flex-col items-center gap-4 lg:hidden">
        <div className="flex flex-wrap justify-center gap-2">
          {FILES.slice(0, 6).map(({ icon: Icon, tilt }, i) => (
            <span
              key={i}
              className={cn("grid size-11 place-items-center rounded-full border border-border bg-surface", i % 2 === 1 && "translate-y-2")}
              style={{ rotate: `${tilt ?? 0}deg` }}
            >
              <Icon className="size-[18px] text-fg-2" strokeWidth={1.5} aria-hidden />
            </span>
          ))}
        </div>
        <span className="rounded-full bg-inverted px-3 py-1 text-[12px] font-medium text-inverted-fg">Read</span>
        <div className="w-full max-w-[360px]">
          <RankedCard />
        </div>
        <ArrowDown className="size-4 text-fg-3" strokeWidth={1.75} aria-hidden />
        <div className="flex gap-3">
          {OUTPUTS.map(({ icon: Icon, y }) => (
            <span key={y} className="grid size-11 place-items-center rounded-full border border-border bg-surface">
              <Icon className="size-[18px] text-fg" strokeWidth={1.75} aria-hidden />
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}

function Node({ x, y, tilt, children }: { x: number; y: number; tilt?: number; children: React.ReactNode }) {
  return (
    <span
      className="absolute grid size-[52px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface"
      style={{ left: pct(x, W), top: pct(y, H), rotate: tilt ? `${tilt}deg` : undefined }}
      aria-hidden
    >
      {children}
    </span>
  );
}

function Pill({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return (
    <span
      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-inverted px-3.5 py-1.5 text-[12px] font-medium text-inverted-fg"
      style={{ left: pct(x, W), top: pct(y, H) }}
    >
      {children}
    </span>
  );
}

function RankedCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface p-3 shadow-overlay">
      <div className="flex items-center gap-2 rounded-full border border-border bg-bg px-3 py-2">
        <Sparkles className="size-3.5 shrink-0 text-data" strokeWidth={1.75} aria-hidden />
        <span className="h-1.5 w-3/5 rounded-full bg-fg/[0.08]" aria-hidden />
      </div>
      <ol className="mt-3 flex flex-col gap-2.5 px-1">
        {ISSUES.map((impact, i) => (
          <li key={impact} className="grid grid-cols-[68px_minmax(0,1fr)_44px] items-center gap-2">
            <span className="text-[11px] text-fg-2">Property #{i + 1}</span>
            <span className="h-1.5 rounded-full bg-fg/[0.06]">
              <span className="block h-full rounded-full bg-unfavorable/70" style={{ width: `${Math.max(8, (impact / MAX) * 100)}%` }} />
            </span>
            <span className="num text-right text-[11px] text-unfavorable">-{formatCurrencyShort(impact)}</span>
          </li>
        ))}
      </ol>
      <div className="mt-3 grid place-items-center border-t border-border pt-4 pb-1">
        <span className="relative grid size-10 place-items-center rounded-full border border-border bg-bg">
          <span className="absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-data/25" aria-hidden />
          <span className="absolute top-1/2 left-1/2 size-[92px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-data/15" aria-hidden />
          <Database className="size-4 text-fg-2" strokeWidth={1.75} aria-hidden />
        </span>
      </div>
    </div>
  );
}
