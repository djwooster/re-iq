import type { Metadata } from "next";
import { Suspense } from "react";
import { ManagersView } from "@/components/workspace/managers-view";
import { RealDataNotice } from "@/components/workspace/real-data-notice";
import { getViewer } from "@/lib/auth/access";
import { getWorkspace } from "@/lib/workspace/context";
import { getManagers, listProperties } from "@/lib/workspace/queries";

export const metadata: Metadata = { title: "Property managers" };

export default function ManagersPage() {
  return (
    <Suspense>
      <Managers />
    </Suspense>
  );
}

async function Managers() {
  if ((await getViewer()).kind !== "user") return <RealDataNotice title="Property managers" />;
  const ws = await getWorkspace();
  const [properties, { uploaders, invites }] = await Promise.all([listProperties(ws), getManagers(ws)]);
  return <ManagersView properties={properties} uploaders={uploaders} invites={invites} canEdit={ws.role === "owner"} />;
}
