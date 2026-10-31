"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/components/shell/app-context";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/empty-state";
import { FadeIn } from "@/components/ui/motion";
import { LATEST_MONTH, formatDate, monthEnd } from "@/lib/dates";
import { listImports, listMembers, listProperties } from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
// Connectors are on hold while RE-IQ is upload-only. Restore these with the section below.
// import { listConnectors } from "@/lib/data";
// import { Connectors } from "./connectors";
import { ImportDrawer } from "./import-drawer";
import { ImportHistory } from "./import-history";
import { UploadFlow } from "./upload-flow";

export function DataSourcesView() {
  const { orgId } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedId = params.get("import");

  const { data } = useData(async () => {
    const [imports, properties, members] = await Promise.all([listImports(orgId), listProperties(orgId), listMembers(orgId)]);
    return { imports, properties: properties.map((p) => p.property), members };
  }, [orgId]);

  const select = (id: string | null) => router.replace(id ? `${pathname}?import=${id}` : pathname, { scroll: false });
  const current = data?.properties.filter((p) => p.data_through === monthEnd(LATEST_MONTH)).length ?? 0;

  return (
    <>
      <PageHeader title="Data Sources" subtitle="Upload the reports your property managers already send. Any system's exports work." />
      <PageBody>
        <div className="flex flex-col gap-6">
          <FadeIn>
            <section id="upload" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
              <UploadFlow />
              <Card className="flex flex-col gap-3 p-4 text-xs">
                <div>
                  <div className="eyebrow mb-1.5">Coverage</div>
                  {data ? (
                    <p className="text-fg-2">
                      <span className="num text-fg">{current}</span> of <span className="num text-fg">{data.properties.length}</span> properties have data through{" "}
                      {formatDate(monthEnd(LATEST_MONTH))}.
                    </p>
                  ) : (
                    <Skeleton className="h-4 w-40" />
                  )}
                </div>
                <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-fg-3">
                  Yardi, ResMan, Rent Manager, Entrata, and AppFolio exports all land in one chart of accounts, so numbers compare across managers. See what September still needs on{" "}
                  <Link href="/app/close" className="text-fg-2 underline-offset-2 hover:text-fg hover:underline">
                    Close
                  </Link>
                  .
                </p>
              </Card>
            </section>
          </FadeIn>

          <FadeIn delay={0.06}>
            {data ? (
              <ImportHistory imports={data.imports} properties={data.properties} members={data.members} selectedId={selectedId} onSelect={select} />
            ) : (
              <Skeleton className="h-64 w-full rounded-lg" />
            )}
          </FadeIn>

          {/* Connectors are on hold while RE-IQ is upload-only.
          <FadeIn delay={0.1}>
            <section id="connectors">
              <div className="mb-3">
                <h2 className="text-[13px] font-semibold text-fg">Connectors</h2>
                <p className="mt-0.5 text-xs text-fg-3">Optional. A direct connection saves the monthly upload where a property manager&apos;s system supports it.</p>
              </div>
              {data ? <Connectors connectors={data.connectors} /> : <Skeleton className="h-40 w-full rounded-lg" />}
            </section>
          </FadeIn>
          */}
        </div>
      </PageBody>
      <ImportDrawer importId={selectedId} onClose={() => select(null)} />
    </>
  );
}
