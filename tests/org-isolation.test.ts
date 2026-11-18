import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { HAS_TEST_DB, admin, cleanup, makeUser, orgsOf, signedIn, type TestUser } from "./supabase";

/** Signed in as a user in Org A, nothing about Org B is readable or writable. */
describe.skipIf(!HAS_TEST_DB)("org isolation (RLS)", () => {
  const users: TestUser[] = [];
  let a: TestUser;
  let orgA: string;
  let orgB: string;
  let asA: SupabaseClient;

  beforeAll(async () => {
    a = await makeUser("a", { full_name: "User A", company: "Org A" });
    const b = await makeUser("b", { full_name: "User B", company: "Org B" });
    users.push(a, b);
    [{ org_id: orgA }] = await orgsOf(a.id);
    [{ org_id: orgB }] = await orgsOf(b.id);
    asA = await signedIn(a);
  });

  afterAll(() => cleanup(users, [orgA, orgB].filter(Boolean)));

  it("sign-up made each user the owner of a new org", async () => {
    expect(await orgsOf(a.id)).toEqual([{ org_id: orgA, role: "owner" }]);
    expect(orgA).not.toEqual(orgB);
  });

  it("reads only its own org", async () => {
    const { data } = await asA.from("orgs").select("id");
    expect(data?.map((o) => o.id)).toEqual([orgA]);
  });

  it("can't read Org B or its memberships", async () => {
    expect((await asA.from("orgs").select("id").eq("id", orgB)).data).toEqual([]);
    expect((await asA.from("org_members").select("user_id").eq("org_id", orgB)).data).toEqual([]);
  });

  it("can't insert itself into Org B", async () => {
    const { error } = await asA.from("org_members").insert({ org_id: orgB, user_id: a.id, role: "owner" });
    expect(error).not.toBeNull();
    expect((await orgsOf(a.id)).map((m) => m.org_id)).toEqual([orgA]);
  });

  it("can't change its own role", async () => {
    await asA.from("org_members").update({ role: "member" }).eq("user_id", a.id);
    expect((await orgsOf(a.id))[0].role).toBe("owner");
  });

  it("can't create orgs, delete its membership, or rename its org", async () => {
    expect((await asA.from("orgs").insert({ name: "Sneaky" })).error).not.toBeNull();
    await asA.from("org_members").delete().eq("user_id", a.id);
    await asA.from("orgs").update({ name: "Renamed" }).eq("id", orgA);
    expect(await orgsOf(a.id)).toHaveLength(1);
    expect((await admin().from("orgs").select("name").eq("id", orgA).single()).data?.name).toBe("Org A");
  });

  it("can't invite into Org B, write invites directly, or read Org B's invites", async () => {
    expect((await asA.rpc("create_org_invite", { target_org: orgB, invite_email: "x@example.test" })).error).not.toBeNull();
    expect((await asA.from("org_invites").insert({ org_id: orgA, email: "x@example.test", token_hash: "f".repeat(64) })).error).not.toBeNull();
    expect((await asA.from("org_invites").select("id").eq("org_id", orgB)).data).toEqual([]);
  });

  it("an invited uploader joins Org A without creating an org, and isn't a dashboard reader", async () => {
    const c = await makeUser("c", { full_name: "Uploader C", signup_via: "invite" });
    users.push(c);
    expect(await orgsOf(c.id)).toEqual([]);

    const { data: token, error } = await asA.rpc("create_org_invite", { target_org: orgA, invite_email: c.email, invite_role: "uploader" });
    expect(error).toBeNull();

    const asC = await signedIn(c);
    expect((await asC.rpc("accept_org_invite", { raw_token: token })).data).toBe(orgA);
    expect(await orgsOf(c.id)).toEqual([{ org_id: orgA, role: "uploader" }]);
    expect((await asC.rpc("is_org_reader", { target_org: orgA })).data).toBe(false);

    // One use only.
    expect((await asC.rpc("accept_org_invite", { raw_token: token })).error).not.toBeNull();
  });

  it("an invite can't be accepted by a different email", async () => {
    const { data: token } = await asA.rpc("create_org_invite", { target_org: orgA, invite_email: "someone-else@example.test" });
    const d = await makeUser("d", { full_name: "User D", company: "Org D" });
    users.push(d);
    const asD = await signedIn(d);
    expect((await asD.rpc("accept_org_invite", { raw_token: token })).error).not.toBeNull();
    const dOrgs = await orgsOf(d.id);
    expect(dOrgs.map((m) => m.org_id)).not.toContain(orgA);
    await admin().from("orgs").delete().in("id", dOrgs.map((m) => m.org_id));
  });
});
