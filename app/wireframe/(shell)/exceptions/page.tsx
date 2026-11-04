import { Suspense } from "react";
import { Exceptions } from "@/components/wireframe-v2/exceptions";

type Props = { searchParams: Promise<{ status?: string }> };

export default function Page({ searchParams }: Props) {
  return (
    <Suspense>
      <Inner searchParams={searchParams} />
    </Suspense>
  );
}

async function Inner({ searchParams }: Props) {
  const { status } = await searchParams;
  return <Exceptions key={status ?? ""} initialStatus={status} />;
}
