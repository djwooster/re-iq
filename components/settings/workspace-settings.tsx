"use client";

import { Copy } from "lucide-react";
import { useTour } from "@/components/tour/tour";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/empty-state";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import {
  ALERT_RULES,
  ALL_GL_CATEGORIES,
  REPORT_KINDS,
  getCrosswalk,
  getOwnerViewSettings,
  listProperties,
  listSavedMappings,
  setOwnerViewSettings,
  setReportShared,
  sharedReports,
  uploadPath,
} from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import { CATEGORY_LABELS, SYSTEM_LABELS } from "@/lib/labels";
import type { GlCategory, PropertyManager, PropertyRecord } from "@/lib/types";

export function PropertiesAndManagers({ orgId }: { orgId: string }) {
  const toast = useToast();
  const { data } = useData(() => listProperties(orgId), [orgId]);
  if (!data) return <Skeleton className="h-60 rounded-lg" />;
  const managers = new Map<string, { manager: PropertyManager; properties: PropertyRecord[] }>();
  for (const { property } of data) {
    const m = managers.get(property.property_manager_id) ?? { manager: property.property_manager, properties: [] };
    m.properties.push(property);
    managers.set(property.property_manager_id, m);
  }
  const copy = async (m: PropertyManager) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${uploadPath(m)}`);
      toast(`Upload link for ${m.name} copied`);
    } catch {
      toast("Couldn't copy the link");
    }
  };
  return (
    <Card>
      <CardHeader title="Properties and managers" description="Who manages what, the software their exports come from, and each manager's upload link." />
      <Table>
        <THead>
          <Th>Manager</Th>
          <Th>Software</Th>
          <Th>Properties</Th>
          <Th>Contact</Th>
          <Th align="right">Upload link</Th>
        </THead>
        <tbody>
          {[...managers.values()].map(({ manager, properties }) => (
            <Tr key={manager.id}>
              <Td className="text-fg">{manager.name}</Td>
              <Td className="text-fg-2">{SYSTEM_LABELS[manager.system]}</Td>
              <Td className="whitespace-normal text-fg-2">{properties.map((p) => p.name).join(", ")}</Td>
              <Td className="text-fg-3">{manager.contact_name}</Td>
              <Td align="right">
                <Button size="xs" icon={<Copy className="size-3" />} onClick={() => copy(manager)}>
                  Copy
                </Button>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

export function ChartOfAccounts({ orgId }: { orgId: string }) {
  const { data } = useData(async () => {
    const [crosswalks, saved] = await Promise.all([Promise.all(ALL_GL_CATEGORIES.map((c) => getCrosswalk(orgId, c as GlCategory))), listSavedMappings(orgId)]);
    return { crosswalks, saved };
  }, [orgId]);
  if (!data) return <Skeleton className="h-60 rounded-lg" />;
  const managers = data.crosswalks[0].managers.map((m) => m.manager);
  return (
    <Card>
      <CardHeader title="Chart of accounts" description="The standard accounts every report maps to, and each manager's lines that land on them." />
      <Table>
        <THead>
          <Th>Standard account</Th>
          {managers.map((m) => (
            <Th key={m.id}>{m.name.split(" ")[0]}</Th>
          ))}
        </THead>
        <tbody>
          {data.crosswalks.map((c) => (
            <Tr key={c.category}>
              <Td className="text-fg">{c.label}</Td>
              {c.managers.map((m) => (
                <Td key={m.manager.id} className="text-[11px] whitespace-normal text-fg-3">
                  {m.lines.map((l) => l.label).join(", ") || "—"}
                </Td>
              ))}
            </Tr>
          ))}
        </tbody>
      </Table>
      <div className="border-t border-border px-4 py-3">
        <div className="eyebrow mb-1.5">Saved mappings</div>
        {data.saved.length ? (
          <ul className="flex flex-col gap-1">
            {data.saved.map((s) => (
              <li key={`${s.manager.id}-${s.code}`} className="text-xs text-fg-2">
                {s.manager.name}: <span className="num text-fg-3">{s.code}</span> {s.label} → <span className="text-fg">{s.target === "ignore" ? "Not imported" : CATEGORY_LABELS[s.target as GlCategory]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-fg-3">None yet. Changing a line in Mapping review saves it here for that manager.</p>
        )}
      </div>
    </Card>
  );
}

export function OwnerViewControls() {
  const toast = useToast();
  const { data } = useData(async () => ({ settings: getOwnerViewSettings(), shared: sharedReports() }), []);
  if (!data) return <Skeleton className="h-40 rounded-lg" />;
  const toggles: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }[] = [
    { label: "Issues in progress", hint: "Issues you're acting on, with your note", checked: data.settings.show_in_progress, onChange: (v) => setOwnerViewSettings({ show_in_progress: v }) },
    { label: "Property-level detail", hint: "NOI and occupancy for each property", checked: data.settings.show_properties, onChange: (v) => setOwnerViewSettings({ show_properties: v }) },
    ...REPORT_KINDS.filter((k) => k.id !== "lender").map((k) => ({
      label: `Share: ${k.label}`,
      hint: k.period,
      checked: Boolean(data.shared[k.id]),
      onChange: (v: boolean) => setReportShared(k.id, v),
    })),
  ];
  return (
    <Card>
      <CardHeader title="Owner view" description="What Dana Whitfield sees. Portfolio health and results achieved are always shown." />
      <ul className="border-t border-border">
        {toggles.map((t) => (
          <li key={t.label} className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-2.5 last:border-b-0">
            <span>
              <span className="block text-xs text-fg">{t.label}</span>
              <span className="block text-[11px] text-fg-3">{t.hint}</span>
            </span>
            <Switch
              checked={t.checked}
              label={t.label}
              onChange={async (v) => {
                await t.onChange(v);
                toast(v ? `${t.label}: shown to the owner` : `${t.label}: hidden from the owner`);
              }}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function AlertThresholds() {
  const toast = useToast();
  return (
    <Card>
      <CardHeader title="Alert thresholds" description="What becomes an issue. Changing these isn't wired up in the prototype." />
      <ul className="border-t border-border">
        {ALERT_RULES.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-2 last:border-b-0">
            <span className="text-xs text-fg-2">{r.label}</span>
            <Input defaultValue={r.value} aria-label={r.label} className="w-[180px]" onBlur={() => toast("Threshold changes aren't saved in the prototype")} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function DemoTour() {
  const { enabled, setEnabled } = useTour();
  return (
    <Card>
      <CardHeader
        title="Demo tour"
        description="For interviews and internal demos. Adds a Tour button at the bottom right that walks through the eight-step story."
        action={<Switch checked={enabled} label="Demo tour" onChange={setEnabled} />}
      />
    </Card>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn("relative h-4 w-7 shrink-0 cursor-pointer rounded-full transition-colors", checked ? "bg-fg" : "bg-fg/15")}
    >
      <span className={cn("absolute top-0.5 size-3 rounded-full bg-bg transition-transform", checked ? "translate-x-3.5" : "translate-x-0.5")} />
    </button>
  );
}
