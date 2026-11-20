import { Landmark } from "lucide-react";
import type { Metadata } from "next";
import { EmptyPage, LinkButton } from "@/components/app/page";

export const metadata: Metadata = { title: "Capital and debt" };

export default function Page() {
  return (
    <EmptyPage
      title="Capital and debt"
      icon={<Landmark className="size-4" strokeWidth={1.75} />}
      heading="No capital or debt data yet"
      description="Loans, covenants and capital plans appear here once loan and capital reports are processed."
      action={<LinkButton href="/app/properties" variant="secondary">Upload reports</LinkButton>}
    />
  );
}
