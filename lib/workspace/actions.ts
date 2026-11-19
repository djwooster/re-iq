"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getWorkspace } from "./context";

/**
 * Owner actions for properties and property managers (uploaders). Each runs as the signed-in user,
 * so row-level security and the database functions re-check that they own the org.
 */

export type Result = { ok: true } | { ok: false; message: string };
export type InviteResult = { ok: true; url: string } | { ok: false; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OWNERS_ONLY = { ok: false, message: "Only owners can change this." } as const;
const TRY_AGAIN = { ok: false, message: "That didn't save. Try again." } as const;

const PATHS = ["/app/workspace/properties", "/app/workspace/managers"];
const refresh = () => PATHS.forEach((p) => revalidatePath(p));

function readProperty(fd: FormData) {
  const name = String(fd.get("name") ?? "").trim();
  const address = String(fd.get("address") ?? "").trim();
  const units = String(fd.get("unit_count") ?? "").trim();
  if (!name || name.length > 120) return { error: "Give the property a name (up to 120 characters)." } as const;
  if (address.length > 300) return { error: "That address is too long." } as const;
  const unit_count = units === "" ? null : Number(units);
  if (unit_count !== null && (!Number.isInteger(unit_count) || unit_count < 0 || unit_count > 100000)) return { error: "Units should be a whole number." } as const;
  return { value: { name, address: address || null, unit_count } } as const;
}

export async function createProperty(fd: FormData): Promise<Result> {
  const ws = await getWorkspace();
  if (ws.role !== "owner") return OWNERS_ONLY;
  const parsed = readProperty(fd);
  if ("error" in parsed) return { ok: false, message: parsed.error! };
  const { error } = await ws.supabase.from("properties").insert({ org_id: ws.orgId, ...parsed.value });
  if (error) return TRY_AGAIN;
  refresh();
  return { ok: true };
}

export async function updateProperty(id: string, fd: FormData): Promise<Result> {
  const ws = await getWorkspace();
  if (ws.role !== "owner" || !UUID.test(id)) return OWNERS_ONLY;
  const parsed = readProperty(fd);
  if ("error" in parsed) return { ok: false, message: parsed.error! };
  const { error } = await ws.supabase.from("properties").update(parsed.value).eq("id", id).eq("org_id", ws.orgId);
  if (error) return TRY_AGAIN;
  refresh();
  return { ok: true };
}

/** Archiving stops new uploads to the property; its reports stay. */
export async function setPropertyArchived(id: string, archived: boolean): Promise<Result> {
  const ws = await getWorkspace();
  if (ws.role !== "owner" || !UUID.test(id)) return OWNERS_ONLY;
  const { error } = await ws.supabase.from("properties").update({ archived_at: archived ? new Date().toISOString() : null }).eq("id", id).eq("org_id", ws.orgId);
  if (error) return TRY_AGAIN;
  refresh();
  return { ok: true };
}

/** Invites a property manager to upload to the chosen properties. Returns the link, shown once. */
export async function inviteUploader(email: string, propertyIds: string[]): Promise<InviteResult> {
  const ws = await getWorkspace();
  if (ws.role !== "owner") return OWNERS_ONLY;
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254 || !EMAIL.test(normalized)) return { ok: false, message: "That doesn't look like an email address." };
  if (!propertyIds.length || !propertyIds.every((p) => UUID.test(p))) return { ok: false, message: "Choose at least one property." };
  const { data: token, error } = await ws.supabase.rpc("create_org_invite", { target_org: ws.orgId, invite_email: normalized, invite_role: "uploader", property_ids: propertyIds });
  if (error || typeof token !== "string") return { ok: false, message: "This person can't be invited to your organization." };
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  refresh();
  return { ok: true, url: `${origin}/invite?token=${token}` };
}

export async function revokePendingInvite(inviteId: string): Promise<Result> {
  const ws = await getWorkspace();
  if (ws.role !== "owner" || !UUID.test(inviteId)) return OWNERS_ONLY;
  const { error } = await ws.supabase.rpc("revoke_org_invite", { invite_id: inviteId });
  if (error) return TRY_AGAIN;
  refresh();
  return { ok: true };
}

/** Sets exactly which properties an uploader can upload to. Takes effect immediately. */
export async function setUploaderAccess(userId: string, propertyIds: string[]): Promise<Result> {
  const ws = await getWorkspace();
  if (ws.role !== "owner" || !UUID.test(userId) || !propertyIds.every((p) => UUID.test(p))) return OWNERS_ONLY;
  const { error } = await ws.supabase.rpc("set_uploader_access", { target_org: ws.orgId, target_user: userId, property_ids: propertyIds });
  if (error) return TRY_AGAIN;
  refresh();
  return { ok: true };
}

/** Removes an uploader from the organization: all property access and the membership. */
export async function removeUploader(userId: string): Promise<Result> {
  const ws = await getWorkspace();
  if (ws.role !== "owner" || !UUID.test(userId)) return OWNERS_ONLY;
  const { error } = await ws.supabase.rpc("remove_uploader", { target_org: ws.orgId, target_user: userId });
  if (error) return TRY_AGAIN;
  refresh();
  return { ok: true };
}

/** Changes the signed-in person's own name (Supabase user metadata, as set at sign-up). */
export async function updateMyName(name: string): Promise<Result> {
  const ws = await getWorkspace();
  const value = name.trim();
  if (!value || value.length > 100) return { ok: false, message: "Enter your name (up to 100 characters)." };
  const { error } = await ws.supabase.auth.updateUser({ data: { full_name: value } });
  if (error) return TRY_AGAIN;
  revalidatePath("/prototype", "layout");
  return { ok: true };
}
