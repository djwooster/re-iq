import "server-only";
import { AccessDenied } from "@/lib/auth/access";
import { getWorkspace } from "./context";
import type { Person } from "./queries";

/** The signed-in person, their org and its owners and members, for the shell and settings. */

export interface Account {
  name: string;
  email: string;
  role: "owner" | "member";
  orgName: string;
  team: { userId: string; name: string | null; email: string; role: "owner" | "member" }[];
}

/** Null for demo and signed-out visitors. */
export async function getAccount(): Promise<Account | null> {
  let ws;
  try {
    ws = await getWorkspace();
  } catch (e) {
    if (e instanceof AccessDenied) return null;
    throw e;
  }
  const [{ data: auth }, people] = await Promise.all([ws.supabase.auth.getUser(), ws.supabase.rpc("org_people", { target_org: ws.orgId })]);
  const user = auth.user;
  if (!user) return null;
  const team = ((people.data ?? []) as Person[])
    .filter((p): p is Person & { role: "owner" | "member" } => p.role === "owner" || p.role === "member")
    .map((p) => ({ userId: p.user_id, name: p.full_name, email: p.email, role: p.role }));
  return {
    name: String(user.user_metadata?.full_name ?? "").trim(),
    email: user.email ?? "",
    role: ws.role,
    orgName: ws.orgName,
    team,
  };
}
