import type { Metadata } from "next";
import { after } from "next/server";
import { Suspense } from "react";
import { SetupFrame } from "@/components/app/setup";
import { SETUP_STEPS, type SetupStep } from "@/lib/workspace/setup-steps";
import { ToastProvider } from "@/components/ui/toast";
import { Review } from "@/components/app/review";
import { SetupProperties } from "@/components/app/setup-properties";
import { SetupLinks } from "@/components/app/setup-links";
import { SetupManagers } from "@/components/app/setup-managers";
import { closePeriod } from "@/lib/workspace/format";
import { isReadable, readPending } from "@/lib/reading/run";
import { getManagers, getReportReads, getUnreadUploads, getUploadsForPeriod, listCompanies, listProperties, type ReportRead } from "@/lib/workspace/queries";
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
  } else if (step === "managers") {
    body = <SetupManagers properties={active} companies={await listCompanies(ws)} />;
  } else {
    const [companies, { uploaders, invites }] = await Promise.all([listCompanies(ws), getManagers(ws)]);
    const rows = companies
      .map((c) => {
        const email = c.reports_email?.toLowerCase() ?? null;
        const sent = invites.filter((i) => i.email === email).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
        return { id: c.id, name: c.name, email, properties: active.filter((p) => p.management_company_id === c.id).length, sentAt: sent?.created_at ?? null, joined: Boolean(email && uploaders.some((u) => u.email.toLowerCase() === email)) };
      })
      .filter((r) => r.properties > 0);
    body = <SetupLinks rows={rows} />;
  }

  return (
    <ToastProvider>
      <SetupFrame step={step} canContinue={active.length > 0} bare={step !== "review"}>
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
