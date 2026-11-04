import { Suspense } from "react";
import { ProjectPage } from "@/components/wireframe-v2/renovations";
import { PROJECTS } from "@/components/wireframe-v2/seed";

export function generateStaticParams() {
  return PROJECTS.map((x) => ({ id: x.id }));
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
  return <ProjectPage id={p.id} />;
}
