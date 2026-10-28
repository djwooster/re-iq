import type { Metadata } from "next";
import { PerformanceView } from "@/components/performance/performance-view";
import { PortfolioGate } from "@/components/shell/portfolio-gate";

export const metadata: Metadata = { title: "Performance" };

export default function PerformancePage() {
  return (
    <PortfolioGate page="performance">
      <PerformanceView />
    </PortfolioGate>
  );
}
