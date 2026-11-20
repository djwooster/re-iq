"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Segmented, Tabs } from "@/components/ui/controls";
import { THead, Table, Td, Th, Tr } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import type { Account } from "@/lib/workspace/account";
import { renameOrg, updateMyName, type Result } from "@/lib/workspace/actions";
import { deleteMyAccount } from "@/lib/workspace/delete-account";
import { ROLE_LABELS } from "@/lib/workspace/format";
import { Page } from "./page";

type Tab = "profile" | "team" | "workspace";

export function Settings({ account }: { account: Account }) {
  const [tab, setTab] = useState<Tab>("profile");
  return (
    <Page
      title="Settings"
      subtitle={account.orgName}
      tabs={
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "profile", label: "Profile" },
            { id: "team", label: "Team" },
            { id: "workspace", label: "Workspace" },
          ]}
        />
      }
    >
      {tab === "profile" && (
        <>
          <Profile account={account} />
          <DeleteAccount account={account} />
        </>
      )}
      {tab === "team" && <Team account={account} />}
      {tab === "workspace" && <Workspace account={account} />}
    </Page>
  );
}

/** One editable text value with its own Save, for name-like fields. */
function SaveField({ label, initial, save, done }: { label: string; initial: string; save: (value: string) => Promise<Result>; done: string }) {
  const toast = useToast();
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const result = await save(value);
      if (!result.ok) return setError(result.message);
      setError(null);
      toast(done);
      router.refresh();
    });
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <Field label={label}>{(id) => <Input id={id} value={value} onChange={(e) => setValue(e.target.value)} maxLength={120} />}</Field>
      {error && (
        <p role="alert" className="text-xs text-unfavorable">
          {error}
        </p>
      )}
      <div>
        <Button type="submit" variant="primary" size="sm" loading={saving} disabled={value.trim() === initial || !value.trim()}>
          Save
        </Button>
      </div>
    </form>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <dt className="text-fg-2">{label}</dt>
      <dd className="font-medium text-fg">{children}</dd>
    </div>
  );
}

function Profile({ account }: { account: Account }) {
  return (
    <Card className="max-w-lg">
      <CardHeader title="Profile" />
      <div className="flex flex-col gap-5 px-4 pb-4">
        <SaveField label="Name" initial={account.name} save={updateMyName} done="Name saved" />
        <dl className="flex flex-col gap-3 border-t border-border pt-4">
          <Row label="Email">{account.email}</Row>
          <Row label="Role">{ROLE_LABELS[account.role]}</Row>
        </dl>
      </div>
    </Card>
  );
}

/** Deleting the account. Typing DELETE is the confirmation; the consequences are spelled out first. */
function DeleteAccount({ account }: { account: Account }) {
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const lastOwner = account.role === "owner" && account.team.filter((p) => p.role === "owner").length === 1;
  const others = account.team.length - 1;
  return (
    <Card className="max-w-lg">
      <CardHeader title="Delete account" />
      <div className="flex flex-col gap-4 px-4 pb-4 text-xs">
        <p className="leading-relaxed text-fg-2">
          {lastOwner ? (
            <>
              You&apos;re the only owner of <span className="font-medium text-fg">{account.orgName}</span>, so deleting your account also deletes the organization: every property, every uploaded report and file,
              {others > 0 ? ` and access for the ${others} other ${others === 1 ? "person" : "people"} on your team` : ""}, along with your property managers&apos; access. This can&apos;t be undone.
            </>
          ) : (
            <>Your account and sign-in are deleted. {account.orgName} and its reports stay with the rest of your team. This can&apos;t be undone.</>
          )}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const result = await deleteMyAccount(typed);
              if (result && !result.ok) setError(result.message);
            });
          }}
          className="flex flex-col gap-2"
        >
          <Field label="Type DELETE to confirm">{(id) => <Input id={id} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />}</Field>
          {error && (
            <p role="alert" className="text-xs text-unfavorable">
              {error}
            </p>
          )}
          <div>
            <Button type="submit" variant="danger" size="sm" loading={pending} disabled={typed.trim() !== "DELETE"}>
              {lastOwner ? "Delete account and organization" : "Delete account"}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}

function Team({ account }: { account: Account }) {
  return (
    <Card>
      <CardHeader title="Team" description="Everyone in your organization who can see the dashboard. Property managers are under Managers." />
      <Table>
        <THead>
          <Th>Name</Th>
          <Th>Email</Th>
          <Th>Role</Th>
        </THead>
        <tbody>
          {account.team.map((p) => (
            <Tr key={p.userId}>
              <Td className="font-medium text-fg">{p.name || "—"}</Td>
              <Td className="text-fg-2">{p.email}</Td>
              <Td className="text-fg-2">{ROLE_LABELS[p.role]}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

function Workspace({ account }: { account: Account }) {
  const { preference, setPreference } = useTheme();
  return (
    <Card className="max-w-lg">
      <CardHeader title="Workspace" />
      <div className="flex flex-col gap-5 px-4 pb-4">
        {account.role === "owner" ? (
          <SaveField label="Organization name" initial={account.orgName} save={renameOrg} done="Organization renamed" />
        ) : (
          <dl>
            <Row label="Organization">{account.orgName}</Row>
          </dl>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4 text-xs">
          <span className="text-fg-2">Theme</span>
          <Segmented
            label="Theme"
            value={preference}
            onChange={setPreference}
            options={[
              { id: "light", label: "Light" },
              { id: "dark", label: "Dark" },
              { id: "system", label: "System" },
            ]}
          />
        </div>
      </div>
    </Card>
  );
}
