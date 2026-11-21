import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry/options";

// Browser error tracking. NEXT_PUBLIC_SENTRY_DSN is copied from SENTRY_DSN at build (next.config.ts);
// without it, Sentry is never started.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) Sentry.init(sentryOptions(dsn));
