import type { Metadata } from "next";
import { Suspense } from "react";
import { PropertiesView } from "@/components/workspace/properties-view";
import { RealDataNotice } from "@/components/workspace/real-data-notice";
import { getViewer } from "@/lib/auth/access";
import { getWorkspace } from "@/lib/workspace/context";
import { listProperties } from "@/lib/workspace/queries";

export const metadata: Metadata = { title: "Properties and reports" };

export default function WorkspacePropertiesPage() {
  return (
    <Suspense>
      <Properties />
    </Suspense>
  );
}

async function Properties() {
  if ((await getViewer()).kind !== "user") return <RealDataNotice title="Properties and reports" />;
  const ws = await getWorkspace();
  return <PropertiesView properties={await listProperties(ws)} canEdit={ws.role === "owner"} />;
}
