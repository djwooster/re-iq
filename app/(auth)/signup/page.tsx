import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/shell/auth-form";

export const metadata: Metadata = { title: "Create workspace" };

export default function SignupPage() {
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
