"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/shell/app-context";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { useTheme, type ThemePreference } from "@/components/theme/theme-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Segmented, Select } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/empty-state";
import { FadeIn } from "@/components/ui/motion";
import { Modal } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { getOrganization, inviteMember, listMembers, updateOrganization } from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import type { Member } from "@/lib/types";

const ROLE_LABEL: Record<Member["role"], string> = { admin: "Admin", member: "Member", viewer: "Viewer" };

export function SettingsView() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Appearance, organization, and team" />
      <PageBody narrow>
        <div className="flex flex-col gap-3">
          <FadeIn>
            <Appearance />
          </FadeIn>
          <FadeIn delay={0.05}>
            <Organization />
          </FadeIn>
          <FadeIn delay={0.1}>
            <Team />
          </FadeIn>
        </div>
      </PageBody>
    </>
  );
}

function Appearance() {
  const { preference, setPreference } = useTheme();
  return (
    <Card>
      <CardHeader
        title="Appearance"
        description="System follows your operating system setting."
        action={
          <Segmented<ThemePreference>
            label="Theme"
            value={preference}
            onChange={setPreference}
            options={[
              { id: "light", label: "Light" },
              { id: "dark", label: "Dark" },
              { id: "system", label: "System" },
            ]}
          />
        }
      />
    </Card>
  );
}

function Organization() {
  const { orgId } = useApp();
  const toast = useToast();
  const { data: org } = useData(() => getOrganization(orgId), [orgId]);
  const [name, setName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const value = name ?? org?.name ?? "";
  const dirty = org && name !== null && name.trim() !== org.name;

  const save = async () => {
    if (!dirty) return;
    setSaving(true);
    await updateOrganization(orgId, { name: value.trim() });
    setSaving(false);
    setName(null);
    toast("Organization name updated");
  };

  return (
    <Card>
      <CardHeader title="Organization" />
      <div className="flex flex-col gap-4 px-4 pb-4">
        {!org ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="num flex size-12 items-center justify-center rounded-lg border border-dashed border-border-strong text-sm text-fg-3">
                {org.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div>
                <div className="text-xs text-fg">Logo</div>
                <p className="text-[11px] text-fg-3">Shown in the sidebar and on shared reports. Logo upload arrives with real storage.</p>
              </div>
            </div>
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
            >
              <div className="flex-1">
                <Field label="Organization name">{(id) => <Input id={id} value={value} onChange={(e) => setName(e.target.value)} maxLength={80} />}</Field>
              </div>
              <Button type="submit" variant="primary" disabled={!dirty || !value.trim()} loading={saving}>
                Save
              </Button>
            </form>
          </>
        )}
      </div>
    </Card>
  );
}

function Team() {
  const { orgId } = useApp();
  const toast = useToast();
  const { data: members } = useData(() => listMembers(orgId), [orgId]);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Member["role"]>("member");
  const [sending, setSending] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const invite = async () => {
    if (!valid) return;
    setSending(true);
    await inviteMember(orgId, { email, role });
    setSending(false);
    setOpen(false);
    setEmail("");
    toast("Invite recorded", { detail: `${email} appears as invited. No email is sent in this preview.` });
  };

  return (
    <Card>
      <CardHeader
        title="Team"
        description={members ? `${members.filter((m) => m.status === "active").length} members` : " "}
        action={
          <Button icon={<UserPlus className="size-3" />} onClick={() => setOpen(true)}>
            Invite
          </Button>
        }
      />
      <ul>
        {(members ?? []).map((m) => (
          <li key={m.id} className="flex items-center gap-3 border-t border-border/70 px-4 py-2.5">
            <span className="num flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-bg text-[10px] text-fg-2">{m.initials}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs text-fg">{m.name}</span>
              <span className="block truncate text-[11px] text-fg-3">
                {m.email} · {m.title}
              </span>
            </span>
            {m.status === "invited" && <Badge tone="warning">Invited</Badge>}
            <Badge tone="muted">{ROLE_LABEL[m.role]}</Badge>
          </li>
        ))}
      </ul>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Invite a teammate"
        description="Invites are a placeholder in this preview: the person is added as invited, and no email is sent."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!valid} loading={sending} onClick={invite}>
              Add invite
            </Button>
          </>
        }
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            invite();
          }}
        >
          <Field label="Work email">{(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" autoFocus />}</Field>
          <Field label="Role" hint="Viewers can see everything but can't change actions or upload reports.">
            {(id) => (
              <Select id={id} value={role} onChange={(e) => setRole(e.target.value as Member["role"])}>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </Select>
            )}
          </Field>
        </form>
      </Modal>
    </Card>
  );
}
