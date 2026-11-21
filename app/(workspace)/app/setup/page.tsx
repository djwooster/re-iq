import type { Metadata } from "next";
import { after } from "next/server";
import { Suspense } from "react";
import { SetupFrame } from "@/components/app/setup";
import { SETUP_STEPS, type SetupStep } from "@/lib/workspace/setup-steps";
import { ToastProvider } from "@/components/ui/toast";
import { Review } from "@/components/app/review";
import { SetupProperties } from "@/components/app/setup-properties";
import { ManagersView } from "@/components/workspace/managers-view";
import { closePeriod } from "@/lib/workspace/format";
import { isReadable, readPending } from "@/lib/reading/run";
import { getManagers, getReportReads, getUnreadUploads, getUploadsForPeriod, listProperties, type ReportRead } from "@/lib/workspace/queries";
import { requestWorkspace } from "@/lib/workspace/request";

export const metadata: Metadata = { title: "Set up your workspace" };

type Props = { searchParams: Promise<{ step?: string }> };

export default function SetupPage({ searchParams }: Props) {
  return (
    <Suspense>
      <Setup searchParams={searchParams} />
    </Suspense>
  );
}

/** First-run setup. Every step works on real records. */
async function Setup({ searchParams }: Props) {
  const params = await searchParams;
  const step: SetupStep = SETUP_STEPS.some((s) => s.id === params.step) ? (params.step as SetupStep) : "properties";
  const ws = await requestWorkspace();
  const properties = await listProperties(ws);
  const active = properties.filter((p) => !p.archived_at);
  const canEdit = ws.role === "owner";

  let body: React.ReactNode;
  if (step === "properties") {
    const period = closePeriod();
    body = <SetupProperties properties={active} uploads={await getUploadsForPeriod(ws, period)} period={period} />;
  } else if (step === "review") {
    // Anything uploaded but not read yet (or that failed) starts reading now, in the background.
    const unread = (await getUnreadUploads(ws)).filter(isReadable);
    if (unread.length) after(() => readPending(unread.map((u) => u.id)));
    const reads = await getReportReads(ws);
    body = <Review properties={properties} reads={unread.length ? [...reads, ...placeholders(unread, reads)] : reads} />;
  } else {
    const { uploaders, invites } = await getManagers(ws);
    body = <ManagersView properties={properties} uploaders={uploaders} invites={invites} canEdit={canEdit} />;
  }

  return (
    <ToastProvider>
      <SetupFrame step={step} canContinue={active.length > 0} bare={step === "properties"}>
        {body}
      </SetupFrame>
    </ToastProvider>
  );
}

/** Uploads whose reading starts on this visit show as being read until their record exists. */
function placeholders(unread: Awaited<ReturnType<typeof getUnreadUploads>>, reads: ReportRead[]): ReportRead[] {
  return unread
    .filter((u) => !reads.some((r) => r.upload_id === u.id))
    .map((u) => ({ id: `pending-${u.id}`, upload_id: u.id, property_id: u.property_id, status: "reading", report_type: null, period: null, result: null, overrides: {}, error: null, uploads: { file_name: u.file_name, created_at: u.created_at } }));
}
