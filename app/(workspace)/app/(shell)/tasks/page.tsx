import { CalendarCheck, ListChecks, UserCheck } from "lucide-react";
import type { Metadata } from "next";
import { EmptyPage } from "@/components/app/page";

export const metadata: Metadata = { title: "Tasks" };

export default function Page() {
  return (
    <EmptyPage
      title="Tasks"
      icons={[<ListChecks key="ListChecks" />, <UserCheck key="UserCheck" />, <CalendarCheck key="CalendarCheck" />]}
      heading="Nothing waiting on you"
      description="Approvals and follow-ups assigned to you show here."
    />
  );
}
