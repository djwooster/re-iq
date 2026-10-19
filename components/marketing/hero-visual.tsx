"use client";

import { AlertTriangle, FileSpreadsheet, FileText, Paperclip } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { OverviewPanel } from "./overview-panel";
import { Scene, rise } from "./scene";

/*
 * September close for the sample portfolio. "Without": the report emails the
 * managers actually sent (34 attachments, Oct 5–13). "With": the same files
 * move into the overview's sources and the summary writes itself.
 */

type Attachment = { id: string; name: string; failed?: boolean };

const EMAILS: { from: string; subject: string; date: string; files: Attachment[] }[] = [
  { from: "Harbor Property Group", subject: "Willow Bend September financials", date: "Oct 5", files: [{ id: "willow", name: "WillowBend_TwelveMonthIS_Sep26.xlsx" }] },
  {
    from: "Crestline Residential",
    subject: "Oakridge and The Vale T12s",
    date: "Oct 5",
    files: [
      { id: "oakridge", name: "Oakridge_T12_Sep2026.xlsx" },
      { id: "vale", name: "TheVale_T12_Sep2026.xlsx" },
    ],
  },
  {
    from: "Summit Living Management",
    subject: "Hickory Station Sep package",
    date: "Oct 6",
    files: [{ id: "hickory", name: "Hickory Station - Financial Package - Sep 2026.pdf", failed: true }],
  },
  {
    from: "Meridian Residential",
    subject: "Peachtree Landing month-end",
    date: "Oct 9",
    files: [
      { id: "peachtree", name: "PeachtreeLanding_IncomeStatement_2026-09.csv" },
      { id: "peachtree-rr", name: "PeachtreeLanding_RentRoll_2026-09-30.csv" },
    ],
  },
  { from: "Meridian Residential", subject: "Magnolia Court T12", date: "Oct 9", files: [{ id: "magnolia", name: "magnolia-court-twelve-month-income-statement-2026-09.xlsx" }] },
  { from: "Crestline Residential", subject: "Brookstone September reports", date: "Oct 13", files: [{ id: "brookstone", name: "Brookstone_T12_Sep2026.xlsx" }] },
];
const READ = EMAILS.flatMap((e) => e.files).filter((f) => !f.failed);
const TOTAL_FILES = 34;

const MORPH = { layout: { duration: 0.5, ease: "easeOut" as const } };

// Steps: 1 emails arrive, 2 the tally, 3 switch to RE-IQ (files move into sources), 4–6 the overview plays.
const SCHEDULE = [200, 2600, 4200, 4800, 5200, 6500] as const;
const AFTER = 3;

function FileChip({ file, compact }: { file: Attachment; compact?: boolean }) {
  const Icon = file.name.endsWith(".pdf") ? FileText : FileSpreadsheet;
  return (
    <motion.span
      layoutId={`file-${file.id}`}
      transition={MORPH}
      className={cn(
        "num inline-flex min-w-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px]",
        file.failed ? "border-warning/30 bg-warning/[0.06] text-warning" : "border-border bg-surface text-fg-2",
        compact ? "max-w-[180px]" : "max-w-full",
      )}
    >
      <Icon className="size-3 shrink-0" strokeWidth={1.75} aria-hidden />
      <span className="truncate">{file.name}</span>
    </motion.span>
  );
}

function PhaseToggle({ after }: { after: boolean }) {
  return (
    <div className="inline-flex rounded-md border border-border bg-bg p-0.5" aria-hidden>
      {["Without RE-IQ", "With RE-IQ"].map((label, i) => {
        const active = after === (i === 1);
        return (
          <span key={label} className={cn("relative px-2.5 py-1 text-[11px] transition-colors duration-200", active ? "text-fg" : "text-fg-3")}>
            {active && <motion.span layoutId="hero-phase" className="absolute inset-0 rounded-[5px] bg-surface-2" transition={{ duration: 0.2, ease: "easeOut" }} />}
            <span className="relative">{label}</span>
          </span>
        );
      })}
    </div>
  );
}

function Inbox({ step }: { step: number }) {
  return (
    <div className="rounded-lg border border-border bg-bg">
      <div className="flex items-baseline justify-between gap-3 border-b border-border px-3 py-2">
        <span className="text-[12px] font-medium text-fg">Inbox · September reports</span>
        <span className="num text-[10px] text-fg-3">Oct 5–13</span>
      </div>
      <ul>
        {EMAILS.map((e, i) => (
          <motion.li
            key={e.subject}
            {...rise(step >= 1, i * 0.32)}
            className="grid gap-1.5 border-b border-border px-3 py-2 last:border-b-0 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_44px] sm:items-center sm:gap-3"
          >
            <div className="min-w-0">
              <div className="truncate text-[11px] font-medium text-fg">{e.from}</div>
              <div className="truncate text-[10px] text-fg-3">{e.subject}</div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              <Paperclip className="size-3 shrink-0 text-fg-3" strokeWidth={1.75} aria-hidden />
              {e.files.map((f) => (
                <FileChip key={f.id} file={f} />
              ))}
            </div>
            <span className="num hidden text-right text-[10px] text-fg-3 sm:block">{e.date}</span>
          </motion.li>
        ))}
      </ul>
      <div className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-3 py-2 text-[10px]">
        <motion.span {...rise(step >= 2)} className="num text-fg-2">
          {TOTAL_FILES} attachments · 4 managers · 3 file types
        </motion.span>
        <motion.span {...rise(step >= 2, 0.25)} className="inline-flex items-center gap-1 text-warning">
          <AlertTriangle className="size-3" strokeWidth={1.75} aria-hidden /> Hickory Station sent a scan: re-key it by hand
        </motion.span>
      </div>
    </div>
  );
}

function Sources() {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-2">
      <span className="mr-1 text-[10px] text-fg-3">Read from</span>
      {READ.slice(0, 4).map((f) => (
        <FileChip key={f.id} file={f} compact />
      ))}
      <motion.span {...rise(true, 0.4)} className="num text-[10px] text-fg-3">
        + {TOTAL_FILES - 4} more
      </motion.span>
      <motion.span {...rise(true, 0.5)} className="ml-auto hidden text-[10px] text-fg-3 md:inline">
        Hickory Station sent a scan. Ask Summit for the Excel export.
      </motion.span>
    </div>
  );
}

export function HeroVisual() {
  return (
    <Scene label="September close · Alder Peak Capital (sample)" meta="14 properties · 3,790 units" schedule={SCHEDULE}>
      {(step) => {
        const after = step >= AFTER;
        return (
          <LayoutGroup>
            <div className="mb-2 flex justify-center">
              <PhaseToggle after={after} />
            </div>
            <div className="relative min-h-[470px] sm:min-h-[420px]">
              <AnimatePresence mode="popLayout" initial={false}>
                {after ? (
                  <motion.div key="after" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                    <Sources />
                    <OverviewPanel step={step - AFTER} />
                  </motion.div>
                ) : (
                  <motion.div key="before" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                    <Inbox step={step} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </LayoutGroup>
        );
      }}
    </Scene>
  );
}
