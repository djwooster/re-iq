import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

/** Basic security headers on every response. No CSP yet (see SECURITY.md, Deferred). */
export const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  // The DSN only says where to send events; it isn't a secret. SENTRY_AUTH_TOKEN never reaches the browser.
  env: { NEXT_PUBLIC_SENTRY_DSN: process.env.SENTRY_DSN ?? "" },
  cacheComponents: true,
  partialPrefetching: true,
  // The v2 wireframe moved to /wireframe; the low-fidelity v1 is parked in app/_wireframe-v1 (not routed).
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async redirects() {
    return [
      { source: "/wireframe-v2/:path*", destination: "/wireframe/:path*", permanent: false },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

/**
 * Sentry uploads source maps at build time when SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT
 * are set (build-time only), then deletes them from the deployment. Without them, nothing uploads.
 */
export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  telemetry: false,
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
