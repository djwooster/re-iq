"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Card, Field, Input, Row, Segmented, Select, Table, Tabs, Td } from "./ui";
import { useTheme } from "@/components/theme/theme-provider";
import { useToast } from "@/components/ui/toast";
import type { Account } from "@/lib/workspace/account";
import { saveThresholds, updateMyName } from "@/lib/workspace/actions";
import { deleteMyAccount } from "@/lib/workspace/delete-account";
import { ROLE_LABELS } from "@/lib/workspace/format";
import { CHART_OF_ACCOUNTS, KPIS } from "@/lib/workspace/kpis";
import type { Property, Threshold } from "@/lib/workspace/queries";
import { Page } from "./page";

/** Settings: profile, thresholds, properties, chart of accounts, team and workspace. */

type Tab = "profile" | "thresholds" | "accounts" | "team" | "workspace";

const SEES: Record<Account["role"], string> = { owner: "Everything; manages properties, managers and settings", member: "Everything; can't change settings or access" };

export function Settings({ account, properties, thresholds }: { account: Account; properties: Property[]; thresholds: Threshold[] }) {
  const [tab, setTab] = useState<Tab>("profile");
  const active = properties.filter((p) => !p.archived_at);
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
            { id: "thresholds", label: "Thresholds and targets" },
            { id: "accounts", label: "Chart of accounts" },
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
      {tab === "thresholds" && <Thresholds properties={active} saved={thresholds} canEdit={account.role === "owner"} />}
      {tab === "accounts" && (
        <Table columns={["Owner account", { label: "Manager labels mapped", num: true }]}>
          {CHART_OF_ACCOUNTS.map((a) => (
            <Row key={a}>
              <Td>{a}</Td>
              <Td num className="text-fg-3">
                —
              </Td>
            </Row>
          ))}
        </Table>
      )}
      {tab === "team" && (
        <Table columns={["Name", "Role", "Sees"]}>
          {account.team.map((p) => (
            <Row key={p.userId}>
              <Td>{p.name || p.email}</Td>
              <Td className="text-fg-2">{ROLE_LABELS[p.role]}</Td>
              <Td className="text-fg-2">{SEES[p.role]}</Td>
            </Row>
          ))}
        </Table>
      )}
      {tab === "workspace" && <Workspace orgName={account.orgName} />}
    </Page>
  );
}

function Profile({ account }: { account: Account }) {
  const toast = useToast();
  const router = useRouter();
  const [name, setName] = useState(account.name);
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const save = () =>
    start(async () => {
      const result = await updateMyName(name);
      if (!result.ok) return setError(result.message);
      setError(null);
      toast("Name saved");
      router.refresh();
    });
  return (
    <Card title="Profile">
      <div className="flex max-w-lg flex-col gap-4 text-xs">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        </Field>
        {error && (
          <p role="alert" className="text-xs text-unfavorable">
            {error}
          </p>
        )}
        <dl className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-fg-2">Email</dt>
            <dd className="font-medium">{account.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-fg-2">Role</dt>
            <dd className="font-medium">{ROLE_LABELS[account.role]}</dd>
          </div>
        </dl>
        <div>
          <Button onClick={save} disabled={saving || !name.trim() || name.trim() === account.name}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
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
  const remove = () =>
    start(async () => {
      const result = await deleteMyAccount(typed);
      if (result && !result.ok) setError(result.message);
    });
  return (
    <Card title="Delete account">
      <div className="flex max-w-lg flex-col gap-4 text-xs">
        <p className="leading-relaxed text-fg-2">
          {lastOwner
            ? `You're the only owner of ${account.orgName}, so deleting your account also deletes the organization: every property and every uploaded report and file${others > 0 ? `, and access for the ${others} other ${others === 1 ? "person" : "people"} on your team` : ""}. Your property managers lose access too. This can't be undone.`
            : `Your account and sign-in are deleted. ${account.orgName} and its reports stay with the rest of your team. This can't be undone.`}
        </p>
        <Field label="Type DELETE to confirm">
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </Field>
        {error && (
          <p role="alert" className="text-xs text-unfavorable">
            {error}
          </p>
        )}
        <div>
          <Button variant="danger-ghost" onClick={remove} disabled={pending || typed.trim() !== "DELETE"}>
            {pending ? "Deleting…" : lastOwner ? "Delete account and organization" : "Delete account"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Workspace({ orgName }: { orgName: string }) {
  const { preference, setPreference } = useTheme();
  return (
    <Card title="Workspace">
      <dl className="flex max-w-lg flex-col gap-4 text-xs">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-fg-2">Organization</dt>
          <dd className="font-medium">{orgName}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-fg-2">Theme</dt>
          <dd>
            <Segmented label="" value={preference === "system" ? "System" : preference === "dark" ? "Dark" : "Light"} options={["Light", "Dark", "System"] as const} onChange={(v) => setPreference(v.toLowerCase() as "light" | "dark" | "system")} />
          </dd>
        </div>
      </dl>
    </Card>
  );
}

const ALL = "All properties";

/** The thresholds table; Save stores the targets for the chosen scope. */
function Thresholds({ properties, saved, canEdit }: { properties: Property[]; saved: Threshold[]; canEdit: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const [scope, setScope] = useState(ALL);
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [saving, start] = useTransition();
  const propertyId = properties.find((p) => p.name === scope)?.id ?? null;
  const key = (kpi: string) => `${scope}:${kpi}`;
  // What a KPI shows for this scope: an edit in progress, else a saved target (property, then all), else the default.
  const current = (kpi: string, fallback: string) =>
    targets[key(kpi)] ?? saved.find((t) => t.kpi === kpi && t.property_id === propertyId)?.target ?? saved.find((t) => t.kpi === kpi && t.property_id === null)?.target ?? fallback;
  const save = () =>
    start(async () => {
      const values = Object.fromEntries(KPIS.map((k) => [k.kpi, current(k.kpi, k.target)]).filter(([kpi, value]) => value !== KPIS.find((k) => k.kpi === kpi)?.target));
      const result = await saveThresholds(propertyId, values);
      if (!result.ok) return toast(result.message);
      setTargets({});
      toast("Thresholds saved", { detail: `Applies to ${scope.toLowerCase()} from the next close.` });
      router.refresh();
    });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-48">
          <Field label="Applies to">
            <Select value={scope} onChange={setScope} options={[ALL, ...properties.map((p) => p.name)]} />
          </Field>
        </div>
        {canEdit && (
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        )}
      </div>
      <Table columns={["KPI", "Formula", "Source report", "Target or alert"]}>
        {KPIS.map((k) => (
          <Row key={k.kpi}>
            <Td className="font-medium whitespace-nowrap">{k.kpi}</Td>
            <Td className="text-xs text-fg-2">{k.formula}</Td>
            <Td className="whitespace-nowrap text-fg-2">{k.source}</Td>
            <Td className="w-64">
              <Input value={current(k.kpi, k.target)} disabled={!canEdit} onChange={(e) => setTargets((t) => ({ ...t, [key(k.kpi)]: e.target.value }))} />
            </Td>
          </Row>
        ))}
      </Table>
    </div>
  );
}
