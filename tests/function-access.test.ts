import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { HAS_TEST_DB, cleanup, makeUser, orgsOf, signedIn, type TestUser } from "./supabase";

/**
 * Internal database functions can't be called from a client: not with the public key (anon),
 * and not as a signed-in user. They live in the unexposed `private` schema, or (the rate-limit
 * entry point) are executable by the service role only.
 */
const INTERNAL: [string, Record<string, unknown>][] = [
  ["is_org_member", { target_org: "00000000-0000-0000-0000-000000000000" }],
  ["is_org_owner", { target_org: "00000000-0000-0000-0000-000000000000" }],
  ["is_org_reader", { target_org: "00000000-0000-0000-0000-000000000000" }],
  ["handle_new_user", {}],
  ["hit_rate_limit", { p_key: "x", p_limit: 1, p_window_seconds: 60 }],
  ["rate_limit_hit", { p_key: "x", p_limit: 1, p_window_seconds: 60 }],
  ["has_property_access", { target_property: "00000000-0000-0000-0000-000000000000" }],
  ["can_read_report_object", { object_name: "x/y/z/file.csv" }],
  ["try_uuid", { value: "x" }],
  ["org_upload_cap", {}],
  ["enforce_membership_rules", {}],
];

describe.skipIf(!HAS_TEST_DB)("internal functions are closed to clients", () => {
  let user: TestUser;
  let orgId: string;
  let anon: SupabaseClient;
  let asUser: SupabaseClient;

  beforeAll(async () => {
    user = await makeUser("fn", { full_name: "Fn User", company: "Fn Org" });
    [{ org_id: orgId }] = await orgsOf(user.id);
    anon = createClient(process.env.TEST_SUPABASE_URL!, process.env.TEST_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    asUser = await signedIn(user);
  });
  afterAll(() => cleanup([user], [orgId]));

  for (const [fn, args] of INTERNAL) {
    it(`${fn}: anon and a signed-in user both fail, in public and in private`, async () => {
      for (const client of [anon, asUser]) {
        expect((await client.rpc(fn, args)).error).not.toBeNull();
        expect((await client.schema("private").rpc(fn, args)).error).not.toBeNull();
      }
    });
  }

  it("anon can't call any client-callable function either", async () => {
    const zero = "00000000-0000-0000-0000-000000000000";
    const calls: [string, Record<string, unknown>][] = [
      ["create_org_invite", { target_org: orgId, invite_email: "x@example.test" }],
      ["accept_org_invite", { raw_token: "0".repeat(64) }],
      ["revoke_org_invite", { invite_id: zero }],
      ["set_uploader_access", { target_org: orgId, target_user: zero, property_ids: [] }],
      ["remove_uploader", { target_org: orgId, target_user: zero }],
      ["org_people", { target_org: orgId }],
      ["can_upload", { target_property: zero }],
      ["record_upload", { upload_id: zero, target_property: zero, report_type: "t12", period: "2026-10-01", file_name: "x.csv", size_bytes: 1, content_type: "text/csv", sha256: "a".repeat(64) }],
    ];
    for (const [fn, args] of calls) expect((await anon.rpc(fn, args)).error, fn).not.toBeNull();
  });

  it("the private schema's tables aren't reachable", async () => {
    for (const client of [anon, asUser]) {
      expect((await client.schema("private").from("rate_limits").select("*")).error).not.toBeNull();
    }
  });
});
