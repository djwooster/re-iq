import { describe, expect, it } from "vitest";
import nextConfig, { SECURITY_HEADERS } from "@/next.config";

/** Every route, pages and API alike, gets the basic security headers. */
describe("security headers", () => {
  it("apply to every path", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const all = rules.find((r) => r.source === "/:path*");
    expect(all?.headers).toEqual(SECURITY_HEADERS);
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
