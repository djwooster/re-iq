"use client";

import { ChevronLeft, ChevronRight, Map, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { useApp } from "@/components/shell/app-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { getOrganization, loadSamplePortfolio } from "@/lib/data";

/**
 * The internal demo tour. Off unless switched on in Settings. Its state lives
 * outside the `reiq.` keys so a fresh start (/demo?fresh=1) doesn't turn it off.
 */
const KEY = "reiq-tour";

interface TourState {
  enabled: boolean;
  step: number;
}

const listeners = new Set<() => void>();
let cached: { raw: string | null; state: TourState } | null = null;

function read(): TourState {
  try {
    const raw = localStorage.getItem(KEY);
    if (cached && cached.raw === raw) return cached.state;
    const state = raw ? (JSON.parse(raw) as TourState) : { enabled: false, step: 0 };
    cached = { raw, state };
    return state;
  } catch {
    return { enabled: false, step: 0 };
  }
}

function write(next: TourState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: the tour stays off.
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const OFF: TourState = { enabled: false, step: 0 };

export function useTour() {
  const state = useSyncExternalStore(subscribe, read, () => OFF);
  return { ...state, setEnabled: (enabled: boolean) => write({ ...state, enabled }), setStep: (step: number) => write({ ...state, step }) };
}

interface Step {
  title: string;
  body: string;
  href: string;
  /** The first step starts from an empty workspace; the rest need the sample portfolio. */
  fresh?: boolean;
}

export const TOUR_STEPS: Step[] = [
  { title: "Upload a T12 and see it cleaned up", body: "Click Upload report. It reads Brookstone's November T12, then shows the mapping review and the standardized statement.", href: "/demo?fresh=1", fresh: true },
  { title: "November close and portfolio health", body: "The close line, NOI vs budget, physical and economic occupancy side by side, and issues by dollars.", href: "/app" },
  { title: "Lakeline Flats: driver, trend, evidence", body: "Why vacancy and concessions are behind budget. Click any number to open the line in Harbor's report.", href: "/app/issues/iss_lakeline_vacancy" },
  { title: "Mesa Verde: a resolved issue and its result", body: "Flagged in June, acted on in October, resolved in December. R&M back on budget.", href: "/app/issues/iss_mesa_hvac" },
  { title: "Crestline late, mapping review, reconciliation", body: "The close tracker, then the Mapping review and Reconciliation tabs.", href: "/app/data-sources" },
  { title: "Manager scorecards", body: "Each manager against their own budgets first, then raw numbers with context.", href: "/app/performance?tab=managers" },
  { title: "The lender covenant report", body: "DSCR and headroom for every loan. Lakeline is below its covenant.", href: "/app/reports?type=lender" },
  { title: "View as owner", body: "Open the user menu at the bottom left and choose View as owner (Dana Whitfield).", href: "/app" },
];

export function TourButton() {
  const { orgId } = useApp();
  const { enabled, step, setStep, setEnabled } = useTour();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  if (!enabled) return null;

  const go = async (i: number) => {
    setStep(i);
    const s = TOUR_STEPS[i];
    if (s.fresh) {
      window.location.assign(s.href);
      return;
    }
    // Steps after the first run need the full sample portfolio.
    if (!(await getOrganization(orgId)).is_sample) loadSamplePortfolio();
    router.push(s.href);
  };
  const s = TOUR_STEPS[step] ?? TOUR_STEPS[0];

  return (
    <div className="fixed right-4 bottom-4 z-40 print:hidden">
      {open ? (
        <div className="w-[320px] rounded-lg border border-border bg-bg p-3 shadow-overlay">
          <div className="mb-2 flex items-center justify-between">
            <span className="eyebrow">
              Tour · {step + 1} of {TOUR_STEPS.length}
            </span>
            <button type="button" aria-label="Close tour" onClick={() => setOpen(false)} className="cursor-pointer rounded p-0.5 text-fg-3 hover:text-fg">
              <X className="size-3.5" />
            </button>
          </div>
          <div className="text-xs font-medium text-fg">{s.title}</div>
          <p className="mt-1 text-[11px] leading-4 text-fg-2">{s.body}</p>
          <ol className="mt-3 flex gap-1">
            {TOUR_STEPS.map((x, i) => (
              <li key={x.title} className="flex-1">
                <button type="button" aria-label={x.title} title={x.title} onClick={() => go(i)} className={cn("block h-1 w-full cursor-pointer rounded-full", i <= step ? "bg-fg" : "bg-fg/15")} />
              </li>
            ))}
          </ol>
          <div className="mt-3 flex items-center justify-between">
            <Button size="xs" variant="ghost" onClick={() => setEnabled(false)}>
              Turn off
            </Button>
            <div className="flex gap-1.5">
              <Button size="xs" disabled={step === 0} icon={<ChevronLeft className="size-3" />} onClick={() => go(step - 1)}>
                Back
              </Button>
              <Button size="xs" variant="primary" onClick={() => go(step === TOUR_STEPS.length - 1 ? 0 : step + 1)}>
                {step === TOUR_STEPS.length - 1 ? "Start over" : "Next"} <ChevronRight className="size-3" />
              </Button>
            </div>
          </div>
          <button type="button" onClick={() => go(step)} className="mt-2 w-full cursor-pointer text-left text-[11px] text-fg-3 underline decoration-border underline-offset-2 hover:text-fg">
            Go to this step
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-bg px-3 py-1.5 text-[11px] font-medium text-fg shadow-overlay hover:border-border-strong">
          <Map className="size-3" strokeWidth={1.75} /> Tour · {step + 1}/{TOUR_STEPS.length}
        </button>
      )}
    </div>
  );
}
