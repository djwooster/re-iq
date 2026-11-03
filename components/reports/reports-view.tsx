"use client";

import { ArrowDown, ArrowUp, FileDown, Plus, RotateCcw, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/shell/app-context";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/empty-state";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { REPORT_KINDS, getReport, resetReport, saveReport, setReportShared, sharedReports, type ReportDoc, type ReportKind, type ReportSection } from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";

/** Reports for owners, LPs, and lenders: built from the data, edited by Jordan, shared when ready. */
export function ReportsView() {
  const { role } = useApp();
  const owner = role === "owner";
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { data: shared } = useData(async () => sharedReports(), []);
  const kinds = REPORT_KINDS.filter((k) => !owner || shared?.[k.id]);
  const kind = (params.get("type") as ReportKind) ?? kinds[0]?.id ?? "owner_monthly";

  return (
    <>
      <PageHeader title="Reports" subtitle={owner ? "Reports shared with you" : "Built from the same numbers as every screen. Edit the words; the tables stay tied to the data."} />
      <PageBody>
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav className="flex flex-col gap-1">
            {kinds.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => router.replace(`${pathname}?type=${k.id}`, { scroll: false })}
                className={cn("cursor-pointer rounded-md px-3 py-2 text-left transition-colors", kind === k.id ? "bg-fg/[0.06]" : "hover:bg-fg/[0.03]")}
              >
                <div className="text-xs font-medium text-fg">{k.label}</div>
                <div className="text-[11px] text-fg-3">{k.period}</div>
                {!owner && shared?.[k.id] && <div className="mt-0.5 text-[10px] text-favorable">Shared with owner</div>}
              </button>
            ))}
            {owner && kinds.length === 0 && <p className="px-3 text-xs text-fg-3">No reports shared yet.</p>}
          </nav>
          {owner && !kinds.some((k) => k.id === kind) ? (
            <Card>
              <EmptyState title="Not shared" description="This report hasn't been shared with you." />
            </Card>
          ) : (
            <Editor key={kind} kind={kind} readOnly={owner} shared={Boolean(shared?.[kind])} />
          )}
        </div>
      </PageBody>
    </>
  );
}

function Editor({ kind, readOnly, shared }: { kind: ReportKind; readOnly: boolean; shared: boolean }) {
  const [initial, setInitial] = useState<ReportDoc | null>(null);
  const [version, setVersion] = useState(0);
  // Load once per report; after that local edits lead and are saved as they happen.
  const { data } = useData(() => getReport(kind), [kind, version]);
  const doc = initial ?? data;
  if (!doc) return <Skeleton className="h-[600px] rounded-lg" />;
  return <DocEditor key={version} kind={kind} readOnly={readOnly} shared={shared} initial={doc} onLoaded={setInitial} onRebuilt={() => { setInitial(null); setVersion((v) => v + 1); }} />;
}

