import "server-only";
import * as Sentry from "@sentry/nextjs";
import { AUTH_ENABLED } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { fetchMemberships, resolveAccess, viaOAuth, type Access } from "./access-rules";

/** Who is asking. */
export type Viewer = { kind: "anonymous" } | { kind: "user"; userId: string; access: Access };

export async function getViewer(): Promise<Viewer> {
  if (!AUTH_ENABLED) return { kind: "anonymous" };
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return { kind: "anonymous" };
  const memberships = await fetchMemberships(supabase, userId);
  // Errors in this request carry the user ID, and the org ID when there's exactly one. Never names or emails.
  Sentry.setUser({ id: userId });
  Sentry.setTag("org_id", memberships.length === 1 ? memberships[0].orgId : undefined);
  return { kind: "user", userId, access: resolveAccess(memberships.map((m) => m.role), viaOAuth(data.claims)) };
}

export class AccessDenied extends Error {
  constructor() {
    super("Access denied");
  }
}

/**
 * Guard for every server function that reads or writes real org data: a signed-in owner or member.
 * Uploaders and anonymous callers are refused before any query runs.
 */
export async function requireDashboardUser(): Promise<{ userId: string }> {
  const viewer = await getViewer();
  if (viewer.kind !== "user" || viewer.access !== "dashboard") throw new AccessDenied();
  return { userId: viewer.userId };
}

/** Guard for uploader-only server functions (the upload page, later). */
export async function requireUploader(): Promise<{ userId: string }> {
  const viewer = await getViewer();
  if (viewer.kind !== "user" || viewer.access !== "uploader") throw new AccessDenied();
  return { userId: viewer.userId };
}
