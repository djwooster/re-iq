import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/shell/auth-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <AuthForm mode="forgot" />
    </Suspense>
  );
}
