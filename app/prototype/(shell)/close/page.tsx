import { Suspense } from "react";
import { Close } from "@/components/prototype/close";

type Props = { searchParams: Promise<{ tab?: string; month?: string }> };

export default function Page({ searchParams }: Props) {
  return (
    <Suspense>
      <Inner searchParams={searchParams} />
    </Suspense>
  );
}

async function Inner({ searchParams }: Props) {
  const { tab, month } = await searchParams;
  return <Close key={`${month ?? ""}-${tab ?? ""}`} initialTab={tab} month={month} />;
}
