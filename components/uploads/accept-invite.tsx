"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { acceptInviteFromCookie } from "@/lib/auth/invites";

export function AcceptInvite() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mt-6 flex flex-col gap-3">
      <Button type="button" variant="primary" className="w-full" loading={pending} onClick={() => start(async () => setMessage((await acceptInviteFromCookie()).message))}>
        Accept invitation
      </Button>
      {message && (
        <p role="alert" className="text-xs text-unfavorable">
          {message}
        </p>
      )}
    </div>
  );
}
