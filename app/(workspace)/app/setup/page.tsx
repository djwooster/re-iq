import type { Metadata } from "next";
import { Suspense } from "react";
import { SetupFrame } from "@/components/app/setup";
import { SETUP_STEPS, type SetupStep } from "@/lib/workspace/setup-steps";
import { ToastProvider } from "@/components/ui/toast";
import { UploadCard } from "@/components/uploads/upload-view";
import { ManagersView } from "@/components/workspace/managers-view";
import { PropertiesView } from "@/components/workspace/properties-view";
import { getManagers, listProperties } from "@/lib/workspace/queries";
import { requestWorkspace } from "@/lib/workspace/request";

export const metadata: Metadata = { title: "Set up your workspace" };

type Props = { searchParams: Promise<{ step?: string; property?: string }> };

export default function SetupPage({ searchParams }: Props) {
  return (
    <Suspense>
      <Setup searchParams={searchParams} />
    </Suspense>
  );
}

/** The real first-run setup. Every step works on real records, reusing the same screens as the app. */
async function Setup({ searchParams }: Props) {
  const params = await searchParams;
  const step: SetupStep = SETUP_STEPS.some((s) => s.id === params.step) ? (params.step as SetupStep) : "properties";
  const ws = await requestWorkspace();
  const properties = await listProperties(ws);
  const active = properties.filter((p) => !p.archived_at);
  const canEdit = ws.role === "owner";

  let body: React.ReactNode;
  if (step === "properties") body = <PropertiesView properties={properties} canEdit={canEdit} />;
  else if (step === "reports") {
    const selected = active.find((p) => p.id === params.property) ?? active[0];
    body = selected ? <UploadCard properties={active} selectedId={selected.id} propertyHref="/app/setup?step=reports&property=" /> : null;
  } else {
    const { uploaders, invites } = await getManagers(ws);
    body = <ManagersView properties={properties} uploaders={uploaders} invites={invites} canEdit={canEdit} />;
  }

  return (
    <ToastProvider>
      <SetupFrame step={step} canContinue={active.length > 0}>
        {body}
      </SetupFrame>
    </ToastProvider>
  );
}
