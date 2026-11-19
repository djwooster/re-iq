import type { NextConfig } from "next";
import { describe, expect, it } from "vitest";
import config, { SECURITY_HEADERS } from "@/next.config";

/** Every route, pages and API alike, gets the basic security headers. */
describe("security headers", () => {
  it("apply to every path", async () => {
    // withSentryConfig may return the config or a function of the build phase.
    const resolved: NextConfig = typeof config === "function" ? await (config as (phase: string, ctx: object) => Promise<NextConfig>)("phase-test", {}) : config;
    const rules = (await resolved.headers?.()) ?? [];
    expect(rules.find((r) => r.source === "/:path*")?.headers).toEqual(SECURITY_HEADERS);
  });

  it("are the four agreed headers, with HSTS for two years and subdomains, no preload", () => {
    expect(Object.fromEntries(SECURITY_HEADERS.map((h) => [h.key, h.value]))).toEqual({
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
    });
  });
});
