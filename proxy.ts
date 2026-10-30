import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "reiq_session";

/**
 * Mock auth gate. A session is just a cookie set by /login or /signup, or by
 * /demo, which the marketing site links to so visitors skip the sign-in form.
 * /demo?fresh=1 is for usability tests: it signs out, wipes the browser's saved
 * workspace (see freshStartScript), and opens signup, so each participant starts
 * from an empty workspace. /demo?to=/app/... lands on a specific page (the
 * marketing sections link to the feature they describe). Real auth (Supabase)
 * replaces this.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (pathname === "/demo" && request.nextUrl.searchParams.has("fresh")) {
    const response = NextResponse.redirect(new URL("/signup#fresh", request.url));
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }
  if (pathname === "/demo") {
    const to = request.nextUrl.searchParams.get("to");
    // Only plain in-app paths, so the parameter can't redirect anywhere else.
    const target = to && /^\/app(\/[\w-]+)*$/.test(to) ? to : "/app";
    const response = NextResponse.redirect(new URL(target, request.url));
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
