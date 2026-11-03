"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { RESOLVE_REASONS, setIssueStatus, type Issue } from "@/lib/data";
import { ISSUE_STATUS_LABELS } from "@/lib/labels";
import type { IssueStatus, ResolveReason } from "@/lib/types";

const ORDER: IssueStatus[] = ["open", "acting", "resolved"];

/**
 * Open → Acting → Resolved. The asset manager records the decision in their
 * own words; RE-IQ never suggests one.
 */
export function StatusControl({ issue }: { issue: Issue }) {
  const toast = useToast();
  const [pending, setPending] = useState<IssueStatus | null>(null);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState<ResolveReason>("fixed");
  const [saving, setSaving] = useState(false);

  const choose = (s: IssueStatus) => {
    if (s === issue.status) return setPending(null);
    setNote("");
    setReason("fixed");
    if (s === "open") return save("open");
    setPending(s);
  };

  const save = async (s: IssueStatus) => {
    setSaving(true);
    await setIssueStatus(issue.id, s, { note, reason });
    setSaving(false);
    setPending(null);
    toast(`Moved to ${ISSUE_STATUS_LABELS[s]}`);
  };

  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label="Status" className="inline-flex w-fit rounded-md border border-border bg-surface p-0.5">
        {ORDER.map((s) => {
          const active = (pending ?? issue.status) === s;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(s)}
              className={cn(
                "cursor-pointer rounded-[5px] px-3 py-1 text-[11px] font-medium transition-colors",
                active ? "border border-border bg-bg text-fg" : "border border-transparent text-fg-3 hover:text-fg-2",
              )}
            >
              {ISSUE_STATUS_LABELS[s]}
            </button>
          );
        })}
      </div>

      {pending && (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3">
          {pending === "resolved" && (
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Reason">
              {RESOLVE_REASONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={reason === r.id}
                  title={r.hint}
                  onClick={() => setReason(r.id)}
                  className={cn(
                    "cursor-pointer rounded-md border px-2 py-1 text-[11px] transition-colors",
                    reason === r.id ? "border-fg-3 text-fg" : "border-border text-fg-3 hover:text-fg-2",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
          <Input
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save(pending)}
            placeholder={pending === "acting" ? "Decision note (optional)" : reason === "not_an_issue" ? "Why it's expected, e.g. planned capex (optional)" : "Note (optional)"}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="xs" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="xs" loading={saving} onClick={() => save(pending)}>
              Move to {ISSUE_STATUS_LABELS[pending]}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
