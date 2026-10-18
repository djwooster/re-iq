import Link from "next/link";
import { FadeIn } from "@/components/ui/motion";
import { ProductPreview } from "./product-preview";
import { WaitlistForm } from "./waitlist-form";

/*
 * Examples on this page come from the sample portfolio (Alder Peak Capital,
 * Q3 2026), so they match what visitors see if they open the demo.
 */

function Section({ id, eyebrow, title, intro, children }: { id?: string; eyebrow: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-16 border-t border-border">
      <div className="mx-auto max-w-[1080px] px-4 py-16 sm:px-6 sm:py-20">
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="mt-2 max-w-[560px] text-[22px] font-semibold leading-[1.25] tracking-[-0.01em] text-fg sm:text-[26px]">{title}</h2>
        {intro && <p className="mt-3 max-w-[560px] text-[14px] leading-[1.6] text-fg-2">{intro}</p>}
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

export function Hero() {
  return (
    <section className="mx-auto max-w-[1080px] px-4 pt-16 pb-16 sm:px-6 sm:pt-24 sm:pb-20">
      <FadeIn className="max-w-[640px]">
        <div className="eyebrow">Early access · Multifamily asset management</div>
        <h1 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-fg sm:text-[44px]">
          See what moved NOI across every property, from the reports you already get.
        </h1>
        <p className="mt-5 max-w-[540px] text-[15px] leading-[1.6] text-fg-2">
          RE-IQ reads the T12s, rent rolls, and work orders your property managers send, puts them on one chart of accounts, and tells you
          what&apos;s off budget, why, and what to do about it this week.
        </p>
        <WaitlistForm source="hero" className="mt-8" />
      </FadeIn>
      <FadeIn delay={0.1} className="mt-14 sm:mt-16">
        <ProductPreview />
      </FadeIn>
    </section>
  );
}

const QUESTIONS = [
  {
    q: "Are we on budget?",
    a: "NOI is $391K (4.0%) below budget this quarter. Vacancy, concessions, R&M, and every other driver are broken out, and they add up to the total.",
  },
  {
    q: "Where are we losing money?",
    a: "R&M at Mesa Verde is $57K over budget since May. 26 of 45 HVAC work orders since May were repeat calls to the same 4 units.",
  },
  {
    q: "What needs attention?",
    a: "Delinquency at Magnolia Court reached 9.1% of billed charges, up from 5.1% in March. Its September T12 is still waiting on review.",
  },
  {
    q: "Where can NOI grow?",
    a: "58 below-market leases at Brookstone Park expire by Jan 16. Renewing them closer to market is worth an estimated $66K a year.",
  },
  {
    q: "What should we do this week?",
    a: "Each finding becomes an action with an owner and a status, so the next call with your manager starts from a list, not a spreadsheet.",
  },
];

export function Questions() {
  return (
    <Section
      eyebrow="What it answers"
      title="The questions you ask every month, answered from the ledger."
      intro="Examples from a 14-property, 3,790-unit sample portfolio with data through September 30."
    >
      <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {QUESTIONS.map(({ q, a }) => (
          <div key={q} className="bg-surface p-5">
            <dt className="text-[13px] font-semibold text-fg">{q}</dt>
            <dd className="mt-2 text-[13px] leading-[1.6] text-fg-2">{a}</dd>
          </div>
        ))}
        <div className="flex flex-col justify-end bg-surface p-5">
          <Link href="/login" className="text-[13px] text-fg-2 underline-offset-2 hover:text-fg hover:underline">
            Open the sample portfolio →
          </Link>
        </div>
      </dl>
    </Section>
  );
}

const STEPS = [
  {
    title: "Send the reports you already get",
    body: "Upload the monthly package from each manager: T12, rent roll, work orders. Excel, CSV, or PDF, from whatever property management system they run.",
  },
  {
    title: "Confirm the mapping once",
    body: "Each manager's chart of accounts is mapped to one standard. You review only the lines it isn't sure about, and it remembers them next month.",
  },
  {
    title: "Read the variance, then act",
    body: "Budget vs. actual by property and by driver, issues ranked by dollar impact, and opportunities with the assumptions behind each estimate.",
  },
];

export function HowItWorks() {
  return (
    <Section eyebrow="How it works" title="No new system for your managers. No re-keying for you.">
      <ol className="grid gap-8 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <span className="num text-[11px] text-fg-3">0{i + 1}</span>
            <h3 className="mt-2 text-[14px] font-semibold text-fg">{s.title}</h3>
            <p className="mt-2 text-[13px] leading-[1.6] text-fg-2">{s.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

const PRINCIPLES = [
  { title: "Evidence one click away", body: "Every AI statement opens to the numbers behind it and the report or sync they came from." },
  { title: "Estimates are labeled", body: "Projected savings and revenue say they're estimates and show the assumption, like renewing at 60% of the gap to market." },
  { title: "Freshness is visible", body: "If a property's September T12 hasn't arrived, its numbers say “through Aug 31” instead of quietly going stale." },
  { title: "Physical and economic occupancy", body: "Shown side by side, so a full building that isn't collecting doesn't look healthy." },
];

export function Trust() {
  return (
    <Section eyebrow="Built to be checked" title="Every number traces back to a report.">
      <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {PRINCIPLES.map((p) => (
          <li key={p.title} className="border-l border-border-strong pl-4">
            <h3 className="text-[14px] font-semibold text-fg">{p.title}</h3>
            <p className="mt-1.5 text-[13px] leading-[1.6] text-fg-2">{p.body}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function FinalCta() {
  return (
    <section id="early-access" className="scroll-mt-16 border-t border-border bg-surface">
      <div className="mx-auto max-w-[1080px] px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="max-w-[560px] text-[22px] font-semibold leading-[1.25] tracking-[-0.01em] text-fg sm:text-[26px]">Get early access</h2>
        <p className="mt-3 max-w-[520px] text-[14px] leading-[1.6] text-fg-2">
          We&apos;re onboarding a small group of owners and asset managers first. Leave your email and we&apos;ll reach out to set up your
          portfolio.
        </p>
        <WaitlistForm source="footer" className="mt-6" />
      </div>
    </section>
  );
}
