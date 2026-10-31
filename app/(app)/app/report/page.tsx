import type { Metadata } from "next";
import { ReportView } from "@/components/report/report-view";

export const metadata: Metadata = { title: "Owner report" };

export default function ReportPage() {
  return <ReportView />;
}
