import type { Metadata } from "next";
import { Suspense } from "react";
import { IssueView } from "@/components/issues/issue-view";
import { getSession, listIssues } from "@/lib/data";

type Params = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  const issues = await listIssues(getSession().org_id);
  return issues.map((i) => ({ id: i.id }));
}

export const metadata: Metadata = { title: "Issue" };

export default function IssuePage({ params }: Params) {
  return (
    <Suspense>
      <Issue params={params} />
    </Suspense>
  );
}

async function Issue({ params }: Params) {
  const { id } = await params;
  return <IssueView id={id} />;
}
