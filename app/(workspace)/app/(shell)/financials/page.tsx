import { ChartNoAxesColumn } from "lucide-react";
import type { Metadata } from "next";
import { EmptyPage, LinkButton } from "@/components/app/page";

export const metadata: Metadata = { title: "Financials" };

export default function Page() {
  return (
    <EmptyPage
      title="Financials"
      icon={<ChartNoAxesColumn className="size-4" strokeWidth={1.75} />}
      heading="No financials yet"
      description="Income statements, budget variance and trends appear here once your reports are processed."
      action={<LinkButton href="/app/properties" variant="secondary">Upload reports</LinkButton>}
    />
  );
}
