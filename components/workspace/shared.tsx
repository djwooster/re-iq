"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

/** "October 2026" for a period stored as 2026-10-01. */
export const monthLabel = (period: string) => new Date(`${period.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

export const dateLabel = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const sizeLabel = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

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
