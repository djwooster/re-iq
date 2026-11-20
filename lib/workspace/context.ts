import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AccessDenied, getViewer } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in user's organization, for real-data screens. Every query runs as the user, so
 * row-level security applies on top of these checks. Demo sessions never get here (getViewer
 * decides a demo from cookies, before any Supabase client exists).
 */

export interface Workspace {
  supabase: SupabaseClient;
  userId: string;
  orgId: string;
  orgName: string;
  role: "owner" | "member";
  /** When setup was finished or skipped; null sends the first visit to /app/setup. */
  setupCompletedAt: string | null;
}

/** An owner or member, in their own org (owner first if they belong to several). */
export async function getWorkspace(): Promise<Workspace> {
  const viewer = await getViewer();
  if (viewer.kind !== "user" || viewer.access !== "dashboard") throw new AccessDenied();
  const supabase = await createClient();
  const { data } = await supabase.from("org_members").select("org_id, role, orgs(name, setup_completed_at)").eq("user_id", viewer.userId).in("role", ["owner", "member"]);
  const rows = (data ?? []) as unknown as { org_id: string; role: "owner" | "member"; orgs: { name: string; setup_completed_at: string | null } | null }[];
  const row = rows.find((r) => r.role === "owner") ?? rows[0];
  if (!row) throw new AccessDenied();
  return { supabase, userId: viewer.userId, orgId: row.org_id, orgName: row.orgs?.name ?? "", role: row.role, setupCompletedAt: row.orgs?.setup_completed_at ?? null };
}

export interface UploaderContext {
  supabase: SupabaseClient;
  userId: string;
  /** The owner they're working for now. */
  orgId: string;
  /** Every owner they upload for, by name. */
  orgs: { id: string; name: string }[];
}

/** An uploader, working for one of the owners they upload for: `orgId` if it's one of theirs, else the first by name. */
export async function getUploader(orgId?: string): Promise<UploaderContext> {
  const viewer = await getViewer();
  if (viewer.kind !== "user" || viewer.access !== "uploader") throw new AccessDenied();
  const supabase = await createClient();
  const { data } = await supabase.from("org_members").select("org_id, orgs(name)").eq("user_id", viewer.userId).eq("role", "uploader");
  const orgs = ((data ?? []) as unknown as { org_id: string; orgs: { name: string } | null }[]).map((r) => ({ id: r.org_id, name: r.orgs?.name ?? "" })).sort((a, b) => a.name.localeCompare(b.name));
  if (!orgs.length) throw new AccessDenied();
  return { supabase, userId: viewer.userId, orgId: orgs.find((o) => o.id === orgId)?.id ?? orgs[0].id, orgs };
}

/** Whoever may upload: an owner or member, or an uploader. Which org an upload belongs to comes from its property; the database re-checks access per property. */
export async function getUploadContext(): Promise<{ supabase: SupabaseClient; userId: string }> {
  const viewer = await getViewer();
  if (viewer.kind === "user" && viewer.access === "dashboard") {
    const { supabase, userId } = await getWorkspace();
    return { supabase, userId };
  }
  const { supabase, userId } = await getUploader();
  return { supabase, userId };
}
