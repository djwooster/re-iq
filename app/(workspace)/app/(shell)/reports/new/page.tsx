import type { Metadata } from "next";
import { Suspense } from "react";
import { Page } from "@/components/app/page";
import { SetupProperties } from "@/components/app/setup-properties";
import { closePeriod } from "@/lib/workspace/format";
import { getUploadsForPeriod, listProperties } from "@/lib/workspace/queries";
import { requestWorkspace } from "@/lib/workspace/request";

export const metadata: Metadata = { title: "Add reports" };

export default function AddReportsPage() {
  return (
    <Suspense>
      <AddReports />
    </Suspense>
  );
}

/** The monthly way in: drop the month's reports, each matched to its property by name, then Review. */
async function AddReports() {
  const ws = await requestWorkspace();
  const period = closePeriod();
  const [properties, uploads] = await Promise.all([listProperties(ws), getUploadsForPeriod(ws, period)]);
  return (
    <Page title="Add reports">
      <SetupProperties properties={properties.filter((p) => !p.archived_at)} uploads={uploads} period={period} inApp />
    </Page>
  );
}
