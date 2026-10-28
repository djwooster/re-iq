import type { Metadata } from "next";
import { OverviewView } from "@/components/overview/overview-view";
import { PortfolioGate } from "@/components/shell/portfolio-gate";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  return (
    <PortfolioGate page="overview">
      <OverviewView />
    </PortfolioGate>
  );
}
