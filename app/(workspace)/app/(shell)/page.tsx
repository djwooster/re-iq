import { ChartNoAxesColumn, FileUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LinkButton, Page } from "@/components/app/page";
import { Pulse } from "@/components/app/pulse";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { THead, Table, Td, Th, Tr } from "@/components/ui/table";
import { reportTypeLabel } from "@/lib/uploads/report-types";
import { closePeriod, dateLabel, monthLabel } from "@/lib/workspace/format";
import { PULSE_REPORTS } from "@/lib/workspace/pulse";
import { getLatestReports, getManagers, getRecentUploads, getUploadsForPeriod, listProperties } from "@/lib/workspace/queries";
import { requestWorkspace } from "@/lib/workspace/request";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  return (
    <Suspense>
      <Overview />
    </Suspense>
  );
}

function Stat({ label, value, sub, href }: { label: string; value: string; sub?: string; href: string }) {
  return (
    <Link href={href} className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-border bg-surface px-4 py-3.5 transition-colors hover:border-border-strong">
      <span className="eyebrow truncate">{label}</span>
      <span className="num text-xl leading-6 font-medium tracking-tight text-fg">{value}</span>
      {sub && <span className="truncate text-[11px] text-fg-3">{sub}</span>}
    </Link>
  );
}

/** Where a signed-in owner lands. A new workspace goes through setup first (finishing or skipping it is remembered on the org). */
async function Overview() {
  const ws = await requestWorkspace();
  if (!ws.setupCompletedAt) redirect("/app/setup");
  const period = closePeriod();
  const [properties, monthUploads, recent, { uploaders, invites }, pulse] = await Promise.all([listProperties(ws), getUploadsForPeriod(ws, period), getRecentUploads(ws), getManagers(ws), getLatestReports(ws, PULSE_REPORTS)]);
  const active = properties.filter((p) => !p.archived_at);
  const names = new Map(properties.map((p) => [p.id, p.name]));
  const units = active.reduce((sum, p) => sum + (p.unit_count ?? 0), 0);
  const received = active.filter((p) => monthUploads.some((u) => u.property_id === p.id)).length;

  if (!active.length) {
    return (
      <Page title="Overview" subtitle={ws.orgName}>
        <Card>
          <EmptyState
            title="Add your first reports"
            description="Drop last month's reports. Each one is matched to its property by file name, then read."
            action={<LinkButton href="/app/setup">Add reports</LinkButton>}
          />
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Overview" subtitle={ws.orgName}>
      <Pulse latest={pulse.filter((u) => active.some((p) => p.id === u.property_id))} properties={active.length} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Properties" value={String(active.length)} sub={units ? `${units.toLocaleString("en-US")} units` : undefined} href="/app/properties" />
        <Stat label={`${monthLabel(period)} close`} value={`${received} of ${active.length}`} sub="properties have sent reports" href="/app/close" />
        <Stat label="Property managers" value={String(uploaders.length)} sub={invites.length ? `${invites.length} invite${invites.length === 1 ? "" : "s"} pending` : undefined} href="/app/managers" />
      </div>

      <Card>
        <CardHeader title="Latest reports" />
        {recent.length === 0 ? (
          <EmptyState
            icon={<FileUp className="size-4" strokeWidth={1.75} />}
            title="No reports yet"
            description="Upload a property's monthly reports, or invite its property manager to. They show here as they arrive."
            action={<LinkButton href={`/app/properties/${active[0].id}`}>Upload reports</LinkButton>}
          />
        ) : (
          <Table>
            <THead>
              <Th>Property</Th>
              <Th>Report</Th>
              <Th>Month</Th>
              <Th>Received</Th>
            </THead>
            <tbody>
              {recent.map((u) => (
                <Tr key={u.id}>
                  <Td>
                    <Link href={`/app/properties/${u.property_id}`} className="font-medium text-property underline decoration-property/40 decoration-dashed underline-offset-[3px] hover:decoration-property">
                      {names.get(u.property_id) ?? "Property"}
                    </Link>
                  </Td>
                  <Td className="text-fg">{reportTypeLabel(u.report_type)}</Td>
                  <Td className="text-fg-2">{monthLabel(u.period)}</Td>
                  <Td className="text-fg-2">{dateLabel(u.created_at)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader title="Portfolio performance" />
        <EmptyState icon={<ChartNoAxesColumn className="size-4" strokeWidth={1.75} />} title="No numbers yet" description="NOI, occupancy and budget variance appear here once your reports are processed." />
      </Card>
    </Page>
  );
}
