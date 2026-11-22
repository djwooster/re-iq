import { ChartNoAxesColumn, FileSpreadsheet, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import { EmptyPage, LinkButton } from "@/components/app/page";

export const metadata: Metadata = { title: "Financials" };

export default function Page() {
  return (
    <EmptyPage
      title="Financials"
      icons={[<FileSpreadsheet key="FileSpreadsheet" />, <ChartNoAxesColumn key="ChartNoAxesColumn" />, <TrendingUp key="TrendingUp" />]}
      heading="No financials yet"
      description="Income statements, budget variance and trends appear here once your reports are processed."
      action={<LinkButton href="/app/properties" variant="secondary">Upload reports</LinkButton>}
    />
  );
}
