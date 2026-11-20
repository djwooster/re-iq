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
  orgId: string;
}

/** An uploader, in the one org they upload for. */
export async function getUploader(): Promise<UploaderContext> {
  const viewer = await getViewer();
  if (viewer.kind !== "user" || viewer.access !== "uploader") throw new AccessDenied();
  const supabase = await createClient();
  const { data } = await supabase.from("org_members").select("org_id").eq("user_id", viewer.userId).eq("role", "uploader").maybeSingle();
  if (!data) throw new AccessDenied();
  return { supabase, userId: viewer.userId, orgId: data.org_id as string };
}

/** Whoever may upload: an owner or member in their org, or an uploader in theirs. The database re-checks per property. */
export async function getUploadContext(): Promise<UploaderContext> {
  const viewer = await getViewer();
  if (viewer.kind === "user" && viewer.access === "dashboard") {
    const { supabase, userId, orgId } = await getWorkspace();
    return { supabase, userId, orgId };
  }
  return getUploader();
}
