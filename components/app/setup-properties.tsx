"use client";

import { Building2, Check, ChevronDown, FileSpreadsheet, FileText, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button, Select } from "./ui";
import { Input, Select as UiSelect } from "@/components/ui/controls";
import { Drawer } from "@/components/ui/overlay";
import { cn } from "@/lib/cn";
import { formatFileSize } from "@/lib/format";
import { PACKAGE, REPORT_TYPE, detectKind, guessProperty, type ReportKind } from "@/lib/uploads/match";
import { reportTypeLabel } from "@/lib/uploads/report-types";
import { sendFile } from "@/lib/uploads/send";
import { addPropertyNamed, renameProperty, setPropertyArchived } from "@/lib/workspace/actions";
import type { Property, Upload } from "@/lib/workspace/queries";

/**
 * Setup's first step: drop the month's reports,
 * each file is matched to a property and a report type by its name, fix anything in the property's
 * drawer, then Continue. Dropped files wait in the browser until Continue (or Save and exit), which
 * creates the new properties, renames changed ones and uploads the files. Saved uploads can't be
 * edited, so they show read-only.
 */

interface Row {
  key: string;
  /** Set once the property exists. */
  id?: string;
  name: string;
  units: number | null;
  saved: Upload[];
}

interface Staged {
  id: string;
  file: File;
  /** The row it's for; empty when no property matched. */
  row: string;
  kind: ReportKind;
}

const UNASSIGNED = "unassigned";
const SHORT: Record<string, string> = { "Renovation tracker": "Reno tracker" };
const CHECKBOX = "size-3.5 cursor-pointer accent-[var(--text-primary)]";

let seq = 0;
const uid = () => `s${Date.now().toString(36)}${(seq++).toString(36)}`;

