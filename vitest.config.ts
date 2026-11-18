import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      // Lets server modules be imported in tests; Next enforces the real guard at build time.
      "server-only": path.resolve(__dirname, "tests/server-only-stub.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    // TEST_SUPABASE_* come from .env.local; database tests skip without them.
    env: loadEnv("test", process.cwd(), ""),
    testTimeout: 20_000,
  },
});
