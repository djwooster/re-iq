"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/shell/app-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/dates";
import { formatCurrency } from "@/lib/format";
import { listActions, setActionStatus } from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import { ACTION_STATUS_LABELS } from "@/lib/labels";
import type { ActionStatus, Insight, PropertyRecord } from "@/lib/types";
import { EstimateTag, EvidenceList, SourceList } from "./evidence";

const STATUS_TONE: Record<ActionStatus, "neutral" | "data" | "muted" | "favorable"> = {
  new: "data",
  accepted: "neutral",
  dismissed: "muted",
  done: "favorable",
};

export function InsightDrawer({ insight: current, property: currentProperty, onClose }: { insight: Insight | null; property?: PropertyRecord; onClose: () => void }) {
  // Keep showing the last insight while the drawer animates out.
  const [last, setLast] = useState({ insight: current, property: currentProperty });
  if (current && current !== last.insight) setLast({ insight: current, property: currentProperty });
  const insight = current ?? last.insight;
  const property = current ? currentProperty : last.property;
  const { orgId } = useApp();
  const toast = useToast();
  const { data: actions } = useData(() => listActions(orgId), [orgId]);
  const [pending, setPending] = useState<string | null>(null);
  const linked = actions?.filter((a) => a.insight_id === insight?.id) ?? [];

  const update = async (id: string, status: ActionStatus) => {
    setPending(`${id}:${status}`);
    await setActionStatus(id, status);
    setPending(null);
    toast(`Action ${ACTION_STATUS_LABELS[status].toLowerCase()}`, { detail: "Tracked in RE-IQ only. Nothing is sent to the property manager's system." });
  };

  return (
    <Drawer
      open={Boolean(current)}
      onClose={onClose}
      eyebrow={insight ? `${insight.type === "issue" ? "Needs attention" : "Opportunity"} · ${property?.name ?? "Portfolio"}` : undefined}
      title={insight?.title ?? ""}
    >
      {insight && (
        <div className="flex flex-col gap-5 px-4 py-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className={`num text-2xl leading-7 font-medium ${insight.type === "issue" ? "text-unfavorable" : "text-favorable"}`}>
                {insight.type === "issue" ? "-" : "+"}
                {formatCurrency(insight.impact)}
              </div>
              <div className="mt-0.5 text-[11px] text-fg-3">
                {insight.impact_label}
                {insight.is_estimate && <EstimateTag />}
              </div>
            </div>
            <Badge tone="muted">{insight.confidence} confidence</Badge>
          </div>

          <section>
            <div className="eyebrow mb-1.5">Diagnosis</div>
            <p className="text-xs leading-[1.65] text-fg-2">{insight.diagnosis}</p>
          </section>

          <section>
            <div className="eyebrow mb-2">Evidence</div>
            <EvidenceList items={insight.evidence} />
          </section>

          <section>
            <div className="eyebrow mb-1.5">Recommended</div>
            <p className="text-xs leading-[1.65] text-fg-2">{insight.recommended_action}</p>
            {linked.map((a) => (
              <div key={a.id} className="mt-2.5 rounded-md border border-border bg-surface px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs text-fg">{a.title}</span>
                  <Badge tone={STATUS_TONE[a.status]}>{ACTION_STATUS_LABELS[a.status]}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  {a.status === "new" && (
                    <>
                      <Button size="xs" variant="primary" loading={pending === `${a.id}:accepted`} onClick={() => update(a.id, "accepted")}>
                        Accept
                      </Button>
                      <Button size="xs" variant="ghost" loading={pending === `${a.id}:dismissed`} onClick={() => update(a.id, "dismissed")}>
                        Dismiss
                      </Button>
                    </>
                  )}
                  {a.status === "accepted" && (
                    <Button size="xs" loading={pending === `${a.id}:done`} onClick={() => update(a.id, "done")}>
                      Mark done
                    </Button>
                  )}
                  {(a.status === "dismissed" || a.status === "done") && (
                    <Button size="xs" variant="ghost" loading={pending === `${a.id}:new`} onClick={() => update(a.id, "new")}>
                      Reopen
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </section>

          <section>
            <div className="eyebrow mb-1.5">Sources</div>
            <SourceList sources={insight.sources} />
          </section>

          <div className="flex items-center justify-between border-t border-border pt-3 text-[11px] text-fg-3">
            <span className="num">Based on data through {formatDate(insight.data_through)}</span>
            {property && (
              <Link href={`/app/properties/${property.id}`} className="inline-flex items-center gap-1 text-fg-2 hover:text-fg">
                Open property <ArrowUpRight className="size-3" />
              </Link>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
