import { CircleCheck, FileText, Send } from "lucide-react";
import type { Metadata } from "next";
import { EmptyPage, LinkButton } from "@/components/app/page";

export const metadata: Metadata = { title: "Owner report" };

export default function Page() {
  return (
    <EmptyPage
      title="Owner report"
      icons={[<FileText key="FileText" />, <CircleCheck key="CircleCheck" />, <Send key="Send" />]}
      heading="No owner report yet"
      description="The owner report comes together here once every property's reports are in for the month."
      action={<LinkButton href="/app/close" variant="secondary">View the close</LinkButton>}
    />
  );
}
