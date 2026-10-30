import { ArrowDown, Mail, Sparkles, TrendingUp } from "lucide-react";
import { formatCurrencyShort } from "@/lib/format";
import { TypingPrompt } from "./typing-prompt";

/*
 * Hero diagram, read left to right: every manager's package arrives in a
 * different form (tangled lines, red dots: problems coming in), RE-IQ reads
 * and ranks what costs the most, and one result comes out (green dots: NOI
 * found). Amounts are the sample portfolio's top issues and its open
 * opportunities, which sum to the +$177K on the demo's Overview.
 *
 * Desktop draws on a fixed 1200×360 canvas centered on the card, so the card
 * sits on the page's center line. Nodes are positioned by percentage and the
 * SVG shares the same coordinates, so lines meet nodes at any width. Dots are
 * hidden under reduced motion. Smaller screens get a stacked version.
 */

const W = 1200;
const H = 360;

type FileNode = { kind: "XLS" | "PDF" | "CSV" | "mail"; x: number; y: number; tilt: number };

const FILES: FileNode[] = [
  { kind: "XLS", x: 132, y: 92, tilt: -7 },
  { kind: "PDF", x: 252, y: 64, tilt: 5 },
  { kind: "mail", x: 290, y: 178, tilt: -4 },
  { kind: "CSV", x: 172, y: 196, tilt: 3 },
  { kind: "PDF", x: 118, y: 290, tilt: 6 },
  { kind: "XLS", x: 248, y: 292, tilt: -5 },
];

const CARD = { left: 438, right: 762 };
const READ = { x: 380, y: 180 };
const ACT = { x: 820, y: 180 };
const RESULT = { left: 900, x: 990 };

const ISSUES = [280_430, 57_153, 28_547, 24_715];
const MAX = ISSUES[0];
const NOI_FOUND = 176_939;

/** Each file's line swings up or down before settling into Read, so neighbours cross. */
const SWING = [60, -55, 45, -65, 40, -50];

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

function fileLine(f: FileNode, i: number) {
  const start = f.x + 26;
  const end = READ.x - 34;
  const span = end - start;
  return `M${start} ${f.y} C ${start + span * 0.5} ${f.y + SWING[i]}, ${end - span * 0.45} ${READ.y - SWING[i] * 0.5}, ${end} ${READ.y}`;
}

type Flow = { d: string; dur: number; begin: number; tone: "bad" | "good" };

const FLOWS: Flow[] = [
  ...FILES.map((f, i) => ({ d: fileLine(f, i), dur: 2.6 + (i % 3) * 0.4, begin: i * 0.4, tone: "bad" as const })),
  { d: `M${READ.x + 34} ${READ.y} L${CARD.left} ${READ.y}`, dur: 1.2, begin: 0.3, tone: "bad" },
  { d: `M${CARD.right} ${ACT.y} L${ACT.x - 30} ${ACT.y}`, dur: 1.2, begin: 0.8, tone: "good" },
  { d: `M${ACT.x + 30} ${ACT.y} L${RESULT.left} ${ACT.y}`, dur: 1.4, begin: 1.3, tone: "good" },
];

