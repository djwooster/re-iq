import type { Metadata } from "next";
import { NotBuilt } from "@/components/shell/not-built";

export const metadata: Metadata = { title: "Properties" };

export default function PropertiesPage() {
  return (
    <NotBuilt
      title="Properties"
      subtitle="Every property, whichever system it runs on"
      upload
      description="A sortable table of all 14 properties with occupancy, NOI vs. budget, delinquency, data source, and data-through date, plus a summary drawer for each."
    />
  );
}
