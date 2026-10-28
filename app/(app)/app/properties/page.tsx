import type { Metadata } from "next";
import { PropertiesView } from "@/components/properties/properties-view";
import { PortfolioGate } from "@/components/shell/portfolio-gate";

export const metadata: Metadata = { title: "Properties" };

export default function PropertiesPage() {
  return (
    <PortfolioGate page="properties">
      <PropertiesView />
    </PortfolioGate>
  );
}
