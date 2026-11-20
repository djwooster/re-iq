"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export { dateLabel, monthLabel, sizeLabel } from "@/lib/workspace/format";

/** A destructive action asks once more before it runs (two clicks, never a dialog). */
export function ConfirmButton({ label, confirmLabel, onConfirm }: { label: string; confirmLabel: string; onConfirm: () => Promise<unknown> }) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  if (!armed)
    return (
      <Button type="button" size="xs" variant="ghost" onClick={() => setArmed(true)}>
        {label}
      </Button>
    );
  return (
    <span className="inline-flex items-center gap-1">
      <Button type="button" size="xs" variant="danger-ghost" loading={pending} onClick={() => start(async () => void (await onConfirm()))}>
        {confirmLabel}
      </Button>
      <Button type="button" size="xs" variant="ghost" onClick={() => setArmed(false)}>
        Cancel
      </Button>
    </span>
  );
}

export function FormMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-unfavorable">
      {message}
    </p>
  );
}
