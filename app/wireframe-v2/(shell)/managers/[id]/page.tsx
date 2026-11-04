import { Suspense } from "react";
import { ManagerPage } from "@/components/wireframe-v2/managers";
import { MANAGERS } from "@/components/wireframe-v2/seed";

export function generateStaticParams() {
  return MANAGERS.map((m) => ({ id: m.id }));
}

type Params = { params: Promise<{ id: string }> };

export default function Page({ params }: Params) {
  return (
    <Suspense>
      <Inner params={params} />
    </Suspense>
  );
}

async function Inner({ params }: Params) {
  const p = await params;
  return <ManagerPage id={p.id} />;
}
