import * as Sentry from "@sentry/nextjs";

/** Server and edge error tracking. Without SENTRY_DSN (local dev), Sentry is never started. */
export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  const { sentryOptions } = await import("@/lib/sentry/options");
  Sentry.init(sentryOptions(dsn));
}

export const onRequestError = Sentry.captureRequestError;
