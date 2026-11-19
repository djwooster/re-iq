import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PropertyReportsView } from "@/components/workspace/property-reports-view";
import { RealDataNotice } from "@/components/workspace/real-data-notice";
import { getViewer } from "@/lib/auth/access";
import { getWorkspace } from "@/lib/workspace/context";
import { getPropertyReports } from "@/lib/workspace/queries";

export const metadata: Metadata = { title: "Property reports" };

type Props = { params: Promise<{ id: string }> };

export default function PropertyReportsPage({ params }: Props) {
  return (
    <Suspense>
      <Reports params={params} />
    </Suspense>
  );
}

async function Reports({ params }: Props) {
  if ((await getViewer()).kind !== "user") return <RealDataNotice title="Property reports" />;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const ws = await getWorkspace();
  const { property, uploads, names } = await getPropertyReports(ws, id);
  if (!property) notFound();
  return <PropertyReportsView property={property} uploads={uploads} names={names} />;
}