export function SetupProperties({ properties, uploads, period }: { properties: Property[]; uploads: Upload[]; period: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => properties.map((p) => ({ key: p.id, id: p.id, name: p.name, units: p.unit_count, saved: uploads.filter((u) => u.property_id === p.id) })));
  const [staged, setStaged] = useState<Staged[]>([]);
  const saved = useRef(new Map(properties.map((p) => [p.id, p.name])));
  const [open, setOpen] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const busy = progress !== null;

  // The total sits outside the table but lines up under the Units column.
  const unitsTh = useRef<HTMLTableCellElement>(null);
  const [unitsEnd, setUnitsEnd] = useState(0);
  const loose = staged.filter((s) => !s.row);
  const empty = !rows.length && !loose.length;
  useLayoutEffect(() => {
    const th = unitsTh.current;
    const table = th?.closest("table");
    if (!th || !table) return;
    const measure = () => setUnitsEnd(th.offsetLeft + th.offsetWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(table);
    return () => ro.disconnect();
  }, [empty]);

  /** Puts dropped files with a property (matching names first, then new rows) and a report type. */
  const add = (files: File[], row?: string) => {
    const next = [...rows];
    const adds: Staged[] = [];
    for (const file of files) {
      let key = row;
      if (key === undefined) {
        const guess = guessProperty(file.name);
        let match = guess ? next.find((r) => r.name.trim().toLowerCase() === guess.toLowerCase()) : undefined;
        if (!match && guess) next.push((match = { key: uid(), name: guess, units: null, saved: [] }));
        key = match?.key ?? "";
      }
      adds.push({ id: uid(), file, row: key, kind: detectKind(file.name) });
    }
    setRows(next);
    setStaged((s) => [...s, ...adds]);
  };
  const { getRootProps, getInputProps, isDragActive, open: choose } = useDropzone({ onDrop: (files) => add(files), noClick: true, multiple: true, disabled: busy });

  const has = (r: Row, k: ReportKind) => r.saved.some((u) => u.report_type === REPORT_TYPE[k]) || staged.some((s) => s.row === r.key && s.kind === k);
  const reports = rows.reduce((n, r) => n + r.saved.length, 0) + staged.filter((s) => s.row).length;

  const addOne = () => {
    const key = uid();
    setRows((x) => [...x, { key, name: "", units: null, saved: [] }]);
    setOpen(key);
  };
  const remove = async (keys: string[]) => {
    const gone = rows.filter((r) => keys.includes(r.key));
    setRows((x) => x.filter((r) => !keys.includes(r.key)));
    setStaged((s) => s.filter((f) => !keys.includes(f.row)));
    setPicked((x) => x.filter((k) => !keys.includes(k)));
    // A property that already exists is archived: it leaves the list and its reports stay.
    const existing = gone.filter((r) => r.id);
    if (!existing.length) return;
    const results = await Promise.all(existing.map((r) => setPropertyArchived(r.id!, true)));
    const failed = existing.filter((_, n) => !results[n].ok);
    if (failed.length) {
      setRows((x) => [...x, ...failed]);
      setErrors(failed.map((r) => `${r.name}: couldn't be removed. Try again.`));
    }
    router.refresh();
  };

  /** Creates and renames properties, then uploads the waiting files. True when everything saved. */
  const save = async () => {
    const errs: string[] = [];
    const ids = new Map<string, string>();
    setErrors([]);
    setProgress("Saving properties");
    for (const r of rows) {
      const name = r.name.trim();
      if (r.id) {
        ids.set(r.key, r.id);
        if (name === saved.current.get(r.id)) continue;
        const res = await renameProperty(r.id, name);
        if (res.ok) saved.current.set(r.id, name);
        else errs.push(`${name}: ${res.message}`);
        continue;
      }
      const res = await addPropertyNamed(name);
      if (!res.ok) {
        errs.push(`${name || "Unnamed property"}: ${res.message}`);
        continue;
      }
      ids.set(r.key, res.id);
      saved.current.set(res.id, name);
      // Keep the id so a retry doesn't add it twice.
      setRows((x) => x.map((q) => (q.key === r.key ? { ...q, id: res.id } : q)));
    }
    const queue = staged.filter((s) => ids.has(s.row));
    for (const [n, s] of queue.entries()) {
      setProgress(`Uploading ${n + 1} of ${queue.length}`);
      const res = await sendFile({ propertyId: ids.get(s.row)!, reportType: REPORT_TYPE[s.kind], period: period.slice(0, 7), fileName: s.file.name }, s.file);
      if (res.ok) setStaged((x) => x.filter((f) => f.id !== s.id));
      else errs.push(`${s.file.name}: ${res.message}`);
    }
    setProgress(null);
    setErrors(errs);
    router.refresh();
    return errs.length === 0;
  };

  const sel = picked.filter((k) => rows.some((r) => r.key === k));
  const all = rows.length > 0 && sel.length === rows.length;
  const toggle = (k: string) => setPicked((x) => (x.includes(k) ? x.filter((q) => q !== k) : [...x, k]));

  const addButton = (
    <Button variant="secondary" icon={<Plus className="size-3" />} onClick={addOne} disabled={busy}>
      Add a property
    </Button>
  );

  return (
    <>
      <Heading title="Add reports" />

      <div
        {...getRootProps()}
        className={cn("flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-center transition-colors duration-200", empty ? "px-6 py-12" : "px-4 py-4", isDragActive ? "border-fg-3 bg-fg/[0.035]" : "border-border-strong/70")}
      >
        <input {...getInputProps()} aria-label="Add reports" />
        <div className={cn("flex items-center gap-3", empty && "flex-col gap-2")}>
          <UploadCloud className={cn(empty ? "size-5" : "size-4", isDragActive ? "text-fg" : "text-fg-3")} strokeWidth={1.5} />
          <span className="text-xs">{isDragActive ? "Drop to add" : empty ? "Drop all of this month's reports here" : "Drop more reports"}</span>
          <span className={cn("flex items-center gap-2", empty && "mt-2")}>
            <Button variant="secondary" onClick={choose} disabled={busy}>
              Choose files
            </Button>
          </span>
        </div>
      </div>

      {empty && <div>{addButton}</div>}

      {!empty && (
        <div className="flex flex-col gap-2">
          {loose.length > 0 && (
            <button type="button" onClick={() => setOpen(UNASSIGNED)} className="flex items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/[0.06] px-4 py-2.5 text-left text-xs transition-colors hover:border-warning/70">
              <span>
                {loose.length} {loose.length === 1 ? "file" : "files"} we couldn&apos;t match to a property
              </span>
              <span className="text-fg-2">Assign →</span>
            </button>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-fg-2">{sel.length > 0 && `${sel.length} selected`}</span>
            <BulkEdit count={sel.length} onDelete={() => remove(sel)} />
          </div>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-8 pl-4">
                    <input type="checkbox" aria-label="Select all properties" checked={all} ref={(el) => void (el && (el.indeterminate = sel.length > 0 && !all))} onChange={() => setPicked(all ? [] : rows.map((r) => r.key))} className={CHECKBOX} />
                  </th>
                  <th className="w-6 px-1 text-right text-xs font-medium text-fg-2">#</th>
                  <th className="h-8 px-3 text-left text-xs font-medium text-fg-2">Property</th>
                  <th ref={unitsTh} className="h-8 px-2 text-right text-xs font-medium text-fg-2">
                    Units
                  </th>
                  {PACKAGE.map((k) => (
                    <th key={k} className="h-8 px-2 text-center text-xs font-medium whitespace-nowrap text-fg-2">
                      {SHORT[k] ?? k}
                    </th>
                  ))}
                  <th className="w-10" aria-label="Actions" />
                </tr>
              </thead>
              <motion.tbody initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.03 } } }}>
                {rows.map((r, n) => (
                  <motion.tr
                    key={r.key}
                    variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } } }}
                    onClick={() => setOpen(r.key)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(r.key))}
                    tabIndex={0}
                    className={cn("group cursor-pointer border-b border-border/70 transition-colors last:border-b-0 hover:bg-fg/[0.025] focus-visible:bg-fg/[0.04] focus-visible:outline-none", sel.includes(r.key) && "bg-fg/[0.03]")}
                  >
                    <td className="pl-4" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label={`Select ${r.name || "property"}`} checked={sel.includes(r.key)} onChange={() => toggle(r.key)} className={CHECKBOX} />
                    </td>
                    <td className="num px-1 text-right text-fg-3">{n + 1}</td>
                    <td className="h-10 px-3 font-medium whitespace-nowrap">{r.name || <span className="text-fg-3">Unnamed property</span>}</td>
                    <td className="num px-2 text-right text-fg-2">{r.units ?? "–"}</td>
                    {PACKAGE.map((k) => (
                      <td key={k} className="px-2 text-center">
                        {has(r, k) ? <Check className="mx-auto size-3.5 text-favorable" aria-label="Added" /> : <X className="mx-auto size-3.5 text-unfavorable/60" aria-label="Missing" />}
                      </td>
                    ))}
                    <td className="pr-2 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          remove([r.key]);
                        }}
                        aria-label={`Delete ${r.name || "property"}`}
                        title="Delete property"
                        className="rounded-md p-1.5 text-fg-3 transition-colors hover:bg-fg/[0.06] hover:text-unfavorable"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
          <div className="flex items-start justify-between gap-3">
            {/* Ends 8px past the Units column so the number lands where the column's numbers do (they sit 8px in from the cell edge). */}
            <div className="relative flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-xs font-medium" style={{ width: unitsEnd ? unitsEnd + 10 : undefined }}>
              <span>Total units</span>
              <span className="num absolute right-4">{rows.reduce((s, r) => s + (r.units ?? 0), 0).toLocaleString("en-US")}</span>
            </div>
            {addButton}
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs text-unfavorable">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex items-center justify-end gap-3 border-t border-border pt-5">
        {progress && <span className="num text-xs text-fg-3">{progress}</span>}
        <Button variant="secondary" disabled={busy} onClick={async () => (await save()) && router.push("/")}>
          Save and exit
        </Button>
        <Button disabled={busy || !rows.length || !rows.every((r) => r.name.trim()) || !reports} onClick={async () => (await save()) && router.push("/app/setup?step=managers")}>
          Continue
        </Button>
      </div>

      <FilesDrawer
        open={open}
        onClose={() => setOpen(null)}
        rows={rows}
        staged={staged}
        busy={busy}
        onRename={(key, name) => setRows((x) => x.map((r) => (r.key === key ? { ...r, name } : r)))}
        onFile={(id, patch) => setStaged((x) => x.map((s) => (s.id === id ? { ...s, ...patch } : s)))}
        onRemoveFile={(id) => setStaged((x) => x.filter((s) => s.id !== id))}
        onAdd={add}
        onDelete={(key) => remove([key])}
        onDropUntouched={(key) => setRows((x) => x.filter((r) => r.key !== key))}
      />
    </>
  );
}

