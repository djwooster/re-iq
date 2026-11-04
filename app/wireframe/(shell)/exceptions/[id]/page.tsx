import { Suspense } from "react";
import { ExceptionDetail } from "@/components/wireframe-v2/exceptions";
import { EXCEPTIONS } from "@/components/wireframe-v2/seed";

export function generateStaticParams() {
  return EXCEPTIONS.map((e) => ({ id: e.id }));
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
  return <ExceptionDetail id={p.id} />;
}
