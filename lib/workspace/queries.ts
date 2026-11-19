import "server-only";
import type { UploaderContext, Workspace } from "./context";

/** Reads for the property, manager and upload screens. All run as the user, under row-level security. */

export interface Property {
  id: string;
  name: string;
  address: string | null;
  unit_count: number | null;
  archived_at: string | null;
}

export interface Upload {
  id: string;
  property_id: string;
  uploaded_by: string | null;
  report_type: string;
  period: string;
  file_name: string;
  size_bytes: number;
  version: number;
  created_at: string;
}

export interface Person {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  property_ids: string[];
  expires_at: string;
  created_at: string;
}

const UPLOAD_COLUMNS = "id, property_id, uploaded_by, report_type, period, file_name, size_bytes, version, created_at";

export async function listProperties(ws: Workspace): Promise<Property[]> {
  const { data } = await ws.supabase.from("properties").select("id, name, address, unit_count, archived_at").eq("org_id", ws.orgId).order("name");
  return (data ?? []) as Property[];
}

export async function getManagers(ws: Workspace) {
  const [people, access, invites] = await Promise.all([
    ws.supabase.rpc("org_people", { target_org: ws.orgId }),
    ws.supabase.from("uploader_property_access").select("user_id, property_id").eq("org_id", ws.orgId),
    ws.role === "owner"
      ? ws.supabase.from("org_invites").select("id, email, property_ids, expires_at, created_at").eq("org_id", ws.orgId).eq("role", "uploader").is("accepted_at", null).is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  const grants = new Map<string, string[]>();
  for (const row of (access.data ?? []) as { user_id: string; property_id: string }[]) grants.set(row.user_id, [...(grants.get(row.user_id) ?? []), row.property_id]);
  const uploaders = ((people.data ?? []) as Person[]).filter((p) => p.role === "uploader").map((p) => ({ ...p, property_ids: grants.get(p.user_id) ?? [] }));
  return { uploaders, invites: (invites.data ?? []) as PendingInvite[] };
}

export async function getPropertyReports(ws: Workspace, propertyId: string) {
  const [property, uploads, people] = await Promise.all([
    ws.supabase.from("properties").select("id, name, address, unit_count, archived_at").eq("id", propertyId).eq("org_id", ws.orgId).maybeSingle(),
    ws.supabase.from("uploads").select(UPLOAD_COLUMNS).eq("property_id", propertyId).order("period", { ascending: false }).order("created_at", { ascending: false }),
    ws.supabase.rpc("org_people", { target_org: ws.orgId }),
  ]);
  const names = new Map(((people.data ?? []) as Person[]).map((p) => [p.user_id, p.full_name || p.email]));
  return { property: property.data as Property | null, uploads: (uploads.data ?? []) as Upload[], names: Object.fromEntries(names) as Record<string, string> };
}

/** The properties this uploader may upload to (row-level security returns only their grants). */
export async function getUploaderProperties(ctx: UploaderContext): Promise<Property[]> {
  const { data } = await ctx.supabase.from("properties").select("id, name, address, unit_count, archived_at").eq("org_id", ctx.orgId).is("archived_at", null).order("name");
  return (data ?? []) as Property[];
}

/** Everything this uploader has uploaded for the property, any month. */
export async function getUploaderHistory(ctx: UploaderContext, propertyId: string): Promise<Upload[]> {
  const { data } = await ctx.supabase.from("uploads").select(UPLOAD_COLUMNS).eq("property_id", propertyId).eq("uploaded_by", ctx.userId).order("created_at", { ascending: false });
  return (data ?? []) as Upload[];
}
