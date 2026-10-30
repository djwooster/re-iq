import Image from "next/image";
import { cn } from "@/lib/cn";

/*
 * The buyer's month, made scannable: four cards, each a step of month-end
 * RE-IQ takes off the asset manager's plate. Each card has an illustration
 * slot. Until a file exists, a simple vector stand-in renders in its place;
 * to swap one in, put the image in public/marketing/ and set `image`. The
 * vector version also stands in under dark mode.
 */

type Art = "excel" | "tieout" | "creep" | "source";

const CARDS: { title: string; body: string; art: Art; image?: string; wide: boolean; textBelow?: boolean }[] = [
  {
    title: "No more rebuilding in Excel",
    body: "Yardi, Entrata, AppFolio, ResMan, or Rent Manager: every layout lands in one chart of accounts, without retyping.",
    art: "excel",
    image: "/marketing/data-mapping.png",
    wide: true,
  },
  {
    title: "No more skipped tie-outs",
    body: "Totals are checked against each manager's statements, and breaks get flagged.",
    art: "tieout",
    wide: false,
  },
  {
    title: "No slow problems hiding",
    body: "Small misses that grow for months surface early, ranked by dollars.",
    art: "creep",
    wide: false,
  },
  {
    title: "No more waiting on the manager",
    body: "Every issue comes with its cause and the report line behind it, so you start from the answer instead of an email chain.",
    art: "source",
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
            <span className="mt-1 inline-block rounded-lg border border-border bg-surface-2 px-2">RE-IQ gives them back.</span>
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
                {card.image ? (
                  <>
                    {/* The illustrations are drawn on light backgrounds, so dark mode keeps the vector version. */}
                    <Image src={card.image} alt="" fill className="object-contain dark:hidden" sizes="(min-width: 1024px) 700px, 100vw" />
                    <span className="hidden dark:block">
                      <PlaceholderArt art={card.art} />
                    </span>
                  </>
                ) : (
                  <PlaceholderArt art={card.art} />
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Wireframe stand-ins until the illustrations are ready. */
function PlaceholderArt({ art }: { art: Art }) {
  return (
    <svg viewBox="0 0 400 240" className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <g className="fill-none stroke-border-strong" strokeWidth={1}>
        {art === "excel" && (
          <>
            {[60, 96, 132, 168].map((y, i) => (
              <rect key={y} x={60} y={y} width={88} height={22} rx={6} strokeDasharray="3 3" opacity={i === 1 ? 1 : 0.5} />
            ))}
            <path d="M148 107 C 180 107, 180 120, 212 120" strokeDasharray="3 3" />
            <rect x={212} y={96} width={140} height={48} rx={8} className="fill-bg stroke-border-strong" />
            <rect x={226} y={110} width={40} height={6} rx={3} className="fill-fg/15 stroke-none" />
            <rect x={274} y={110} width={64} height={6} rx={3} className="fill-fg stroke-none" />
            <rect x={226} y={124} width={112} height={6} rx={3} className="fill-fg/10 stroke-none" />
          </>
        )}
        {art === "tieout" && (
          <>
            <path d="M110 170 A 90 90 0 0 1 290 170" strokeDasharray="2 4" />
            <path d="M200 92 L240 106 V140 C240 162 222 178 200 186 C178 178 160 162 160 140 V106 Z" className="fill-bg stroke-border-strong" />
            <path d="M184 140 L196 152 L218 128" className="stroke-favorable" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={110} cy={170} r={9} className="fill-bg stroke-warning" />
            <circle cx={290} cy={170} r={9} className="fill-bg stroke-favorable" />
          </>
        )}
        {art === "creep" && (
          <>
            {[70, 110, 150, 190].map((y) => (
              <path key={y} d={`M50 ${y} H350`} opacity={0.4} />
            ))}
            <path d="M50 150 L50 150 L100 148 L150 140 L200 128 L250 110 L300 86 L350 60" className="stroke-unfavorable" strokeWidth={2} strokeLinecap="round" />
            <path d="M50 130 H350" strokeDasharray="4 4" className="stroke-fg-3" />
            <circle cx={300} cy={86} r={5} className="fill-unfavorable stroke-none" />
          </>
        )}
        {art === "source" && (
          <>
            <rect x={120} y={40} width={160} height={170} rx={10} className="fill-bg stroke-border-strong" />
            {[70, 90, 110, 150, 170].map((y, i) => (
              <rect key={y} x={140} y={y} width={i % 2 ? 90 : 120} height={6} rx={3} className="fill-fg/10 stroke-none" />
            ))}
            <rect x={136} y={124} width={128} height={18} rx={4} className="fill-fg/[0.04]" />
            <rect x={142} y={130} width={70} height={6} rx={3} className="fill-fg stroke-none" />
            <path d="M130 118 V114 H134 M266 114 H270 V118 M270 148 V152 H266 M134 152 H130 V148" className="stroke-fg" strokeWidth={2} />
          </>
        )}
      </g>
    </svg>
  );
}
