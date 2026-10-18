import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "reiq_session";

/**
 * Mock auth gate. A session is just a cookie set by /login or /signup.
 * Real auth (Supabase) replaces this; see TODO.md.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (pathname === "/") {
    return NextResponse.redirect(new URL(hasSession ? "/app" : "/login", request.url));
  }
  if (pathname.startsWith("/app") && !hasSession) {
    const url = new URL("/login", request.url);
    if (pathname !== "/app") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/app/:path*"],
};
