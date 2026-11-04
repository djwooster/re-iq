import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The v2 wireframe moved to /wireframe; the low-fidelity v1 is parked in app/_wireframe-v1 (not routed).
  async redirects() {
    return [{ source: "/wireframe-v2/:path*", destination: "/wireframe/:path*", permanent: false }];
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

export default nextConfig;
