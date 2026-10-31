import { CalendarClock, FileSearch, Gauge, Tag } from "lucide-react";
import { FadeIn } from "@/components/ui/motion";
import { cn } from "@/lib/cn";
import { HeroFlow } from "./hero-flow";
import { BridgeArt } from "./bridge-art";
import { IngestArt } from "./ingest-art";
import { SectionCta } from "./section-cta";
import { ReconcileArt } from "./reconcile-art";
import { ValueArt } from "./value-art";
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
        <WaitlistForm source="hero" className="mt-8 text-left" />
      </FadeIn>
      <FadeIn delay={0.1} className="mt-12 sm:mt-14">
        <HeroFlow />
      </FadeIn>
    </section>
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
  demo,
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
  /** The demo page that shows this feature, for the section's call to action. */
  demo: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-12 border-t border-border", tinted && "bg-surface")}>
      <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-16">
        <div className={cn("max-w-[560px]", reverse && "lg:order-2")}>
          <div className="eyebrow">{eyebrow}</div>
          <h2 className={cn(H2, "mt-2")}>{title}</h2>
          <div className={cn(BODY, "mt-3")}>{body}</div>
          {extra && <div className="mt-6">{extra}</div>}
          <SectionCta demo={demo} className="mt-8" />
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
      demo="/app/data-sources"
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
      demo="/app/data-sources"
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
      demo="/app/performance"
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
      demo="/app/properties/prop_brookstone"
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
