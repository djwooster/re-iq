import { ArrowRight, Calculator, CalendarCheck, CalendarClock, Eraser, EyeOff, FileSearch, Gauge, Layers, Lock, Table2, Tag, UserCheck, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { FadeIn } from "@/components/ui/motion";
import { cn } from "@/lib/cn";
import { BOOKING_URL } from "@/lib/marketing";
import { HeroFlow } from "./hero-flow";
import { BookCall } from "./book-call";
import { BridgeArt } from "./bridge-art";
import { IngestArt } from "./ingest-art";
import { SectionCta } from "./section-cta";
import { ReconcileArt } from "./reconcile-art";
import { ValueArt } from "./value-art";
import { WaitlistForm } from "./waitlist-form";

/*
 * Every example on this page comes from the sample portfolio (Alder Peak
 * Capital, Q3 2026).
 * The page follows the buyer's month: their reality first, then each pain
 * with the part of the product that answers it.
 */

const H2 = "text-[24px] font-semibold leading-[1.2] tracking-[-0.015em] text-fg sm:text-[28px]";
const BODY = "text-[14px] leading-[1.6] text-fg-2";

export function Hero() {
  return (
    <section className="mx-auto max-w-[1280px] px-4 pt-16 pb-16 sm:px-6 sm:pt-24 sm:pb-24">
      <FadeIn className="mx-auto flex max-w-[720px] flex-col items-center text-center">
        <span className="eyebrow inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11px]! text-fg-2">
          <span className="size-1.5 rounded-full bg-fg-2" aria-hidden />
          Early access · Multifamily asset management
        </span>
        <h1 className="mt-5 text-[36px] font-semibold leading-[1.08] tracking-[-0.03em] text-balance text-fg sm:text-[56px]">
          Property manager reports, checked and explained.
        </h1>
        <p className="mt-5 max-w-[560px] text-[16px] leading-[1.55] text-fg-2">
          RE-IQ reads every manager&apos;s monthly package, checks the math, and tells you what&apos;s wrong, why, and what to do about it.
        </p>
        <BookCall className="mt-8" />
      </FadeIn>
      <FadeIn delay={0.1} className="mt-12 sm:mt-14">
        <HeroFlow />
      </FadeIn>
    </section>
  );
}

/** A section of plain facts: the headline on the left, four short points beside it. */
function FactsSection({
  id,
  eyebrow,
  title,
  body,
  facts,
  link,
  tinted,
}: {
  id: string;
  eyebrow: string;
  title: string;
  body: React.ReactNode;
  facts: { icon: LucideIcon; title: string; body: string }[];
  link?: { href: string; label: string };
  tinted?: boolean;
}) {
  return (
    <section id={id} className={cn("scroll-mt-12 border-t border-border", tinted && "bg-surface")}>
      <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <FadeIn className="max-w-[440px]">
          <div className="eyebrow">{eyebrow}</div>
          <h2 className={cn(H2, "mt-2")}>{title}</h2>
          <div className={cn(BODY, "mt-3")}>{body}</div>
          {link && (
            <Link href={link.href} className="group mt-6 inline-flex items-center gap-1 text-[13px] text-fg-2 transition-colors duration-150 hover:text-fg">
              {link.label}
              <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={1.75} aria-hidden />
            </Link>
          )}
        </FadeIn>
        <FadeIn delay={0.05}>
          <ul className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
            {facts.map(({ icon: Icon, title, body }) => (
              <li key={title}>
                <Icon className="size-4 text-fg-3" strokeWidth={1.75} aria-hidden />
                <h3 className="mt-2 text-[14px] font-medium text-fg">{title}</h3>
                <p className="mt-1 text-[13px] leading-[1.55] text-fg-2">{body}</p>
              </li>
            ))}
          </ul>
        </FadeIn>
      </div>
    </section>
  );
}

export function Accuracy() {
  return (
    <FactsSection
      id="accuracy"
      tinted
      eyebrow="Accuracy"
      title="Every number comes from the report itself."
      body={<p>AI is good at reading messy layouts and bad at arithmetic, so RE-IQ uses it only for the first. Every amount is read straight from the manager&apos;s file.</p>}
      facts={[
        { icon: Table2, title: "AI reads the layout, not the numbers", body: "It says which row and column hold what. Our code then takes each amount directly from those cells." },
        { icon: Calculator, title: "The report has to agree with itself", body: "Subtotals add up, NOI equals income minus expenses, a T-12 has twelve months in a row. Any break is flagged with its row." },
        { icon: UserCheck, title: "Nothing counts until you confirm it", body: "Each report is a draft until you approve it. Lines RE-IQ isn't sure how to map wait for your call." },
        { icon: CalendarCheck, title: "Month and property from the contents", body: "Read from the report, not its file name, and flagged when the two disagree." },
      ]}
    />
  );
}

export function Security() {
  return (
    <FactsSection
      id="security"
      eyebrow="Security"
      title="Your data stays yours."
      body={<p>You&apos;re trusting us with your properties&apos; financials. Here&apos;s what&apos;s in place today.</p>}
      link={{ href: "/security", label: "How we protect your data" }}
      facts={[
        { icon: Layers, title: "Kept separate", body: "The database keeps each company's data apart, and tests try to cross that line before every release that touches data or access." },
        { icon: EyeOff, title: "Managers upload, never browse", body: "Property managers see only the properties you give them, and never your dashboards." },
        { icon: Eraser, title: "No names or bank numbers", body: "Resident names, contact details and bank account numbers are removed when a report is read. The AI that reads reports doesn't train on your data." },
        { icon: Lock, title: "Encrypted, in the US", body: "Every connection is encrypted, so is stored data, and everything is hosted in the United States." },
      ]}
    />
  );
}

/** A product section: the headline and the product's answer beside a visual, splitting the content width evenly. */
function ProductSection({
  id,
  eyebrow,
  title,
  body,
  extra,
  visual,
  reverse,
  tinted,
}: {
  id: string;
  eyebrow: string;
  title: string;
  body: React.ReactNode;
  extra?: React.ReactNode;
  visual: React.ReactNode;
  reverse?: boolean;
  /** A slightly different background, so long runs of sections read as separate bands. */
  tinted?: boolean;
}) {
  return (
    <section id={id} className={cn("scroll-mt-12 border-t border-border", tinted && "bg-surface")}>
      <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-16">
        <div className={cn("max-w-[560px]", reverse && "lg:order-2")}>
          <div className="eyebrow">{eyebrow}</div>
          <h2 className={cn(H2, "mt-2")}>{title}</h2>
          <div className={cn(BODY, "mt-3")}>{body}</div>
          {extra && <div className="mt-6">{extra}</div>}
          <SectionCta className="mt-8" />
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
      tinted
      eyebrow="Ingest"
      title="Every manager, one format."
      body={
        <p>
          T-12s, rent rolls, and work orders from Yardi, Entrata, AppFolio, ResMan, and Rent Manager map to one standard chart of accounts. Lines under 75% confidence wait for
          you, so nothing is guessed silently.
        </p>
      }
      visual={<IngestArt />}
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
      visual={<ReconcileArt />}
    />
  );
}

export function Explain() {
  return (
    <ProductSection
      id="explain"
      tinted
      eyebrow="Explain"
      title="See where the gap comes from."
      body={<p>Budget to actual by driver and by property, expressed as NOI impact. The drivers always add up to the total.</p>}
      visual={<BridgeArt />}
    />
  );
}

export function Grow() {
  return (
    <ProductSection
      id="grow"
      reverse
      tinted
      eyebrow="Grow"
      title="Find the NOI you're leaving on the table."
      body={
        <p>
          Every extra <span className="num text-fg">$10K</span> of NOI adds about <span className="num text-fg">$200K</span> of value at a 5% cap rate. RE-IQ finds it in the
          rent rolls, T-12s, and vendor spend you already have, and labels every estimate with its assumption.
        </p>
      }
      visual={<ValueArt />}
    />
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
    <section id="book-a-call" className="scroll-mt-16 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[480px]">
          <h2 className={H2}>See your portfolio this week.</h2>
          <p className={cn(BODY, "mt-3")}>
            Book a call, then forward last quarter&apos;s packages. We&apos;ll send back a free portfolio review: a ranked list of issues and NOI opportunities.
          </p>
        </div>
        <div className="flex w-full max-w-[420px] flex-col gap-4">
          {BOOKING_URL && <BookCall className="self-start" />}
          <WaitlistForm source="footer" />
        </div>
      </div>
    </section>
  );
}
