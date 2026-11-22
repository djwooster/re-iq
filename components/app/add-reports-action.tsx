import { Suspense } from "react";
import { AddReportsButton } from "@/components/app/add-reports";
import { closePeriod } from "@/lib/workspace/format";
import { listProperties } from "@/lib/workspace/queries";
import { requestWorkspace } from "@/lib/workspace/request";

/** The Add reports popup for server pages that don't otherwise load properties. */
export function AddReportsAction() {
  return (
    <Suspense>
      <AddReports />
    </Suspense>
  );
}

async function AddReports() {
  const ws = await requestWorkspace();
  const properties = await listProperties(ws);
  return <AddReportsButton properties={properties.filter((p) => !p.archived_at)} period={closePeriod()} variant="secondary" />;
}
