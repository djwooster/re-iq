import type { Breadcrumb, Event } from "@sentry/nextjs";

/**
 * What leaves the app for Sentry. Request bodies, cookies, headers and query strings are dropped;
 * email addresses are masked anywhere in the event; the user is reduced to an ID, and Sentry is told
 * not to infer an IP address or location. Org IDs travel
 * as a tag. Runs in the browser and on the server (beforeSend, beforeBreadcrumb).
 */

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export const maskEmails = (s: string) => s.replace(EMAIL, "[email]");

/** Drops ?query and #hash, which can carry tokens, emails and invite links. */
export const stripQuery = (url: string) => url.split(/[?#]/)[0];

function scrub(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return maskEmails(value);
  if (depth > 8 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrub(v, depth + 1)]));
}

export function scrubEvent<T extends Event>(event: T): T {
  if (event.request) {
    const url = event.request.url ? stripQuery(event.request.url) : undefined;
    event.request = { method: event.request.method, url };
  }
  // ip_address: null tells Sentry not to infer an IP (and from it, a location) from the connection.
  event.user = event.user?.id ? { id: event.user.id, ip_address: null } : { ip_address: null };
  if (event.message) event.message = maskEmails(event.message);
  event.exception = scrub(event.exception) as T["exception"];
  event.extra = scrub(event.extra) as T["extra"];
  event.contexts = scrub(event.contexts) as T["contexts"];
  event.tags = scrub(event.tags) as T["tags"];
  event.breadcrumbs = event.breadcrumbs?.map(scrubBreadcrumb);
  return event;
}

export function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb {
  const data = crumb.data ? (scrub(crumb.data) as Record<string, unknown>) : undefined;
  if (data) for (const key of ["url", "from", "to"]) if (typeof data[key] === "string") data[key] = stripQuery(data[key] as string);
  return { ...crumb, message: crumb.message ? maskEmails(crumb.message) : crumb.message, data };
}
