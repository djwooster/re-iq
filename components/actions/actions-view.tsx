"use client";

import { ListChecks } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { InsightDrawer } from "@/components/insights/insight-drawer";
import { EstimateTag } from "@/components/insights/evidence";
import { useApp } from "@/components/shell/app-context";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, Tabs } from "@/components/ui/controls";
import { EmptyState, Skeleton } from "@/components/ui/empty-state";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { daysBetween, formatDate, TODAY } from "@/lib/dates";
import { listActions, listInsights, listMembers, listProperties, updateAction } from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import { formatCurrencyShort } from "@/lib/format";
import { ACTION_STATUS_LABELS } from "@/lib/labels";
import type { Action, ActionStatus } from "@/lib/types";

type Filter = "open" | ActionStatus | "all";

const STATUS_TONE: Record<ActionStatus, "data" | "neutral" | "muted" | "favorable"> = {
  new: "data",
  accepted: "neutral",
  dismissed: "muted",
  done: "favorable",
};

export function ActionsView() {
  const { orgId } = useApp();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("open");
  const [pending, setPending] = useState<string | null>(null);
  const [insightId, setInsightId] = useState<string | null>(null);

  const { data } = useData(async () => {
    const [actions, insights, members, properties] = await Promise.all([listActions(orgId), listInsights(orgId), listMembers(orgId), listProperties(orgId)]);
    return { actions, insights, members, properties: properties.map((p) => p.property) };
  }, [orgId]);

  const actions = data?.actions ?? [];
  const visible = actions
    .filter((a) => (filter === "all" ? true : filter === "open" ? a.status === "new" || a.status === "accepted" : a.status === filter))
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || b.estimated_impact - a.estimated_impact);
  const openImpact = actions.filter((a) => a.status === "new" || a.status === "accepted").reduce((s, a) => s + a.estimated_impact, 0);
  const count = (f: Filter) => actions.filter((a) => (f === "open" ? a.status === "new" || a.status === "accepted" : a.status === f)).length;

  const setStatus = async (a: Action, status: ActionStatus) => {
    setPending(`${a.id}:${status}`);
    await updateAction(a.id, { status });
    setPending(null);
    toast(`${ACTION_STATUS_LABELS[status]}: ${a.title}`, { detail: "Tracked in RE-IQ only. Nothing is written to any PMS." });
  };

  const assign = async (a: Action, assignee: string) => {
    await updateAction(a.id, { assignee_id: assignee || null });
    const name = data?.members.find((m) => m.id === assignee)?.name;
    toast(name ? `Assigned to ${name}` : "Unassigned");
  };

  const insight = data?.insights.find((i) => i.id === insightId) ?? null;

  return (
    <>
      <PageHeader
        title="Actions"
        subtitle={data ? `${count("open")} open · ${formatCurrencyShort(openImpact)} estimated impact · tracked here only, nothing writes back to a PMS` : " "}
      />
      <PageBody>
        <div className="flex flex-col gap-3">
          <Tabs
            value={filter}
            onChange={setFilter}
            tabs={[
              { id: "open", label: "Open", count: count("open") },
              { id: "new", label: "New", count: count("new") },
              { id: "accepted", label: "Accepted", count: count("accepted") },
              { id: "done", label: "Done", count: count("done") },
              { id: "dismissed", label: "Dismissed", count: count("dismissed") },
            ]}
          />
          {!data ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : visible.length === 0 ? (
            <Card>
              <EmptyState
                icon={<ListChecks className="size-3.5" strokeWidth={1.75} />}
                title={filter === "open" ? "Nothing open" : `No ${ACTION_STATUS_LABELS[filter as ActionStatus]?.toLowerCase() ?? ""} actions`}
                description="Recommendations appear here as new reports come in and issues or opportunities are found."
              />
            </Card>
          ) : (
            <FadeIn>
              <Card>
                <Stagger as="ul">
                  {visible.map((a, i) => {
                    const property = data.properties.find((p) => p.id === a.property_id);
                    const isIssue = a.insight_id.startsWith("ins_");
                    const ins = data.insights.find((x) => x.id === a.insight_id);
                    const overdue = a.due_date && (a.status === "new" || a.status === "accepted") && daysBetween(TODAY, a.due_date) < 0;
                    return (
                      <StaggerItem as="li" key={a.id} className={cn("grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto]", i > 0 && "border-t border-border/70")}>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => setInsightId(a.insight_id)} className="cursor-pointer text-left text-xs font-medium text-fg hover:underline">
                              {a.title}
                            </button>
                            <Badge tone={STATUS_TONE[a.status]}>{ACTION_STATUS_LABELS[a.status]}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-fg-2">{a.detail}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fg-3">
                            {property ? (
                              <Link href={`/app/properties/${property.id}`} className="hover:text-fg">
                                {property.name}
                              </Link>
                            ) : (
                              <span>Portfolio</span>
                            )}
                            <span className={cn("num", isIssue ? "text-unfavorable" : "text-favorable")}>
                              {isIssue ? "-" : "+"}
                              {formatCurrencyShort(a.estimated_impact)}
                              {!isIssue && "/yr"}
                            </span>
                            {ins?.is_estimate && <EstimateTag />}
                            {a.due_date && <span className={cn("num", overdue && "text-warning")}>Due {formatDate(a.due_date)}</span>}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
                          <Select dense className="w-[150px]" value={a.assignee_id ?? ""} onChange={(e) => assign(a, e.target.value)} aria-label="Assignee">
                            <option value="">Unassigned</option>
                            {data.members
                              .filter((m) => m.status === "active" && m.role !== "viewer")
                              .map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                </option>
                              ))}
                          </Select>
                          {a.status === "new" && (
                            <>
                              <Button size="xs" variant="primary" loading={pending === `${a.id}:accepted`} onClick={() => setStatus(a, "accepted")}>
                                Accept
                              </Button>
                              <Button size="xs" variant="ghost" loading={pending === `${a.id}:dismissed`} onClick={() => setStatus(a, "dismissed")}>
                                Dismiss
                              </Button>
                            </>
                          )}
                          {a.status === "accepted" && (
                            <Button size="xs" loading={pending === `${a.id}:done`} onClick={() => setStatus(a, "done")}>
                              Mark done
                            </Button>
                          )}
                          {(a.status === "done" || a.status === "dismissed") && (
                            <Button size="xs" variant="ghost" loading={pending === `${a.id}:new`} onClick={() => setStatus(a, "new")}>
                              Reopen
                            </Button>
                          )}
                        </div>
                      </StaggerItem>
                    );
                  })}
                </Stagger>
              </Card>
            </FadeIn>
          )}
        </div>
      </PageBody>
      <InsightDrawer insight={insight} property={data?.properties.find((p) => p.id === insight?.property_id)} onClose={() => setInsightId(null)} />
    </>
  );
}
