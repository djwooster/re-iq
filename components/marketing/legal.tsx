import { LEGAL, LEGAL_DRAFT } from "@/lib/legal";

/** Shared frame for /privacy, /terms and /security: one readable column in the marketing style. */

export function LegalPage({ eyebrow, title, intro, draft, dateLabel = "Effective", children }: { eyebrow: string; title: string; intro?: React.ReactNode; draft?: boolean; dateLabel?: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-[720px] px-4 pt-12 pb-20 sm:px-6 sm:pt-16">
      {draft && LEGAL_DRAFT && (
        <p role="note" className="mb-8 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-[13px] text-fg">
          <span className="font-semibold">Draft, pending legal review.</span> This document isn&apos;t final and may change before launch.
        </p>
      )}
      <div className="eyebrow">{eyebrow}</div>
      <h1 className="mt-2 text-[32px] font-semibold leading-[1.1] tracking-[-0.025em] text-fg sm:text-[40px]">{title}</h1>
      <p className="mt-3 text-[13px] text-fg-3">
        {dateLabel} {LEGAL.effectiveDate}
      </p>
      {intro && <div className="mt-6 text-[15px] leading-[1.65] text-fg-2">{intro}</div>}
      <div className="mt-10 flex flex-col gap-10">{children}</div>
    </article>
  );
}

export function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-16">
      <h2 className="text-[19px] font-semibold leading-[1.3] tracking-[-0.01em] text-fg">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-[14px] leading-[1.65] text-fg-2 [&_a]:text-fg [&_a]:underline [&_a]:decoration-fg/30 [&_a]:underline-offset-[3px] hover:[&_a]:decoration-fg [&_strong]:font-medium [&_strong]:text-fg [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

/** A visible note for counsel on a section they must write or confirm. Hidden once LEGAL_DRAFT is off. */
export function ForCounsel({ children }: { children: React.ReactNode }) {
  if (!LEGAL_DRAFT) return null;
  return (
    <p className="rounded-md border border-dashed border-border-strong bg-surface px-3 py-2 text-[12px] text-fg-2">
      <span className="font-semibold text-fg">For counsel:</span> {children}
    </p>
  );
}
