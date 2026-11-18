import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** checkLimit's own failure policy, and that its logs carry no personal data. */

const store = vi.hoisted(() => ({ mode: "down" as "down" | "missing" | "ok" }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () =>
    store.mode === "missing"
      ? null
      : {
          rpc: async () => {
            if (store.mode === "down") throw new Error("fetch failed");
            return { data: true, error: null };
          },
        },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }) }));

const { checkLimit } = await import("@/lib/auth/rate-limit");

const EMAIL = "person@example.test";
let lines: string[] = [];

beforeEach(() => {
  process.env.RATE_LIMIT_HMAC_SECRET = "test-secret";
  lines = [];
  vi.spyOn(console, "warn").mockImplementation((line: string) => void lines.push(line));
});
afterEach(() => vi.restoreAllMocks());

describe("checkLimit when the store is unreachable", () => {
  it("sign-in fails open and logs it", async () => {
    store.mode = "down";
    expect(await checkLimit("signIn", EMAIL)).toBe("ok");
    expect(JSON.parse(lines[0])).toMatchObject({ level: "warn", event: "rate_limit.fail_open", action: "signIn" });
  });

  it("sign-up, password reset and invite acceptance fail closed and log it", async () => {
    store.mode = "down";
    for (const action of ["signUp", "passwordReset", "acceptInvite"] as const) {
      expect(await checkLimit(action, EMAIL)).toBe("unavailable");
    }
    expect(lines.map((l) => JSON.parse(l).event)).toEqual(["rate_limit.fail_closed", "rate_limit.fail_closed", "rate_limit.fail_closed"]);
  });

  it("treats a missing store or secret as unreachable", async () => {
    store.mode = "missing";
    expect(await checkLimit("signUp", EMAIL)).toBe("unavailable");
    store.mode = "ok";
    delete process.env.RATE_LIMIT_HMAC_SECRET;
    expect(await checkLimit("signUp", EMAIL)).toBe("unavailable");
  });

  it("logs no email or IP", async () => {
    store.mode = "down";
    await checkLimit("signIn", EMAIL);
    await checkLimit("signUp", EMAIL);
    expect(lines.join("\n")).not.toMatch(/person@example|203\.0\.113/);
  });
});
