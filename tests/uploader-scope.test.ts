import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { HAS_TEST_DB, admin, cleanup, makeUser, orgsOf, signedIn, type TestUser } from "./supabase";

/** An uploader belongs to one org only, and no account is both an uploader and an owner/member. */
describe.skipIf(!HAS_TEST_DB)("one org per uploader", () => {
  const users: TestUser[] = [];
  const orgs: string[] = [];
  let ownerA: SupabaseClient;
  let ownerB: SupabaseClient;
  let orgA: string;
  let orgB: string;
  let uploader: TestUser;
  let ownerBUser: TestUser;

  beforeAll(async () => {
    const a = await makeUser("scope-a", { full_name: "Owner A", company: "Scope A" });
    ownerBUser = await makeUser("scope-b", { full_name: "Owner B", company: "Scope B" });
    users.push(a, ownerBUser);
    [{ org_id: orgA }] = await orgsOf(a.id);
    [{ org_id: orgB }] = await orgsOf(ownerBUser.id);
    orgs.push(orgA, orgB);
    ownerA = await signedIn(a);
    ownerB = await signedIn(ownerBUser);

    uploader = await makeUser("scope-up", { full_name: "Uploader", signup_via: "invite" });
    users.push(uploader);
    const { data: token } = await ownerA.rpc("create_org_invite", { target_org: orgA, invite_email: uploader.email });
    expect((await (await signedIn(uploader)).rpc("accept_org_invite", { raw_token: token })).data).toBe(orgA);
  });
  afterAll(() => cleanup(users, orgs));

  it("an uploader in Org A can't be invited to Org B, as uploader or member", async () => {
    for (const role of ["uploader", "member"]) {
      expect((await ownerB.rpc("create_org_invite", { target_org: orgB, invite_email: uploader.email, invite_role: role })).error).not.toBeNull();
    }
  });

  it("the database refuses a second org or an owner role for an uploader, whoever writes it", async () => {
    expect((await admin().from("org_members").insert({ org_id: orgB, user_id: uploader.id, role: "uploader" })).error).not.toBeNull();
    expect((await admin().from("org_members").insert({ org_id: orgB, user_id: uploader.id, role: "member" })).error).not.toBeNull();
    expect(await orgsOf(uploader.id)).toEqual([{ org_id: orgA, role: "uploader" }]);
  });

  it("an owner of any org can't be invited as an uploader, or made one", async () => {
    expect((await ownerA.rpc("create_org_invite", { target_org: orgA, invite_email: ownerBUser.email, invite_role: "uploader" })).error).not.toBeNull();
    expect((await admin().from("org_members").insert({ org_id: orgA, user_id: ownerBUser.id, role: "uploader" })).error).not.toBeNull();
    expect(await orgsOf(ownerBUser.id)).toEqual([{ org_id: orgB, role: "owner" }]);
  });
});
