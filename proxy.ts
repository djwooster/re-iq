import { NextResponse, type NextRequest } from "next/server";
import { HOME, fetchRoles, resolveAccess, viaOAuth } from "@/lib/auth/access-rules";
import { SESSION_COOKIE, isDemoSession, isSupabaseAuthCookie } from "@/lib/auth/demo";
import { demoTarget } from "@/lib/auth/redirect";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Auth gate.
 * - Demo sessions (the /demo cookie) only see /app's mock data and never touch Supabase.
 * - Signed-in users: owners and members get /app; uploaders get /upload, and only with an
 *   email-and-password session. The session is refreshed here on every request.
 * /demo?fresh=1 also wipes the browser's demo changes (see freshStartScript); /demo?to=/app/...
 * lands on a specific page. Server Actions and Route Handlers check access themselves too.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/demo") {
    const fresh = request.nextUrl.searchParams.has("fresh");
    const target = demoTarget(request.nextUrl.searchParams.get("to"));
    // Signed in for real: a GET never signs anyone out. Ask first; the page posts to enterDemo.
    if (request.cookies.getAll().some((c) => isSupabaseAuthCookie(c.name))) {
      const confirm = new URL("/demo/switch", request.url);
      confirm.searchParams.set("to", target);
      if (fresh) confirm.searchParams.set("fresh", "1");
      return NextResponse.redirect(confirm);
    }
    const response = NextResponse.redirect(new URL(fresh ? `${target}#fresh` : target, request.url));
    response.cookies.set(SESSION_COOKIE, "demo", { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
    return response;
  }

  if (isDemoSession(request.cookies.getAll())) {
    if (pathname === "/upload") return NextResponse.redirect(new URL("/app", request.url));
    if (pathname === "/reset-password") return NextResponse.redirect(new URL("/forgot-password", request.url));
    return NextResponse.next();
  }

  const { response, claims, supabase } = await updateSession(request);
  const userId = claims?.sub ?? null;

  if (!userId || !supabase) {
    if (pathname.startsWith("/app") || pathname === "/upload") {
      const url = new URL("/login", request.url);
      if (pathname.startsWith("/app") && pathname !== "/app") url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (pathname === "/reset-password") return NextResponse.redirect(new URL("/forgot-password", request.url));
    return response;
  }

  // A real session wins over a stale demo cookie.
  if (request.cookies.has(SESSION_COOKIE)) response.cookies.delete(SESSION_COOKIE);

  if (pathname.startsWith("/app") || pathname === "/upload" || pathname === "/login" || pathname === "/signup") {
    const access = resolveAccess(await fetchRoles(supabase, userId), viaOAuth(claims));
    const home = HOME[access];
    if (pathname.startsWith("/app") && access !== "dashboard") return redirectKeepingCookies(new URL(home, request.url), response);
    if (pathname === "/upload" && access === "dashboard") return redirectKeepingCookies(new URL("/app", request.url), response);
    if (pathname === "/login" || pathname === "/signup") return redirectKeepingCookies(new URL(home, request.url), response);
  }
  return response;
}

/** A redirect that still carries any auth cookies the session refresh just set. */
function redirectKeepingCookies(url: URL, from: NextResponse) {
  const to = NextResponse.redirect(url);
  from.cookies.getAll().forEach((c) => to.cookies.set(c));
  return to;
}

export const config = {
  matcher: ["/demo", "/app/:path*", "/upload", "/login", "/signup", "/forgot-password", "/reset-password", "/auth/:path*"],
};
