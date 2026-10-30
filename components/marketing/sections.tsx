import { ArrowRight, CalendarClock, Check, FileSearch, Flag, Forward, Gauge, GitCompareArrows, Tag, X } from "lucide-react";
import { FadeIn } from "@/components/ui/motion";
import { cn } from "@/lib/cn";
import { formatCurrencyShort } from "@/lib/format";
import { HeroFlow } from "./hero-flow";
import { IngestVisual } from "./ingest-visual";
import { MonthTimeline } from "./month-timeline";
import { PrioritizeVisual } from "./prioritize-visual";
import { LabelMerge, ScorecardVisual, TieOutVisual } from "./proof-visuals";
import { RenewalsVisual } from "./renewals-visual";
import { VarianceVisual } from "./variance-visual";
import { WaitlistForm } from "./waitlist-form";

/*
 * Every example on this page comes from the sample portfolio (Alder Peak
 * Capital, Q3 2026), so it matches what visitors see if they open the demo.
 * The page follows the buyer's month: their reality first, then each pain
 * with the part of the product that answers it.
 */

const H2 = "text-[24px] font-semibold leading-[1.2] tracking-[-0.015em] text-fg sm:text-[28px]";
const BODY = "text-[14px] leading-[1.6] text-fg-2";

export function Hero() {
  return (
    <section className="mx-auto max-w-[1280px] px-4 pt-16 pb-16 sm:px-6 sm:pt-24 sm:pb-24">
      <FadeIn className="mx-auto flex max-w-[720px] flex-col items-center text-center">
        <div className="eyebrow">Early access · Multifamily asset management</div>
        <h1 className="mt-3 text-[48px] font-semibold leading-[1.02] tracking-[-0.035em] text-fg sm:text-[72px]">Month-end, done.</h1>
        <p className="mt-5 max-w-[560px] text-[16px] leading-[1.55] text-fg-2">
          RE-IQ reads every property manager&apos;s monthly package, checks the math, and tells you what&apos;s wrong, why, and what to do about it.
        </p>
        <WaitlistForm source="hero" className="mt-8 text-left" />
        <a href="/demo" className="mt-3 inline-flex items-center gap-1 text-[12px] text-fg-2 transition-colors hover:text-fg">
          Try the demo
          <ArrowRight className="size-3" strokeWidth={1.75} aria-hidden />
        </a>
        <p className="mt-6 text-[11px] text-fg-3">For owners and asset managers with 5–30 properties and multiple managers.</p>
      </FadeIn>
      <FadeIn delay={0.1} className="mt-12 sm:mt-14">
        <HeroFlow />
      </FadeIn>
    </section>
  );
}

