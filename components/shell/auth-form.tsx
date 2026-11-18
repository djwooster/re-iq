"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/controls";
import { requestPasswordReset, signIn, signInWithProvider, signUp, updatePassword, type AuthState, type Provider } from "@/lib/auth/actions";
import { PRODUCT_NAME } from "@/lib/labels";
import { AUTH_ENABLED } from "@/lib/supabase/env";

type Mode = "login" | "signup" | "forgot" | "reset";

const ACTIONS = { login: signIn, signup: signUp, forgot: requestPasswordReset, reset: updatePassword };

const COPY: Record<Mode, { title: string; sub: string; submit: string }> = {
  login: { title: "Sign in", sub: "Portfolio performance from every property, whatever system it runs on.", submit: "Sign in" },
  signup: { title: "Create your workspace", sub: "Start with the reports your property managers already send you.", submit: "Create workspace" },
  forgot: { title: "Reset your password", sub: "We'll email you a link to choose a new one.", submit: "Send reset link" },
  reset: { title: "Choose a new password", sub: "At least 8 characters.", submit: "Save password" },
};

/** Errors that arrive in the URL, from auth email links and Google or Microsoft sign-in. */
const URL_ERRORS: Record<string, string> = {
  "confirm-link": "That confirmation link has expired or was already used. Sign in to get a new one.",
  "reset-link": "That reset link has expired or was already used. Request a new one.",
  provider: "That sign-in didn't finish. Try again.",
  "use-password": "Sign in with your email and password.",
};

const IDLE: AuthState = { status: "idle" };

export function AuthForm({ mode }: { mode: Mode }) {
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const [state, action, pending] = useActionState(ACTIONS[mode], IDLE);
  const error = state.status === "error" ? state.message : URL_ERRORS[params.get("error") ?? ""];
  const copy = COPY[mode];

  if (state.status === "sent") {
    return (
      <div>
        <h1 className="text-[15px] font-semibold text-fg">Check your email</h1>
        <p className="mt-1 text-xs text-fg-2">
          {mode === "signup" ? (
            <>
              We sent a confirmation link to <span className="font-medium text-fg">{state.email}</span>. Open it to finish creating your workspace.
            </>
          ) : (
            <>
              If <span className="font-medium text-fg">{state.email}</span> has an account, a reset link is on its way.
            </>
          )}
        </p>
        <p className="mt-6 text-xs text-fg-3">
          <Link href="/login" className="text-fg-2 underline-offset-2 hover:text-fg hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[15px] font-semibold text-fg">{copy.title}</h1>
      <p className="mt-1 text-xs text-fg-3">{copy.sub}</p>

      {(mode === "login" || mode === "signup") && (
        <>
          <div className="mt-6 flex flex-col gap-2">
            <ProviderButton provider="google" next={next} />
            <ProviderButton provider="azure" next={next} />
          </div>
          <div className="my-5 flex items-center gap-3 text-[11px] text-fg-3">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <form action={action} className={mode === "forgot" || mode === "reset" ? "mt-6 flex flex-col gap-3" : "flex flex-col gap-3"}>
        <input type="hidden" name="next" value={next} />
        {mode === "signup" && (
          <>
            <Field label="Full name">{(id) => <Input id={id} name="name" autoComplete="name" placeholder="Jordan Reyes" required />}</Field>
            <Field label="Company">{(id) => <Input id={id} name="company" autoComplete="organization" placeholder="Alder Peak Capital" required />}</Field>
          </>
        )}
        {mode !== "reset" && <Field label="Work email">{(id) => <Input id={id} name="email" type="email" autoComplete="email" placeholder="you@company.com" required />}</Field>}
        {mode !== "forgot" && (
          <Field
            label={mode === "reset" ? "New password" : "Password"}
            hint={
              mode === "login" ? (
                <Link href="/forgot-password" className="underline-offset-2 hover:text-fg hover:underline">
                  Forgot your password?
                </Link>
              ) : undefined
            }
          >
            {(id) => <Input id={id} name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "login" ? undefined : 8} required />}
          </Field>
        )}
        {error && (
          <p role="alert" className="text-xs text-unfavorable">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" loading={pending} className="mt-2 w-full">
          {copy.submit}
        </Button>
      </form>

      {!AUTH_ENABLED && (
        <p className="mt-4 rounded-md border border-dashed border-border px-3 py-2 text-[11px] text-fg-3">
          Demo environment: any credentials work and you&apos;ll enter the Alder Peak Capital sample portfolio.
        </p>
      )}

      <p className="mt-6 text-xs text-fg-3">
        {mode === "login" ? (
          <>
            New to {PRODUCT_NAME}?{" "}
            <Link href="/signup" className="text-fg-2 underline-offset-2 hover:text-fg hover:underline">
              Create a workspace
            </Link>
          </>
        ) : mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-fg-2 underline-offset-2 hover:text-fg hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <Link href="/login" className="text-fg-2 underline-offset-2 hover:text-fg hover:underline">
            Back to sign in
          </Link>
        )}
      </p>
    </div>
  );
}

function ProviderButton({ provider, next }: { provider: Provider; next: string }) {
  const [pending, start] = useTransition();
  return (
    <Button type="button" variant="secondary" loading={pending} className="w-full" icon={provider === "google" ? <GoogleMark /> : <MicrosoftMark />} onClick={() => start(() => signInWithProvider(provider, next).then(() => undefined))}>
      Continue with {provider === "google" ? "Google" : "Microsoft"}
    </Button>
  );
}

// Brand marks keep their own colors, per Google's and Microsoft's sign-in button guidelines.
function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="size-3.5" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg viewBox="0 0 21 21" className="size-3.5" aria-hidden>
      <path fill="#F25022" d="M1 1h9v9H1z" />
      <path fill="#7FBA00" d="M11 1h9v9h-9z" />
      <path fill="#00A4EF" d="M1 11h9v9H1z" />
      <path fill="#FFB900" d="M11 11h9v9h-9z" />
    </svg>
  );
}
