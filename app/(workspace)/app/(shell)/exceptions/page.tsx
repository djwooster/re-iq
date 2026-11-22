import { AlertCircle, Gauge, Search } from "lucide-react";
import type { Metadata } from "next";
import { EmptyPage } from "@/components/app/page";

export const metadata: Metadata = { title: "Exceptions" };

export default function Page() {
  return (
    <EmptyPage
      title="Exceptions"
      icons={[<AlertCircle key="AlertCircle" />, <Gauge key="Gauge" />, <Search key="Search" />]}
      heading="No exceptions"
      description="When a property's numbers cross one of your thresholds, the exception and the evidence behind it show here."
    />
  );
}
