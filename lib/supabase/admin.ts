import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AUTH_ENABLED, SUPABASE_URL } from "./env";

/**
 * Service-role client for server-only jobs that no user may do themselves (rate limits today).
 * It bypasses RLS, so never pass it user input as a filter without checking access first.
 * Returns null unless SUPABASE_SECRET_KEY belongs to the same project as auth: SUPABASE_URL (the
 * waitlist's) must be unset or equal NEXT_PUBLIC_SUPABASE_URL.
 */
export function createAdminClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SECRET_KEY;
  const other = process.env.SUPABASE_URL?.replace(/\/$/, "");
  if (!AUTH_ENABLED || !key || (other && other !== SUPABASE_URL.replace(/\/$/, ""))) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
