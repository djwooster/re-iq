import { HardHat } from "lucide-react";
import type { Metadata } from "next";
import { EmptyPage } from "@/components/app/page";

export const metadata: Metadata = { title: "Renovations" };

export default function Page() {
  return (
    <EmptyPage
      title="Renovations"
      icon={<HardHat className="size-4" strokeWidth={1.75} />}
      heading="No renovation projects"
      description="Renovation projects and their returns show here once you start one."
    />
  );
}
