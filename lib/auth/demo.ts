/** The demo session cookie, set by /demo or by signing in while real auth is off. */
export const SESSION_COOKIE = "reiq_session";

/** Supabase keeps its session in sb-<project>-auth-token cookies (sometimes split into .0, .1). */
export const isSupabaseAuthCookie = (name: string) => name.startsWith("sb-") && name.includes("-auth-token");

/**
 * A demo session: the demo cookie and no Supabase session. Demo sessions only ever see mock data;
 * callers check this before creating any Supabase client, so a demo never queries the database.
 */
export function isDemoSession(cookies: { name: string; value: string }[]): boolean {
  return cookies.some((c) => c.name === SESSION_COOKIE && c.value === "demo") && !cookies.some((c) => isSupabaseAuthCookie(c.name));
}
