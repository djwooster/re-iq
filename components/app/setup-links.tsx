"use client";

import { Check, LayoutGrid, Mail, Send, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { sendCompanyInvites } from "@/lib/workspace/actions";
import { dateLabel } from "@/lib/workspace/format";
import { Button } from "./ui";

/**
 * Setup's Upload links step: email each management company an invite to upload its properties'
 * reports. Whoever accepts creates an account (one account works across every owner they report
 * to). Sending is optional; Continue goes on either way.
 */

export interface LinkRow {
  id: string;
  name: string;
  email: string | null;
  properties: number;
  /** When the newest pending invite went out. */
  sentAt: string | null;
  /** Someone with this email already uploads for the org. */
  joined: boolean;
}

const HOW = [
  { icon: Mail, tone: "bg-spot-coral/12 text-spot-coral", text: "Each company gets an email from RE-IQ with its own invite." },
  { icon: UploadCloud, tone: "bg-spot-sun/15 text-spot-sun", text: "Every month, they upload the package. No template." },
  { icon: LayoutGrid, tone: "bg-spot-violet/12 text-spot-violet", text: "The reports land in this workspace, sorted by property." },
];

export function SetupLinks({ rows }: { rows: LinkRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [sending, setSending] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const unsent = rows.filter((r) => !r.sentAt && !r.joined && r.email);

  const send = (ids: string[]) =>
    start(async () => {
      setSending(ids);
      const results = await sendCompanyInvites(ids);
      setSending([]);
      setErrors((e) => ({ ...e, ...Object.fromEntries(results.map((r) => [r.id, r.ok ? "" : (r.message ?? "That didn't send.")])) }));
      const sent = results.filter((r) => r.ok);
      if (sent.length) {
        const one = rows.find((r) => r.id === sent[0].id);
        toast(sent.length === 1 ? `Invite sent to ${one?.name}` : `Invites sent to ${sent.length} companies`, { detail: sent.length === 1 ? (one?.email ?? undefined) : undefined });
      }
      router.refresh();
    });

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-[22px] leading-8 font-semibold tracking-tight">Send each company its upload link</h1>
        {unsent.length > 0 && (
          <Button icon={<Send className="size-3" />} disabled={pending} onClick={() => send(unsent.map((r) => r.id))}>
            {unsent.length === rows.length ? `Send all ${unsent.length}` : `Send the other ${unsent.length}`}
          </Button>
        )}
      </div>

      <ol className="grid gap-3 sm:grid-cols-3">
        {HOW.map(({ icon: Icon, tone, text }) => (
          <li key={text} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            <span className={cn("flex size-10 items-center justify-center rounded-lg", tone)}>
              <Icon className="size-5" strokeWidth={1.75} />
            </span>
            <span className="text-xs leading-relaxed text-fg">{text}</span>
          </li>
        ))}
      </ol>

      {rows.length ? (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium">{r.name}</span>
                <span className="block truncate text-xs text-fg-3">
                  {r.email ?? "No reports email"} · {r.properties} {r.properties === 1 ? "property" : "properties"}
                </span>
                {errors[r.id] && <span className="mt-1 block text-xs text-unfavorable">{errors[r.id]}</span>}
              </span>
              <span className="flex min-w-[150px] justify-end">
                {r.joined ? (
                  <span className="flex items-center gap-1.5 text-xs text-fg-2">
                    <Check className="size-3 text-favorable" /> Joined
                  </span>
                ) : r.sentAt ? (
                  <span className="flex items-center gap-2 text-xs text-fg-2">
                    <Check className="size-3 text-favorable" /> Sent {dateLabel(r.sentAt)}
                    <button type="button" disabled={pending} onClick={() => send([r.id])} className="font-medium text-fg hover:underline disabled:opacity-50">
                      {sending.includes(r.id) ? "Sending…" : "Resend"}
                    </button>
                  </span>
                ) : (
                  <Button variant="secondary" icon={<Send className="size-3" />} disabled={pending || !r.email} onClick={() => send([r.id])}>
                    {sending.includes(r.id) ? "Sending…" : "Send"}
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-xs text-fg-3">No management companies yet. Add them in the previous step, or continue and upload reports yourself.</p>
      )}

      <div className="mt-2 flex items-center justify-end gap-3 border-t border-border pt-5">
        <Button variant="secondary" href="/app/setup?step=managers">
          Back
        </Button>
        <Button href="/app/setup?step=review">Continue</Button>
      </div>
    </>
  );
}
