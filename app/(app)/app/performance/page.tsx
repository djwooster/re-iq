import type { Metadata } from "next";
import { NotBuilt } from "@/components/shell/not-built";

export const metadata: Metadata = { title: "Performance" };

export default function PerformancePage() {
  return (
    <NotBuilt
      title="Performance"
      subtitle="Budget vs. actual by period, driver, and property"
      description="Budget vs. actual with MTD, QTD, YTD, and T12, variance by driver and by property, and trend charts. The Overview already shows the quarter-to-date breakdown."
    />
  );
}
