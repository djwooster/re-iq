import { Suspense } from "react";
import { Unit } from "@/components/prototype/properties";
import { EXCEPTIONS } from "@/components/prototype/seed";

/** Prerender the units the exceptions link to; the rest render on request. */
export function generateStaticParams() {
  return EXCEPTIONS.flatMap((e) => (e.drill[3].kind === "Units" ? (e.drill[3].rows ?? []).map((u) => ({ id: e.property, unit: u.replace("Unit ", "") })) : []));
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
