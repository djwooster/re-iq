import type { Metadata } from "next";
import { Suspense } from "react";
import { UploadPortal } from "@/components/upload-portal/upload-portal";
import { ToastProvider } from "@/components/ui/toast";

type Params = { params: Promise<{ token: string }> };

export function generateStaticParams() {
  return ["summit-7f3k2q", "harbor-m82xva", "northgate-q4c9tw", "crestline-h6p1rz"].map((token) => ({ token }));
}

export const metadata: Metadata = { title: "Send monthly reports" };

/** A property manager's no-login upload page. Public: the token in the link is the access. */
export default function UploadPage({ params }: Params) {
  return (
    <ToastProvider>
      <Suspense>
        <Portal params={params} />
      </Suspense>
    </ToastProvider>
  );
}

async function Portal({ params }: Params) {
  const { token } = await params;
  return <UploadPortal token={token} />;
}
