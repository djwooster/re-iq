import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Overview } from "@/components/app/overview";
import { LinkButton, Page } from "@/components/app/page";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { closePeriod, dateLabel } from "@/lib/workspace/format";
import { listCompanies, listProperties } from "@/lib/workspace/queries";
import { requestWorkspace } from "@/lib/workspace/request";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  return (
    <Suspense>
      <OverviewData />
    </Suspense>
  );
}

/** Where a signed-in owner lands. A new workspace goes through setup first (finishing or skipping it is remembered on the org). */
async function OverviewData() {
  const ws = await requestWorkspace();
  if (!ws.setupCompletedAt) redirect("/app/setup");
  const [properties, companies] = await Promise.all([listProperties(ws), listCompanies(ws)]);
  const active = properties.filter((p) => !p.archived_at);

  if (!active.length) {
    return (
      <Page title="Overview" subtitle={ws.orgName}>
        <Card>
          <EmptyState
            title="Add your first reports"
            description="Drop last month's reports. Each one is matched to its property by file name, then read."
            action={
              <LinkButton href="/app/reports/new" icon={<Plus className="size-3.5" />}>
                Add report
              </LinkButton>
            }
          />
        </Card>
      </Page>
    );
  }

  // The month being closed, and the twelve months the NOI chart covers.
  const end = new Date(`${closePeriod()}T00:00:00Z`);
  const start = new Date(end);
  start.setUTCMonth(start.getUTCMonth() - 11);
  const short = (d: Date) => d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  return (
    <Overview
      date={dateLabel(new Date().toISOString())}
      month={end.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" })}
      range={`${short(start)} – ${short(end)}`}
      properties={active}
      companies={companies}
    />
  );
}
