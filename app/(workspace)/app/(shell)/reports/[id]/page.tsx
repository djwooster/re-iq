import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Page } from "@/components/app/page";
import { ReportDetail } from "@/components/app/report-detail";
import { DownloadButton } from "@/components/workspace/download-button";
import { getReport, getReports, listProperties } from "@/lib/workspace/queries";
import { requestWorkspace } from "@/lib/workspace/request";

export const metadata: Metadata = { title: "Report" };

type Props = { params: Promise<{ id: string }> };

export default function ReportPage({ params }: Props) {
  return (
    <Suspense>
      <Report params={params} />
    </Suspense>
  );
}

/** One report: where it came from, and what was read from it, to check and confirm. */
async function Report({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const ws = await requestWorkspace();
  const [report, properties, rows] = await Promise.all([getReport(ws, id), listProperties(ws), getReports(ws)]);
  if (!report) notFound();
  const property = properties.find((p) => p.id === report.upload.property_id);
  const row = rows.find((r) => r.id === id);
  return (
    <Page title={report.upload.file_name} crumbs={[{ label: "Reports", href: "/app/reports" }, { label: property?.name ?? "Report" }]} actions={<DownloadButton uploadId={id} />}>
      <ReportDetail upload={report.upload} read={report.read} propertyName={property?.name ?? "Property"} from={row?.uploaderName ?? null} />
    </Page>
  );
}
