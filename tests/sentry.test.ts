import type { ErrorEvent } from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { scrubBreadcrumb, scrubEvent } from "@/lib/sentry/scrub";

/** What reaches Sentry: no bodies, cookies, headers, query strings or emails; the user as an ID only. */

const sent = vi.hoisted(() => ({ messages: [] as { event: string; options: { level: string; extra: Record<string, unknown> } }[] }));
vi.mock("@sentry/nextjs", () => ({
  captureMessage: (event: string, options: { level: string; extra: Record<string, unknown> }) => void sent.messages.push({ event, options }),
}));

const { log } = await import("@/lib/logger");

describe("scrubEvent", () => {
  const event = (): ErrorEvent =>
    ({
      type: undefined,
      message: "Sign-in failed for jordan@alderpeak.com",
      request: {
        method: "POST",
        url: "https://app.re-iq.example/auth/confirm?token_hash=abc&email=jordan@alderpeak.com",
        data: { email: "jordan@alderpeak.com", password: "hunter22" },
        cookies: { "sb-ref-auth-token": "secret" },
        headers: { authorization: "Bearer xyz", cookie: "sb=1", "user-agent": "x" },
        query_string: "token_hash=abc",
      },
      user: { id: "user-1", email: "jordan@alderpeak.com", username: "Jordan Reyes", ip_address: "203.0.113.9" },
      exception: { values: [{ type: "Error", value: "No account for jordan@alderpeak.com" }] },
      extra: { note: "contact jordan@alderpeak.com" },
      tags: { org_id: "org-1" },
      breadcrumbs: [{ category: "fetch", data: { url: "https://x.example/rest/v1/orgs?select=*&email=a@b.co" }, message: "a@b.co" }],
    }) as ErrorEvent;

  it("keeps only the request method and path", () => {
    expect(scrubEvent(event()).request).toEqual({ method: "POST", url: "https://app.re-iq.example/auth/confirm" });
  });

  it("reduces the user to an ID, with no IP to infer a location from, and keeps the org tag", () => {
    const e = scrubEvent(event());
    expect(e.user).toEqual({ id: "user-1", ip_address: null });
    expect(scrubEvent({ type: undefined } as ErrorEvent).user).toEqual({ ip_address: null });
    expect(e.tags).toEqual({ org_id: "org-1" });
  });

  it("masks emails everywhere and strips query strings from breadcrumbs", () => {
    const e = scrubEvent(event());
    expect(JSON.stringify(e)).not.toMatch(/@alderpeak|a@b\.co|hunter22|Bearer|token_hash/);
    expect(e.breadcrumbs?.[0].data?.url).toBe("https://x.example/rest/v1/orgs");
  });

  it("scrubs breadcrumbs on their own (beforeBreadcrumb)", () => {
    const crumb = scrubBreadcrumb({ category: "navigation", data: { from: "/login?next=/app", to: "/invite?token=abc" }, message: "x@y.co" });
    expect(crumb).toEqual({ category: "navigation", data: { from: "/login", to: "/invite" }, message: "[email]" });
  });
});

describe("logger → Sentry", () => {
  beforeEach(() => {
    sent.messages = [];
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  it("opens Sentry issues for warnings and errors only, redacted", () => {
    log.info("something.ok", { action: "signIn" });
    log.warn("rate_limit.fail_open", { action: "signIn", email: "jordan@alderpeak.com" });
    log.error("waitlist.save_failed");
    expect(sent.messages).toEqual([
      { event: "rate_limit.fail_open", options: { level: "warning", extra: { action: "signIn", email: "[redacted]" } } },
      { event: "waitlist.save_failed", options: { level: "error", extra: {} } },
    ]);
  });
});
