"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getWorkspace } from "./context";
import { sendEmail } from "@/lib/email";
import { readUpload } from "@/lib/reading/run";
import { CHART_OF_ACCOUNTS, KPIS } from "./kpis";

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

const refresh = () => revalidatePath("/app", "layout");

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

const readName = (raw: string) => {
  const name = raw.trim();
  return name && name.length <= 120 ? name : null;
};

/** Setup adds properties by name alone, then uploads to them, so it needs the new id. */
export async function addPropertyNamed(raw: string): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const ws = await getWorkspace();
  if (ws.role !== "owner") return OWNERS_ONLY;
  const name = readName(raw);
  if (!name) return { ok: false, message: "Give the property a name (up to 120 characters)." };
  const { data, error } = await ws.supabase.from("properties").insert({ org_id: ws.orgId, name }).select("id").single();
  if (error || !data) return TRY_AGAIN;
  refresh();
  return { ok: true, id: data.id as string };
}

/** Renames a property and leaves its address and unit count alone. */
export async function renameProperty(id: string, raw: string): Promise<Result> {
  const ws = await getWorkspace();
  if (ws.role !== "owner" || !UUID.test(id)) return OWNERS_ONLY;
  const name = readName(raw);
  if (!name) return { ok: false, message: "Give the property a name (up to 120 characters)." };
  const { error } = await ws.supabase.from("properties").update({ name }).eq("id", id).eq("org_id", ws.orgId);
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
  refresh();
  return { ok: true };
}

/** Finishing or skipping setup; remembered on the org, so it holds on any computer. */
export async function completeSetup(): Promise<Result> {
  const ws = await getWorkspace();
  const { error } = await ws.supabase.rpc("complete_setup", { target_org: ws.orgId });
  if (error) return TRY_AGAIN;
  refresh();
  return { ok: true };
}

export async function renameOrg(name: string): Promise<Result> {
  const ws = await getWorkspace();
  if (ws.role !== "owner") return OWNERS_ONLY;
  const value = name.trim();
  if (!value || value.length > 120) return { ok: false, message: "Enter a name (up to 120 characters)." };
  const { error } = await ws.supabase.rpc("rename_org", { target_org: ws.orgId, new_name: value });
  if (error) return TRY_AGAIN;
  refresh();
  return { ok: true };
}

/**
 * Saves the targets for one scope (all properties, or one property): replaces that scope's rows with the
 * targets that differ from the defaults. Owners only; row-level security re-checks.
 */
export async function saveThresholds(propertyId: string | null, targets: Record<string, string>): Promise<Result> {
  const ws = await getWorkspace();
  if (ws.role !== "owner") return OWNERS_ONLY;
  if (propertyId !== null && !UUID.test(propertyId)) return TRY_AGAIN;
  const rows = Object.entries(targets)
    .filter(([kpi]) => KPIS.some((k) => k.kpi === kpi))
    .map(([kpi, target]) => ({ kpi, target: target.trim() }));
  if (rows.some((r) => !r.target || r.target.length > 200)) return { ok: false, message: "Each target needs some text (up to 200 characters)." };
  const scope = ws.supabase.from("org_thresholds").delete().eq("org_id", ws.orgId);
  const { error: clearError } = await (propertyId ? scope.eq("property_id", propertyId) : scope.is("property_id", null));
  if (clearError) return TRY_AGAIN;
  if (rows.length) {
    const { error } = await ws.supabase.from("org_thresholds").insert(rows.map((r) => ({ org_id: ws.orgId, property_id: propertyId, ...r })));
    if (error) return TRY_AGAIN;
  }
  refresh();
  return { ok: true };
}

/** Confirms what was read from a report, with any accounts the reviewer changed ({ row: account }). */
export async function confirmReportRead(id: string, overrides: Record<string, string>): Promise<Result> {
  const ws = await getWorkspace();
  if (!UUID.test(id)) return TRY_AGAIN;
  const accounts = new Set(["none", ...CHART_OF_ACCOUNTS]);
  const entries = Object.entries(overrides ?? {});
  if (entries.length > 500 || !entries.every(([row, account]) => /^\d{1,6}$/.test(row) && accounts.has(account))) return TRY_AGAIN;
  const { error } = await ws.supabase.rpc("confirm_report_read", { read_id: id, account_overrides: Object.fromEntries(entries) });
  if (error) return TRY_AGAIN;
  refresh();
  return { ok: true };
}

/** Reads a report again after a failed read. The upload must be one the user can see. */
export async function retryReportRead(uploadId: string): Promise<Result> {
  const ws = await getWorkspace();
  if (!UUID.test(uploadId)) return TRY_AGAIN;
  const { data } = await ws.supabase.from("report_reads").select("id").eq("upload_id", uploadId).eq("org_id", ws.orgId).eq("status", "failed").maybeSingle();
  if (!data) return TRY_AGAIN;
  await readUpload(uploadId);
  refresh();
  return { ok: true };
}

export interface CompanyInput {
  /** Null for a company added in this session. */
  id: string | null;
  name: string;
  email: string;
  propertyIds: string[];
}

/**
 * Saves setup's Managers step: the org's companies (added, renamed, removed) and which company
 * manages each property. Companies left out are removed; properties left out have no company.
 */
