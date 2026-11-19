"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/empty-state";
import { THead, Table, Td, Th, Tr } from "@/components/ui/table";
import { createProperty, setPropertyArchived, updateProperty } from "@/lib/workspace/actions";
import type { Property } from "@/lib/workspace/queries";
import { ConfirmButton, FormMessage } from "./shared";

export function PropertiesView({ properties, canEdit }: { properties: Property[]; canEdit: boolean }) {
  const [editing, setEditing] = useState<string | null>(null);
  const router = useRouter();
  const active = properties.filter((p) => !p.archived_at);
  return (
    <>
      <PageHeader title="Properties and reports" subtitle={`${active.length} active ${active.length === 1 ? "property" : "properties"}`} />
      <PageBody>
        <div className="flex flex-col gap-4">
          {canEdit && (
            <Card>
              <CardHeader title="Add a property" />
              <div className="px-4 pb-4">
                <PropertyForm submitLabel="Add property" onSubmit={createProperty} resetOnSuccess />
              </div>
            </Card>
          )}
          <Card>
            {properties.length === 0 ? (
              <EmptyState title="No properties yet" description={canEdit ? "Add your first property above, then invite its property manager to upload reports." : "An owner adds properties."} />
            ) : (
              <Table>
                <THead>
                  <Th>Property</Th>
                  <Th>Address</Th>
                  <Th align="right">Units</Th>
                  <Th>Status</Th>
                  {canEdit && <Th />}
                </THead>
                <tbody>
                  {properties.map((p) =>
                    editing === p.id ? (
                      <tr key={p.id} className="border-b border-border/70">
                        <td colSpan={5} className="px-4 py-3">
                          <PropertyForm
                            initial={p}
                            submitLabel="Save"
                            onSubmit={(fd) => updateProperty(p.id, fd)}
                            onDone={() => setEditing(null)}
                            onCancel={() => setEditing(null)}
                          />
                        </td>
                      </tr>
                    ) : (
                      <Tr key={p.id}>
                        <Td>
                          <Link href={`/app/workspace/properties/${p.id}`} className="font-medium text-property underline decoration-property/40 decoration-dashed underline-offset-[3px] hover:decoration-property">
                            {p.name}
                          </Link>
                        </Td>
                        <Td className="text-fg-2">{p.address ?? "–"}</Td>
                        <Td align="right" mono>
                          {p.unit_count ?? "–"}
                        </Td>
                        <Td>{p.archived_at ? <Badge tone="muted">Archived</Badge> : <Badge tone="favorable">Active</Badge>}</Td>
                        {canEdit && (
                          <Td align="right">
                            <span className="inline-flex items-center gap-1">
                              <Button type="button" size="xs" variant="ghost" onClick={() => setEditing(p.id)}>
                                Edit
                              </Button>
                              {p.archived_at ? (
                                <Button type="button" size="xs" variant="ghost" onClick={async () => (await setPropertyArchived(p.id, false), router.refresh())}>
                                  Restore
                                </Button>
                              ) : (
                                <ConfirmButton label="Archive" confirmLabel="Archive: stops uploads" onConfirm={async () => (await setPropertyArchived(p.id, true), router.refresh())} />
                              )}
                            </span>
                          </Td>
                        )}
                      </Tr>
                    ),
                  )}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
      </PageBody>
    </>
  );
}

function PropertyForm({
  initial,
  submitLabel,
  onSubmit,
  onDone,
  onCancel,
  resetOnSuccess,
}: {
  initial?: Property;
  submitLabel: string;
  onSubmit: (fd: FormData) => Promise<{ ok: true } | { ok: false; message: string }>;
  onDone?: () => void;
  onCancel?: () => void;
  resetOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1.2fr_1.6fr_0.6fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        start(async () => {
          const res = await onSubmit(fd);
          if (!res.ok) return setMessage(res.message);
          setMessage(null);
          if (resetOnSuccess) form.reset();
          onDone?.();
          router.refresh();
        });
      }}
    >
      <Field label="Name">{(id) => <Input id={id} name="name" defaultValue={initial?.name} maxLength={120} required placeholder="Maple Court" />}</Field>
      <Field label="Address">{(id) => <Input id={id} name="address" defaultValue={initial?.address ?? ""} maxLength={300} placeholder="120 Maple St, Denver, CO" />}</Field>
      <Field label="Units">{(id) => <Input id={id} name="unit_count" type="number" min={0} step={1} defaultValue={initial?.unit_count ?? ""} placeholder="96" />}</Field>
      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" loading={pending}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      <div className="sm:col-span-4">
        <FormMessage message={message} />
      </div>
    </form>
  );
}
