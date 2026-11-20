import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AppShell } from "@/components/app/shell";
import { getAccount } from "@/lib/workspace/account";
import { ROLE_LABELS } from "@/lib/workspace/format";

/** The signed-in app. proxy.ts already sends anyone without a dashboard role away; this re-checks. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <Frame>{children}</Frame>
    </Suspense>
  );
}

async function Frame({ children }: { children: React.ReactNode }) {
  await connection();
  const account = await getAccount();
  if (!account) redirect("/login");
  return <AppShell account={{ orgName: account.orgName, name: account.name, email: account.email, roleLabel: ROLE_LABELS[account.role] }}>{children}</AppShell>;
}
