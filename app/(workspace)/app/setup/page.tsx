import type { Metadata } from "next";
import { Suspense } from "react";
import { SetupFrame } from "@/components/app/setup";
import { SETUP_STEPS, type SetupStep } from "@/lib/workspace/setup-steps";
import { ToastProvider } from "@/components/ui/toast";
import { SetupProperties } from "@/components/app/setup-properties";
import { ManagersView } from "@/components/workspace/managers-view";
import { closePeriod } from "@/lib/workspace/format";
import { getManagers, getUploadsForPeriod, listProperties } from "@/lib/workspace/queries";
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

/** The real first-run setup, following the prototype's. Every step works on real records. */
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