export function YourMonth() {
  return (
    <section id="your-month" className="scroll-mt-12 border-t border-border">
      <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-[560px]">
          <div className="eyebrow">Your month, today</div>
          <h2 className={cn(H2, "mt-2")}>Every month, the same three weeks.</h2>
        </div>
        <div className="mt-10 lg:mt-14">
          <MonthTimeline />
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    icon: Forward,
    title: "Forward",
    body: "Send the packages your managers already email you to your RE-IQ inbox, or upload them. Connect a manager's system where it's supported.",
  },
  {
    icon: GitCompareArrows,
    title: "We translate and reconcile",
    body: "Every manager's accounts map to one standard chart, and totals are checked against the manager's own statements.",
  },
  {
    icon: Flag,
    title: "You get a ranked list",
    body: "Issues ordered by dollar impact, each with the cause and a next step you can assign.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-12 border-t border-border">
      <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-[560px]">
          <div className="eyebrow">How it works</div>
          <h2 className={cn(H2, "mt-2")}>Forward the reports you already get.</h2>
          <p className={cn(BODY, "mt-3")}>No integration project and nothing for IT to install.</p>
        </div>
        <ol className="mt-10 grid gap-3 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <span className="grid size-8 place-items-center rounded-md border border-border bg-bg text-fg-2">
                  <Icon className="size-4" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="num text-[10px] text-fg-3">0{i + 1}</span>
              </div>
              <h3 className="mt-4 text-[14px] font-semibold text-fg">{title}</h3>
              <p className="mt-1.5 text-[13px] leading-[1.55] text-fg-2">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** A product section: the pain today, the headline, then the product's answer beside a visual. */
function ProductSection({
  id,
  eyebrow,
  today,
  title,
  body,
  extra,
  visual,
  reverse,
  wide,
}: {
  id: string;
  eyebrow: string;
  today: string;
  title: string;
  body: React.ReactNode;
  extra?: React.ReactNode;
  visual: React.ReactNode;
  reverse?: boolean;
  /** Gives the visual more room, for the section that carries the most weight. */
  wide?: boolean;
}) {
  return (
    <section id={id} className="scroll-mt-12 border-t border-border">
      <div
        className={cn(
          "mx-auto grid max-w-[1280px] items-center gap-8 px-4 py-16 sm:px-6 sm:py-24 lg:gap-14",
          wide ? "lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)]" : "lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]",
        )}
      >
        <div className={cn("max-w-[440px]", reverse && "lg:order-2")}>
          <p className="text-[12px] leading-[1.5] text-fg-3">{today}</p>
          <div className="eyebrow mt-5">{eyebrow}</div>
          <h2 className={cn(H2, "mt-2")}>{title}</h2>
          <div className={cn(BODY, "mt-3")}>{body}</div>
          {extra && <div className="mt-6">{extra}</div>}
        </div>
        <div className={cn("min-w-0", reverse && "lg:order-1")}>{visual}</div>
      </div>
    </section>
  );
}

export function Ingest() {
  return (
    <ProductSection
      id="ingest"
      eyebrow="Ingest"
      today="Today: hours per property rebuilding packages in Excel."
      title="Every manager, one format."
      body={
        <p>
          T-12s, rent rolls, and work orders from Yardi, Entrata, AppFolio, ResMan, and Rent Manager map to one standard chart of accounts. Lines under 75% confidence wait for
          you, so nothing is guessed silently.
        </p>
      }
      extra={<LabelMerge />}
      visual={<IngestVisual />}
    />
  );
}

const PRINCIPLES = [
  { icon: FileSearch, title: "Evidence one click away", body: "Every AI statement opens to its numbers and source report." },
  { icon: Tag, title: "Estimates are labeled", body: "With the assumption, so you can disagree with it." },
  { icon: CalendarClock, title: "Freshness is visible", body: "A late report shows “through Aug 31”, not stale numbers." },
  { icon: Gauge, title: "Physical and economic", body: "Occupancy side by side, so a full building that isn't paying shows." },
];

export function Reconcile() {
  return (
    <ProductSection
      id="reconcile"
      reverse
      eyebrow="Reconcile"
      today="Today: checking the math is the first thing that gets skipped."
      title="Numbers you can trust."
      body={<p>RE-IQ is designed to tie every total to the manager&apos;s own statements and flag any break, and every number traces back to a source line.</p>}
      extra={
        <ul className="grid gap-4 sm:grid-cols-2">
          {PRINCIPLES.map(({ icon: Icon, title, body }) => (
            <li key={title}>
              <Icon className="size-4 text-fg-3" strokeWidth={1.75} aria-hidden />
              <h3 className="mt-2 text-[13px] font-medium text-fg">{title}</h3>
              <p className="mt-0.5 text-[12px] leading-[1.55] text-fg-3">{body}</p>
            </li>
          ))}
        </ul>
      }
      visual={<TieOutVisual />}
    />
  );
}

export function Explain() {
  return (
    <ProductSection
      id="explain"
      eyebrow="Explain"
      today="Today: you know NOI is off. Working out why takes days."
      title="See where the gap comes from."
      body={<p>Budget to actual by driver and by property, expressed as NOI impact. The drivers always add up to the total.</p>}
      visual={<VarianceVisual />}
    />
  );
}

export function Prioritize() {
  return (
    <ProductSection
      id="prioritize"
      reverse
      wide
      eyebrow="Prioritize"
      today="Today: with 16 properties, only the big misses get attention. Slow problems hide for months."
      title="Start with what costs the most."
      body={<p>Diagnosis, not dashboards. Issues ranked by dollars, each with the numbers and source behind it and a next step you can assign.</p>}
      extra={
        <p className="border-l-2 border-warning pl-3 text-[13px] leading-[1.55] text-fg-2">
          The Mesa Verde HVAC problem started in May. It never crossed a typical variance threshold until it was <span className="num text-fg">$57K</span>.
        </p>
      }
      visual={<PrioritizeVisual />}
    />
  );
}

export function CompareManagers() {
  return (
    <ProductSection
      id="managers"
      eyebrow="Compare managers"
      today="Today: each manager's software only sees its own properties."
      title="Compare managers on the same scale."
      body={<p>Once every package maps to one standard, you can put managers side by side on the same metrics. No property management system can, because each one only sees its own data.</p>}
      visual={<ScorecardVisual />}
    />
  );
}

/* The sample portfolio's open opportunities, which sum to the +$177K on the demo's Overview. */
const OPPORTUNITIES = [
  { where: "Brookstone Park", what: "58 below-market leases expiring by Jan 16", value: 65_736 },
  { where: "Across the portfolio", what: "85 more below-market renewals in 90 days", value: 58_104 },
  { where: "4 Crestline properties", what: "Landscaping $45 a unit over benchmark", value: 53_099 },
];
const CAP_RATE = 0.05;
const OPPORTUNITY_TOTAL = OPPORTUNITIES.reduce((s, o) => s + o.value, 0);

export function Grow() {
  return (
    <ProductSection
      id="grow"
      reverse
      eyebrow="Grow"
      today="Today: below-market renewals and creeping vendor costs go unnoticed."
      title="Find the NOI you're leaving on the table."
      body={
        <p>
          Every extra <span className="num text-fg">$10K</span> of NOI adds about <span className="num text-fg">$200K</span> of value at a 5% cap rate. RE-IQ finds it in the
          rent rolls, T-12s, and vendor spend you already have, and labels every estimate with its assumption.
        </p>
      }
      extra={
        <div className="rounded-lg border border-border bg-surface">
          <ul>
            {OPPORTUNITIES.map((o) => (
              <li key={o.where} className="flex items-baseline justify-between gap-3 border-b border-border px-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-medium text-fg">{o.where}</span>
                  <span className="block truncate text-[11px] text-fg-3">{o.what}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="num block text-[12px] text-favorable">+{formatCurrencyShort(o.value)}/yr</span>
                  <span className="num block text-[10.5px] text-fg-3">≈ {formatCurrencyShort(o.value / CAP_RATE)} value</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between gap-3 px-3 py-2.5 text-[12px]">
            <span className="text-fg-2">Estimated, annual (sample)</span>
            <span className="num text-fg">
              +{formatCurrencyShort(OPPORTUNITY_TOTAL)} ≈ {formatCurrencyShort(OPPORTUNITY_TOTAL / CAP_RATE)}
            </span>
          </div>
        </div>
      }
      visual={<RenewalsVisual />}
    />
  );
}

const COMPARISON = [
  { them: "Built for the operator running the buildings", us: "Built for the owner who hired the operator" },
  { them: "Sees only the properties on its own system", us: "Reads every manager's reports, whatever the system" },
  { them: "Answers questions about one system", us: "Compares managers on the same metrics" },
  { them: "Trusts its own numbers", us: "Checks totals against each manager's statements" },
  { them: "Adopted across the manager's whole company", us: "Live in days, starting from reports you already get" },
];

export function WhyNotManagerAi() {
  return (
    <section id="why" className="scroll-mt-12 border-t border-border">
      <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-[560px]">
          <div className="eyebrow">Why RE-IQ</div>
          <h2 className={cn(H2, "mt-2")}>Why not the AI in your managers&apos; software?</h2>
          <p className={cn(BODY, "mt-3")}>Our edge isn&apos;t AI. It&apos;s working for the owner, across every manager.</p>
        </div>
        <div className="mt-10 grid gap-3 md:grid-cols-2">
          <ComparisonColumn title="Manager software" rows={COMPARISON.map((r) => r.them)} />
          <ComparisonColumn title="RE-IQ" rows={COMPARISON.map((r) => r.us)} ours />
        </div>
      </div>
    </section>
  );
}

function ComparisonColumn({ title, rows, ours }: { title: string; rows: string[]; ours?: boolean }) {
  const Icon = ours ? Check : X;
  return (
    <div className={cn("rounded-lg border p-5", ours ? "border-border-strong bg-surface" : "border-border")}>
      <h3 className={cn("text-[14px] font-semibold", ours ? "text-fg" : "text-fg-2")}>{title}</h3>
      <ul className="mt-4 flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row} className="flex gap-2.5 text-[13px] leading-[1.5]">
            <Icon className={cn("mt-0.5 size-3.5 shrink-0", ours ? "text-favorable" : "text-fg-3")} strokeWidth={2} aria-hidden />
            <span className={ours ? "text-fg" : "text-fg-3"}>{row}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WhoItsFor() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-4 py-10 sm:px-6 md:flex-row md:items-baseline md:justify-between">
        <p className="text-[15px] font-medium text-fg">Built for owners and asset managers with 5–30 multifamily properties and 2–4 third-party managers.</p>
        <p className="shrink-0 text-[12px] text-fg-3">Not for self-managing landlords.</p>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section id="early-access" className="scroll-mt-16 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[480px]">
          <h2 className={H2}>See your portfolio this week.</h2>
          <p className={cn(BODY, "mt-3")}>
            Request early access, then forward last quarter&apos;s packages. We&apos;ll send back a free portfolio review: a ranked list of issues and NOI opportunities.{" "}
            <a href="/demo" className="text-fg underline-offset-2 hover:underline">
              Or explore the sample portfolio.
            </a>
          </p>
        </div>
        <WaitlistForm source="footer" />
      </div>
    </section>
  );
}
