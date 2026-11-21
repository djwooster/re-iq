import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { AuthForm } from "@/components/shell/auth-form";
import { AcceptInvite } from "@/components/uploads/accept-invite";
import { getViewer } from "@/lib/auth/access";
import { INVITE_COOKIE } from "@/lib/auth/access-rules";

export const metadata: Metadata = { title: "Accept invitation" };

type Props = { searchParams: Promise<{ mode?: string }> };

/**
 * A property manager's invite. The proxy has already moved the token from the link into an
 * HTTP-only cookie. Signed out: create an account or sign in, with email and password only.
 * Signed in: accept, which adds them to the owner's org with access to the invited properties.
 */
export default function InvitePage({ searchParams }: Props) {
  return (
    <Suspense>
      <Invite searchParams={searchParams} />
    </Suspense>
  );
}

async function Invite({ searchParams }: Props) {
  const hasInvite = Boolean((await cookies()).get(INVITE_COOKIE)?.value);
  if (!hasInvite) {
    return (
      <div>
        <h1 className="text-[15px] font-semibold text-fg">Open your invite link</h1>
        <p className="mt-1 text-xs text-fg-3">Use the invitation link you were sent. Invites work once, for the email they were sent to, for 7 days.</p>
      </div>
    );
  }
  const viewer = await getViewer();
  if (viewer.kind === "user") {
    return (
      <div>
        <h1 className="text-[15px] font-semibold text-fg">Accept your invitation</h1>
        <p className="mt-1 text-xs text-fg-3">You&apos;ll be able to upload monthly reports for the properties the owner chose.</p>
        <AcceptInvite />
      </div>
    );
  }
  const { mode } = await searchParams;
  return <AuthForm mode={mode === "login" ? "login" : "signup"} invite />;
}
