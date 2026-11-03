import type { Metadata } from "next";
import { Suspense } from "react";
import { ManagerView } from "@/components/performance/manager-view";
import { getSession, getManagerScores } from "@/lib/data";

type Params = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  const scores = await getManagerScores(getSession().org_id, "qtd");
  return scores.map((s) => ({ id: s.manager.id }));
}

export const metadata: Metadata = { title: "Manager" };

export default function ManagerPage({ params }: Params) {
  return (
    <Suspense>
      <Manager params={params} />
    </Suspense>
  );
}

async function Manager({ params }: Params) {
  const { id } = await params;
  return <ManagerView id={id} />;
}
