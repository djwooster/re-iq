import { ChartNoAxesColumn, FileSpreadsheet, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import { AddReportsAction } from "@/components/app/add-reports-action";
import { EmptyPage } from "@/components/app/page";

export const metadata: Metadata = { title: "Financials" };

export default function Page() {
  return (
    <EmptyPage
      title="Financials"
      icons={[<FileSpreadsheet key="FileSpreadsheet" />, <ChartNoAxesColumn key="ChartNoAxesColumn" />, <TrendingUp key="TrendingUp" />]}
      heading="No financials yet"
      description="Income statements, budget variance and trends appear here once your reports are processed."
      action={<AddReportsAction />}
    />
  );
}
