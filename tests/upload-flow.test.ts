import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { HAS_TEST_DB, admin, cleanup, makeUser, orgsOf, signedIn, type TestUser } from "./supabase";

/**
 * The real upload actions, end to end against local Supabase: startUpload signs an "incoming" URL,
 * the file goes there as the browser would send it, finalizeUpload validates it, strips photo
 * metadata, stores it in "reports" and records it. Only the session lookup and Next's cache are stubbed.
 */

const ctx = vi.hoisted(() => ({ uploader: null as null | { supabase: unknown; userId: string; orgId: string } }));

vi.mock("@/lib/workspace/context", () => ({ getUploadContext: async () => ctx.uploader }));
vi.mock("@/lib/auth/rate-limit", () => ({ checkLimit: async () => "ok" }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => admin() }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { startUpload, finalizeUpload } = await import("@/lib/uploads/actions");

const GPS = "GPS-SECRET-39.7392N-104.9903W";
const enc = (s: string) => new TextEncoder().encode(s);
function jpegWithGps(): Uint8Array {
  const seg = (marker: number, text: string) => {
    const p = enc(text);
    return [0xff, marker, (p.length + 2) >> 8, (p.length + 2) & 255, ...p];
  };
  return Uint8Array.from([0xff, 0xd8, ...seg(0xe0, "JFIF\0\x01\x01\0\0\x01\0\x01\0\0"), ...seg(0xe1, `Exif\0\0MM\0*${GPS}`), 0xff, 0xda, 0, 8, 1, 1, 0, 0, 63, 0, ...enc("image-data"), 0xff, 0xd9]);
}

describe.skipIf(!HAS_TEST_DB)("upload flow, end to end", () => {
  const users: TestUser[] = [];
  let orgId: string;
  let propertyId: string;
  let uploader: SupabaseClient;
  const browser = () => createClient(process.env.TEST_SUPABASE_URL!, process.env.TEST_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });

  const send = async (fileName: string, body: Uint8Array, reportType = "photos") => {
    const meta = { propertyId, reportType, period: "2026-10", fileName };
    const start = await startUpload(meta, body.length);
    if (!start.ok) return start;
    const sent = await browser().storage.from("incoming").uploadToSignedUrl(start.path, start.token, body);
    expect(sent.error).toBeNull();
    const done = await finalizeUpload(meta, start.uploadId);
    return { ...done, path: start.path };
  };

  beforeAll(async () => {
    const owner = await makeUser("flow-owner", { full_name: "Owner", company: "Flow Org" });
    users.push(owner);
    [{ org_id: orgId }] = await orgsOf(owner.id);
    const asOwner = await signedIn(owner);
    propertyId = (await asOwner.from("properties").insert({ org_id: orgId, name: "Flow Place" }).select("id").single()).data!.id;
    const up = await makeUser("flow-uploader", { full_name: "PM", signup_via: "invite" });
    users.push(up);
    const { data: token } = await asOwner.rpc("create_org_invite", { target_org: orgId, invite_email: up.email, invite_role: "uploader", property_ids: [propertyId] });
    uploader = await signedIn(up);
    await uploader.rpc("accept_org_invite", { raw_token: token });
    ctx.uploader = { supabase: uploader, userId: up.id, orgId };
  });

  afterAll(async () => {
    const { data } = await admin().from("uploads").select("storage_path").eq("org_id", orgId);
    if (data?.length) await admin().storage.from("reports").remove(data.map((r) => r.storage_path as string));
    await cleanup(users, [orgId]);
  });

  it("stores a photo with its GPS data removed, records it, and clears incoming", async () => {
    const result = await send("site visit.jpg", jpegWithGps());
    expect(result).toMatchObject({ ok: true, version: 1 });
    const path = (result as { path: string }).path;

    const stored = new Uint8Array(await (await admin().storage.from("reports").download(path)).data!.arrayBuffer());
    expect(Buffer.from(stored).includes(Buffer.from(GPS))).toBe(false);
    expect(Buffer.from(stored).includes(Buffer.from("image-data"))).toBe(true);

    const { data: rows } = await uploader.from("uploads").select("file_name, content_type, report_type, period, sha256, status");
    expect(rows).toEqual([expect.objectContaining({ file_name: "site visit.jpg", content_type: "image/jpeg", report_type: "photos", period: "2026-10-01", status: "received" })]);
    expect((await admin().storage.from("incoming").download(path)).data).toBeNull();
  });

  it("rejects a disguised file, stores nothing, and clears incoming", async () => {
    const result = await send("t12.pdf", enc("MZ this is really a program"), "t12");
    expect(result).toMatchObject({ ok: false, message: "This file's contents don't match its type." });
    const path = (result as { path: string }).path;
    expect((await admin().storage.from("reports").download(path)).data).toBeNull();
    expect((await admin().storage.from("incoming").download(path)).data).toBeNull();
  });

  it("refuses to start an upload to a property without access", async () => {
    const meta = { propertyId: "00000000-0000-4000-8000-000000000000", reportType: "t12", period: "2026-10", fileName: "t12.pdf" };
    expect(await startUpload(meta, 100)).toMatchObject({ ok: false });
  });
});
