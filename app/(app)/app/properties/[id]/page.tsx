import type { Metadata } from "next";
import { NotBuilt } from "@/components/shell/not-built";
import { getSession, listProperties } from "@/lib/data";

export const metadata: Metadata = { title: "Property" };

export async function generateStaticParams() {
  const properties = await listProperties(getSession().org_id);
  return properties.map((p) => ({ id: p.property.id }));
}

export default function PropertyPage() {
  return (
    <NotBuilt
      title="Property detail"
      subtitle="Summary, trends, renewals, vendors, work orders, and sources"
      description="Each property's own AI summary, metrics and trends, below-market units, upcoming renewals, top vendors, open work orders, and the reports behind its numbers."
    />
  );
}
