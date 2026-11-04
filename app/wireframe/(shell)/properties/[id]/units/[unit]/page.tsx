import { Suspense } from "react";
import { Unit } from "@/components/wireframe-v2/properties";
import { PROPERTIES, unitNumbers } from "@/components/wireframe-v2/seed";

export function generateStaticParams() {
  return PROPERTIES.flatMap((x) => unitNumbers().map((unit) => ({ id: x.id, unit })));
}

type Params = { params: Promise<{ id: string; unit: string }> };

export default function Page({ params }: Params) {
  return (
    <Suspense>
      <Inner params={params} />
    </Suspense>
  );
}

async function Inner({ params }: Params) {
  const p = await params;
  return <Unit propertyId={p.id} unit={p.unit} />;
}
