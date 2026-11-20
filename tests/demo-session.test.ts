import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { HAS_TEST_DB, cleanup, makeUser, orgsOf, type TestUser } from "./supabase";

/**
 * A demo session (the /demo cookie) only ever gets mock data. It never gets a Supabase session,
 * an org ID, or a query against real tables; the server decides this before any Supabase call.
 */

const jar = vi.hoisted(() => ({ cookies: [] as { name: string; value: string }[] }));
const supabaseCalls = vi.hoisted(() => ({ updateSession: 0, createClient: 0 }));

vi.mock("@/lib/supabase/env", () => ({ AUTH_ENABLED: true, SUPABASE_URL: "https://staging.example", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" }));
vi.mock("@/lib/supabase/proxy", () => ({
  updateSession: vi.fn(async () => {
    supabaseCalls.updateSession++;
    throw new Error("A demo session reached Supabase");
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => {
    supabaseCalls.createClient++;
    throw new Error("A demo session reached Supabase");
  }),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => jar.cookies }) }));

const { proxy } = await import("@/proxy");
const { getViewer, requireDashboardUser, AccessDenied } = await import("@/lib/auth/access");
const { isDemoSession } = await import("@/lib/auth/demo");

const DEMO = { name: "reiq_session", value: "demo" };
const request = (path: string, cookies: { name: string; value: string }[]) => {
  const req = new NextRequest(new URL(path, "http://localhost:3000"));
  cookies.forEach((c) => req.cookies.set(c.name, c.value));
  return req;
};

beforeEach(() => {
  supabaseCalls.updateSession = 0;
  supabaseCalls.createClient = 0;
  jar.cookies = [DEMO];
});

describe("demo session, on the server", () => {
  it("is recognised from cookies alone, and only without a Supabase session", () => {
    expect(isDemoSession([DEMO])).toBe(true);
    expect(isDemoSession([DEMO, { name: "sb-ref-auth-token", value: "x" }])).toBe(false);
    expect(isDemoSession([{ name: "reiq_session", value: "anything-else" }])).toBe(false);
  });

  it("a leftover demo cookie can't open /app: it goes home, cleared, without touching Supabase", async () => {
    const res = await proxy(request("/app/properties", [DEMO]));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/");
    expect(res.cookies.get("reiq_session")?.value).toBe("");
    expect(supabaseCalls.updateSession).toBe(0);
  });

  it("is sent away from the uploader page without touching Supabase", async () => {
    const res = await proxy(request("/upload", [DEMO]));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/");
    expect(supabaseCalls.updateSession).toBe(0);
  });

  it("/demo is parked: it sends visitors home and sets no cookie", async () => {
    const res = await proxy(request("/demo?to=/app/properties", []));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/");
    expect(res.cookies.getAll()).toEqual([]);
  });

  // Parked with the demo (proxy.ts); unskip when it comes back.
  it.skip("opening /demo while signed in asks first, and changes no cookies", async () => {
    const res = await proxy(request("/demo?to=/app/properties&fresh=1", [{ name: "sb-ref-auth-token", value: "x" }]));
    const to = new URL(res.headers.get("location")!);
    expect(to.pathname).toBe("/demo/switch");
    expect(to.searchParams.get("to")).toBe("/app/properties");
    expect(to.searchParams.get("fresh")).toBe("1");
    expect(res.cookies.getAll()).toEqual([]);
  });

  it.skip("opening /demo signed out starts the demo, and ignores off-site targets", async () => {
    const res = await proxy(request("/demo?to=https://evil.example", []));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/app");
    expect(res.cookies.get("reiq_session")?.value).toBe("demo");
  });

  it("server data access sees a demo and creates no Supabase client", async () => {
    expect(await getViewer()).toEqual({ kind: "demo" });
    await expect(requireDashboardUser()).rejects.toBeInstanceOf(AccessDenied);
    expect(supabaseCalls.createClient).toBe(0);
  });
});

/** Once a real org exists, the most a demo browser could hold (the public key, no session) reads none of it. */
describe.skipIf(!HAS_TEST_DB)("demo session, against the database", () => {
  let owner: TestUser;
  let orgId: string;

  beforeAll(async () => {
    owner = await makeUser("demo-check", { full_name: "Owner", company: "Real Org" });
    [{ org_id: orgId }] = await orgsOf(owner.id);
  });
  afterAll(() => cleanup([owner], [orgId]));

  it("can't read orgs, memberships or invites, or call the invite functions", async () => {
    const anon = createClient(process.env.TEST_SUPABASE_URL!, process.env.TEST_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    for (const table of ["orgs", "org_members", "org_invites"]) {
      const { data } = await anon.from(table).select("*");
      expect(data ?? []).toEqual([]);
    }
    expect((await anon.rpc("create_org_invite", { target_org: orgId, invite_email: "x@example.test" })).error).not.toBeNull();
    expect((await anon.rpc("accept_org_invite", { raw_token: "0".repeat(64) })).error).not.toBeNull();
  });
});
