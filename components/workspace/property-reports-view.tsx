import Link from "next/link";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { THead, Table, Td, Th, Tr } from "@/components/ui/table";
import { reportTypeLabel } from "@/lib/uploads/report-types";
import type { Property, Upload } from "@/lib/workspace/queries";
import { DownloadButton } from "./download-button";
import { dateLabel, monthLabel, sizeLabel } from "./shared";

/** Which reports arrived for each month, who uploaded them, and a download for each. */
export function PropertyReportsView({ property, uploads, names }: { property: Property; uploads: Upload[]; names: Record<string, string> }) {
  const months = [...new Set(uploads.map((u) => u.period))];
  return (
    <>
      <PageHeader
        title={property.name}
        subtitle={
          <>
            <Link href="/app/workspace/properties" className="hover:text-fg">
              Properties and reports
            </Link>
            {property.address ? ` · ${property.address}` : ""}
          </>
        }
        actions={property.archived_at ? <Badge tone="muted">Archived</Badge> : undefined}
      />
      <PageBody>
        <div className="flex flex-col gap-4">
          {months.length === 0 && (
            <Card>
              <EmptyState title="No reports yet" description="Reports appear here as soon as this property's manager uploads them." />
            </Card>
          )}
          {months.map((month) => {
            const rows = uploads.filter((u) => u.period === month);
            return (
              <Card key={month}>
                <CardHeader title={monthLabel(month)} description={`${rows.length} ${rows.length === 1 ? "file" : "files"}`} />
                <Table>
                  <THead>
                    <Th>Report</Th>
                    <Th>File</Th>
                    <Th>Uploaded by</Th>
                    <Th>Received</Th>
                    <Th />
                  </THead>
                  <tbody>
                    {rows.map((u) => (
                      <Tr key={u.id}>
                        <Td className="font-medium text-fg">{reportTypeLabel(u.report_type)}</Td>
                        <Td className="text-fg-2">
                          {u.file_name}
                          <span className="ml-1.5 text-[11px] text-fg-3">
                            {sizeLabel(u.size_bytes)}
                            {u.version > 1 ? ` · version ${u.version}` : ""}
                          </span>
                        </Td>
                        <Td className="text-fg-2">{(u.uploaded_by && names[u.uploaded_by]) || "Removed user"}</Td>
                        <Td className="text-fg-2">{dateLabel(u.created_at)}</Td>
                        <Td align="right">
                          <DownloadButton uploadId={u.id} />
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            );
          })}
        </div>
      </PageBody>
    </>
  );
}
