import type { Metadata } from "next";
import { Suspense } from "react";
import { UploadView } from "@/components/uploads/upload-view";
import { getViewer } from "@/lib/auth/access";
import { getUploader } from "@/lib/workspace/context";
import { getUploaderHistory, getUploaderProperties } from "@/lib/workspace/queries";

export const metadata: Metadata = { title: "Upload reports" };

type Props = { searchParams: Promise<{ property?: string }> };

/** Where property managers upload. The proxy sends everyone else elsewhere; this re-checks. */
export default function UploadPage({ searchParams }: Props) {
  return (
    <Suspense>
      <Upload searchParams={searchParams} />
    </Suspense>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="max-w-[420px]">
      <h1 className="text-[15px] font-semibold text-fg">{title}</h1>
      <p className="mt-1 text-xs text-fg-3">{children}</p>
    </div>
  );
}

async function Upload({ searchParams }: Props) {
  const viewer = await getViewer();
  if (viewer.kind !== "user" || viewer.access !== "uploader") {
    return <Notice title="No workspace yet">Your account isn&apos;t part of a workspace. Ask the person who invited you for a new invite link.</Notice>;
  }
  const ctx = await getUploader();
  const properties = await getUploaderProperties(ctx);
  if (!properties.length) {
    return <Notice title="No properties yet">You don&apos;t have access to any properties right now. Ask the owner who invited you to give you access.</Notice>;
  }
  const { property } = await searchParams;
  const selected = properties.find((p) => p.id === property) ?? properties[0];
  const history = await getUploaderHistory(ctx, selected.id);
  return <UploadView properties={properties} selectedId={selected.id} history={history} />;
}
