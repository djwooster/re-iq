import { ClipboardList, Hammer, Wrench } from "lucide-react";
import type { Metadata } from "next";
import { AddReportsAction } from "@/components/app/add-reports-action";
import { EmptyPage } from "@/components/app/page";

export const metadata: Metadata = { title: "Operations" };

export default function Page() {
  return (
    <EmptyPage
      title="Operations"
      icons={[<Wrench key="Wrench" />, <ClipboardList key="ClipboardList" />, <Hammer key="Hammer" />]}
      heading="No operations data yet"
      description="Work orders, turns and operating expenses appear here once reports are processed."
      action={<AddReportsAction />}
    />
  );
}
