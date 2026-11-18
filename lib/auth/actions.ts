"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "./demo";
import { AUTH_ENABLED } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "./redirect";

export type AuthState = { status: "idle" } | { status: "error"; message: string } | { status: "sent"; email: string };

export type Provider = "google" | "azure";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

/** The site's own origin, for links in auth emails and OAuth returns. Supabase only accepts allow-listed URLs. */
async function origin() {
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

/** Without Supabase configured, sign-in still works: it starts the demo session, as before. */
async function demoSession(next: string): Promise<never> {
  (await cookies()).set(SESSION_COOKIE, "demo", { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  redirect(next);
}

export async function signIn(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const next = safeNext(str(fd, "next"));
  if (!AUTH_ENABLED) return demoSession(next);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: str(fd, "email").toLowerCase(), password: String(fd.get("password") ?? "") });
  if (error) {
    return { status: "error", message: error.code === "email_not_confirmed" ? "Confirm your email first. The link is in your inbox." : "That email and password don't match an account." };
  }
  (await cookies()).delete(SESSION_COOKIE);
  redirect(next);
}

/**
 * Self sign-up creates a new org with this person as owner (the handle_new_user trigger).
 * From an invite link (invite=1), no org is created; acceptInvite adds them to the inviting org.
 */
export async function signUp(_prev: AuthState, fd: FormData): Promise<AuthState> {
  if (!AUTH_ENABLED) return demoSession("/app");
  const invited = str(fd, "invite") === "1";
  const name = str(fd, "name").slice(0, 120);
  const company = str(fd, "company").slice(0, 120);
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!name || (!company && !invited)) return { status: "error", message: invited ? "Add your name." : "Add your name and company." };
  if (email.length > 254 || !EMAIL.test(email)) return { status: "error", message: "That doesn't look like an email address." };
  if (password.length < MIN_PASSWORD) return { status: "error", message: `Use at least ${MIN_PASSWORD} characters for your password.` };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Read by the handle_new_user trigger: company names the new org; signup_via=invite skips it.
    options: { data: invited ? { full_name: name, signup_via: "invite" } : { full_name: name, company }, emailRedirectTo: `${await origin()}/auth/confirm?next=/app` },
  });
  if (error) {
    return { status: "error", message: error.code === "weak_password" ? "Choose a stronger password." : "We couldn't create your account just now. Please try again." };
  }
  // With email confirmation off (local only), Supabase signs the user straight in.
  if (data.session) redirect("/app");
  return { status: "sent", email };
}

export async function signInWithProvider(provider: Provider, next: string): Promise<AuthState> {
  if (!AUTH_ENABLED) return demoSession(safeNext(next));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(safeNext(next))}`,
      // Microsoft (Azure) doesn't return the email address without this scope.
      scopes: provider === "azure" ? "email" : undefined,
    },
  });
  if (error || !data.url) return { status: "error", message: "That sign-in option isn't available right now." };
  redirect(data.url);
}

/** Always reports success, so the form can't be used to find out which emails have accounts. */
export async function requestPasswordReset(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const email = str(fd, "email").toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) return { status: "error", message: "That doesn't look like an email address." };
  if (AUTH_ENABLED) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${await origin()}/auth/confirm?next=/reset-password` });
  }
  return { status: "sent", email };
}

export async function updatePassword(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const password = String(fd.get("password") ?? "");
  if (password.length < MIN_PASSWORD) return { status: "error", message: `Use at least ${MIN_PASSWORD} characters for your password.` };
  if (!AUTH_ENABLED) redirect("/login");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { status: "error", message: error.code === "same_password" ? "Choose a password you haven't used here before." : "That reset link has expired. Request a new one." };
  }
  redirect("/app");
}

export async function signOut(): Promise<void> {
  if (AUTH_ENABLED) await (await createClient()).auth.signOut();
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
