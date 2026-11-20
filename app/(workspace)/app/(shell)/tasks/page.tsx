import { ListChecks } from "lucide-react";
import type { Metadata } from "next";
import { EmptyPage } from "@/components/app/page";

export const metadata: Metadata = { title: "Tasks" };

export default function Page() {
  return (
    <EmptyPage
      title="Tasks"
      icon={<ListChecks className="size-4" strokeWidth={1.75} />}
      heading="Nothing waiting on you"
      description="Approvals and follow-ups assigned to you show here."
    />
  );
}
