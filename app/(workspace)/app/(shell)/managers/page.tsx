import type { Metadata } from "next";
import { Suspense } from "react";
import { Page } from "@/components/app/page";
import { ManagersView } from "@/components/workspace/managers-view";
import { getManagers, listProperties } from "@/lib/workspace/queries";
import { requestWorkspace } from "@/lib/workspace/request";

export const metadata: Metadata = { title: "Managers" };

export default function ManagersPage() {
  return (
    <Suspense>
      <Managers />
    </Suspense>
  );
}

async function Managers() {
  const ws = await requestWorkspace();
  const [properties, { uploaders, invites }] = await Promise.all([listProperties(ws), getManagers(ws)]);
  return (
    <Page title="Managers" subtitle="Property managers who upload monthly reports for your properties">
      <ManagersView properties={properties} uploaders={uploaders} invites={invites} canEdit={ws.role === "owner"} />
    </Page>
  );
}
