/**
 * Supabase Auth settings. The URL and publishable key are safe in the browser (RLS guards the data).
 * Until both are set, real auth is off and sign-in falls back to the demo session, so a deploy
 * without them keeps working.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const AUTH_ENABLED = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
