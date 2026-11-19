import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { HAS_TEST_DB, admin, cleanup, makeUser, orgsOf, signedIn, type TestUser } from "./supabase";

/** Invites are bound to the invited email, expire, can be revoked, and work once. */
describe.skipIf(!HAS_TEST_DB)("invites", () => {
  const users: TestUser[] = [];
  const orgs: string[] = [];
  let owner: SupabaseClient;
  let orgId: string;

  const invitee = async (label: string) => {
    const u = await makeUser(label, { full_name: label, signup_via: "invite" });
    users.push(u);
    return { user: u, client: await signedIn(u) };
  };
  const invite = async (email: string) => {
    const { data, error } = await owner.rpc("create_org_invite", { target_org: orgId, invite_email: email, invite_role: "uploader" });
    expect(error).toBeNull();
    return data as string;
  };
  const inviteId = async (email: string) => (await admin().from("org_invites").select("id").eq("email", email).is("accepted_at", null).single()).data!.id as string;

  beforeAll(async () => {
    const o = await makeUser("owner", { full_name: "Owner", company: "Invite Org" });
    users.push(o);
    [{ org_id: orgId }] = await orgsOf(o.id);
    orgs.push(orgId);
    owner = await signedIn(o);
  });
  afterAll(() => cleanup(users, orgs));

  it("stores the email lowercased and trimmed, and matches it case-insensitively", async () => {
    const { user, client } = await invitee("case");
    const token = await invite(`  ${user.email.toUpperCase()}  `);
    expect((await admin().from("org_invites").select("email").eq("email", user.email)).data).toHaveLength(1);
    expect((await client.rpc("accept_org_invite", { raw_token: token })).data).toBe(orgId);
  });

  it("fails for a different email", async () => {
    const { client } = await invitee("wrong");
    const token = await invite("someone-else@example.test");
    expect((await client.rpc("accept_org_invite", { raw_token: token })).error).not.toBeNull();
  });

  it("fails once expired", async () => {
    const { user, client } = await invitee("expired");
    const token = await invite(user.email);
    await admin().from("org_invites").update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq("email", user.email);
    expect((await client.rpc("accept_org_invite", { raw_token: token })).error).not.toBeNull();
    expect(await orgsOf(user.id)).toEqual([]);
  });

  it("fails once revoked; only an owner of the org can revoke, and only once", async () => {
    const { user, client } = await invitee("revoked");
    const token = await invite(user.email);
    const id = await inviteId(user.email);
    expect((await client.rpc("revoke_org_invite", { invite_id: id })).error).not.toBeNull();
    expect((await owner.rpc("revoke_org_invite", { invite_id: id })).data).toBe(true);
    expect((await owner.rpc("revoke_org_invite", { invite_id: id })).data).toBe(false);
    expect((await client.rpc("accept_org_invite", { raw_token: token })).error).not.toBeNull();
    expect(await orgsOf(user.id)).toEqual([]);
  });

  it("fails on reuse", async () => {
    const { user, client } = await invitee("reuse");
    const token = await invite(user.email);
    expect((await client.rpc("accept_org_invite", { raw_token: token })).data).toBe(orgId);
    expect((await client.rpc("accept_org_invite", { raw_token: token })).error).not.toBeNull();
  });
});
