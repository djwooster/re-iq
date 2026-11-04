"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { CHART_OF_ACCOUNTS, KPIS, MANAGERS, ORG, PROPERTIES, manager } from "./seed";
import { Page } from "./shell";
import { Bar, barW, Button, Chip, Field, Input, Row, Select, Table, Tabs, Td } from "./ui";

type Tab = "thresholds" | "properties" | "accounts" | "team";

export function Settings() {
  const [tab, setTab] = useState<Tab>("thresholds");
  return (
    <Page title="Settings" subtitle={ORG}>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "thresholds", label: "Thresholds and targets" },
          { id: "properties", label: "Properties and managers" },
          { id: "accounts", label: "Chart of accounts" },
          { id: "team", label: "Team" },
        ]}
      />
      {tab === "thresholds" && <Thresholds />}
      {tab === "properties" && (
        <Table columns={["Property", "Manager", "Contact", "Upload link"]}>
          {PROPERTIES.map((p) => {
            const m = manager(p.manager);
            return (
              <Row key={p.id}>
                <Td>{p.name}</Td>
                <Td className="text-fg-2">{m.name}</Td>
                <Td className="text-fg-2">{m.contact}</Td>
                <Td className="num text-[11px] text-fg-3">re-iq.app/upload/{m.token}</Td>
              </Row>
            );
          })}
        </Table>
      )}
      {tab === "accounts" && (
        <Table columns={["Owner account", "Manager labels mapped", ...MANAGERS.map((m) => m.name)]}>
          {CHART_OF_ACCOUNTS.map((a, i) => (
            <Row key={a}>
              <Td>{a}</Td>
              <Td>
                <Bar w={barW(i, 3, 5)} />
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
            ["You", "Asset manager", "Everything; decides and assigns"],
            ["Analyst", "Analyst", "Everything; can draft questions and the owner report"],
            ["Owner", "Owner", "Owner report and decision log"],
          ].map(([n, r, s]) => (
            <Row key={n}>
              <Td>{n}</Td>
              <Td className="text-fg-2">{r}</Td>
              <Td className="text-fg-2">{s}</Td>
            </Row>
          ))}
        </Table>
      )}
    </Page>
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
        <Button onClick={() => toast("Thresholds saved")}>Save</Button>
      </div>
      <Table columns={["KPI", "Formula", "Source report", "Target or alert"]}>
        {KPIS.map((k) => (
          <Row key={k.kpi}>
            <Td className="font-medium whitespace-nowrap">{k.kpi}</Td>
            <Td className="text-[11px] text-fg-2">{k.formula}</Td>
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
