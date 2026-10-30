"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useActionState, useId } from "react";
import { joinWaitlist, type WaitlistState } from "@/app/(marketing)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/controls";
import { cn } from "@/lib/cn";

const INITIAL: WaitlistState = { status: "idle" };

/** Email capture for early access. `source` records which form on the page was used; `hint` shows the privacy note. */
export function WaitlistForm({ source, hint = true, className }: { source: string; hint?: boolean; className?: string }) {
  const [state, action, pending] = useActionState(joinWaitlist, INITIAL);
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={cn("w-full max-w-[420px]", className)}>
      <AnimatePresence mode="wait" initial={false}>
        {state.status === "done" ? (
          <motion.p
            key="done"
            role="status"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex h-9 items-center gap-2 text-[13px] text-fg-2"
          >
            <Check className="size-4 text-favorable" strokeWidth={2} aria-hidden />
            You&apos;re on the list. We&apos;ll email <span className="num text-fg">{state.email}</span> when access opens.
          </motion.p>
        ) : (
          <motion.form key="form" action={action} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor={id} className="sr-only">
                Work email
              </label>
              <Input
                id={id}
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                required
                aria-invalid={state.status === "error" || undefined}
                aria-describedby={state.status === "error" ? errorId : undefined}
                className="h-9 flex-1 px-3 text-[13px]"
              />
              <input type="hidden" name="source" value={source} />
              <input type="text" name="company_site" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
              <Button type="submit" variant="primary" loading={pending} className="h-9 px-4 text-[13px]">
                Request early access
              </Button>
            </div>
            {state.status === "error" ? (
              <p id={errorId} role="alert" className="mt-2 text-[11px] text-unfavorable">
                {state.message}
              </p>
            ) : (
              hint && <p className="mt-2 text-[11px] text-fg-3">Work email preferred. We only use it to contact you about access.</p>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
