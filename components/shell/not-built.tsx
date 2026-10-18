"use client";

import { Hammer } from "lucide-react";
import Link from "next/link";
import { UploadReportButton } from "@/components/data-sources/upload-button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageBody, PageHeader } from "./page-header";

/** Placeholder for a page that is planned but not built in this checkpoint. */
export function NotBuilt({ title, subtitle, description, upload }: { title: string; subtitle: string; description: string; upload?: boolean }) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} actions={upload ? <UploadReportButton /> : undefined} />
      <PageBody>
        <Card>
          <EmptyState
            icon={<Hammer className="size-3.5" strokeWidth={1.75} />}
            title={`${title} is next`}
            description={description}
            action={
              <Link href="/app" className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:border-border-strong">
                Back to Overview
              </Link>
            }
          />
        </Card>
      </PageBody>
    </>
  );
}
