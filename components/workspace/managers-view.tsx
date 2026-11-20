"use client";

import { Check, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/empty-state";
import { THead, Table, Td, Th, Tr } from "@/components/ui/table";
import { inviteUploader, removeUploader, revokePendingInvite, setUploaderAccess } from "@/lib/workspace/actions";
import type { PendingInvite, Person, Property } from "@/lib/workspace/queries";
import { ConfirmButton, FormMessage, dateLabel } from "./shared";

type Uploader = Person & { property_ids: string[] };

export function ManagersView({ properties, uploaders, invites, canEdit }: { properties: Property[]; uploaders: Uploader[]; invites: PendingInvite[]; canEdit: boolean }) {
  const active = properties.filter((p) => !p.archived_at);
  const names = new Map(properties.map((p) => [p.id, p.name]));
  const listNames = (ids: string[]) => ids.map((id) => names.get(id)).filter(Boolean).join(", ") || "No properties";
  const router = useRouter();
  return (
    <>
        <div className="flex flex-col gap-4">
          {canEdit &&
            (active.length ? (
              <InviteCard properties={active} />
            ) : (
              <Card>
                <EmptyState title="Add a property first" description="Property managers upload to specific properties, so add one before inviting anyone." />
              </Card>
            ))}

          <Card>
            <CardHeader title="Uploaders" description="Access changes take effect immediately." />
            {uploaders.length === 0 ? (
              <EmptyState title="No property managers yet" description="Invited managers appear here once they accept." />
            ) : (
              <Table>
                <THead>
                  <Th>Person</Th>
                  <Th>Can upload to</Th>
                  {canEdit && <Th />}
                </THead>
                <tbody>
                  {uploaders.map((u) => (
                    <UploaderRow key={u.user_id} uploader={u} properties={active} canEdit={canEdit} summary={listNames(u.property_ids)} onChanged={() => router.refresh()} />
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          {canEdit && invites.length > 0 && (
            <Card>
              <CardHeader title="Pending invites" />
              <Table>
                <THead>
                  <Th>Email</Th>
                  <Th>Properties</Th>
                  <Th>Expires</Th>
                  <Th />
                </THead>
                <tbody>
                  {invites.map((inv) => (
                    <Tr key={inv.id}>
                      <Td>{inv.email}</Td>
                      <Td className="text-fg-2">{listNames(inv.property_ids)}</Td>
                      <Td className="text-fg-2">{dateLabel(inv.expires_at)}</Td>
                      <Td align="right">
                        <ConfirmButton label="Revoke" confirmLabel="Revoke invite" onConfirm={async () => (await revokePendingInvite(inv.id), router.refresh())} />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}
        </div>
    </>
  );
}

function PropertyChecks({ properties, selected, onChange }: { properties: Property[]; selected: string[]; onChange: (ids: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {properties.map((p) => (
        <label key={p.id} className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-fg">
          <input type="checkbox" className="size-3.5 accent-fg" checked={selected.includes(p.id)} onChange={(e) => onChange(e.target.checked ? [...selected, p.id] : selected.filter((x) => x !== p.id))} />
          {p.name}
        </label>
      ))}
    </div>
  );
}

function InviteCard({ properties }: { properties: Property[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Card>
      <CardHeader title="Invite a property manager" description="They sign up with email and password, and can upload only to the properties you choose." />
      <form
        className="flex flex-col gap-3 px-4 pb-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await inviteUploader(email, selected);
            if (!res.ok) return setMessage(res.message);
            setMessage(null);
            setLink(res.url);
            setCopied(false);
            setEmail("");
            setSelected([]);
            router.refresh();
          });
        }}
      >
        <div className="max-w-sm">
          <Field label="Their work email">{(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="manager@company.com" required />}</Field>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-fg-2">Properties they can upload to</span>
          <PropertyChecks properties={properties} selected={selected} onChange={setSelected} />
        </div>
        <FormMessage message={message} />
        <div>
          <Button type="submit" variant="primary" loading={pending}>
            Create invite
          </Button>
        </div>
        {link && (
          <div className="flex flex-col gap-1.5 rounded-md border border-border bg-bg p-3">
            <span className="text-xs text-fg-2">Send this link to them. It works once, for that email, for 7 days, and isn&apos;t shown again.</span>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate text-[11px] text-fg">{link}</code>
              <Button
                type="button"
                size="xs"
                variant="secondary"
                icon={copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                onClick={() => navigator.clipboard.writeText(link).then(() => setCopied(true))}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Card>
  );
}

function UploaderRow({ uploader, properties, canEdit, summary, onChanged }: { uploader: Uploader; properties: Property[]; canEdit: boolean; summary: string; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(uploader.property_ids);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Tr>
      <Td className="align-top">
        <div className="font-medium text-fg">{uploader.full_name ?? uploader.email}</div>
        {uploader.full_name && <div className="text-[11px] text-fg-3">{uploader.email}</div>}
      </Td>
      <Td className="whitespace-normal py-2 align-top text-fg-2">
        {editing ? (
          <div className="flex flex-col gap-2">
            <PropertyChecks properties={properties} selected={selected} onChange={setSelected} />
            <FormMessage message={message} />
            <span className="inline-flex gap-1">
              <Button
                type="button"
                size="xs"
                variant="primary"
                loading={pending}
                onClick={() =>
                  start(async () => {
                    const res = await setUploaderAccess(uploader.user_id, selected);
                    if (!res.ok) return setMessage(res.message);
                    setEditing(false);
                    onChanged();
                  })
                }
              >
                Save access
              </Button>
              <Button type="button" size="xs" variant="ghost" onClick={() => (setSelected(uploader.property_ids), setEditing(false))}>
                Cancel
              </Button>
            </span>
          </div>
        ) : (
          summary
        )}
      </Td>
      {canEdit && (
        <Td align="right" className="align-top">
          {!editing && (
            <span className="inline-flex items-center gap-1">
              <Button type="button" size="xs" variant="ghost" onClick={() => setEditing(true)}>
                Change access
              </Button>
              <ConfirmButton label="Remove" confirmLabel="Remove from organization" onConfirm={async () => (await removeUploader(uploader.user_id), onChanged())} />
            </span>
          )}
        </Td>
      )}
    </Tr>
  );
}
