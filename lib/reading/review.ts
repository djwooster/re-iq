import "server-only";
import { after } from "next/server";
import { getReportReads, getUnreadUploads, type ReportRead } from "@/lib/workspace/queries";
import type { Workspace } from "@/lib/workspace/context";
import { isReadable, readPending } from "./run";

/**
 * What the Review screens show: every read in the org, plus uploads never read before, which start
 * reading now (in the background) and show as being read until their record exists.
 */
export async function loadReview(ws: Workspace): Promise<ReportRead[]> {
  const unread = (await getUnreadUploads(ws)).filter(isReadable);
  if (unread.length) after(() => readPending(unread.map((u) => u.id)));
  const reads = await getReportReads(ws);
  const pending: ReportRead[] = unread
    .filter((u) => !reads.some((r) => r.upload_id === u.id))
    .map((u) => ({ id: `pending-${u.id}`, upload_id: u.id, property_id: u.property_id, status: "reading", report_type: null, period: null, result: null, overrides: {}, error: null, uploads: { file_name: u.file_name, created_at: u.created_at } }));
  return [...pending, ...reads];
}
