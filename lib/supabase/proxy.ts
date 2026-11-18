import { createServerClient } from "@supabase/ssr";
import type { JwtPayload, SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ENABLED, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

/**
 * Refreshes the Supabase session on each request and returns the verified claims (or null).
 * The response carries any refreshed auth cookies; return it, or copy its cookies onto a redirect.
 */
export async function updateSession(request: NextRequest): Promise<{ response: NextResponse; claims: JwtPayload | null; supabase: SupabaseClient | null }> {
  let response = NextResponse.next({ request });
  if (!AUTH_ENABLED) return { response, claims: null, supabase: null };

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet, headers) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Nothing between createServerClient and getClaims: it verifies the token and refreshes it if needed.
  const { data } = await supabase.auth.getClaims();
  return { response, claims: data?.claims ?? null, supabase };
}
