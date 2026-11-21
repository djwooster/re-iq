import type { Metadata } from "next";
import { Suspense } from "react";
import { LinkButton, Page } from "@/components/app/page";
import { Review } from "@/components/app/review";
import { loadReview } from "@/lib/reading/review";
import { listProperties } from "@/lib/workspace/queries";
import { requestWorkspace } from "@/lib/workspace/request";

export const metadata: Metadata = { title: "Review" };

export default function ReviewPage() {
  return (
    <Suspense>
      <ReviewReports />
    </Suspense>
  );
}

/** What RE-IQ read from each report, to check and confirm. */
async function ReviewReports() {
  const ws = await requestWorkspace();
  const [properties, reads] = await Promise.all([listProperties(ws), loadReview(ws)]);
  return (
    <Page title="Review" subtitle="Nothing counts toward your numbers until you confirm it." actions={<LinkButton href="/app/reports/new">Add reports</LinkButton>}>
      <Review properties={properties} reads={reads} />
    </Page>
  );
}
