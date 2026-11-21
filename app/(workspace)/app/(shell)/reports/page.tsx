import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { LinkButton, Page } from "@/components/app/page";
import { Reports, type ReadStatus, type ReportsTab } from "@/components/app/reports";
import { isReadable } from "@/lib/reading/run";
import { loadReview } from "@/lib/reading/review";
import { getReports, listProperties } from "@/lib/workspace/queries";
import { requestWorkspace } from "@/lib/workspace/request";

export const metadata: Metadata = { title: "Reports" };

type Props = { searchParams: Promise<{ tab?: string }> };

export default function ReportsPage({ searchParams }: Props) {
  return (
    <Suspense>
      <ReportsList searchParams={searchParams} />
    </Suspense>
  );
}

/** Every report received, and what reading made of it. Anything never read starts reading on this visit. */
async function ReportsList({ searchParams }: Props) {
  const { tab } = await searchParams;
  const ws = await requestWorkspace();
  const [properties, reads] = await Promise.all([listProperties(ws), loadReview(ws)]);
  const rows = await getReports(ws);
  const byUpload = new Map(reads.map((r) => [r.upload_id, r.status]));
  const types = new Map(reads.map((r) => [r.upload_id, r.report_type]));
  // A read that couldn't place the report (type "other") isn't worth reviewing: it's simply not read yet.
  const statusOf = (id: string, readable: boolean): ReadStatus => {
    const status = byUpload.get(id);
    if (!status) return readable ? "reading" : "notRead";
    return status === "read" && types.get(id) === "other" ? "notRead" : status;
  };
  const statuses: Record<string, ReadStatus> = Object.fromEntries(rows.map((r) => [r.id, statusOf(r.id, isReadable(r))]));
  const current: ReportsTab = tab === "review" || tab === "failed" ? tab : "all";
  return (
    <Page title="Reports" actions={<LinkButton href="/app/reports/new" icon={<Plus className="size-3.5" />}>Add report</LinkButton>}>
      <Reports tab={current} rows={rows} statuses={statuses} reads={reads} properties={properties} canDelete={ws.role === "owner"} />
    </Page>
  );
}
