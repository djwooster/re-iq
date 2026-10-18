"use client";

import { createContext, useContext, useMemo, useState, useSyncExternalStore } from "react";
import { getRole, getSession, setRole, subscribe } from "@/lib/data";
import type { Role, Session } from "@/lib/types";

interface AppContextValue {
  session: Session;
  orgId: string;
  role: Role;
  setRole: (r: Role) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session] = useState(getSession);
  // Role is a client-side demo preference; the server always renders the default.
  const role = useSyncExternalStore(subscribe, getRole, () => "asset_manager" as Role);
  const value = useMemo(() => ({ session, orgId: session.org_id, role, setRole }), [session, role]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export const SHOW_DEV_TOOLS = process.env.NEXT_PUBLIC_SHOW_DEV_TOOLS === "true";
