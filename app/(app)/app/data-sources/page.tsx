import type { Metadata } from "next";
import { Suspense } from "react";
import { DataSourcesView } from "@/components/data-sources/data-sources-view";

export const metadata: Metadata = { title: "Data Sources" };

export default function DataSourcesPage() {
  return (
    <Suspense>
      <DataSourcesView />
    </Suspense>
  );
}
