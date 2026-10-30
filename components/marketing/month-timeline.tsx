import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

/* An asset manager's month today. Stages 3 and 4 are the low point: hours of work that produce only a spreadsheet. */

const STAGES = [
  { title: "Wait for close", when: "Days 1–20", body: "Flying blind on last month's numbers." },
  { title: "Packages trickle in", when: "Days 15–25", body: "PDFs and spreadsheets from 2–4 managers, all different." },
  { title: "Rebuild in Excel", body: "Retype, then remap “Repairs” vs. “R&M” vs. “Maintenance”.", low: true },
  { title: "Check the math", body: "Tie the rent roll to the T-12, if there's time.", low: true },
  { title: "Skim variances", body: "Sixteen properties, so only the big misses get looked at." },
  { title: "Ask why", body: "Email the manager, then wait days for an answer." },
  { title: "Decide and report up", body: "Rebuild the charts for LPs and lenders." },
];

const WITH_REIQ = ["Forward the packages", "Review what needs you", "Decide"];

export function MonthTimeline() {
  return (
    <div>
      <ol className="relative grid gap-0 lg:grid-cols-7 lg:gap-3">
        {/* The line the stages hang from: vertical on mobile, horizontal on desktop */}
        <span className="absolute top-2 bottom-2 left-[5px] w-px bg-border lg:top-[5px] lg:right-0 lg:bottom-auto lg:left-0 lg:h-px lg:w-auto" aria-hidden />
        {STAGES.map((s, i) => (
          <li key={s.title} className={cn("relative pb-6 pl-7 lg:pb-0 lg:pl-0", s.low && "lg:pt-10")}>
            <span
              className={cn(
                "absolute top-1 left-0 size-[11px] rounded-full border-2 border-bg lg:top-0",
                s.low ? "bg-warning lg:top-10" : "bg-fg-3",
              )}
              aria-hidden
            />
            {s.low && <span className="absolute top-[5px] left-[5px] hidden h-10 w-px bg-warning/50 lg:block" aria-hidden />}
            <div className="lg:pt-6">
              <div className="num text-[10px] text-fg-3">
                {String(i + 1).padStart(2, "0")}
                {s.when ? ` · ${s.when}` : ""}
              </div>
              <h3 className={cn("mt-1 text-[13px] font-medium", s.low ? "text-warning" : "text-fg")}>{s.title}</h3>
              <p className="mt-1 text-[12px] leading-[1.5] text-fg-3">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-8 max-w-[640px] text-[14px] leading-[1.6] text-fg-2 lg:mt-10">
        Stages 2 through 4 produce nothing but a spreadsheet. <span className="text-fg">RE-IQ does them for you.</span>
      </p>
      <div className="mt-6 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center">
        <span className="eyebrow shrink-0">With RE-IQ</span>
        <ol className="flex flex-wrap items-center gap-2">
          {WITH_REIQ.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              {i > 0 && <ArrowRight className="size-3.5 text-fg-3" strokeWidth={1.75} aria-hidden />}
              <span className="rounded-md border border-border bg-bg px-2.5 py-1 text-[12px] font-medium text-fg">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