export async function saveCompanies(input: CompanyInput[]): Promise<Result> {
  const ws = await getWorkspace();
  if (ws.role !== "owner") return OWNERS_ONLY;
  if (!Array.isArray(input) || input.length > 200) return TRY_AGAIN;
  const seen = new Set<string>();
  for (const c of input) {
    const name = c.name?.trim() ?? "";
    const email = c.email?.trim().toLowerCase() ?? "";
    if (!name || name.length > 120) return { ok: false, message: "Give each company a name (up to 120 characters)." };
    if (email && (email.length > 254 || !EMAIL.test(email))) return { ok: false, message: `${name}: that doesn't look like an email address.` };
    if ((c.id && !UUID.test(c.id)) || !c.propertyIds.every((p) => UUID.test(p) && !seen.has(p))) return TRY_AGAIN;
    c.propertyIds.forEach((p) => seen.add(p));
  }

  const { data: existing } = await ws.supabase.from("management_companies").select("id").eq("org_id", ws.orgId);
  const known = new Set(((existing ?? []) as { id: string }[]).map((c) => c.id));
  const ids: string[] = [];
  for (const c of input) {
    const row = { name: c.name.trim(), reports_email: c.email.trim().toLowerCase() || null };
    if (c.id && known.has(c.id)) {
      const { error } = await ws.supabase.from("management_companies").update(row).eq("id", c.id).eq("org_id", ws.orgId);
      if (error) return TRY_AGAIN;
      ids.push(c.id);
    } else {
      const { data, error } = await ws.supabase.from("management_companies").insert({ org_id: ws.orgId, ...row }).select("id").single();
      if (error || !data) return TRY_AGAIN;
      ids.push(data.id as string);
    }
  }

  const { error: clearError } = await ws.supabase.from("properties").update({ management_company_id: null }).eq("org_id", ws.orgId);
  if (clearError) return TRY_AGAIN;
  for (const [i, c] of input.entries()) {
    if (!c.propertyIds.length) continue;
    const { error } = await ws.supabase.from("properties").update({ management_company_id: ids[i] }).eq("org_id", ws.orgId).in("id", c.propertyIds);
    if (error) return TRY_AGAIN;
  }
  const removed = [...known].filter((id) => !ids.includes(id));
  if (removed.length) await ws.supabase.from("management_companies").delete().eq("org_id", ws.orgId).in("id", removed);
  refresh();
  return { ok: true };
}

/**
 * Emails each company's reports address an invite to upload for its properties. An earlier
 * pending invite to the same address is revoked, so only the newest link works.
 */
export async function sendCompanyInvites(companyIds: string[]): Promise<{ id: string; ok: boolean; message?: string }[]> {
  const ws = await getWorkspace();
  if (ws.role !== "owner" || !Array.isArray(companyIds) || companyIds.length > 200 || !companyIds.every((id) => UUID.test(id))) return companyIds.map((id) => ({ id, ok: false, message: OWNERS_ONLY.message }));
  const [{ data: companies }, { data: properties }] = await Promise.all([
    ws.supabase.from("management_companies").select("id, name, reports_email").eq("org_id", ws.orgId).in("id", companyIds),
    ws.supabase.from("properties").select("id, name, management_company_id").eq("org_id", ws.orgId).is("archived_at", null).in("management_company_id", companyIds),
  ]);
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const results = [];
  for (const id of companyIds) {
    const company = (companies ?? []).find((c) => c.id === id) as { id: string; name: string; reports_email: string | null } | undefined;
    const props = ((properties ?? []) as { id: string; name: string; management_company_id: string }[]).filter((p) => p.management_company_id === id);
    if (!company?.reports_email) {
      results.push({ id, ok: false, message: "Add the company's reports email first." });
      continue;
    }
    if (!props.length) {
      results.push({ id, ok: false, message: "This company has no properties." });
      continue;
    }
    const { data: pending } = await ws.supabase.from("org_invites").select("id").eq("org_id", ws.orgId).eq("email", company.reports_email).is("accepted_at", null).is("revoked_at", null);
    for (const p of (pending ?? []) as { id: string }[]) await ws.supabase.rpc("revoke_org_invite", { invite_id: p.id });
    const { data: token, error } = await ws.supabase.rpc("create_org_invite", { target_org: ws.orgId, invite_email: company.reports_email, invite_role: "uploader", property_ids: props.map((p) => p.id) });
    if (error || typeof token !== "string") {
      results.push({ id, ok: false, message: "This address can't be invited. It may belong to an owner's account." });
      continue;
    }
    const names = props.map((p) => p.name).join(", ");
    const sent = await sendEmail({
      to: company.reports_email,
      subject: `${ws.orgName || "An owner"} invited you to send reports on RE-IQ`,
      text: `${ws.orgName || "An owner"} uses RE-IQ to collect monthly reports for ${props.length === 1 ? "" : `${props.length} properties: `}${names}.\n\nCreate your account and upload here:\n${origin}/invite?token=${token}\n\nThe link works once, for ${company.reports_email}, for 7 days. If you already send reports to another owner on RE-IQ, sign in with the same account.`,
    });
    results.push(sent ? { id, ok: true } : { id, ok: false, message: "The invite was created but the email didn't send. Try again." });
  }
  refresh();
  return results;
}
