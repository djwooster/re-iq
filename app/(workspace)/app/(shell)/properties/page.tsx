import type { Metadata } from "next";
import { Suspense } from "react";
import { Page } from "@/components/app/page";
import { PropertiesView } from "@/components/workspace/properties-view";
import { listProperties } from "@/lib/workspace/queries";
import { requestWorkspace } from "@/lib/workspace/request";

export const metadata: Metadata = { title: "Properties" };

export default function PropertiesPage() {
  return (
    <Suspense>
      <Properties />
    </Suspense>
  );
}

async function Properties() {
  const ws = await requestWorkspace();
  const properties = await listProperties(ws);
  const active = properties.filter((p) => !p.archived_at).length;
  return (
    <Page title="Properties" subtitle={active ? `${active} active ${active === 1 ? "property" : "properties"}` : undefined}>
      <PropertiesView properties={properties} canEdit={ws.role === "owner"} />
    </Page>
  );
}
