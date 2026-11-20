"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { AccessDenied, getViewer } from "@/lib/auth/access";
import { checkLimit } from "@/lib/auth/rate-limit";
import { log } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getUploadContext } from "@/lib/workspace/context";
import { isReportType } from "./report-types";
import { stripMetadata } from "./strip-metadata";
import { ACCEPTED_EXTENSIONS, MAX_UPLOAD_BYTES, REJECTION_MESSAGE, checkFile, extensionOf, isImage, safeFileName } from "./validate";

/**
 * Uploads. The browser can't send 25 MB through our server (Vercel caps request bodies at 4.5 MB),
 * so:
 *  1. startUpload checks access, the rate limit and the org's daily cap, then returns a one-time
 *     signed URL into the private "incoming" bucket, which no client can read.
 *  2. The browser uploads the file there.
 *  3. finalizeUpload reads it back, checks the real contents, strips photo metadata, writes the
 *     result to the private "reports" bucket, records it (record_upload re-checks access), and
 *     deletes the incoming copy whatever happens.
 */

export interface UploadMeta {
  propertyId: string;
  reportType: string;
  period: string; // YYYY-MM
  fileName: string;
}

export type StartResult = { ok: true; uploadId: string; path: string; token: string } | { ok: false; message: string };
export type FinishResult = { ok: true; version: number } | { ok: false; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const NO_ACCESS = "You can't upload to this property. Ask the owner to check your access.";
const TRY_AGAIN = "Something went wrong on our side. Try again shortly.";

function checkMeta(meta: UploadMeta): string | null {
  if (!UUID.test(meta.propertyId)) return NO_ACCESS;
  if (!isReportType(meta.reportType)) return "Choose a report type.";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(meta.period)) return "Choose the month this report covers.";
  if (!(ACCEPTED_EXTENSIONS as readonly string[]).includes(extensionOf(meta.fileName))) return REJECTION_MESSAGE.type_not_allowed;
  return null;
}

const pathFor = (orgId: string, meta: UploadMeta, uploadId: string) => `${orgId}/${meta.propertyId}/${uploadId}/${safeFileName(meta.fileName)}`;

function accessMessage(status: unknown): string | null {
  if (status === "ok") return null;
  if (status === "org_cap") return "Your organization has reached today's upload limit. Try again tomorrow.";
  return NO_ACCESS;
}

export async function startUpload(meta: UploadMeta, size: number): Promise<StartResult> {
  const { supabase, userId, orgId } = await getUploadContext();
  const invalid = checkMeta(meta);
  if (invalid) return { ok: false, message: invalid };
  if (size <= 0) return { ok: false, message: REJECTION_MESSAGE.empty };
  if (size > MAX_UPLOAD_BYTES) return { ok: false, message: REJECTION_MESSAGE.too_large };

  const limit = await checkLimit("upload", userId);
  if (limit === "limited") return { ok: false, message: "You've uploaded a lot in the last hour. Try again later." };
  if (limit === "unavailable") return { ok: false, message: TRY_AGAIN };

  const { data: status } = await supabase.rpc("can_upload", { target_property: meta.propertyId });
  const denied = accessMessage(status);
  if (denied) return { ok: false, message: denied };

  const admin = createAdminClient();
  if (!admin) return { ok: false, message: TRY_AGAIN };
  const uploadId = randomUUID();
  const path = pathFor(orgId, meta, uploadId);
  const { data, error } = await admin.storage.from("incoming").createSignedUploadUrl(path);
  if (error || !data) {
    log.error("upload.sign_failed");
    return { ok: false, message: TRY_AGAIN };
  }
  return { ok: true, uploadId, path, token: data.token };
}

export async function finalizeUpload(meta: UploadMeta, uploadId: string): Promise<FinishResult> {
  const { supabase, orgId } = await getUploadContext();
  const invalid = checkMeta(meta);
  if (invalid || !UUID.test(uploadId)) return { ok: false, message: invalid ?? NO_ACCESS };
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: TRY_AGAIN };
  const path = pathFor(orgId, meta, uploadId);

  try {
    const { data: status } = await supabase.rpc("can_upload", { target_property: meta.propertyId });
    const denied = accessMessage(status);
    if (denied) return { ok: false, message: denied };

    const { data: blob, error: readError } = await admin.storage.from("incoming").download(path);
    if (readError || !blob) return { ok: false, message: "We didn't receive that file. Try again." };
    const original = new Uint8Array(await blob.arrayBuffer());

    const verdict = checkFile(meta.fileName, original);
    if (!verdict.ok) return { ok: false, message: REJECTION_MESSAGE[verdict.reason] };
    const bytes = isImage(verdict.kind) ? stripMetadata(verdict.kind, original) : original;
    const sha256 = createHash("sha256").update(bytes).digest("hex");

    const { error: writeError } = await admin.storage.from("reports").upload(path, bytes, { contentType: verdict.contentType, upsert: false });
    if (writeError) {
      log.error("upload.store_failed");
      return { ok: false, message: TRY_AGAIN };
    }
    const { data: version, error: recordError } = await supabase.rpc("record_upload", {
      upload_id: uploadId,
      target_property: meta.propertyId,
      report_type: meta.reportType,
      period: `${meta.period}-01`,
      file_name: safeFileName(meta.fileName),
      size_bytes: bytes.length,
      content_type: verdict.contentType,
      sha256,
    });
    if (recordError || typeof version !== "number") {
      await admin.storage.from("reports").remove([path]);
      return { ok: false, message: NO_ACCESS };
    }
    revalidatePath("/upload");
    revalidatePath("/app", "layout");
    return { ok: true, version };
  } finally {
    await admin.storage.from("incoming").remove([path]);
  }
}

/**
 * A 60-second download link for one upload, as an attachment. The record lookup and the signed URL
 * both run as the signed-in user, so row-level security and the storage policy decide access:
 * owners and members of the org, or the uploader who uploaded it while they keep access.
 */
export async function downloadUrl(uploadId: string): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const viewer = await getViewer();
  if (viewer.kind !== "user") throw new AccessDenied();
  if (!UUID.test(uploadId)) return { ok: false, message: "That file isn't available." };
  const supabase = await createClient();
  const { data: upload } = await supabase.from("uploads").select("storage_path, file_name").eq("id", uploadId).maybeSingle();
  if (!upload) return { ok: false, message: "That file isn't available." };
  const { data, error } = await supabase.storage.from("reports").createSignedUrl(upload.storage_path as string, 60, { download: upload.file_name as string });
  if (error || !data) return { ok: false, message: "That file isn't available." };
  return { ok: true, url: data.signedUrl };
}
