import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/demo";
import { safeNext } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Links in auth emails land here: confirm sign-up (type=email) and password reset (type=recovery).
 * Verifying the token hash signs the user in; the token never reaches the page we redirect to.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const next = safeNext(params.get("next"));
  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      const response = NextResponse.redirect(new URL(next, request.url));
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }
  }
  return NextResponse.redirect(new URL(`/login?error=${type === "recovery" ? "reset-link" : "confirm-link"}`, request.url));
}
