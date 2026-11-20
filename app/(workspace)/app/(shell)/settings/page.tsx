import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Settings } from "@/components/app/settings";
import { getAccount } from "@/lib/workspace/account";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <Suspense>
      <Load />
    </Suspense>
  );
}

async function Load() {
  await connection();
  const account = await getAccount();
  if (!account) redirect("/login");
  return <Settings account={account} />;
}
