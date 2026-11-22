"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/controls";
import { cn } from "@/lib/cn";
import { requestPasswordReset, signIn, signInWithProvider, signUp, updatePassword, type AuthState, type Provider } from "@/lib/auth/actions";

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
  provider: "That sign-in didn't finish. Try again, or use your email and password.",
  "use-password": "Sign in with your email and password.",
};

const IDLE: AuthState = { status: "idle" };

/**
 * With `invite`, the form is for a property manager accepting an invite: email and password only
 * (no Google or Microsoft), sign-up creates no org, and both paths come back to /invite.
 */
export function AuthForm({ mode, invite }: { mode: Mode; invite?: boolean }) {
  const params = useSearchParams();
  const next = invite ? "/invite" : (params.get("next") ?? "");
  const [state, action, pending] = useActionState(ACTIONS[mode], IDLE);
  const [providerError, setProviderError] = useState<string | null>(null);
  const error = state.status === "error" ? state.message : URL_ERRORS[params.get("error") ?? ""];
  const copy = COPY[mode];

  if (state.status === "sent") {
    return (
      <div className="text-center">
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-fg">Check your email</h1>
        <div className={cn(CARD, "mt-6 text-left")}>
          <p className="text-[13px] leading-[1.6] text-fg-2">
            {mode === "signup" ? (
              <>
                We sent a confirmation link to <span className="font-medium text-fg">{state.email}</span>. Open it to {invite ? "accept your invitation" : "finish creating your workspace"}.
              </>
            ) : (
              <>
                If <span className="font-medium text-fg">{state.email}</span> has an account, a reset link is on its way.
              </>
            )}
          </p>
        </div>
        <p className="mt-5 text-xs text-fg-3">
          <Link href={invite ? "/invite?mode=login" : "/login"} className="font-medium text-fg-2 hover:text-fg">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  const withProviders = (mode === "login" || mode === "signup") && !invite;
  return (
    <div>
      <div className="text-center">
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-fg">{invite ? (mode === "signup" ? "Create your account" : "Sign in to accept") : copy.title}</h1>
        <p className="mx-auto mt-1.5 max-w-[340px] text-[13px] leading-[1.5] text-fg-3">
          {invite ? "You've been invited to upload monthly reports. Use the email address the invite was sent to." : copy.sub}
        </p>
      </div>

      <div className={cn(CARD, "mt-6")}>
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="next" value={next} />
          {invite && <input type="hidden" name="invite" value="1" />}
          {mode === "signup" && (
            <div className={cn("grid gap-3", !invite && "sm:grid-cols-2")}>
              <Field label="Full name">{(id) => <Input id={id} name="name" autoComplete="name" placeholder="Jordan Reyes" required />}</Field>
              {!invite && <Field label="Company">{(id) => <Input id={id} name="company" autoComplete="organization" placeholder="Alder Peak Capital" required />}</Field>}
            </div>
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

        {withProviders && (
          <>
            <div className="my-5 flex items-center gap-3 text-[10px] tracking-[0.08em] text-fg-3 uppercase">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="flex flex-col gap-2">
              <ProviderButton provider="google" next={next} onError={setProviderError} />
              <ProviderButton provider="azure" next={next} onError={setProviderError} />
              {providerError && (
                <p role="alert" className="text-xs text-unfavorable">
                  {providerError}
                </p>
              )}
            </div>
          </>
        )}

        <p className="mt-6 text-center text-xs text-fg-3">
          {mode === "login" || mode === "signup" ? <SwitchMode mode={mode} invite={invite} /> : (
            <Link href="/login" className="font-medium text-fg-2 hover:text-fg">
              Back to sign in
            </Link>
          )}
        </p>
      </div>

      {mode === "signup" && (
        <p className="mx-auto mt-6 max-w-[300px] text-center text-[11px] leading-[1.6] text-fg-3">
          By creating an account, you agree to the{" "}
          <Link href="/terms" className="text-fg-2 underline underline-offset-2 hover:text-fg">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-fg-2 underline underline-offset-2 hover:text-fg">
            Privacy Policy
          </Link>
          .
        </p>
      )}
    </div>
  );
}

const CARD = "rounded-xl border border-border bg-surface p-6 sm:p-8";

const PROVIDER_ERROR = "We couldn't start that sign-in. Try again, or use your email and password.";

/** On success the server action redirects to Google or Microsoft; anything else shows a message. */
function ProviderButton({ provider, next, onError }: { provider: Provider; next: string; onError: (message: string | null) => void }) {
  const [pending, start] = useTransition();
  const go = () =>
    start(async () => {
      onError(null);
      try {
        const res = await signInWithProvider(provider, next);
        if (res?.status === "error") onError(PROVIDER_ERROR);
      } catch {
        onError(PROVIDER_ERROR);
      }
    });
  return (
    <Button type="button" variant="secondary" loading={pending} className="w-full" icon={provider === "google" ? <GoogleMark /> : <MicrosoftMark />} onClick={go}>
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

/** "Already have an account? Sign in", keeping where the person was headed (`next`). */
function SwitchMode({ mode, invite }: { mode: "login" | "signup"; invite?: boolean }) {
  const params = useSearchParams();
  const to = mode === "login" ? "signup" : "login";
  const next = params.get("next");
  const href = invite ? (to === "login" ? "/invite?mode=login" : "/invite") : `/${to}${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  return (
    <>
      {mode === "login" ? "Don't have an account? " : "Already have an account? "}
      <Link href={href} replace className="font-medium text-fg hover:underline hover:underline-offset-2">
        {to === "login" ? "Sign in" : invite ? "Create one" : "Sign up"}
      </Link>
    </>
  );
}
