import { Suspense } from "react";
import { ReportScreen } from "@/components/wireframe/screens";

type Params = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return ["owner", "lp", "lender"].map((id) => ({ id }));
}

export default function Page({ params }: Params) {
  return (
    <Suspense>
      <Report params={params} />
    </Suspense>
  );
}

async function Report({ params }: Params) {
  const { id } = await params;
  return <ReportScreen id={id} />;
}
