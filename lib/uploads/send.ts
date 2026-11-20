import { createClient } from "@/lib/supabase/client";
import { finalizeUpload, startUpload, type UploadMeta } from "./actions";
import { ACCEPTED_EXTENSIONS, MAX_UPLOAD_BYTES, REJECTION_MESSAGE, extensionOf } from "./validate";

export type SendResult = { ok: true; version: number } | { ok: false; message: string };

/** Uploads one file from the browser: quick checks, a signed upload into "incoming", then the server's checks (see actions.ts). */
export async function sendFile(meta: UploadMeta, file: File): Promise<SendResult> {
  if (!(ACCEPTED_EXTENSIONS as readonly string[]).includes(extensionOf(file.name))) return { ok: false, message: REJECTION_MESSAGE.type_not_allowed };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, message: REJECTION_MESSAGE.too_large };
  const start = await startUpload(meta, file.size);
  if (!start.ok) return start;
  const sent = await createClient().storage.from("incoming").uploadToSignedUrl(start.path, start.token, file, { contentType: file.type || "application/octet-stream" });
  if (sent.error) return { ok: false, message: "The upload didn't finish. Check your connection and try again." };
  return finalizeUpload(meta, start.uploadId);
}
