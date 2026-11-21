import "server-only";
import type { UploaderContext, Workspace } from "./context";

/** Reads for the property, manager and upload screens. All run as the user, under row-level security. */

export interface Property {
  id: string;
  name: string;
  address: string | null;
  unit_count: number | null;
  archived_at: string | null;
  management_company_id?: string | null;
}

export interface Company {
  id: string;
  name: string;
  reports_email: string | null;
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
  const { data } = await ws.supabase.from("properties").select("id, name, address, unit_count, archived_at, management_company_id").eq("org_id", ws.orgId).order("name");
  return (data ?? []) as Property[];
}

/** The org's management companies, by name. */
export async function listCompanies(ws: Workspace): Promise<Company[]> {
  const { data } = await ws.supabase.from("management_companies").select("id, name, reports_email").eq("org_id", ws.orgId).order("name");
  return (data ?? []) as Company[];
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

/** Every upload in the org for one month (`period` is YYYY-MM-01), newest first. */
export async function getUploadsForPeriod(ws: Workspace, period: string): Promise<Upload[]> {
  const { data } = await ws.supabase.from("uploads").select(UPLOAD_COLUMNS).eq("org_id", ws.orgId).eq("period", period).order("created_at", { ascending: false });
  return (data ?? []) as Upload[];
}

/** The org's latest uploads, any month. */
export async function getRecentUploads(ws: Workspace, limit = 8): Promise<Upload[]> {
  const { data } = await ws.supabase.from("uploads").select(UPLOAD_COLUMNS).eq("org_id", ws.orgId).order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as Upload[];
}

/** The latest upload of each of these report types, per property (optionally one property). */
export async function getLatestReports(ws: Workspace, types: string[], propertyId?: string): Promise<Upload[]> {
  let query = ws.supabase.from("uploads").select(UPLOAD_COLUMNS).eq("org_id", ws.orgId).in("report_type", types).order("created_at", { ascending: false });
  if (propertyId) query = query.eq("property_id", propertyId);
  const { data } = await query;
  const seen = new Set<string>();
  return ((data ?? []) as Upload[]).filter((u) => {
    const key = `${u.property_id}:${u.report_type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export interface Threshold {
  property_id: string | null;
  kpi: string;
  target: string;
}

/** Saved targets for the org: all-properties rows (property_id null) and per-property overrides. */
export async function getThresholds(ws: Workspace): Promise<Threshold[]> {
  const { data } = await ws.supabase.from("org_thresholds").select("property_id, kpi, target").eq("org_id", ws.orgId);
  return (data ?? []) as Threshold[];
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

export interface ReportRead {
  id: string;
  upload_id: string;
  property_id: string;
  status: "reading" | "read" | "failed" | "confirmed";
  report_type: string | null;
  period: string | null;
  result: import("@/lib/reading/read").Reading | null;
  overrides: Record<string, string>;
  error: string | null;
  uploads: { file_name: string; created_at: string } | null;
}

/** What was read from the org's uploads, newest upload first. */
export async function getReportReads(ws: Workspace): Promise<ReportRead[]> {
  const { data } = await ws.supabase.from("report_reads").select("id, upload_id, property_id, status, report_type, period, result, overrides, error, uploads(file_name, created_at)").eq("org_id", ws.orgId).order("created_at", { ascending: false });
  return (data ?? []) as unknown as ReportRead[];
}

/** Uploads in the org that have never been read, for starting reads. A failed read is retried on request, not on every visit. */
export async function getUnreadUploads(ws: Workspace): Promise<Pick<Upload, "id" | "property_id" | "report_type" | "file_name" | "created_at">[]> {
  const [uploads, reads] = await Promise.all([
    ws.supabase.from("uploads").select("id, property_id, report_type, file_name, created_at").eq("org_id", ws.orgId),
    ws.supabase.from("report_reads").select("upload_id").eq("org_id", ws.orgId),
  ]);
  const done = new Set(((reads.data ?? []) as { upload_id: string }[]).map((r) => r.upload_id));
  return ((uploads.data ?? []) as Pick<Upload, "id" | "property_id" | "report_type" | "file_name" | "created_at">[]).filter((u) => !done.has(u.id));
}

export interface ReportRow extends Upload {
  uploaderName: string | null;
  read: Pick<ReportRead, "id" | "status" | "report_type" | "period"> | null;
}

/** Every upload in the org, newest first, with who sent it and how far reading got. */
export async function getReports(ws: Workspace, limit = 500): Promise<ReportRow[]> {
  const [uploads, reads, people] = await Promise.all([
    ws.supabase.from("uploads").select(UPLOAD_COLUMNS).eq("org_id", ws.orgId).order("created_at", { ascending: false }).limit(limit),
    ws.supabase.from("report_reads").select("id, upload_id, status, report_type, period").eq("org_id", ws.orgId),
    ws.supabase.rpc("org_people", { target_org: ws.orgId }),
  ]);
  const names = new Map(((people.data ?? []) as Person[]).map((p) => [p.user_id, p.full_name || p.email]));
  const byUpload = new Map(((reads.data ?? []) as (Pick<ReportRead, "id" | "status" | "report_type" | "period"> & { upload_id: string })[]).map((r) => [r.upload_id, r]));
  return ((uploads.data ?? []) as Upload[]).map((u) => ({ ...u, uploaderName: (u.uploaded_by && names.get(u.uploaded_by)) || null, read: byUpload.get(u.id) ?? null }));
}

/** One upload and what was read from it. */
export async function getReport(ws: Workspace, uploadId: string): Promise<{ upload: Upload; read: ReportRead | null } | null> {
  const [upload, read] = await Promise.all([
    ws.supabase.from("uploads").select(UPLOAD_COLUMNS).eq("org_id", ws.orgId).eq("id", uploadId).maybeSingle(),
    ws.supabase.from("report_reads").select("id, upload_id, property_id, status, report_type, period, result, overrides, error, uploads(file_name, created_at)").eq("org_id", ws.orgId).eq("upload_id", uploadId).maybeSingle(),
  ]);
  if (!upload.data) return null;
  return { upload: upload.data as Upload, read: (read.data as unknown as ReportRead | null) ?? null };
}
