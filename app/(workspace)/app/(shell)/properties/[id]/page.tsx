import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Page } from "@/components/app/page";
import { Pulse } from "@/components/app/pulse";
import { UploadCard } from "@/components/uploads/upload-view";
import { PropertyReportsView } from "@/components/workspace/property-reports-view";
import { PULSE_REPORTS } from "@/lib/workspace/pulse";
import { getLatestReports, getPropertyReports } from "@/lib/workspace/queries";
import { requestWorkspace } from "@/lib/workspace/request";

export const metadata: Metadata = { title: "Property" };

type Props = { params: Promise<{ id: string }> };

export default function PropertyPage({ params }: Props) {
  return (
    <Suspense>
      <Property params={params} />
    </Suspense>
  );
}

/** One property: upload its reports, and every report received, by month, with downloads. */
async function Property({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const ws = await requestWorkspace();
  const [{ property, uploads, names }, pulse] = await Promise.all([getPropertyReports(ws, id), getLatestReports(ws, PULSE_REPORTS, id)]);
  if (!property) notFound();
  const facts = [property.address, property.unit_count != null ? `${property.unit_count.toLocaleString("en-US")} units` : null, property.archived_at ? "Archived" : null].filter(Boolean).join(" · ");
  return (
    <Page title={property.name} subtitle={facts || undefined} crumbs={[{ label: "Properties", href: "/app/properties" }, { label: property.name }]}>
      <Pulse latest={pulse} properties={1} />
      {!property.archived_at && <UploadCard properties={[property]} selectedId={property.id} propertyHref="/app/properties/" />}
      <PropertyReportsView uploads={uploads} names={names} />
    </Page>
  );
}
