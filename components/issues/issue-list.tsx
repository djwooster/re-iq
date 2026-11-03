"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge, type Tone } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/empty-state";
import { Variance } from "@/components/ui/metric";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { cn } from "@/lib/cn";
import type { Issue } from "@/lib/data";
import { ISSUE_STATUS_LABELS } from "@/lib/labels";
import type { IssueStatus } from "@/lib/types";

const STATUS_TONE: Record<IssueStatus, Tone> = { open: "warning", acting: "neutral", resolved: "favorable" };

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]} dot>
      {ISSUE_STATUS_LABELS[status]}
    </Badge>
  );
}

/** Issues as rows: where, what, how much, status, since when. Each row opens the issue. */
export function IssueList({ issues, empty }: { issues?: Issue[]; empty?: string }) {
  if (!issues) {
    return (
      <div className="flex flex-col gap-3 px-4 pb-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }
  if (!issues.length) return <p className="px-4 pb-4 text-xs text-fg-3">{empty ?? "No issues."}</p>;
  return (
    <div>
      <div className="eyebrow grid grid-cols-[minmax(0,1fr)_96px_84px_104px_14px] gap-3 border-y border-border px-4 py-2">
        <span>Issue</span>
        <span className="text-right">Vs budget</span>
        <span>Status</span>
        <span>When</span>
        <span />
      </div>
      <Stagger as="ul">
        {issues.map((issue, i) => (
          <StaggerItem as="li" key={issue.id}>
            <Link
              href={`/app/issues/${issue.id}`}
              className={cn(
                "group grid grid-cols-[minmax(0,1fr)_96px_84px_104px_14px] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-fg/[0.025]",
                i > 0 && "border-t border-border/70",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-xs text-fg">{issue.headline}</span>
                <span className="mt-0.5 block truncate text-[11px] text-fg-3">{issue.scope_label}</span>
              </span>
              <Variance value={issue.impact} short className="text-right text-xs" />
              <span>
                <IssueStatusBadge status={issue.status} />
              </span>
              <span className="num text-[11px] text-fg-3">{issue.window_label}</span>
              <ChevronRight className="size-3.5 text-fg-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
