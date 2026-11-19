import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** The proxy keeps uploaders out of /app, owners out of /upload, and moves invite tokens into a cookie. */

const session = vi.hoisted(() => ({ roles: [] as string[], method: "password" }));

vi.mock("@/lib/supabase/env", () => ({ AUTH_ENABLED: true, SUPABASE_URL: "https://staging.example", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" }));
vi.mock("@/lib/supabase/proxy", () => ({
  updateSession: vi.fn(async (request: NextRequest) => ({
    response: NextResponse.next({ request }),
    claims: { sub: "user-1", amr: [{ method: session.method }] },
    supabase: {
      from: () => ({ select: () => ({ eq: async () => ({ data: session.roles.map((role) => ({ role, org_id: "org-1" })) }) }) }),
    },
  })),
}));

const { proxy } = await import("@/proxy");

const go = async (path: string) => {
  const res = await proxy(new NextRequest(new URL(path, "http://localhost:3000")));
  const to = res.headers.get("location");
  return to ? new URL(to).pathname : null;
};

beforeEach(() => {
  session.roles = [];
  session.method = "password";
});

describe("routing by role", () => {
  it("sends uploaders from every /app page to /upload", async () => {
    session.roles = ["uploader"];
    for (const path of ["/app", "/app/workspace/properties", "/app/workspace/managers", "/app/properties"]) expect(await go(path)).toBe("/upload");
    expect(await go("/upload")).toBeNull();
  });

  it("lets owners into /app and sends them away from /upload", async () => {
    session.roles = ["owner"];
    expect(await go("/app/workspace/properties")).toBeNull();
    expect(await go("/upload")).toBe("/app");
  });

  it("gives an uploader nothing through a Google or Microsoft session", async () => {
    session.roles = ["uploader"];
    session.method = "oauth";
    expect(await go("/app")).toBe("/upload");
    expect(await go("/upload")).toBeNull(); // the page itself then shows "No workspace yet": access is "none"
  });
});

describe("invite links", () => {
  it("move the token into an HTTP-only cookie scoped to /invite and continue at a clean URL", async () => {
    const token = "a".repeat(64);
    const res = await proxy(new NextRequest(new URL(`/invite?token=${token}`, "http://localhost:3000")));
    expect(new URL(res.headers.get("location")!).search).toBe("");
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`reiq_invite=${token}`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\/invite/i);
  });

  it("ignore malformed tokens", async () => {
    const res = await proxy(new NextRequest(new URL("/invite?token=<script>", "http://localhost:3000")));
    expect(res.headers.get("set-cookie") ?? "").not.toContain("reiq_invite");
  });
});
