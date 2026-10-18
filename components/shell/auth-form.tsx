"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/controls";
import { SESSION_COOKIE } from "@/lib/data";
import { PRODUCT_NAME } from "@/lib/labels";

type Mode = "login" | "signup";

/** Placeholder auth: any input sets a mock session cookie and enters the demo org. */
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    document.cookie = `${SESSION_COOKIE}=demo; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    const next = new URLSearchParams(window.location.search).get("next");
    window.setTimeout(() => router.push(next?.startsWith("/app") ? next : "/app"), 450);
  };

  return (
    <div>
      <h1 className="text-[15px] font-semibold text-fg">{mode === "login" ? "Sign in" : "Create your workspace"}</h1>
      <p className="mt-1 text-xs text-fg-3">
        {mode === "login" ? "Portfolio performance from every property, whatever system it runs on." : "Start with the reports your property managers already send you."}
      </p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        {mode === "signup" && (
          <>
            <Field label="Full name">{(id) => <Input id={id} name="name" autoComplete="name" placeholder="Jordan Reyes" required />}</Field>
            <Field label="Company">{(id) => <Input id={id} name="company" autoComplete="organization" placeholder="Alder Peak Capital" required />}</Field>
          </>
        )}
        <Field label="Work email">
          {(id) => <Input id={id} name="email" type="email" autoComplete="email" defaultValue={mode === "login" ? "jordan@alderpeak.com" : undefined} placeholder="you@company.com" required />}
        </Field>
        <Field label="Password">
          {(id) => <Input id={id} name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} defaultValue={mode === "login" ? "demo-password" : undefined} required />}
        </Field>
        <Button type="submit" variant="primary" loading={loading} className="mt-2 w-full">
          {mode === "login" ? "Sign in" : "Create workspace"}
        </Button>
      </form>
      <p className="mt-4 rounded-md border border-dashed border-border px-3 py-2 text-[11px] text-fg-3">
        Demo environment: any credentials work and you&apos;ll enter the Alder Peak Capital sample portfolio.
      </p>
      <p className="mt-6 text-xs text-fg-3">
        {mode === "login" ? (
          <>
            New to {PRODUCT_NAME}?{" "}
            <Link href="/signup" className="text-fg-2 underline-offset-2 hover:text-fg hover:underline">
              Create a workspace
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-fg-2 underline-offset-2 hover:text-fg hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
