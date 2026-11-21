import { NextResponse, type NextRequest } from "next/server";
import { HOME, INVITE_COOKIE, fetchRoles, resolveAccess, viaOAuth } from "@/lib/auth/access-rules";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Auth gate. Signed-in owners and members get /app; uploaders get /upload, and only with an
 * email-and-password session. /prototype is a standalone demo and isn't gated. The session is
 * refreshed here on every request. Server Actions and Route Handlers check access themselves too.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Invite links: keep the token in an HTTP-only cookie and continue at a clean /invite URL, so the
  // token never sits in the address bar, a confirmation email's link or a log.
  if (pathname === "/invite" && request.nextUrl.searchParams.has("token")) {
    const token = request.nextUrl.searchParams.get("token") ?? "";
    const response = NextResponse.redirect(new URL("/invite", request.url));
    if (/^[0-9a-f]{64}$/.test(token)) {
      response.cookies.set(INVITE_COOKIE, token, { path: "/invite", httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:", maxAge: 60 * 60 * 24 * 7 });
    }
    return response;
  }

  const { response, claims, supabase } = await updateSession(request);
  const userId = claims?.sub ?? null;

  if (!userId || !supabase) {
    if (isDashboard(pathname) || pathname === "/upload") {
      const url = new URL("/login", request.url);
      if (isDashboard(pathname) && pathname !== "/app") url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (pathname === "/reset-password") return NextResponse.redirect(new URL("/forgot-password", request.url));
    return response;
  }

  if (isDashboard(pathname) || pathname === "/upload" || pathname === "/login" || pathname === "/signup") {
    const access = resolveAccess(await fetchRoles(supabase, userId), viaOAuth(claims));
    const home = HOME[access];
    if (isDashboard(pathname) && access !== "dashboard") return redirectKeepingCookies(new URL(home, request.url), response);
    if (pathname === "/upload" && access === "dashboard") return redirectKeepingCookies(new URL(home, request.url), response);
    if (pathname === "/login" || pathname === "/signup") return redirectKeepingCookies(new URL(home, request.url), response);
  }
  return response;
}

/** Pages only owners and members may open. */
function isDashboard(pathname: string) {
  return pathname === "/app" || pathname.startsWith("/app/");
}

/** A redirect that still carries any auth cookies the session refresh just set. */
function redirectKeepingCookies(url: URL, from: NextResponse) {
  const to = NextResponse.redirect(url);
  from.cookies.getAll().forEach((c) => to.cookies.set(c));
  return to;
}

export const config = {
  matcher: ["/app/:path*", "/upload", "/invite", "/login", "/signup", "/forgot-password", "/reset-password", "/auth/:path*"],
};
