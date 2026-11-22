import { Landmark, Percent, PiggyBank } from "lucide-react";
import type { Metadata } from "next";
import { EmptyPage, LinkButton } from "@/components/app/page";

export const metadata: Metadata = { title: "Capital and debt" };

export default function Page() {
  return (
    <EmptyPage
      title="Capital and debt"
      icons={[<Landmark key="Landmark" />, <Percent key="Percent" />, <PiggyBank key="PiggyBank" />]}
      heading="No capital or debt data yet"
      description="Loans, covenants and capital plans appear here once loan and capital reports are processed."
      action={<LinkButton href="/app/properties" variant="secondary">Upload reports</LinkButton>}
    />
  );
}
