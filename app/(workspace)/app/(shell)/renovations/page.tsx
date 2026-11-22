import { HardHat, PaintRoller, Ruler } from "lucide-react";
import type { Metadata } from "next";
import { EmptyPage } from "@/components/app/page";

export const metadata: Metadata = { title: "Renovations" };

export default function Page() {
  return (
    <EmptyPage
      title="Renovations"
      icons={[<HardHat key="HardHat" />, <Ruler key="Ruler" />, <PaintRoller key="PaintRoller" />]}
      heading="No renovation projects"
      description="Renovation projects and their returns show here once you start one."
    />
  );
}
