"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/components/theme/theme-provider";
import { uploadUrl } from "./close";
import { profile } from "./numbers";
import { CHART_OF_ACCOUNTS, KPIS, MANAGERS, PROPERTIES, manager } from "./seed";
import { Page } from "./shell";
import { useWf } from "./store";
import { Button, Card, Chip, Field, Input, Row, Segmented, Select, Table, Tabs, Td } from "./ui";

type Tab = "thresholds" | "properties" | "accounts" | "team" | "workspace";

export function Settings() {
  const { state } = useWf();
  const [tab, setTab] = useState<Tab>("thresholds");
  return (
    <Page
      title="Settings"
      subtitle={state.org}
      tabs={
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "thresholds", label: "Thresholds and targets" },
            { id: "properties", label: "Properties and managers" },
            { id: "accounts", label: "Chart of accounts" },
            { id: "team", label: "Team" },
            { id: "workspace", label: "Workspace" },
          ]}
        />
      }>
      {tab === "thresholds" && <Thresholds />}
      {tab === "properties" && (
        <Table columns={["Property", { label: "Units", num: true }, "Manager", "Reports email", "Upload link"]}>
          {PROPERTIES.map((p) => {
            const m = manager(p.manager);
            return (
              <Row key={p.id}>
                <Td className="font-medium">{p.name}</Td>
                <Td num className="text-fg-2">
                  {profile(p.id).units}
                </Td>
                <Td className="text-fg-2">{m.name}</Td>
                <Td className="text-fg-2">{m.email}</Td>
                <Td className="num text-xs text-fg-3">{uploadUrl(m.token)}</Td>
              </Row>
            );
          })}
        </Table>
      )}
      {tab === "accounts" && (
        <Table columns={["Owner account", { label: "Manager labels mapped", num: true }, ...MANAGERS.map((m) => m.name)]}>
          {CHART_OF_ACCOUNTS.map((a, i) => (
            <Row key={a}>
              <Td>{a}</Td>
              <Td num className="text-fg-2">
                {4 + ((i * 7 + 3) % 9)}
              </Td>
              {MANAGERS.map((m, j) => (
                <Td key={m.id}>{(i + j) % 7 === 3 ? <Chip tone="amber">Check</Chip> : <Chip tone="green">Mapped</Chip>}</Td>
              ))}
            </Row>
          ))}
        </Table>
      )}
      {tab === "team" && (
        <Table columns={["Name", "Role", "Sees"]}>
          {[
            [state.user.email, "Asset manager", "Everything; decides and assigns"],
            ["analyst@ownerfirm.com", "Analyst", "Everything; can draft the owner report"],
            ["owner@ownerfirm.com", "Owner", "Owner report and decision log"],
          ].map(([n, r, s]) => (
            <Row key={n}>
              <Td>{n}</Td>
              <Td className="text-fg-2">{r}</Td>
              <Td className="text-fg-2">{s}</Td>
            </Row>
          ))}
        </Table>
      )}
      {tab === "workspace" && <Workspace />}
    </Page>
  );
}

function Workspace() {
  const { preference, setPreference } = useTheme();
  const { state } = useWf();
  return (
    <Card title="Workspace">
      <dl className="flex max-w-lg flex-col gap-4 text-xs">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-fg-2">Organization</dt>
          <dd className="font-medium">{state.org}</dd>
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

function Thresholds() {
  const toast = useToast();
  const [scope, setScope] = useState("All properties");
  const [targets, setTargets] = useState<Record<string, string>>({});
  const key = (kpi: string) => `${scope}:${kpi}`;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-48">
          <Field label="Applies to">
            <Select value={scope} onChange={setScope} options={["All properties", ...PROPERTIES.map((p) => p.name)]} />
          </Field>
        </div>
        <Button onClick={() => toast("Thresholds saved", { detail: `Applies to ${scope.toLowerCase()} from the next close.` })}>Save</Button>
      </div>
      <Table columns={["KPI", "Formula", "Source report", "Target or alert"]}>
        {KPIS.map((k) => (
          <Row key={k.kpi}>
            <Td className="font-medium whitespace-nowrap">{k.kpi}</Td>
            <Td className="text-xs text-fg-2">{k.formula}</Td>
            <Td className="whitespace-nowrap text-fg-2">{k.source}</Td>
            <Td className="w-64">
              <Input value={targets[key(k.kpi)] ?? k.target} onChange={(e) => setTargets((t) => ({ ...t, [key(k.kpi)]: e.target.value }))} />
            </Td>
          </Row>
        ))}
      </Table>
    </div>
  );
}
