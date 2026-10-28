"use client";

import { Building2, ChartNoAxesColumn, LayoutGrid, ListChecks } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { UploadReportButton } from "@/components/data-sources/upload-button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FadeIn } from "@/components/ui/motion";
import { hasPortfolio, subscribe } from "@/lib/data";
import { PageBody, PageHeader } from "./page-header";

type Page = "overview" | "performance" | "properties" | "actions";

const EMPTY: Record<Page, { title: string; icon: typeof LayoutGrid; heading: string; description: string }> = {
  overview: {
    title: "Overview",
    icon: LayoutGrid,
    heading: "Start with one property's T12",
    description:
      "Upload the trailing 12-month income statement your property manager sends, in whatever format it comes in. We read it, map the accounts, and build your portfolio overview from it.",
  },
  performance: {
    title: "Performance",
    icon: ChartNoAxesColumn,
    heading: "Nothing to compare yet",
    description: "NOI against budget, variance drivers, and trends appear here once a property has a T12.",
  },
  properties: {
    title: "Properties",
    icon: Building2,
    heading: "No properties yet",
    description: "A property is added when its first T12 is confirmed. Upload one per property; rent rolls and budgets can follow.",
  },
  actions: {
    title: "Actions",
    icon: ListChecks,
    heading: "No actions yet",
    description: "Actions come from the issues and opportunities found in your reports. Upload a T12 to get the first ones.",
  },
};

/** Shows the page once the portfolio has a property; before that, a way to add the first one. */
export function PortfolioGate({ page, children }: { page: Page; children: React.ReactNode }) {
  // The server renders the page as usual; the client swaps in the empty state if there's nothing yet.
  const ready = useSyncExternalStore(subscribe, hasPortfolio, () => true);
  if (ready) return children;
  const { title, icon: Icon, heading, description } = EMPTY[page];
  return (
    <>
      <PageHeader title={title} />
      <PageBody>
        <FadeIn>
          <Card>
            <EmptyState
              className="py-20"
              icon={<Icon className="size-3.5" strokeWidth={1.75} />}
              title={heading}
              description={description}
              action={
                <>
                  <UploadReportButton />
                  <Link
                    href="/app/data-sources"
                    className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg hover:border-border-strong hover:bg-surface-2"
                  >
                    Data Sources
                  </Link>
                </>
              }
            />
          </Card>
        </FadeIn>
      </PageBody>
    </>
  );
}
