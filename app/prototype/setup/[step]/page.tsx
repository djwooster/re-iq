import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Setup } from "@/components/prototype/setup";
import { STEPS, type StepId } from "@/components/prototype/setup-steps";

export function generateStaticParams() {
  return STEPS.map((s) => ({ step: s.id }));
}

type Params = { params: Promise<{ step: string }> };

export default function Page({ params }: Params) {
  return (
    <Suspense>
      <Inner params={params} />
    </Suspense>
  );
}

async function Inner({ params }: Params) {
  const { step } = await params;
  if (!STEPS.some((s) => s.id === step)) notFound();
  return <Setup step={step as StepId} />;
}
