import { CalendarCheck } from "lucide-react";
import type { Metadata } from "next";
import { EmptyPage, LinkButton } from "@/components/app/page";

export const metadata: Metadata = { title: "Leasing and revenue" };

export default function Page() {
  return (
    <EmptyPage
      title="Leasing and revenue"
      icon={<CalendarCheck className="size-4" strokeWidth={1.75} />}
      heading="No leasing data yet"
      description="Occupancy, rents, renewals and loss to lease appear here once rent rolls and box scores are processed."
      action={<LinkButton href="/app/properties" variant="secondary">Upload reports</LinkButton>}
    />
  );
}
