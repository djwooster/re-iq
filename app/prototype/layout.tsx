import { connection } from "next/server";
import { Suspense } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { AccountProvider } from "@/components/prototype/account";
import { WfStore } from "@/components/prototype/store";
import { getAccount } from "@/lib/workspace/account";

/** State lives here so it carries from sign-in and setup through every screen. */
export default function PrototypeLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <WithAccount>{children}</WithAccount>
    </Suspense>
  );
}

/**
 * Reads the signed-in account per request, so it sits under Suspense. `connection()` keeps it out of
 * prerendering entirely: Supabase checks session expiry with the current time, which can't be prerendered.
 */
async function WithAccount({ children }: { children: React.ReactNode }) {
  await connection();
  const account = await getAccount();
  return (
    <AccountProvider account={account}>
      <WfStore>
        <ToastProvider>{children}</ToastProvider>
      </WfStore>
    </AccountProvider>
  );
}
