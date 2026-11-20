"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { PRODUCT_NAME } from "@/lib/labels";
import { completeSetup } from "@/lib/workspace/actions";
import { SETUP_STEPS, type SetupStep } from "@/lib/workspace/setup-steps";

/**
 * The first-run setup frame for a new workspace. Each step saves as it goes (properties, uploads and
 * invites are real records), so leaving and coming back on any computer picks up where it was.
 * Finishing or skipping is remembered on the org.
 */

const href = (step: SetupStep) => `/app/setup?step=${step}`;

function useFinish() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  const finish = () =>
    start(async () => {
      const result = await completeSetup();
      if (!result.ok) return setError(true);
      router.push("/app");
    });
  return { finish, pending, error };
}

export function SetupFrame({ step, canContinue, children }: { step: SetupStep; canContinue: boolean; children: React.ReactNode }) {
  const i = SETUP_STEPS.findIndex((s) => s.id === step);
  const current = SETUP_STEPS[i];
  const next = SETUP_STEPS[i + 1];
  const back = SETUP_STEPS[i - 1];
  const skip = useFinish();
  const done = useFinish();
  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg">
      <header className="grid h-12 grid-cols-[1fr_auto_1fr] items-center border-b border-border px-5">
        <span className="num justify-self-start text-[13px] font-semibold tracking-[0.06em]">{PRODUCT_NAME}</span>
        <ol className="hidden items-center gap-1 md:flex" aria-label="Setup steps">
          {SETUP_STEPS.map((s, n) => {
            const isDone = n < i;
            const isCurrent = n === i;
            const body = (
              <span className={cn("flex items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors", isCurrent ? "text-fg" : isDone ? "text-fg-2 hover:text-fg" : "text-fg-3")}>
                <span className={cn("num flex size-4 items-center justify-center rounded-full text-[9px] font-semibold", isCurrent ? "bg-inverted text-inverted-fg" : isDone ? "bg-favorable/15 text-favorable" : "border border-border")}>
                  {isDone ? <Check className="size-2.5" strokeWidth={3} /> : n + 1}
                </span>
                {s.label}
              </span>
            );
            return (
              <li key={s.id} className="flex items-center gap-1" aria-current={isCurrent ? "step" : undefined}>
                {n > 0 && <span className="h-px w-5 bg-border" />}
                {!isCurrent && (n < i || canContinue) ? <Link href={href(s.id)}>{body}</Link> : body}
              </li>
            );
          })}
        </ol>
        <button type="button" onClick={skip.finish} disabled={skip.pending} className="justify-self-end rounded-md px-2 py-1 text-xs text-fg-2 transition-colors hover:text-fg disabled:opacity-50">
          Skip setup
        </button>
      </header>
      <motion.main key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }} className="mx-auto flex w-full max-w-[860px] flex-1 flex-col gap-6 px-5 py-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] leading-8 font-semibold tracking-tight">{current.title}</h1>
          <p className="max-w-[560px] text-xs leading-relaxed text-fg-2">{current.hint}</p>
        </div>
        {children}
        <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
          {(skip.error || done.error) && <span className="mr-auto text-xs text-unfavorable">That didn&apos;t save. Try again.</span>}
          {back && (
            <Link href={href(back.id)} className="inline-flex min-w-[100px] items-center justify-center rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] font-medium text-fg transition-colors hover:border-border-strong hover:bg-surface-2">
              Back
            </Link>
          )}
          {next ? (
            canContinue ? (
              <Link href={href(next.id)} className="inline-flex min-w-[100px] items-center justify-center rounded-md border border-transparent bg-inverted px-3 py-1.5 text-[13px] font-medium text-inverted-fg transition-opacity hover:opacity-90">
                Continue
              </Link>
            ) : (
              <Button variant="primary" disabled>
                Continue
              </Button>
            )
          ) : (
            <Button variant="primary" onClick={done.finish} loading={done.pending}>
              Open dashboard
            </Button>
          )}
        </div>
      </motion.main>
    </div>
  );
}
