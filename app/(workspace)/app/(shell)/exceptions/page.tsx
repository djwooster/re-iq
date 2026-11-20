import { AlertCircle } from "lucide-react";
import type { Metadata } from "next";
import { EmptyPage } from "@/components/app/page";

export const metadata: Metadata = { title: "Exceptions" };

export default function Page() {
  return (
    <EmptyPage
      title="Exceptions"
      icon={<AlertCircle className="size-4" strokeWidth={1.75} />}
      heading="No exceptions"
      description="When a property's numbers cross one of your thresholds, the exception and the evidence behind it show here."
    />
  );
}