function DocEditor({
  kind,
  readOnly,
  shared,
  initial,
  onLoaded,
  onRebuilt,
}: {
  kind: ReportKind;
  readOnly: boolean;
  shared: boolean;
  initial: ReportDoc;
  onLoaded: (doc: ReportDoc) => void;
  onRebuilt: () => void;
}) {
  const toast = useToast();
  const [doc, setLocal] = useState<ReportDoc>(initial);
  const setDoc = (next: ReportDoc) => {
    setLocal(next);
    onLoaded(next);
  };
  const meta = REPORT_KINDS.find((k) => k.id === kind)!;

  const update = (sections: ReportSection[]) => {
    const next = { ...doc, sections };
    setDoc(next);
    void saveReport(next);
  };
  const editSection = (id: string, patch: Partial<ReportSection>) => update(doc.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const move = (i: number, d: -1 | 1) => {
    const list = [...doc.sections];
    [list[i], list[i + d]] = [list[i + d], list[i]];
    update(list);
  };

  return (
    <div className="flex flex-col gap-3">
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-fg-3">{doc.edited_at ? `Edited ${formatDate(doc.edited_at.slice(0, 10))}` : "Generated from the latest data"}</span>
          <div className="flex flex-wrap items-center gap-2">
            {doc.edited_at && (
              <Button
                size="xs"
                variant="ghost"
                icon={<RotateCcw className="size-3" />}
                onClick={async () => {
                  await resetReport(kind);
                  onRebuilt();
                  toast("Rebuilt from the latest data");
                }}
              >
                Rebuild
              </Button>
            )}
            <Button size="xs" icon={<FileDown className="size-3" />} onClick={() => toast("Export to PDF isn't in the prototype yet")}>
              PDF
            </Button>
            <Button size="xs" icon={<FileDown className="size-3" />} onClick={() => toast("Export to Excel isn't in the prototype yet")}>
              Excel
            </Button>
            {kind === "owner_monthly" || kind === "lp_quarterly" ? (
              <Button
                size="xs"
                variant={shared ? "secondary" : "primary"}
                onClick={async () => {
                  await setReportShared(kind, !shared);
                  toast(shared ? "No longer shared with the owner" : "Shared with Dana Whitfield");
                }}
              >
                {shared ? "Unshare" : "Share with owner"}
              </Button>
            ) : null}
          </div>
        </div>
      )}

      <Card className="px-8 py-8">
        <div className="eyebrow">{meta.audience}</div>
        <h2 className="mt-1 text-[17px] font-semibold text-fg">{meta.label}</h2>
        <p className="text-xs text-fg-3">Alder Peak Capital · {meta.period}</p>

        <div className="mt-6 flex flex-col gap-7">
          {doc.sections.map((s, i) => (
            <section key={s.id} className="group">
              <div className="flex items-center gap-2">
                {readOnly ? (
                  <h3 className="flex-1 text-[13px] font-semibold text-fg">{s.title}</h3>
                ) : (
                  <input
                    value={s.title}
                    onChange={(e) => editSection(s.id, { title: e.target.value })}
                    aria-label="Section title"
                    className="flex-1 rounded border border-transparent bg-transparent px-1 -mx-1 text-[13px] font-semibold text-fg hover:border-border focus:border-fg-3 focus:outline-none"
                  />
                )}
                {!readOnly && (
                  <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                    <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp className="size-3" />
                    </IconButton>
                    <IconButton label="Move down" disabled={i === doc.sections.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDown className="size-3" />
                    </IconButton>
                    <IconButton label="Remove section" onClick={() => update(doc.sections.filter((x) => x.id !== s.id))}>
                      <Trash2 className="size-3" />
                    </IconButton>
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-col gap-3">
                {s.blocks.map((b) =>
                  b.kind === "text" ? (
                    readOnly ? (
                      <p key={b.id} className="text-xs leading-5 text-fg-2">
                        {b.text}
                      </p>
                    ) : (
                      <textarea
                        key={b.id}
                        value={b.text}
                        placeholder="Write commentary"
                        onChange={(e) => editSection(s.id, { blocks: s.blocks.map((x) => (x.id === b.id ? { ...b, text: e.target.value } : x)) })}
                        className="-mx-1 resize-none rounded border border-transparent bg-transparent px-1 text-xs leading-5 text-fg-2 [field-sizing:content] hover:border-border focus:border-fg-3 focus:text-fg focus:outline-none"
                      />
                    )
                  ) : b.kind === "metrics" ? (
                    <dl key={b.id} className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-4">
                      {b.items.map((m) => (
                        <div key={m.label} className="bg-surface px-3 py-2">
                          <dt className="text-[11px] text-fg-3">{m.label}</dt>
                          <dd className="num text-[13px] text-fg">{m.value}</dd>
                          {m.detail && <dd className="text-[10px] text-fg-3">{m.detail}</dd>}
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <div key={b.id} className="overflow-hidden rounded-md border border-border">
                      <Table>
                        <THead>
                          {b.columns.map((c) => (
                            <Th key={c.label} align={c.align}>
                              {c.label}
                            </Th>
                          ))}
                        </THead>
                        <tbody>
                          {b.rows.map((r) => (
                            <Tr key={r.join("|")}>
                              {r.map((cell, j) => (
                                <Td key={j} align={b.columns[j].align} mono={b.columns[j].align === "right"} className={j === 0 ? "text-fg" : "text-fg-2"}>
                                  {cell}
                                </Td>
                              ))}
                            </Tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  ),
                )}
              </div>
            </section>
          ))}
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => update([...doc.sections, { id: `commentary_${Date.now().toString(36)}`, title: "Commentary", blocks: [{ kind: "text", id: `t_${Date.now().toString(36)}`, text: "" }] }])}
            className="mt-6 flex cursor-pointer items-center gap-1.5 text-[11px] text-fg-3 hover:text-fg"
          >
            <Plus className="size-3" /> Add commentary
          </button>
        )}
      </Card>
    </div>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="cursor-pointer rounded p-1 text-fg-3 hover:bg-fg/[0.05] hover:text-fg disabled:cursor-default disabled:opacity-30">
      {children}
    </button>
  );
}
