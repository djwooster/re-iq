import { scrubBreadcrumb, scrubEvent } from "./scrub";

/** local, preview or production. Vercel sets VERCEL_ENV (and NEXT_PUBLIC_VERCEL_ENV for the browser). */
export function sentryEnvironment(): string {
  const env = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV;
  return env === "production" || env === "preview" ? env : "local";
}

/**
 * Shared Sentry settings for the browser, Node and edge runtimes. Errors only: no tracing, no logs,
 * no session replay.
 */
export function sentryOptions(dsn: string) {
  const environment = sentryEnvironment();
  return {
    dsn,
    enabled: Boolean(dsn),
    environment,
    sendDefaultPii: false,
    enableLogs: false,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  };
}
