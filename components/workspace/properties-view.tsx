"use client";

import { Archive, ArchiveRestore, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { createProperty, deleteProperty, setPropertyArchived, updateProperty } from "@/lib/workspace/actions";
import type { Property } from "@/lib/workspace/queries";
import { FormMessage } from "./shared";
import { PropertyTd, Row, RowMenu, SelectTd, SelectionBar, Table, Td, useSelection } from "@/components/app/ui";

export function PropertiesView({ properties, canEdit }: { properties: Property[]; canEdit: boolean }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<Property[] | null>(null);
  const [deleting, setDeleting] = useState<Property[] | null>(null);
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const selection = useSelection(properties);
  const { selected } = selection;
  const names = (k: number) => `${k} ${k === 1 ? "property" : "properties"}`;

  /** Archives or restores these properties; says how many didn't save. */
  const setArchived = (list: Property[], archived: boolean) =>
    start(async () => {
      const results = await Promise.all(list.map((p) => setPropertyArchived(p.id, archived)));
      const failed = results.filter((r) => !r.ok).length;
      setArchiving(null);
      if (!failed) selection.clear();
      toast(failed ? `${names(failed)} couldn't be ${archived ? "archived" : "restored"}` : `${names(list.length)} ${archived ? "archived" : "restored"}`);
      router.refresh();
    });

  const askDelete = (list: Property[]) => {
    setTyped("");
    setDeleting(list);
  };

  /** Deletes these properties and everything uploaded to them; says how many didn't go. */
  const remove = (list: Property[]) =>
    start(async () => {
      const results = await Promise.all(list.map((p) => deleteProperty(p.id, typed)));
      const failed = results.filter((r) => !r.ok).length;
      setDeleting(null);
      if (!failed) selection.clear();
      toast(failed ? `${names(failed)} couldn't be deleted` : `${names(list.length)} deleted`);
      router.refresh();
    });

  const active = selected.filter((p) => !p.archived_at);
  const archived = selected.filter((p) => p.archived_at);
  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <Card>
          <CardHeader title="Add a property" />
          <div className="px-4 pb-4">
            <PropertyForm submitLabel="Add property" onSubmit={createProperty} resetOnSuccess />
          </div>
        </Card>
      )}
      {properties.length === 0 ? (
        <Card>
          <EmptyState title="No properties yet" description={canEdit ? "Add your first property above. Then upload its reports yourself, or invite its property manager to." : "An owner adds properties."} />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {selected.length > 0 && (
            <SelectionBar count={selected.length} onClear={selection.clear}>
              {archived.length > 0 && (
                <Button variant="secondary" icon={<ArchiveRestore className="size-3.5" />} disabled={pending} onClick={() => setArchived(archived, false)}>
                  Restore{archived.length < selected.length ? ` (${archived.length})` : ""}
                </Button>
              )}
              {active.length > 0 && (
                <Button variant="danger-ghost" icon={<Archive className="size-3.5" />} disabled={pending} onClick={() => setArchiving(active)}>
                  Archive{active.length < selected.length ? ` (${active.length})` : ""}
                </Button>
              )}
              <Button variant="danger-ghost" icon={<Trash2 className="size-3.5" />} disabled={pending} onClick={() => askDelete(selected)}>
                Delete
              </Button>
            </SelectionBar>
          )}
          <Table columns={["Property", "Address", { label: "Units", num: true }, "Status", { label: "", sort: false }]} select={canEdit ? selection.select : undefined}>
            {properties.map((p) =>
              editing === p.id ? (
                <tr key={p.id} className="border-b border-border/70 last:border-b-0">
                  <td colSpan={canEdit ? 6 : 5} className="px-4 py-3">
                    <PropertyForm initial={p} submitLabel="Save" onSubmit={(fd) => updateProperty(p.id, fd)} onDone={() => setEditing(null)} onCancel={() => setEditing(null)} />
                  </td>
                </tr>
              ) : (
                <Row key={p.id} href={`/app/properties/${p.id}`} selected={selection.isSelected(p.id)}>
                  {canEdit && <SelectTd label={`Select ${p.name}`} checked={selection.isSelected(p.id)} onChange={() => selection.toggle(p.id)} />}
                  <PropertyTd>{p.name}</PropertyTd>
                  <Td className="text-fg-2">{p.address ?? "–"}</Td>
                  <Td num>{p.unit_count ?? "–"}</Td>
                  <Td>{p.archived_at ? <Badge tone="muted">Archived</Badge> : <Badge tone="favorable">Active</Badge>}</Td>
                  <Td className="w-10 text-right">
                    <RowMenu
                      label={p.name}
                      disabled={pending}
                      actions={[
                        { label: "Open", icon: ExternalLink, onSelect: () => router.push(`/app/properties/${p.id}`) },
                        ...(canEdit
                          ? [
                              { label: "Edit", icon: Pencil, onSelect: () => setEditing(p.id) },
                              p.archived_at
                                ? { label: "Restore", icon: ArchiveRestore, onSelect: () => setArchived([p], false) }
                                : { label: "Archive", icon: Archive, onSelect: () => setArchiving([p]), danger: true },
                              { label: "Delete", icon: Trash2, onSelect: () => askDelete([p]), danger: true },
                            ]
                          : []),
                      ]}
                    />
                  </Td>
                </Row>
              ),
            )}
          </Table>
        </div>
      )}
      <Modal
        open={!!archiving}
        onClose={() => setArchiving(null)}
        title={archiving?.length === 1 ? `Archive ${archiving[0].name}?` : `Archive ${names(archiving?.length ?? 0)}?`}
        description="Archived properties leave your lists and stop taking uploads. Their reports stay, and you can restore them anytime."
        footer={
          <>
            <Button variant="secondary" onClick={() => setArchiving(null)}>
              Cancel
            </Button>
            <Button variant="danger-ghost" disabled={pending} onClick={() => archiving && setArchived(archiving, true)}>
              {pending ? "Archiving…" : archiving?.length === 1 ? "Archive property" : `Archive ${names(archiving?.length ?? 0)}`}
            </Button>
          </>
        }
      />
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={deleting?.length === 1 ? `Delete ${deleting[0].name}?` : `Delete ${names(deleting?.length ?? 0)}?`}
        description="This deletes every report and file uploaded to them, what was read from those reports, and property managers' access. It can't be undone. To keep the reports, archive instead."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger-ghost" disabled={pending || typed.trim() !== "DELETE"} onClick={() => deleting && remove(deleting)}>
              {pending ? "Deleting…" : deleting?.length === 1 ? "Delete property" : `Delete ${names(deleting?.length ?? 0)}`}
            </Button>
          </>
        }
      >
        <Field label="Type DELETE to confirm">{(id) => <Input id={id} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />}</Field>
      </Modal>
    </div>
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
