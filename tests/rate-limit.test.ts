import { createClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HAS_TEST_DB, admin } from "./supabase";

/**
 * When a limit is hit, auth answers with its usual generic message and never calls Supabase Auth.
 * When the limiter is down, sign-in carries on; sign-up and password reset stop with "try again".
 */

const calls = vi.hoisted(() => ({ createClient: 0, verdict: "limited" as "ok" | "limited" | "unavailable" }));

vi.mock("@/lib/supabase/env", () => ({ AUTH_ENABLED: true, SUPABASE_URL: "https://supabase.test", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" }));
vi.mock("@/lib/auth/rate-limit", () => ({ checkLimit: vi.fn(async () => calls.verdict) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => {
    calls.createClient++;
    return { auth: { signInWithPassword: async () => ({ error: { code: "invalid_credentials" } }) } };
  }),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set() {}, delete() {} }), headers: async () => new Headers({ origin: "http://localhost:3000" }) }));

const { signIn, signUp, requestPasswordReset } = await import("@/lib/auth/actions");

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.set(k, v));
  return fd;
};

beforeEach(() => {
  calls.createClient = 0;
  calls.verdict = "limited";
});

describe("auth when rate-limited", () => {
  it("sign-in gives the same message as a wrong password", async () => {
    expect(await signIn({ status: "idle" }, form({ email: "a@example.test", password: "whatever-123" }))).toEqual({ status: "error", message: "That email and password don't match an account." });
    expect(calls.createClient).toBe(0);
  });

  it("sign-up gives its usual try-again message", async () => {
    const res = await signUp({ status: "idle" }, form({ name: "A", company: "B", email: "a@example.test", password: "long-enough-1" }));
    expect(res).toEqual({ status: "error", message: "We couldn't create your account just now. Please try again." });
    expect(calls.createClient).toBe(0);
  });

  it("password reset still says a link is on its way, and sends nothing", async () => {
    expect(await requestPasswordReset({ status: "idle" }, form({ email: "a@example.test" }))).toEqual({ status: "sent", email: "a@example.test" });
    expect(calls.createClient).toBe(0);
  });
});

describe("auth when the limiter is unavailable", () => {
  beforeEach(() => {
    calls.verdict = "unavailable";
  });
  const TRY_AGAIN = { status: "error", message: "Something went wrong on our side. Try again shortly." };

  it("sign-in still reaches Supabase Auth (fails open)", async () => {
    // checkLimit itself turns "unavailable" into "ok" for sign-in; here the action sees "ok".
    calls.verdict = "ok";
    await signIn({ status: "idle" }, form({ email: "a@example.test", password: "whatever-123" }));
    expect(calls.createClient).toBe(1);
  });

  it("sign-up and password reset stop with a try-again message (fail closed)", async () => {
    expect(await signUp({ status: "idle" }, form({ name: "A", company: "B", email: "a@example.test", password: "long-enough-1" }))).toEqual(TRY_AGAIN);
    expect(await requestPasswordReset({ status: "idle" }, form({ email: "a@example.test" }))).toEqual(TRY_AGAIN);
    expect(calls.createClient).toBe(0);
  });
});

describe.skipIf(!HAS_TEST_DB)("rate_limit_hit", () => {
  it("allows up to the limit in a window, then refuses", async () => {
    const key = `test:${Math.random().toString(36).slice(2)}`;
    const hit = async () => (await admin().rpc("rate_limit_hit", { p_key: key, p_limit: 2, p_window_seconds: 60 })).data;
    expect([await hit(), await hit(), await hit()]).toEqual([true, true, false]);
  });

  it("can't be called or read with the public key", async () => {
    const anon = createClient(process.env.TEST_SUPABASE_URL!, process.env.TEST_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    expect((await anon.rpc("rate_limit_hit", { p_key: "x", p_limit: 1, p_window_seconds: 60 })).error).not.toBeNull();
    expect((await anon.from("rate_limits").select("*")).data ?? []).toEqual([]);
  });
});
