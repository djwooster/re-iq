import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { HAS_TEST_DB, admin, cleanup, makeUser, orgsOf, signedIn, type TestUser } from "./supabase";

/**
 * Properties, uploader grants, upload records and the "reports" bucket. The server writes files
 * with the service role after validating them (simulated here with admin uploads); everything a
 * person can see or do is checked as that person.
 */
describe.skipIf(!HAS_TEST_DB)("uploads: access, isolation and storage", () => {
  const users: TestUser[] = [];
  const orgs: string[] = [];
  let ownerA: SupabaseClient;
  let ownerB: SupabaseClient;
  let up1: SupabaseClient;
  let up2: SupabaseClient;
  let up1User: TestUser;
  let orgA: string;
  let orgB: string;
  let p1: string;
  let p2: string;
  let q1: string;

  const insertProperty = async (client: SupabaseClient, org: string, name: string) => {
    const { data, error } = await client.from("properties").insert({ org_id: org, name }).select("id").single();
    if (error) throw error;
    return data.id as string;
  };

  const invited = async (label: string, propertyIds: string[]) => {
    const user = await makeUser(label, { full_name: label, signup_via: "invite" });
    users.push(user);
    const { data: token, error } = await ownerA.rpc("create_org_invite", { target_org: orgA, invite_email: user.email, invite_role: "uploader", property_ids: propertyIds });
    if (error) throw error;
    const client = await signedIn(user);
    expect((await client.rpc("accept_org_invite", { raw_token: token })).data).toBe(orgA);
    return { user, client };
  };

  /** What the server does after validating a file: store it in "reports", then record it as the uploader. */
  const upload = async (client: SupabaseClient, org: string, property: string, fileName = "t12.csv") => {
    const id = randomUUID();
    const path = `${org}/${property}/${id}/${fileName}`;
    const stored = await admin().storage.from("reports").upload(path, new TextEncoder().encode("Account,Amount\nRent,1\n"), { contentType: "text/csv" });
    if (stored.error) throw stored.error;
    const recorded = await client.rpc("record_upload", {
      upload_id: id,
      target_property: property,
      report_type: "t12",
      period: "2026-10-01",
      file_name: fileName,
      size_bytes: 22,
      content_type: "text/csv",
      sha256: "a".repeat(64),
    });
    return { id, path, ...recorded };
  };

  const signedUrl = async (client: SupabaseClient, path: string) => (await client.storage.from("reports").createSignedUrl(path, 60)).data?.signedUrl ?? null;

  beforeAll(async () => {
    const a = await makeUser("upl-owner-a", { full_name: "Owner A", company: "Uploads A" });
    const b = await makeUser("upl-owner-b", { full_name: "Owner B", company: "Uploads B" });
    users.push(a, b);
    [{ org_id: orgA }] = await orgsOf(a.id);
    [{ org_id: orgB }] = await orgsOf(b.id);
    orgs.push(orgA, orgB);
    ownerA = await signedIn(a);
    ownerB = await signedIn(b);
    p1 = await insertProperty(ownerA, orgA, "Maple Court");
    p2 = await insertProperty(ownerA, orgA, "Cedar Flats");
    q1 = await insertProperty(ownerB, orgB, "Other Org Place");
    const one = await invited("uploader-one", [p1]);
    up1 = one.client;
    up1User = one.user;
    up2 = (await invited("uploader-two", [p2])).client;
  });

  afterAll(async () => {
    const { data } = await admin().from("uploads").select("storage_path").in("org_id", orgs);
    const paths = (data ?? []).map((r) => r.storage_path as string);
    if (paths.length) await admin().storage.from("reports").remove(paths);
    await cleanup(users, orgs);
  });

  it("an uploader can upload only to properties they were granted", async () => {
    expect((await up1.rpc("can_upload", { target_property: p1 })).data).toBe("ok");
    expect((await up1.rpc("can_upload", { target_property: p2 })).data).toBe("no_access");
    expect((await up1.rpc("can_upload", { target_property: q1 })).data).toBe("no_access");
    expect((await upload(up1, orgA, p1)).error).toBeNull();
    expect((await upload(up1, orgA, p2)).error).not.toBeNull();
  });

  it("an uploader sees only the properties they were granted", async () => {
    const { data } = await up1.from("properties").select("id");
    expect(data?.map((p) => p.id)).toEqual([p1]);
  });

  it("an uploader sees and downloads only their own files", async () => {
    const mine = await upload(up1, orgA, p1, "mine.csv");
    const theirs = await upload(up2, orgA, p2, "theirs.csv");
    expect((await up1.from("uploads").select("id")).data?.map((u) => u.id)).toContain(mine.id);
    expect((await up1.from("uploads").select("id")).data?.map((u) => u.id)).not.toContain(theirs.id);
    expect(await signedUrl(up1, mine.path)).not.toBeNull();
    expect(await signedUrl(up1, theirs.path)).toBeNull();
    expect(await signedUrl(up2, mine.path)).toBeNull();
  });

  it("owners see every upload in their org; another org sees nothing", async () => {
    const file = await upload(up1, orgA, p1, "owner-view.csv");
    expect((await ownerA.from("uploads").select("id")).data?.map((u) => u.id)).toContain(file.id);
    expect(await signedUrl(ownerA, file.path)).not.toBeNull();

    expect((await ownerB.from("uploads").select("id").eq("org_id", orgA)).data).toEqual([]);
    expect((await ownerB.from("properties").select("id").eq("org_id", orgA)).data).toEqual([]);
    expect((await ownerB.from("uploader_property_access").select("user_id").eq("org_id", orgA)).data).toEqual([]);
    expect(await signedUrl(ownerB, file.path)).toBeNull();
    expect((await ownerB.storage.from("reports").list(`${orgA}/${p1}`)).data ?? []).toEqual([]);
  });

  it("another org can't add properties or grant access in this org", async () => {
    expect((await ownerB.from("properties").insert({ org_id: orgA, name: "Sneaky" })).error).not.toBeNull();
    expect((await ownerB.rpc("set_uploader_access", { target_org: orgA, target_user: up1User.id, property_ids: [p1, p2] })).error).not.toBeNull();
    expect((await up1.from("properties").insert({ org_id: orgA, name: "Uploader-made" })).error).not.toBeNull();
    expect((await up1.from("properties").update({ name: "Renamed" }).eq("id", p1).select()).data ?? []).toEqual([]);
  });

  it("no client can write to either bucket, or read incoming", async () => {
    const path = `${orgA}/${p1}/${randomUUID()}/direct.csv`;
    for (const client of [up1, ownerA]) {
      expect((await client.storage.from("reports").upload(path, new TextEncoder().encode("x"))).error).not.toBeNull();
      expect((await client.storage.from("incoming").upload(path, new TextEncoder().encode("x"))).error).not.toBeNull();
    }
    await admin().storage.from("incoming").upload(path, new TextEncoder().encode("pending"));
    expect((await up1.storage.from("incoming").download(path)).data).toBeNull();
    expect((await ownerA.storage.from("incoming").download(path)).data).toBeNull();
    await admin().storage.from("incoming").remove([path]);
  });

  it("a record needs its file in place, and the same file name becomes a new version", async () => {
    const missing = await up1.rpc("record_upload", {
      upload_id: randomUUID(),
      target_property: p1,
      report_type: "t12",
      period: "2026-10-01",
      file_name: "never-stored.csv",
      size_bytes: 1,
      content_type: "text/csv",
      sha256: "b".repeat(64),
    });
    expect(missing.error).not.toBeNull();
    expect((await upload(up1, orgA, p1, "versioned.csv")).data).toBe(1);
    expect((await upload(up1, orgA, p1, "versioned.csv")).data).toBe(2);
  });

  it("revoking access takes effect immediately", async () => {
    const file = await upload(up1, orgA, p1, "before-revoke.csv");
    expect((await ownerA.rpc("set_uploader_access", { target_org: orgA, target_user: up1User.id, property_ids: [] })).error).toBeNull();
    expect((await up1.rpc("can_upload", { target_property: p1 })).data).toBe("no_access");
    expect((await upload(up1, orgA, p1, "after-revoke.csv")).error).not.toBeNull();
    expect((await up1.from("uploads").select("id")).data).toEqual([]);
    expect((await up1.from("properties").select("id")).data).toEqual([]);
    expect(await signedUrl(up1, file.path)).toBeNull();
    // The owner still has the file.
    expect(await signedUrl(ownerA, file.path)).not.toBeNull();
  });

  it("removing an uploader ends their membership", async () => {
    expect((await ownerA.rpc("remove_uploader", { target_org: orgA, target_user: up1User.id })).error).toBeNull();
    expect(await orgsOf(up1User.id)).toEqual([]);
  });
});
