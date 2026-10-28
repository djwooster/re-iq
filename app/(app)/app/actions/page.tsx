import type { Metadata } from "next";
import { ActionsView } from "@/components/actions/actions-view";
import { PortfolioGate } from "@/components/shell/portfolio-gate";

export const metadata: Metadata = { title: "Actions" };

export default function ActionsPage() {
  return (
    <PortfolioGate page="actions">
      <ActionsView />
    </PortfolioGate>
  );
}
