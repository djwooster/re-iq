import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { LinkButton, Page } from "@/components/app/page";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { THead, Table, Td, Th, Tr } from "@/components/ui/table";
import { closePeriod, dateLabel, monthLabel } from "@/lib/workspace/format";
import { getUploadsForPeriod, listProperties } from "@/lib/workspace/queries";
import { requestWorkspace } from "@/lib/workspace/request";
import { TextLink } from "@/components/app/ui";

export const metadata: Metadata = { title: "Close" };

export default function ClosePage() {
  return (
    <Suspense>
      <Close />
    </Suspense>
  );
}

/** The month being closed (last month): which properties have sent reports, how many files, and when. */
async function Close() {
  const ws = await requestWorkspace();
  const period = closePeriod();
  const [properties, uploads] = await Promise.all([listProperties(ws), getUploadsForPeriod(ws, period)]);
  const active = properties.filter((p) => !p.archived_at);
  const received = active.filter((p) => uploads.some((u) => u.property_id === p.id)).length;
  return (
    <Page title="Close" subtitle={active.length ? `${monthLabel(period)} · ${received} of ${active.length} ${active.length === 1 ? "property has" : "properties have"} sent reports` : monthLabel(period)}>
      {active.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Building2 className="size-4" strokeWidth={1.75} />}
            title="No properties yet"
            description="Each month's close tracks the reports every property sends. Add a property to start."
            action={<LinkButton href="/app/properties">Add a property</LinkButton>}
          />
        </Card>
      ) : (
        <Card>
          <CardHeader title={`${monthLabel(period)} reports`} description="Reports for the month, by property, uploaded by your team or the property's manager." />
          <Table>
            <THead>
              <Th>Property</Th>
              <Th align="right">Files</Th>
              <Th>Last received</Th>
              <Th>Status</Th>
            </THead>
            <tbody>
              {active.map((p) => {
                const files = uploads.filter((u) => u.property_id === p.id);
                return (
                  <Tr key={p.id}>
                    <Td>
                      <TextLink href={`/app/properties/${p.id}`}>{p.name}</TextLink>
                    </Td>
                    <Td align="right" className="num text-fg-2">
                      {files.length}
                    </Td>
                    <Td className="text-fg-2">{files.length ? dateLabel(files[0].created_at) : "—"}</Td>
                    <Td>{files.length ? <Badge tone="favorable">Received</Badge> : <Badge tone="muted">Waiting</Badge>}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}
    </Page>
  );
}
