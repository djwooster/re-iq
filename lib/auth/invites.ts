"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccessDenied, getViewer } from "./access";
import { INVITE_COOKIE } from "./access-rules";
import { checkLimit } from "./rate-limit";

/**
 * Accepting invitations. Owners create, revoke and manage invites from /app/workspace/managers
 * (lib/workspace/actions.ts). accept_org_invite re-checks everything in the database: a pending,
 * unexpired, unrevoked invite for this user's confirmed email.
 */

export type AcceptResult = { ok: true; orgId: string } | { ok: false };

/**
 * The signed-in invitee accepts. They join the org with the invite's role, get its properties, and
 * no org is created. Invitees sign up with email and password, with signup_via=invite (see signUp),
 * so the sign-up trigger skips creating an org for them.
 */
export async function acceptInvite(token: string): Promise<AcceptResult> {
  const viewer = await getViewer();
  if (viewer.kind !== "user") throw new AccessDenied();
  if ((await checkLimit("acceptInvite", viewer.userId)) !== "ok" || !/^[0-9a-f]{64}$/.test(token)) return { ok: false };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_org_invite", { raw_token: token });
  if (error || typeof data !== "string") return { ok: false };
  return { ok: true, orgId: data };
}

/** The /invite page's Accept button: accepts the invite held in the cookie, then opens the upload page for that owner. */
export async function acceptInviteFromCookie(): Promise<{ ok: false; message: string }> {
  const jar = await cookies();
  const result = await acceptInvite(jar.get(INVITE_COOKIE)?.value ?? "");
  if (!result.ok) return { ok: false, message: "This invite can't be used. It may have expired, been revoked or used already, or be for a different email. Ask for a new one." };
  jar.delete({ name: INVITE_COOKIE, path: "/invite" });
  redirect(`/upload?org=${result.orgId}`);
}
