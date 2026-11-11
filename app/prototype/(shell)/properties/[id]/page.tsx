import { Suspense } from "react";
import { Scorecard } from "@/components/prototype/properties";
import { PROPERTIES } from "@/components/prototype/seed";

export function generateStaticParams() {
  return PROPERTIES.map((x) => ({ id: x.id }));
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
  return <Scorecard id={p.id} />;
}
