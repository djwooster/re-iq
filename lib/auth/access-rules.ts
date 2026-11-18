import type { SupabaseClient } from "@supabase/supabase-js";

export type Role = "owner" | "member" | "uploader";

/** What a signed-in user may open: the dashboards, the uploader page, or nothing yet. */
export type Access = "dashboard" | "uploader" | "none";

/** Signed in through Google or Microsoft (the JWT's amr claim records how the session started). */
export function viaOAuth(claims: { amr?: unknown } | null | undefined): boolean {
  return Array.isArray(claims?.amr) && claims.amr.some((m) => (m as { method?: string })?.method === "oauth");
}

/**
 * Owners and members get the dashboards. Uploaders get the uploader page, but only with an
 * email-and-password session: an uploader membership grants nothing through Google or Microsoft.
 */
export function resolveAccess(roles: Role[], oauth: boolean): Access {
  if (roles.some((r) => r === "owner" || r === "member")) return "dashboard";
  if (!oauth && roles.includes("uploader")) return "uploader";
  return "none";
}

/** The signed-in user's roles across their orgs. RLS returns only their own membership rows. */
export async function fetchRoles(supabase: SupabaseClient, userId: string): Promise<Role[]> {
  const { data } = await supabase.from("org_members").select("role").eq("user_id", userId);
  return (data ?? []).map((r) => r.role as Role);
}

export const HOME: Record<Access, string> = { dashboard: "/app", uploader: "/upload", none: "/upload" };
