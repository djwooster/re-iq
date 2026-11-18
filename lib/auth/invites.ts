"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { AccessDenied, getViewer, requireDashboardUser } from "./access";
import { withinLimit } from "./rate-limit";

/**
 * Invitations. No UI yet: the owner's "Invite uploader" screen and the /invite page call these.
 * The database functions (create_org_invite, accept_org_invite) re-check everything; these
 * wrappers add the session checks and keep tokens out of logs and URLs we store.
 */

export type InviteResult = { ok: true; url: string } | { ok: false };
export type AcceptResult = { ok: true; orgId: string } | { ok: false };

/** An owner invites a property manager (uploader by default). Returns the invite link, shown once. */
export async function createInvite(orgId: string, email: string, role: "uploader" | "member" = "uploader"): Promise<InviteResult> {
  await requireDashboardUser();
  const supabase = await createClient();
  const { data: token, error } = await supabase.rpc("create_org_invite", { target_org: orgId, invite_email: email, invite_role: role });
  if (error || typeof token !== "string") return { ok: false };
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  return { ok: true, url: `${origin}/invite?token=${token}` };
}

/**
 * The signed-in invitee accepts. Their confirmed email must match the invite; they join that org
 * with the invite's role and no org is created. Invitees sign up with email and password, with
 * signup_via=invite (see signUp), so the sign-up trigger skips creating an org for them.
 */
export async function acceptInvite(token: string): Promise<AcceptResult> {
  const viewer = await getViewer();
  if (viewer.kind !== "user") throw new AccessDenied();
  if (!(await withinLimit("acceptInvite", viewer.userId)) || !/^[0-9a-f]{64}$/.test(token)) return { ok: false };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_org_invite", { raw_token: token });
  if (error || typeof data !== "string") return { ok: false };
  return { ok: true, orgId: data };
}
