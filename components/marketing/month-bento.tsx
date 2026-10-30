import { cn } from "@/lib/cn";
import { CreepArt } from "./creep-art";
import { MappingArt } from "./mapping-art";
import { SourceArt } from "./source-art";
import { TieOutArt } from "./tieout-art";

/*
 * The buyer's month, made scannable: four cards, each a step of month-end
 * RE-IQ takes off the asset manager's plate, each with a small looping
 * illustration built from real UI (see the `*-art.tsx` files).
 */

const CARDS: { title: string; body: string; art: React.ReactNode; wide: boolean; textBelow?: boolean }[] = [
  {
    title: "No more rebuilding in Excel",
    body: "Yardi, Entrata, AppFolio, ResMan, or Rent Manager: every layout lands in one chart of accounts, without retyping.",
    art: <MappingArt />,
    wide: true,
  },
  {
    title: "No more skipped tie-outs",
    body: "Totals are checked against each manager's statements, and breaks get flagged.",
    art: <TieOutArt />,
    wide: false,
  },
  {
    title: "No slow problems hiding",
    body: "Small misses that grow for months surface early, ranked by dollars.",
    art: <CreepArt />,
    wide: false,
  },
  {
    title: "No more waiting on the manager",
    body: "Every issue comes with its cause and the report line behind it, so you start from the answer instead of an email chain.",
    art: <SourceArt />,
    wide: true,
    textBelow: true,
  },
];

export function MonthBento() {
  return (
    <section id="your-month" className="scroll-mt-12 border-t border-border">
      <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-end lg:gap-14">
          <h2 className="text-[28px] font-semibold leading-[1.2] tracking-[-0.02em] text-fg sm:text-[40px]">
            Month-end takes three weeks.
            <br />
            <span className="mt-1 inline-block rounded-lg border border-brand/20 bg-brand-soft px-2 text-brand">RE-IQ gives them back.</span>
          </h2>
          <p className="max-w-[520px] text-[15px] leading-[1.6] text-fg-2">
            Wait for close, rebuild every package in Excel, check the math if there&apos;s time, skim for the big misses, then email managers and wait. RE-IQ handles the
            middle of the month, so you start at the decision.
          </p>
        </div>
        <ul className="mt-12 grid gap-3 lg:grid-cols-12">
          {CARDS.map((card) => (
            <li
              key={card.title}
              className={cn(
                "flex overflow-hidden rounded-lg border border-border bg-surface",
                card.wide ? "lg:col-span-7" : "lg:col-span-5",
                card.textBelow ? "flex-col-reverse" : "flex-col",
              )}
            >
              <div className={cn("px-6 pt-6", card.textBelow ? "pb-6" : "pb-2")}>
                <h3 className="text-[15px] font-semibold text-fg">{card.title}</h3>
                <p className="mt-2 max-w-[520px] text-[13px] leading-[1.6] text-fg-2">{card.body}</p>
              </div>
              <div className={cn("relative h-[240px]", !card.textBelow && "mt-auto")}>
                {card.art}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
