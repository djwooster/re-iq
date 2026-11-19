"use client";

import { createContext, useContext } from "react";
import type { Account } from "@/lib/workspace/account";

/** The real signed-in account (null in the demo). Screens show it in place of the sample names. */
const AccountContext = createContext<Account | null>(null);

export function AccountProvider({ account, children }: { account: Account | null; children: React.ReactNode }) {
  return <AccountContext.Provider value={account}>{children}</AccountContext.Provider>;
}

export const useAccount = () => useContext(AccountContext);

export const ROLE_LABELS: Record<Account["role"], string> = { owner: "Owner", member: "Member" };
