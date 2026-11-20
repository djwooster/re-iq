import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Settings } from "@/components/app/settings";
import { getAccount } from "@/lib/workspace/account";
import { getThresholds, listProperties } from "@/lib/workspace/queries";
import { requestWorkspace } from "@/lib/workspace/request";

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
  const ws = await requestWorkspace();
  const [properties, thresholds] = await Promise.all([listProperties(ws), getThresholds(ws)]);
  return <Settings account={account} properties={properties} thresholds={thresholds} />;
}
