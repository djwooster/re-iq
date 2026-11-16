import { Suspense } from "react";
import { Financials } from "@/components/prototype/financials";

type Props = { searchParams: Promise<{ concept?: string }> };

export default function Page({ searchParams }: Props) {
  return (
    <Suspense>
      <Inner searchParams={searchParams} />
    </Suspense>
  );
}

async function Inner({ searchParams }: Props) {
  const { concept } = await searchParams;
  return <Financials key={concept ?? "a"} concept={concept === "b" ? "b" : "a"} />;
}
