import type { Metadata } from "next";
import { Suspense } from "react";
import { PropertyDetailView } from "@/components/properties/property-detail-view";
import { getSession, listProperties } from "@/lib/data";

type Params = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  const properties = await listProperties(getSession().org_id);
  return properties.map((p) => ({ id: p.property.id }));
}

export const metadata: Metadata = { title: "Property" };

export default function PropertyPage({ params }: Params) {
  return (
    <Suspense>
      <PropertyDetail params={params} />
    </Suspense>
  );
}

async function PropertyDetail({ params }: Params) {
  const { id } = await params;
  return <PropertyDetailView id={id} />;
}
