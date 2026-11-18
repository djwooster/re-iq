import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/demo";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Auth gate. /app opens for a signed-in Supabase user (session refreshed here on every request)
 * or for the demo session cookie, which /demo sets so marketing visitors skip sign-in.
 * /demo?fresh=1 also wipes the browser's demo changes (see freshStartScript) so each
 * usability-test participant starts clean. /demo?to=/app/... lands on a specific page.
 * Server Actions and Route Handlers still check the user themselves; this is not the only guard.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/demo") {
    const fresh = request.nextUrl.searchParams.has("fresh");
    const to = request.nextUrl.searchParams.get("to");
    // Only plain in-app paths, so the parameter can't redirect anywhere else.
    const target = to && /^\/app(\/[\w-]+)*$/.test(to) ? to : "/app";
    const response = NextResponse.redirect(new URL(fresh ? `${target}#fresh` : target, request.url));
    response.cookies.set(SESSION_COOKIE, "demo", { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
    return response;
  }

  const { response, userId } = await updateSession(request);
  const demo = request.cookies.get(SESSION_COOKIE)?.value === "demo";

  if (pathname.startsWith("/app") && !userId && !demo) {
    const url = new URL("/login", request.url);
    if (pathname !== "/app") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if ((pathname === "/login" || pathname === "/signup") && userId) {
    return redirectKeepingCookies(new URL("/app", request.url), response);
  }
  if (pathname === "/reset-password" && !userId) {
    return NextResponse.redirect(new URL("/forgot-password", request.url));
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
  matcher: ["/demo", "/app/:path*", "/login", "/signup", "/forgot-password", "/reset-password", "/auth/:path*"],
};
