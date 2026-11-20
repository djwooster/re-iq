/**
 * Supabase Auth settings. The URL and publishable key are safe in the browser (RLS guards the data).
 * Until both are set, auth is off and the sign-in forms say it isn't available.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const AUTH_ENABLED = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
