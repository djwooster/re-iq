import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "reiq_session";

/**
 * Mock auth gate. A session is just a cookie set by /login or /signup, or by
 * /demo, which the marketing site links to so visitors skip the sign-in form.
 * Real auth (Supabase) replaces this; see TODO.md.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (pathname === "/demo") {
    const response = NextResponse.redirect(new URL("/app", request.url));
    response.cookies.set(SESSION_COOKIE, "demo", { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
    return response;
  }
  if (pathname.startsWith("/app") && !hasSession) {
    const url = new URL("/login", request.url);
    if (pathname !== "/app") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/demo", "/app/:path*"],
};
