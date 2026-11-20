import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { UploadView } from "@/components/uploads/upload-view";
import { getViewer } from "@/lib/auth/access";
import { getUploader } from "@/lib/workspace/context";
import { getUploaderHistory, getUploaderProperties } from "@/lib/workspace/queries";

export const metadata: Metadata = { title: "Upload reports" };

type Props = { searchParams: Promise<{ org?: string; property?: string }> };

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
      <div className="mt-1 text-xs text-fg-3">{children}</div>
    </div>
  );
}

async function Upload({ searchParams }: Props) {
  const viewer = await getViewer();
  if (viewer.kind !== "user" || viewer.access !== "uploader") {
    return <Notice title="No workspace yet">Your account isn&apos;t part of a workspace. Ask the person who invited you for a new invite link.</Notice>;
  }
  const { org, property } = await searchParams;
  const ctx = await getUploader(org);
  const properties = await getUploaderProperties(ctx);
  if (!properties.length) {
    const others = ctx.orgs.filter((o) => o.id !== ctx.orgId);
    return (
      <Notice title="No properties yet">
        You don&apos;t have access to any of {ctx.orgs.find((o) => o.id === ctx.orgId)?.name || "this owner"}&apos;s properties right now. Ask them to give you access.
        {others.length > 0 && (
          <span className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
            {others.map((o) => (
              <Link key={o.id} href={`/upload?org=${o.id}`} className="font-medium text-fg underline decoration-fg/20 underline-offset-[3px] hover:decoration-fg/60">
                {o.name}
              </Link>
            ))}
          </span>
        )}
      </Notice>
    );
  }
  const selected = properties.find((p) => p.id === property) ?? properties[0];
  const history = await getUploaderHistory(ctx, selected.id);
  return <UploadView owners={ctx.orgs} ownerId={ctx.orgId} properties={properties} selectedId={selected.id} history={history} />;
}
