"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { UploadReportButton } from "@/components/data-sources/upload-button";
import { useApp } from "@/components/shell/app-context";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Tabs } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/empty-state";
import { FadeIn } from "@/components/ui/motion";
import { getCloseTracker, getReconciliation, listImports, listMembers, listPropertyOptions, listReviewFiles } from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
// Connectors are on hold while RE-IQ is upload-only. Restore with a "Connectors" tab.
// import { listConnectors } from "@/lib/data";
// import { Connectors } from "./connectors";
import { CloseTrackerView } from "./close-tracker";
import { ImportDrawer } from "./import-drawer";
import { ImportHistory } from "./import-history";
import { MappingReview } from "./mapping-review";
import { Reconciliation } from "./reconciliation";

type Tab = "close" | "mapping" | "reconciliation" | "files";

/** Stages 2–4 of the close: packages come in, lines map to one chart, files are checked against each other. */
export function DataSourcesView() {
  const { orgId } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedId = params.get("import");
  const tab = (params.get("tab") as Tab) ?? (selectedId ? "files" : "close");

  const { data } = useData(async () => {
    const [tracker, recon, review, imports, options, members] = await Promise.all([
      getCloseTracker(orgId),
      getReconciliation(orgId),
      listReviewFiles(orgId),
      listImports(orgId),
      listPropertyOptions(orgId),
      listMembers(orgId),
    ]);
    return { tracker, recon, review, imports, properties: options.map((o) => o.property), members };
  }, [orgId]);

  const go = (next: { tab?: Tab; import?: string | null }) => {
    const q = new URLSearchParams();
    const t = next.tab ?? tab;
    if (t !== "close") q.set("tab", t);
    if (next.import) q.set("import", next.import);
    router.replace(q.size ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  const late = data?.tracker.managers.filter((m) => m.state !== "complete").length;
  const toConfirm = data?.review.reduce((s, f) => s + f.pending, 0);
  const breaks = data?.recon.flatMap((r) => r.checks).filter((c) => c.state === "break").length;

  return (
    <>
      <PageHeader title="Data Sources" subtitle="The reports your property managers send, mapped to one chart of accounts and checked against each other." actions={<UploadReportButton variant="secondary" />} />
      <PageBody>
        <Tabs
          className="mb-4"
          value={tab}
          onChange={(t) => go({ tab: t })}
          tabs={[
            { id: "close", label: "Close tracker", count: late || undefined },
            { id: "mapping", label: "Mapping review", count: toConfirm || undefined },
            { id: "reconciliation", label: "Reconciliation", count: breaks || undefined },
            { id: "files", label: "All files", count: data?.imports.length },
          ]}
        />
        <FadeIn key={tab}>
          {!data ? (
            <Skeleton className="h-96 w-full rounded-lg" />
          ) : tab === "close" ? (
            <CloseTrackerView tracker={data.tracker} />
          ) : tab === "mapping" ? (
            <MappingReview />
          ) : tab === "reconciliation" ? (
            <Reconciliation recon={data.recon} />
          ) : (
            <ImportHistory imports={data.imports} properties={data.properties} members={data.members} selectedId={selectedId} onSelect={(id) => go({ tab: "files", import: id })} />
          )}
        </FadeIn>
      </PageBody>
      <ImportDrawer importId={selectedId} onClose={() => go({ import: null })} />
    </>
  );
}
