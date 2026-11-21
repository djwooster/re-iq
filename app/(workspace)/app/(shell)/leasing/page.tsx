import type { Metadata } from "next";
import { Suspense } from "react";
import { Page } from "@/components/app/page";
import { Pulse } from "@/components/app/pulse";
import { PULSE_REPORTS } from "@/lib/workspace/pulse";
import { getLatestReports, listProperties } from "@/lib/workspace/queries";
import { requestWorkspace } from "@/lib/workspace/request";

export const metadata: Metadata = { title: "Leasing and revenue" };

export default function LeasingPage() {
  return (
    <Suspense>
      <Leasing />
    </Suspense>
  );
}

/** Leasing and revenue. Pulse (Brian's five operating numbers) leads until the rest of the page is ported. */
async function Leasing() {
  const ws = await requestWorkspace();
  const [properties, pulse] = await Promise.all([listProperties(ws), getLatestReports(ws, PULSE_REPORTS)]);
  const active = properties.filter((p) => !p.archived_at);
  return (
    <Page title="Leasing and revenue">
      <Pulse latest={pulse.filter((u) => active.some((p) => p.id === u.property_id))} properties={active.length} />
    </Page>
  );
}
