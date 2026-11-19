import { scrubBreadcrumb, scrubEvent, scrubLog } from "./scrub";

/** local, preview or production. Vercel sets VERCEL_ENV (and NEXT_PUBLIC_VERCEL_ENV for the browser). */
export function sentryEnvironment(): string {
  const env = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV;
  return env === "production" || env === "preview" ? env : "local";
}

/**
 * Shared Sentry settings for the browser, Node and edge runtimes. Errors, tracing and logs (on by
 * default in SDK v11); no session replay. Every trace is kept locally, 10% on preview and production.
 */
export function sentryOptions(dsn: string) {
  const environment = sentryEnvironment();
  return {
    dsn,
    enabled: Boolean(dsn),
    environment,
    sendDefaultPii: false,
    tracesSampleRate: environment === "local" ? 1 : 0.1,
    beforeSendLog: scrubLog,
    beforeSend: scrubEvent,
    beforeSendTransaction: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  };
}
