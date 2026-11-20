import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { EmptyPage, LinkButton } from "@/components/app/page";

export const metadata: Metadata = { title: "Owner report" };

export default function Page() {
  return (
    <EmptyPage
      title="Owner report"
      icon={<FileText className="size-4" strokeWidth={1.75} />}
      heading="No owner report yet"
      description="The owner report comes together here once every property's reports are in for the month."
      action={<LinkButton href="/app/close" variant="secondary">View the close</LinkButton>}
    />
  );
}
