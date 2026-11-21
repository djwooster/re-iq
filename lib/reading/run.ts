import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { log } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { MODEL } from "./layout";
import { readReport } from "./read";

/**
 * Reads uploads in the background (after the upload's response, via `after()`), as the service
 * role: no user is waiting, and the result is a draft until an owner or member confirms it.
 * Callers pass upload ids they already know the user may see.
 */

/** Report types the reader handles today, plus "other" (the user wasn't sure; reading says what it is). */
const READABLE_TYPES = new Set(["income_statement", "t12", "ar_aging", "other"]);
const READABLE_FILES = /\.(xlsx|xls|csv)$/i;

export const isReadable = (u: { report_type: string; file_name: string }) => READABLE_TYPES.has(u.report_type) && READABLE_FILES.test(u.file_name);

export async function readUpload(uploadId: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  const { data: upload } = await admin.from("uploads").select("id, org_id, property_id, report_type, file_name, storage_path").eq("id", uploadId).maybeSingle();
  if (!upload || !isReadable(upload)) return;

  // Claim it: only a new upload, or one whose last read failed, is read again.
  const { data: existing } = await admin.from("report_reads").select("status").eq("upload_id", uploadId).maybeSingle();
  if (existing && existing.status !== "failed") return;
  const claim = { upload_id: uploadId, org_id: upload.org_id, property_id: upload.property_id, status: "reading", model: MODEL, error: null };
  const { error: claimError } = existing ? await admin.from("report_reads").update(claim).eq("upload_id", uploadId).eq("status", "failed") : await admin.from("report_reads").insert(claim);
  if (claimError) return;

  const fail = async (event: string, message: string) => {
    log.error(event, { upload: uploadId });
    await admin.from("report_reads").update({ status: "failed", error: message }).eq("upload_id", uploadId);
  };
  if (!process.env.ANTHROPIC_API_KEY) return fail("reading.not_configured", "Reading isn't set up yet.");

  const { data: blob, error: downloadError } = await admin.storage.from("reports").download(upload.storage_path as string);
  if (downloadError || !blob) return fail("reading.download_failed", "We couldn't open this file.");

  try {
    const reading = await readReport(new Anthropic(), upload.file_name as string, new Uint8Array(await blob.arrayBuffer()));
    const { layout, ...rest } = reading;
    await admin
      .from("report_reads")
      .update({
        status: "read",
        report_type: layout.report_type,
        period: layout.period && /^\d{4}-\d{2}$/.test(layout.period) ? `${layout.period}-01` : null,
        result: { ...rest, layout },
        read_at: new Date().toISOString(),
      })
      .eq("upload_id", uploadId);
    log.info("reading.done", { upload: uploadId, ms: reading.ms, input_tokens: reading.usage.input_tokens, output_tokens: reading.usage.output_tokens });
  } catch {
    await fail("reading.failed", "We couldn't read this file. Try again, or check it's the report you meant to send.");
  }
}

/** Starts reading every readable upload of these that hasn't been read (or failed last time). */
export async function readPending(uploadIds: string[]): Promise<void> {
  await Promise.all(uploadIds.map((id) => readUpload(id)));
}