export function HeroFlow() {
  return (
    <figure aria-label={`Every manager's reports in, ranked issues and +${formatCurrencyShort(NOI_FOUND)} of NOI found out (sample)`} className="mx-auto w-full max-w-[1120px]">
      <div className="relative hidden aspect-[1200/360] lg:block">
        <svg className="absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${W} ${H}`} aria-hidden>
          <g fill="none" stroke="currentColor" strokeWidth={1} className="text-border-strong">
            {FLOWS.map((f) => (
              <path key={f.d} d={f.d} />
            ))}
          </g>
          <g className="motion-reduce:hidden">
            {FLOWS.map((f) => (
              <circle key={f.d} r={2.5} opacity={0} className={f.tone === "bad" ? "fill-unfavorable" : "fill-favorable"}>
                <animateMotion path={f.d} dur={`${f.dur}s`} begin={`${f.begin}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.85;1" dur={`${f.dur}s`} begin={`${f.begin}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </g>
        </svg>

        {FILES.map((f) => (
          <Positioned key={`${f.x}-${f.y}`} x={f.x} y={f.y}>
            <FileGlyph {...f} />
          </Positioned>
        ))}
        <Positioned x={READ.x} y={READ.y}>
          <Pill>Read</Pill>
        </Positioned>
        <div className="absolute top-1/2 -translate-y-1/2" style={{ left: pct(CARD.left, W), width: pct(CARD.right - CARD.left, W) }}>
          <RankedCard />
        </div>
        <Positioned x={ACT.x} y={ACT.y}>
          <Pill>Act</Pill>
        </Positioned>
        <div className="absolute top-1/2 -translate-y-1/2" style={{ left: pct(RESULT.left, W) }}>
          <ResultTile />
        </div>
      </div>

      {/* Stacked for phones and tablets: files, read, the card, the result */}
      <div className="flex flex-col items-center gap-3 lg:hidden">
        <div className="flex items-end justify-center gap-2.5">
          {FILES.slice(0, 5).map((f, i) => (
            <span key={i} className={i % 2 === 1 ? "-translate-y-2" : undefined}>
              <FileGlyph {...f} />
            </span>
          ))}
        </div>
        <ArrowDown className="size-4 text-unfavorable" strokeWidth={1.75} aria-hidden />
        <div className="w-full max-w-[380px]">
          <RankedCard />
        </div>
        <ArrowDown className="size-4 text-favorable" strokeWidth={1.75} aria-hidden />
        <ResultTile />
      </div>
    </figure>
  );
}

function Positioned({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: pct(x, W), top: pct(y, H) }}>
      {children}
    </div>
  );
}

/** A document with a folded corner and a format tag, or a forwarded email. */
function FileGlyph({ kind, tilt }: FileNode) {
  if (kind === "mail") {
    return (
      <span className="grid size-[52px] place-items-center rounded-2xl border border-border bg-surface" style={{ rotate: `${tilt}deg` }} aria-hidden>
        <Mail className="size-5 text-fg-2" strokeWidth={1.5} />
      </span>
    );
  }
  return (
    <span className="relative block h-[58px] w-[48px]" style={{ rotate: `${tilt}deg` }} aria-hidden>
      <svg viewBox="0 0 48 58" className="absolute inset-0 size-full">
        <path d="M8 0.5 H32 L47.5 16 V50 A7.5 7.5 0 0 1 40 57.5 H8 A7.5 7.5 0 0 1 0.5 50 V8 A7.5 7.5 0 0 1 8 0.5 Z" className="fill-surface stroke-border-strong" strokeWidth={1} />
        <path d="M32 0.5 V10 A6 6 0 0 0 38 16 H47.5" className="fill-surface-2 stroke-border-strong" strokeWidth={1} />
        <g className="stroke-fg/15" strokeWidth={2} strokeLinecap="round">
          <path d="M10 24 H34" />
          <path d="M10 30 H38" />
          <path d="M10 36 H28" />
        </g>
      </svg>
      <span className="num absolute bottom-[7px] left-[7px] rounded-[4px] bg-inverted px-1 py-px text-[8.5px] font-semibold tracking-[0.04em] text-inverted-fg">{kind}</span>
    </span>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="block rounded-full bg-inverted px-3.5 py-1.5 text-[12px] font-medium text-inverted-fg">{children}</span>;
}

function ResultTile() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-2.5 pr-4">
      <span className="grid size-9 place-items-center rounded-xl bg-favorable/10">
        <TrendingUp className="size-[18px] text-favorable" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="text-left">
        <span className="num block text-[18px] leading-none font-medium text-favorable">+{formatCurrencyShort(NOI_FOUND)}</span>
        <span className="mt-1 block text-[10.5px] text-fg-3">NOI found</span>
      </span>
    </div>
  );
}

function RankedCard() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3 shadow-overlay">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2">
        <Sparkles className="size-3.5 shrink-0 text-data" strokeWidth={1.75} aria-hidden />
        <TypingPrompt />
      </div>
      <ol className="mt-3.5 mb-1 flex flex-col gap-3 px-1">
        {ISSUES.map((impact, i) => (
          <li key={impact} className="grid grid-cols-[72px_minmax(0,1fr)_44px] items-center gap-2.5">
            <span className="text-left text-[11px] text-fg-2">Property #{i + 1}</span>
            <span className="h-1.5 rounded-full bg-fg/[0.06]">
              <span className="block h-full rounded-full bg-unfavorable/70" style={{ width: `${Math.max(6, (impact / MAX) * 100)}%` }} />
            </span>
            <span className="num text-right text-[11px] text-unfavorable">-{formatCurrencyShort(impact)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