function Heading({ title }: { title: string }) {
  return <h1 className="text-[22px] leading-8 font-semibold tracking-tight">{title}</h1>;
}

/** Actions for the checked rows. */
function BulkEdit({ count, onDelete }: { count: number; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <Button variant="secondary" disabled={!count} onClick={() => setOpen((v) => !v)}>
        Bulk edit <ChevronDown className="size-3 text-fg-3" />
      </Button>
      {open && count > 0 && (
        <div role="menu" className="absolute top-full right-0 z-20 mt-1 w-60 rounded-lg border border-border bg-bg p-1 shadow-overlay">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-xs text-unfavorable hover:bg-unfavorable/10"
          >
            <Trash2 className="size-3.5" /> Delete {count} {count === 1 ? "property" : "properties"}
          </button>
        </div>
      )}
    </div>
  );
}

function FileIcon({ name }: { name: string }) {
  return /\.pdf$/i.test(name) ? <FileText className="size-3.5 shrink-0 text-file-pdf" /> : <FileSpreadsheet className={cn("size-3.5 shrink-0", /\.csv$/i.test(name) ? "text-file-csv" : "text-file-xls")} />;
}

/** One property's files (or the unmatched ones): rename the property; retype, move or remove waiting files; add more. */
function FilesDrawer({
  open,
  onClose,
  rows,
  staged,
  busy,
  onRename,
  onFile,
  onRemoveFile,
  onAdd,
  onDelete,
  onDropUntouched,
}: {
  open: string | null;
  onClose: () => void;
  rows: Row[];
  staged: Staged[];
  busy: boolean;
  onRename: (key: string, name: string) => void;
  onFile: (id: string, patch: Partial<Staged>) => void;
  onRemoveFile: (id: string) => void;
  onAdd: (files: File[], row: string) => void;
  onDelete: (key: string) => void;
  onDropUntouched: (key: string) => void;
}) {
  const unassigned = open === UNASSIGNED;
  const r = rows.find((x) => x.key === open);
  const files = staged.filter((s) => (unassigned ? !s.row : s.row === r?.key));
  const { getRootProps, getInputProps, isDragActive, open: choose } = useDropzone({ onDrop: (fs) => r && onAdd(fs, r.key), noClick: true, multiple: true, disabled: busy });
  // Closing a property that was added and left untouched drops it again.
  const close = () => {
    if (r && !r.id && !r.name.trim() && !files.length) onDropUntouched(r.key);
    onClose();
  };

  return (
    <Drawer
      open={unassigned || !!r}
      onClose={close}
      width={520}
      eyebrow={unassigned ? "Files" : <span className="text-property">Property</span>}
      icon={unassigned ? undefined : <Building2 className="size-[18px] text-property" strokeWidth={1.75} />}
      title={unassigned ? "Files we couldn't match" : r?.name || "Unnamed property"}
      footer={
        <>
          {r && (
            <Button
              variant="danger-ghost"
              icon={<Trash2 className="size-3.5" />}
              disabled={busy}
              onClick={() => {
                onDelete(r.key);
                onClose();
              }}
            >
              Delete property
            </Button>
          )}
          <Button icon={<Check className="size-3.5" />} onClick={close}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 p-4">
        {r && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg">Property name</span>
            <Input value={r.name} autoFocus={!r.name} placeholder="As it appears on your owner reports" onChange={(e) => onRename(r.key, e.target.value)} />
          </label>
        )}
        {unassigned && <p className="text-xs text-fg-2">Pick the property each file belongs to, or remove it.</p>}
        {(files.length > 0 || (r && r.saved.length > 0)) && (
          <ul className="flex flex-col rounded-md border border-border">
            {r?.saved.map((u) => (
              <li key={u.id} className="flex flex-col gap-2 border-b border-border/70 px-3 py-2.5 last:border-b-0">
                <div className="flex items-center gap-2.5">
                  <FileIcon name={u.file_name} />
                  <span className="min-w-0 flex-1 truncate text-xs" title={u.file_name}>
                    {u.file_name}
                  </span>
                  <span className="num text-xs text-fg-3">{formatFileSize(u.size_bytes)}</span>
                </div>
                <span className="pl-6 text-xs text-fg-3">{reportTypeLabel(u.report_type)} · uploaded</span>
              </li>
            ))}
            {files.map((s) => (
              <li key={s.id} className="flex flex-col gap-2 border-b border-border/70 px-3 py-2.5 last:border-b-0">
                <div className="flex items-center gap-2.5">
                  <FileIcon name={s.file.name} />
                  <span className="min-w-0 flex-1 truncate text-xs" title={s.file.name}>
                    {s.file.name}
                  </span>
                  <span className="num text-xs text-fg-3">{formatFileSize(s.file.size)}</span>
                  <button type="button" onClick={() => onRemoveFile(s.id)} aria-label={`Remove ${s.file.name}`} className="rounded p-0.5 text-fg-3 hover:text-fg">
                    <X className="size-3" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 pl-6">
                  <Select label={`Report type for ${s.file.name}`} value={s.kind === "Other" ? "Not sure yet" : s.kind} onChange={(v) => onFile(s.id, { kind: (v === "Not sure yet" ? "Other" : v) as ReportKind })} options={[...PACKAGE, "Not sure yet"]} />
                  <UiSelect aria-label={`Property for ${s.file.name}`} value={s.row} onChange={(e) => onFile(s.id, { row: e.target.value })}>
                    {rows.map((q) => (
                      <option key={q.key} value={q.key}>
                        {q.name || "Unnamed property"}
                      </option>
                    ))}
                    <option value="">Not matched</option>
                  </UiSelect>
                </div>
              </li>
            ))}
          </ul>
        )}
        {r && (
          <div {...getRootProps()} className={cn("flex items-center justify-center gap-3 rounded-md border border-dashed px-4 py-4 text-xs transition-colors", isDragActive ? "border-fg-3 bg-fg/[0.035]" : "border-border-strong/70")}>
            <input {...getInputProps()} aria-label={`Add reports for ${r.name || "this property"}`} />
            <UploadCloud className="size-4 text-fg-3" strokeWidth={1.5} />
            {isDragActive ? "Drop to add" : "Drop files for this property"}
            <button type="button" onClick={choose} className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium hover:border-border-strong">
              Choose files
            </button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
