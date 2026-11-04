import { Suspense } from "react";
import { Close } from "@/components/wireframe-v2/close";

type Props = { searchParams: Promise<{ tab?: string }> };

export default function Page({ searchParams }: Props) {
  return (
    <Suspense>
      <Inner searchParams={searchParams} />
    </Suspense>
  );
}

async function Inner({ searchParams }: Props) {
  const { tab } = await searchParams;
  return <Close key={tab ?? ""} initialTab={tab} />;
}
