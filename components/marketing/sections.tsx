import { CalendarClock, FileSearch, Gauge, Tag } from "lucide-react";
import Link from "next/link";
import { FadeIn } from "@/components/ui/motion";
import { cn } from "@/lib/cn";
import { HeroVisual } from "./hero-visual";
import { IngestVisual } from "./ingest-visual";
import { PrioritizeVisual } from "./prioritize-visual";
import { RenewalsVisual } from "./renewals-visual";
import { VarianceVisual } from "./variance-visual";
import { WaitlistForm } from "./waitlist-form";

/*
 * Every example on this page comes from the sample portfolio (Alder Peak
 * Capital, Q3 2026), so it matches what visitors see if they open the demo.
 */

export function Hero() {
  return (
    <section className="mx-auto grid max-w-[1080px] items-center gap-12 px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
      <FadeIn className="max-w-[640px]">
        <div className="eyebrow">Early access · Multifamily asset management</div>
        <h1 className="mt-3 text-[34px] font-semibold leading-[1.08] tracking-[-0.025em] text-balance text-fg sm:text-[48px] lg:text-[42px]">
          Your month-end variance, done before you open Excel.
        </h1>
        <p className="mt-5 max-w-[540px] text-[15px] leading-[1.6] text-fg-2">
          No more chasing T12s, re-keying charts of accounts, or finding out about the HVAC problem three months late. RE-IQ reads the
          reports your managers already send and tells you what changed, why, and what to do this week.
        </p>
        <WaitlistForm source="hero" className="mt-8" />
      </FadeIn>
      <FadeIn delay={0.1}>
        <HeroVisual />
      </FadeIn>
    </section>
  );
}

const FEATURES = [
  {
    step: "01",
    name: "Ingest",
    title: "Send the reports you already get.",
    body: "T12s, rent rolls, and work orders from Yardi, Entrata, AppFolio, ResMan, or Rent Manager. Each manager's accounts map to one standard; you only check what it isn't sure about.",
    visual: <IngestVisual />,
  },
  {
    step: "02",
    name: "Explain",
    title: "See where the gap comes from.",
    body: "Budget to actual by driver and by property, expressed as NOI impact. The drivers always add up to the total.",
    visual: <VarianceVisual />,
  },
  {
    step: "03",
    name: "Prioritize",
    title: "Start with what costs the most.",
    body: "Issues ranked by dollars, each with the numbers and source behind it and a next step you can assign.",
    visual: <PrioritizeVisual />,
  },
  {
    step: "04",
    name: "Grow",
    title: "Find the NOI you're leaving on the table.",
    body: "Below-market renewals, vendor costs above benchmark, and the assumption behind every estimate.",
    visual: <RenewalsVisual />,
  },
];

export function Features() {
  return (
    <>
      {FEATURES.map((f, i) => (
        <section key={f.step} className="border-t border-border">
          <div className="mx-auto grid max-w-[1080px] items-center gap-8 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-14">
            <div className={cn("max-w-[420px]", i % 2 === 1 && "lg:order-2")}>
              <div className="eyebrow">
                {f.step} · {f.name}
              </div>
              <h2 className="mt-2 text-[24px] font-semibold leading-[1.2] tracking-[-0.015em] text-fg sm:text-[28px]">{f.title}</h2>
              <p className="mt-3 text-[14px] leading-[1.6] text-fg-2">{f.body}</p>
            </div>
            <div className={cn(i % 2 === 1 && "lg:order-1")}>{f.visual}</div>
          </div>
        </section>
      ))}
    </>
  );
}

const PRINCIPLES = [
  { icon: FileSearch, title: "Evidence one click away", body: "Every AI statement opens to its numbers and source report." },
  { icon: Tag, title: "Estimates are labeled", body: "With the assumption, so you can disagree with it." },
  { icon: CalendarClock, title: "Freshness is visible", body: "A late report shows “through Aug 31”, not stale numbers." },
  { icon: Gauge, title: "Physical and economic", body: "Occupancy side by side, so a full building that isn't paying shows." },
];

export function Trust() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-[1080px] px-4 py-14 sm:px-6">
        <h2 className="text-[13px] font-semibold text-fg">Every number traces back to a report.</h2>
        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map(({ icon: Icon, title, body }) => (
            <li key={title}>
              <Icon className="size-4 text-fg-3" strokeWidth={1.75} aria-hidden />
              <h3 className="mt-2.5 text-[13px] font-medium text-fg">{title}</h3>
              <p className="mt-1 text-[12px] leading-[1.55] text-fg-3">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section id="early-access" className="scroll-mt-16 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-[1080px] flex-col gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[460px]">
          <h2 className="text-[24px] font-semibold leading-[1.2] tracking-[-0.015em] text-fg sm:text-[28px]">Get early access</h2>
          <p className="mt-3 text-[14px] leading-[1.6] text-fg-2">
            We&apos;re onboarding a small group of owners and asset managers first.{" "}
            <Link href="/login" className="text-fg underline-offset-2 hover:underline">
              Or explore the sample portfolio now.
            </Link>
          </p>
        </div>
        <WaitlistForm source="footer" />
      </div>
    </section>
  );
}
