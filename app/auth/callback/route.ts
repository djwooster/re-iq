import { NextResponse, type NextRequest } from "next/server";
import { fetchRoles, resolveAccess } from "@/lib/auth/access-rules";
import { SESSION_COOKIE } from "@/lib/auth/demo";
import { safeNext } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Google and Microsoft send people back here with a one-time code, exchanged for a session.
 * Uploaders sign in with email and password only, so a provider session that would only grant
 * uploader access (or nothing) is signed straight back out.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const roles = await fetchRoles(supabase, data.user.id);
      if (resolveAccess(roles, true) !== "dashboard") {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL("/login?error=use-password", request.url));
      }
      const response = NextResponse.redirect(new URL(safeNext(params.get("next")), request.url));
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }
  }
  return NextResponse.redirect(new URL("/login?error=provider", request.url));
}
