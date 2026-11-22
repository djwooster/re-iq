import { FileSpreadsheet, LineChart, ScanText } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Overview } from "@/components/app/overview";
import { AddReportsButton } from "@/components/app/add-reports";
import { Page } from "@/components/app/page";
import { SpotEmpty } from "@/components/app/ui";
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
        <SpotEmpty icons={[<FileSpreadsheet key="FileSpreadsheet" />, <ScanText key="ScanText" />, <LineChart key="LineChart" />]} title="Add your first reports" action={<AddReportsButton properties={active} period={closePeriod()} />}>
          Drop last month&apos;s reports. Each one is matched to its property by file name, then read.
        </SpotEmpty>
      </Page>
    );
  }

  // The month being closed.
  const end = new Date(`${closePeriod()}T00:00:00Z`);
  return (
    <Overview
      date={dateLabel(new Date().toISOString())}
      month={end.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" })}
      closing={closePeriod()}
      properties={active}
      companies={companies}
    />
  );
}
