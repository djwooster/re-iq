"use client";

import { Building2, Check, ChevronDown, Copy, FileSpreadsheet, LayoutGrid, Mail, Send, FileText, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Input, Select as UiSelect } from "@/components/ui/controls";
import { Drawer } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { formatFileSize } from "@/lib/format";
import { PRODUCT_NAME } from "@/lib/labels";
import { GL_LINES, uploadUrl, useCopyLink } from "./close";
import { fmt } from "./metrics";
import { profile } from "./numbers";
import { ALL_PROPERTY_IDS, CHART_OF_ACCOUNTS, CLOSE_MONTH, DEFAULT_NAMES, EXCEPTIONS, MANAGERS, MAPPING, MISSING, PACKAGE, RECEIVED, detectKind, fmtWhen, guessProperty, managerOfId, type ManagerId, type ReportKind, type Upload } from "./seed";
import { STEPS, type StepId } from "./setup-steps";
import { useWf, type Draft } from "./store";
import { Button, Select } from "./ui";

/**
 * Self-serve setup: each property with its reports, the managers who send
 * them, then a review of what RE-IQ found. Parsing is simulated; file names,
 * sizes, and report types come from what the user drops.
 */

const B = "/prototype/setup";

export function Setup({ step }: { step: StepId }) {
  const i = STEPS.findIndex((s) => s.id === step);
  const { state, hydrated } = useWf();
  const d = state.draft;
  const ready = d.properties.length > 0 && d.properties.every((p) => p.name.trim()) && d.properties.some((p) => p.reports.length);
  // Everything after Managers needs the companies that step sets up.
  const reachable = (n: number) => n === 0 || (ready && (n === 1 || d.managers.length > 0));
  const furthest = [3, 2, 1, 0].find(reachable) ?? 0;
  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg">
      <header className="grid h-12 grid-cols-[1fr_auto_1fr] items-center border-b border-border px-5">
        <Link href="/prototype" className="num justify-self-start text-[13px] font-semibold tracking-[0.06em]">
          {PRODUCT_NAME}
        </Link>
        <ol className="hidden items-center gap-1 md:flex" aria-label="Setup steps">
          {STEPS.map((s, n) => {
            const done = n < i;
            const current = n === i;
            const body = (
              <span className={cn("flex items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors", current ? "text-fg" : done ? "text-fg-2 hover:text-fg" : "text-fg-3")}>
                <span className={cn("num flex size-4 items-center justify-center rounded-full text-[9px] font-semibold", current ? "bg-inverted text-inverted-fg" : done ? "bg-favorable/15 text-favorable" : "border border-border")}>{done ? <Check className="size-2.5" strokeWidth={3} /> : n + 1}</span>
                {s.label}
              </span>
            );
            return (
              <li key={s.id} className="flex items-center gap-1" aria-current={current ? "step" : undefined}>
                {n > 0 && <span className="h-px w-5 bg-border" />}
                {reachable(n) && !current ? <Link href={`${B}/${s.id}`}>{body}</Link> : body}
              </li>
            );
          })}
        </ol>
        <span aria-hidden />
      </header>
      <motion.main key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }} className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-5 py-10">
        {!hydrated ? null : !reachable(i) ? (
          <div className="flex flex-col items-start gap-3">
            <Heading title="Finish the earlier steps first">This step needs at least one named property with a report.</Heading>
            <Button href={`${B}/${STEPS[furthest].id}`}>Go to {STEPS[furthest].label.toLowerCase()}</Button>
          </div>
        ) : (
          <>
            {step === "properties" && <Properties />}
            {step === "managers" && <Managers />}
            {step === "links" && <Links />}
            {step === "review" && <Review />}
          </>
        )}
      </motion.main>
    </div>
  );
}

function Heading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-[22px] leading-8 font-semibold tracking-tight">{title}</h1>
      {children && <p className="max-w-[560px] text-xs leading-relaxed text-fg-2">{children}</p>}
    </div>
  );
}

function Footer({ back, next, disabled, label = "Continue", onNext, hint }: { back?: StepId; next?: StepId; disabled?: boolean; label?: string; onNext?: () => void; hint?: string }) {
  const router = useRouter();
  return (
    <div className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-5">
      {back ? (
        <Link href={`${B}/${back}`} className="text-xs text-fg-2 hover:text-fg">
          Back
        </Link>
      ) : (
        <span />
      )}
      <span className="flex items-center gap-3">
        {hint && <span className="num text-xs text-fg-3">{hint}</span>}
        <Button variant="secondary" href="/prototype">
          Save and exit
        </Button>
        <Button
          disabled={disabled}
          onClick={() => {
            onNext?.();
            if (next) router.push(`${B}/${next}`);
          }}
        >
          {label}
        </Button>
      </span>
    </div>
  );
}

// ---- Step 1: properties and their reports ----

let seq = 0;
const uid = () => `u${Date.now().toString(36)}${(seq++).toString(36)}`;

/** The reports a property's manager sent for the month, as sample files. */
function sampleReports(id: string, name: string, all = false): Upload[] {
  if (!all && !RECEIVED[managerOfId(id).id]) return [];
  const slug = name.replace(/[^A-Za-z0-9]+/g, "_");
  return PACKAGE.filter((r) => !MISSING[id]?.includes(r)).map((r, n) => ({
    id: uid(),
    property: id,
    name: `${slug}_${r.replace(/(^|\s)(\w)/g, (_, sp, c: string) => c.toUpperCase()).replace(/[^A-Za-z0-9]+/g, "")}_Nov2026.${r === "GL" || r === "Capex" ? "csv" : r === "Renovation tracker" ? "pdf" : "xlsx"}`,
    kind: r,
    size: 38_000 + ((id.charCodeAt(0) * 97 + n * 7919) % 900_000),
  }));
}

/** Puts dropped files with a property (matching names first, then new rows) and a report type. */
function sort(d: Draft, files: { name: string; size: number }[]): Draft {
  const properties = d.properties.map((p) => ({ ...p, reports: [...p.reports] }));
  const unassigned = [...(d.unassigned ?? [])];
  for (const f of files) {
    const guess = guessProperty(f.name);
    let p = guess ? properties.find((x) => x.name.toLowerCase() === guess.toLowerCase()) : undefined;
    if (!p && guess) {
      const id = ALL_PROPERTY_IDS.find((x) => !properties.some((y) => y.id === x));
      if (id) properties.push((p = { id, name: guess, reports: [] }));
    }
    const upload = { id: uid(), property: p?.id ?? "", name: f.name, kind: detectKind(f.name), size: f.size };
    if (p) p.reports.push(upload);
    else unassigned.push(upload);
  }
  return { ...d, properties, unassigned };
}

const SHORT: Record<string, string> = { "Renovation tracker": "Reno tracker" };

const CHECKBOX = "size-3.5 cursor-pointer accent-[var(--text-primary)]";

/** Actions for the checked rows. */
function BulkEdit({ count, onFill, onDelete }: { count: number; onFill: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const pick = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  const noun = count === 1 ? "property" : "properties";
  return (
    <div ref={ref} className="relative">
      <Button variant="secondary" disabled={!count} onClick={() => setOpen((v) => !v)}>
        Bulk edit <ChevronDown className="size-3 text-fg-3" />
      </Button>
      {open && count > 0 && (
        <div role="menu" className="absolute top-full right-0 z-20 mt-1 w-60 rounded-lg border border-border bg-bg p-1 shadow-overlay">
          <button type="button" role="menuitem" onClick={pick(onFill)} className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-xs text-fg-2 hover:bg-fg/[0.04] hover:text-fg">
            <FileSpreadsheet className="size-3.5" /> Fill missing with sample reports
          </button>
          <button type="button" role="menuitem" onClick={pick(onDelete)} className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-xs text-unfavorable hover:bg-unfavorable/10">
            <Trash2 className="size-3.5" /> Delete {count} {noun}
          </button>
        </div>
      )}
    </div>
  );
}

function Properties() {
  const { state, act } = useWf();
  const d = state.draft;
  const set = act.setDraft;
  const [open, setOpen] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  // The total sits outside the table but lines up under the Units column.
  const unitsTh = useRef<HTMLTableCellElement>(null);
  const [unitsEnd, setUnitsEnd] = useState(0);
  const tableShown = d.properties.length > 0 || (d.unassigned?.length ?? 0) > 0;
  useLayoutEffect(() => {
    const th = unitsTh.current;
    const table = th?.closest("table");
    if (!th || !table) return;
    const measure = () => setUnitsEnd(th.offsetLeft + th.offsetWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(table);
    return () => ro.disconnect();
  }, [tableShown]);
  const { getRootProps, getInputProps, isDragActive, open: choose } = useDropzone({ onDrop: (files) => set((x) => sort(x, files)), noClick: true, multiple: true });
  const sample = () =>
    set((x) => ({
      ...x,
      managers: [],
      properties: ALL_PROPERTY_IDS.map((id) => ({ id, name: DEFAULT_NAMES.properties[id], reports: sampleReports(id, DEFAULT_NAMES.properties[id]) })),
      unassigned: [{ id: uid(), property: "", name: "Scan_0412.pdf", kind: "Other", size: 2_310_000 }],
    }));

  const nextId = ALL_PROPERTY_IDS.find((x) => !d.properties.some((p) => p.id === x));
  const remove = (id: string) => set((x) => ({ ...x, properties: x.properties.filter((p) => p.id !== id) }));
  const addOne = () => {
    if (!nextId) return;
    set((x) => ({ ...x, properties: [...x.properties, { id: nextId, name: "", reports: [] }] }));
    setOpen(nextId);
  };
  const addButton = (
    <Button variant="secondary" icon={<Plus className="size-3" />} onClick={addOne} disabled={!nextId}>
      Add a property
    </Button>
  );

  const sel = picked.filter((id) => d.properties.some((p) => p.id === id));
  const all = d.properties.length > 0 && sel.length === d.properties.length;
  const toggle = (id: string) => setPicked((x) => (x.includes(id) ? x.filter((q) => q !== id) : [...x, id]));
  const fillMissing = () =>
    set((x) => ({
      ...x,
      properties: x.properties.map((p) => {
        if (!sel.includes(p.id)) return p;
        const have = new Set(p.reports.map((r) => r.kind));
        return { ...p, reports: [...p.reports, ...sampleReports(p.id, p.name || DEFAULT_NAMES.properties[p.id], true).filter((r) => !have.has(r.kind))] };
      }),
    }));
  const deleteSelected = () => {
    set((x) => ({ ...x, properties: x.properties.filter((p) => !sel.includes(p.id)) }));
    setPicked([]);
  };

  const reports = d.properties.reduce((s, p) => s + p.reports.length, 0);
  const loose = d.unassigned ?? [];
  const empty = !d.properties.length && !loose.length;

  return (
    <>
      <Heading title={`Add ${CLOSE_MONTH}'s reports`}>
        Drop everything your managers sent for {CLOSE_MONTH}, for every property, in one go. {PRODUCT_NAME} sorts each file by property and report type. Check the table and fix anything it got wrong.
      </Heading>

      <div
        {...getRootProps()}
        className={cn("flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-center transition-colors duration-200", empty ? "px-6 py-12" : "px-4 py-4", isDragActive ? "border-fg-3 bg-fg/[0.035]" : "border-border-strong/70")}
      >
        <input {...getInputProps()} aria-label="Add reports" />
        <div className={cn("flex items-center gap-3", empty && "flex-col gap-2")}>
          <UploadCloud className={cn(empty ? "size-5" : "size-4", isDragActive ? "text-fg" : "text-fg-3")} strokeWidth={1.5} />
          <span className="text-xs">{isDragActive ? "Drop to add" : empty ? "Drop all of this month's reports here" : "Drop more reports"}</span>
          <span className={cn("flex items-center gap-2", empty && "mt-2")}>
            <Button variant="secondary" onClick={choose}>
              Choose files
            </Button>
            {empty && <Button onClick={sample}>Fill with sample reports</Button>}
          </span>
        </div>
      </div>

      {empty && (
        <div>{addButton}</div>
      )}

      {!empty && (
        <div className="flex flex-col gap-2">
          {loose.length > 0 && (
            <button type="button" onClick={() => setOpen("unassigned")} className="flex items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/[0.06] px-4 py-2.5 text-left text-xs transition-colors hover:border-warning/70">
              <span>
                {loose.length} {loose.length === 1 ? "file" : "files"} we couldn&apos;t match to a property
              </span>
              <span className="text-fg-2">Assign →</span>
            </button>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-fg-2">{sel.length > 0 && `${sel.length} selected`}</span>
            <BulkEdit count={sel.length} onFill={fillMissing} onDelete={deleteSelected} />
          </div>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-8 pl-4">
                    <input type="checkbox" aria-label="Select all properties" checked={all} ref={(el) => void (el && (el.indeterminate = sel.length > 0 && !all))} onChange={() => setPicked(all ? [] : d.properties.map((p) => p.id))} className={CHECKBOX} />
                  </th>
                  <th className="w-6 px-1 text-right text-xs font-medium text-fg-2">#</th>
                  <th className="text-xs font-medium text-fg-2 h-8 px-3 text-left">Property</th>
                  <th ref={unitsTh} className="text-xs font-medium text-fg-2 h-8 px-2 text-right">Units</th>
                  {PACKAGE.map((k) => (
                    <th key={k} className="text-xs font-medium text-fg-2 h-8 px-2 text-center whitespace-nowrap">
                      {SHORT[k] ?? k}
                    </th>
                  ))}
                  <th className="w-10" aria-label="Actions" />
                </tr>
              </thead>
              <motion.tbody initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.03 } } }}>
                {d.properties.map((p, n) => {
                  const rentRoll = p.reports.some((r) => r.kind === "Rent roll");
                  return (
                    <motion.tr
                      key={p.id}
                      variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } } }}
                      onClick={() => setOpen(p.id)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(p.id))}
                      tabIndex={0}
                      className={cn("group cursor-pointer border-b border-border/70 transition-colors last:border-b-0 hover:bg-fg/[0.025] focus-visible:bg-fg/[0.04] focus-visible:outline-none", sel.includes(p.id) && "bg-fg/[0.03]")}
                    >
                      <td className="pl-4" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" aria-label={`Select ${p.name || "property"}`} checked={sel.includes(p.id)} onChange={() => toggle(p.id)} className={CHECKBOX} />
                      </td>
                      <td className="num px-1 text-right text-fg-3">{n + 1}</td>
                      <td className="h-10 px-3 font-medium whitespace-nowrap">{p.name || <span className="text-fg-3">Unnamed property</span>}</td>
                      <td className="num px-2 text-right text-fg-2">{rentRoll ? profile(p.id).units : "–"}</td>
                      {PACKAGE.map((k) => (
                        <td key={k} className="px-2 text-center">
                          {p.reports.some((r) => r.kind === k) ? <Check className="mx-auto size-3.5 text-favorable" aria-label="Added" /> : <X className="mx-auto size-3.5 text-unfavorable/60" aria-label="Missing" />}
                        </td>
                      ))}
                      <td className="pr-2 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(p.id);
                          }}
                          aria-label={`Delete ${p.name || "property"}`}
                          title="Delete property"
                          className="rounded-md p-1.5 text-fg-3 transition-colors hover:bg-fg/[0.06] hover:text-unfavorable"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          </div>
          {/* Ends 8px past the Units column so the number lands where the column's numbers do (they sit 8px in from the cell edge). */}
          <div className="relative flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-xs font-medium" style={{ width: unitsEnd ? unitsEnd + 10 : undefined }}>
            <span>Total units</span>
            <span className="num absolute right-4">{fmt.int(d.properties.filter((p) => p.reports.some((r) => r.kind === "Rent roll")).reduce((s, p) => s + profile(p.id).units, 0))}</span>
          </div>
          <div>{addButton}</div>
        </div>
      )}

      <Footer
        next="managers"
        disabled={!d.properties.length || !d.properties.every((p) => p.name.trim()) || !reports}
        onNext={() => set((x) => ({ ...x, managers: managersFor(x, x.managers) }))}
      />

      <FilesDrawer id={open} onClose={() => setOpen(null)} />
    </>
  );
}

const UNASSIGNED = "Not matched";

/** One property's files (or the unmatched ones): rename, retype, move, remove, add. */
const NEW = "__new";

function FilesDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { state, act } = useWf();
  const d = state.draft;
  const p = d.properties.find((x) => x.id === id);
  const files = id === "unassigned" ? (d.unassigned ?? []) : (p?.reports ?? []);
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (fs) => p && act.setDraft((x) => ({ ...x, properties: x.properties.map((q) => (q.id === p.id ? { ...q, reports: [...q.reports, ...fs.map((f) => ({ id: uid(), property: p.id, name: f.name, kind: detectKind(f.name), size: f.size }))] } : q)) })),
    noClick: true,
    multiple: true,
  });

  const updateFile = (fileId: string, patch: Partial<Upload>) =>
    act.setDraft((x) => {
      const all = [...x.properties.flatMap((q) => q.reports), ...(x.unassigned ?? [])];
      const file = { ...all.find((f) => f.id === fileId)!, ...patch };
      const strip = (us: Upload[]) => us.filter((u) => u.id !== fileId);
      return {
        ...x,
        properties: x.properties.map((q) => ({ ...q, reports: q.id === file.property ? [...strip(q.reports), file] : strip(q.reports) })),
        unassigned: file.property ? strip(x.unassigned ?? []) : [...strip(x.unassigned ?? []), file],
      };
    });
  const removeFile = (fileId: string) => act.setDraft((x) => ({ ...x, properties: x.properties.map((q) => ({ ...q, reports: q.reports.filter((u) => u.id !== fileId) })), unassigned: (x.unassigned ?? []).filter((u) => u.id !== fileId) }));
  // Closing a property that was added and left untouched drops it again.
  const close = () => {
    if (p && !p.name.trim() && !p.reports.length) act.setDraft((x) => ({ ...x, properties: x.properties.filter((q) => q.id !== p.id) }));
    onClose();
  };
  const names = d.properties.map((q) => q.name || "Unnamed property");
  const owner = p && ownerOf(p);
  // Typing a new company's name; it's created on save.
  const [draftCompany, setDraftCompany] = useState<string | null>(null);
  const setOwner = (manager: string) => p && act.setDraft((x) => ({ ...x, properties: x.properties.map((q) => (q.id === p.id ? { ...q, manager } : q)) }));
  const companies = companiesOf(d);
  // With no companies yet there's nothing to pick, so go straight to typing one.
  const typing = draftCompany !== null || !companies.length;
  const saveCompany = () => {
    const name = draftCompany?.trim();
    if (!p || !name) return;
    const mid = `new-${uid()}`;
    act.setDraft((x) => ({ ...x, managers: [...x.managers, { id: mid, name, email: "", properties: [] }], properties: x.properties.map((q) => (q.id === p.id ? { ...q, manager: mid } : q)) }));
    setDraftCompany(null);
  };

  return (
    <Drawer
      open={!!id && (id === "unassigned" || !!p)}
      onClose={close}
      width={520}
      eyebrow={id === "unassigned" ? "Files" : <span className="text-property">Property</span>}
      icon={id === "unassigned" ? undefined : <Building2 className="size-[18px] text-property" strokeWidth={1.75} />}
      title={id === "unassigned" ? "Files we couldn't match" : p?.name || "Unnamed property"}
      footer={
        <>
          {p && (
            <Button
              variant="danger-ghost"
              icon={<Trash2 className="size-3.5" />}
              onClick={() => {
                act.setDraft((x) => ({ ...x, properties: x.properties.filter((q) => q.id !== p.id) }));
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
        {p && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg">Property name</span>
            <Input value={p.name} autoFocus={!p.name} placeholder="As it appears on your owner reports" onChange={(e) => act.setDraft((x) => ({ ...x, properties: x.properties.map((q) => (q.id === p.id ? { ...q, name: e.target.value } : q)) }))} />
          </label>
        )}
        {p && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="property-company" className="flex items-center justify-between text-xs font-medium text-fg">
              Management company
              {owner && !p.manager && <span className="font-normal text-fg-3">From reports</span>}
            </label>
            {!typing ? (
              <UiSelect id="property-company" value={owner ?? ""} onChange={(e) => (e.target.value === NEW ? setDraftCompany("") : setOwner(e.target.value))}>
                {!owner && (
                  <option value="" disabled>
                    Choose a company
                  </option>
                )}
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value={NEW}>New company…</option>
              </UiSelect>
            ) : (
              <span className="flex items-center gap-1.5">
                <Input
                  id="property-company"
                  autoFocus={draftCompany !== null}
                  value={draftCompany ?? ""}
                  placeholder={companies.length ? "Company name" : "Add a new company"}
                  onChange={(e) => setDraftCompany(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveCompany();
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      setDraftCompany(null);
                    }
                  }}
                  className="flex-1"
                />
                <button type="button" onClick={saveCompany} disabled={!draftCompany?.trim()} aria-label="Save company" className="rounded-md p-2 text-fg-2 transition-colors hover:bg-fg/[0.06] hover:text-fg disabled:opacity-40">
                  <Check className="size-3.5" />
                </button>
                {companies.length > 0 && (
                  <button type="button" onClick={() => setDraftCompany(null)} aria-label="Cancel" className="rounded-md p-2 text-fg-3 transition-colors hover:bg-fg/[0.06] hover:text-fg">
                    <X className="size-3.5" />
                  </button>
                )}
              </span>
            )}
          </div>
        )}
        {id === "unassigned" && <p className="text-xs text-fg-2">Pick the property each file belongs to, or remove it.</p>}
        {files.length > 0 && (
          <ul className="flex flex-col rounded-md border border-border">
            {files.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 border-b border-border/70 px-3 py-2.5 last:border-b-0">
                <div className="flex items-center gap-2.5">
                  {/\.pdf$/i.test(r.name) ? <FileText className="size-3.5 shrink-0 text-file-pdf" /> : <FileSpreadsheet className={cn("size-3.5 shrink-0", /\.csv$/i.test(r.name) ? "text-file-csv" : "text-file-xls")} />}
                  <span className="min-w-0 flex-1 truncate text-xs" title={r.name}>
                    {r.name}
                  </span>
                  <span className="num text-xs text-fg-3">{formatFileSize(r.size)}</span>
                  <button type="button" onClick={() => removeFile(r.id)} aria-label={`Remove ${r.name}`} className="rounded p-0.5 text-fg-3 hover:text-fg">
                    <X className="size-3" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 pl-6">
                  <Select label={`Report type for ${r.name}`} value={r.kind === "Other" ? "Not sure yet" : r.kind} onChange={(v) => updateFile(r.id, { kind: (v === "Not sure yet" ? "Other" : v) as ReportKind })} options={[...PACKAGE, "Not sure yet"]} />
                  <Select
                    label={`Property for ${r.name}`}
                    value={r.property ? (d.properties.find((q) => q.id === r.property)?.name || "Unnamed property") : UNASSIGNED}
                    onChange={(v) => updateFile(r.id, { property: v === UNASSIGNED ? "" : d.properties[names.indexOf(v)].id })}
                    options={[...names, UNASSIGNED]}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        {p && (
          <div {...getRootProps()} className={cn("flex items-center justify-center gap-3 rounded-md border border-dashed px-4 py-4 text-xs transition-colors", isDragActive ? "border-fg-3 bg-fg/[0.035]" : "border-border-strong/70")}>
            <input {...getInputProps()} aria-label={`Add reports for ${p.name || "this property"}`} />
            <UploadCloud className="size-4 text-fg-3" strokeWidth={1.5} />
            {isDragActive ? "Drop to add" : "Drop files for this property"}
            <button type="button" onClick={open} className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium hover:border-border-strong">
              Choose files
            </button>
            {!p.reports.length && (
              <button
                type="button"
                onClick={() => act.setDraft((x) => ({ ...x, properties: x.properties.map((q) => (q.id === p.id ? { ...q, name: q.name.trim() || DEFAULT_NAMES.properties[q.id], reports: sampleReports(q.id, q.name.trim() || DEFAULT_NAMES.properties[q.id], true) } : q)) }))}
                className="rounded-md bg-inverted px-2.5 py-1 text-xs font-medium text-inverted-fg hover:opacity-90"
              >
                Use sample reports
              </button>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}

type DraftProperty = Draft["properties"][number];

/** Who manages a property: the user's pick, else the company its reports came from. */
const ownerOf = (p: DraftProperty) => p.manager ?? (p.reports.length ? managerOfId(p.id).id : undefined);

/** Every company known so far: those already in setup plus any read off reports. */
const companiesOf = (d: Draft) => {
  const list = d.managers.map((m) => ({ id: m.id, name: m.name }));
  for (const p of d.properties) {
    const id = ownerOf(p);
    if (id && id in DEFAULT_NAMES.managers && !list.some((c) => c.id === id)) list.push({ id, name: DEFAULT_NAMES.managers[id as ManagerId].name });
  }
  return list.sort((x, y) => x.id.localeCompare(y.id));
};

/**
 * The companies behind the draft's properties, each with the properties it
 * manages. Names, emails and sent links already entered are kept, and so are
 * companies the user added.
 */
const managersFor = (d: Draft, prev: Draft["managers"]): Draft["managers"] => {
  const owner = (p: DraftProperty) => ownerOf(p) ?? managerOfId(p.id).id;
  const ids = [...new Set([...prev.map((m) => m.id), ...d.properties.map(owner)])];
  return ids
    .map((id) => {
      const seed = DEFAULT_NAMES.managers[id as ManagerId];
      const base = prev.find((m) => m.id === id) ?? { id, name: seed?.name ?? "", email: seed?.email ?? "", properties: [] };
      return { ...base, properties: d.properties.filter((p) => owner(p) === id).map((p) => p.id) };
    })
    // Seeded companies go once they manage nothing; added ones stay unless left blank.
    .filter((m) => m.properties.length || (!(m.id in DEFAULT_NAMES.managers) && m.name.trim()))
    .sort((x, y) => x.id.localeCompare(y.id));
};

// ---- Step 2: managers ----

const isEmail = (v: string) => /.+@.+\..+/.test(v);
const tokenOf = (id: string) => MANAGERS.find((x) => x.id === id)?.token ?? `${id}-${id.slice(-6)}`;

function Managers() {
  const { state, act } = useWf();
  const d = state.draft;
  const name = (id: string) => d.properties.find((p) => p.id === id)?.name || DEFAULT_NAMES.properties[id];
  const set = (id: string, patch: Partial<Draft["managers"][number]>) => act.setDraft((x) => ({ ...x, managers: x.managers.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  const move = (pid: string, to: string) =>
    act.setDraft((x) => ({
      ...x,
      properties: x.properties.map((q) => (q.id === pid ? { ...q, manager: to } : q)),
      managers: x.managers.map((m) => ({ ...m, properties: m.id === to ? [...m.properties, pid] : m.properties.filter((q) => q !== pid) })),
    }));
  const add = (pid?: string) => {
    const id = `new-${uid()}`;
    act.setDraft((x) => ({
      ...x,
      properties: x.properties.map((q) => (q.id === pid ? { ...q, manager: id } : q)),
      managers: [...x.managers.map((m) => ({ ...m, properties: m.properties.filter((q) => q !== pid) })), { id, name: "", email: "", properties: pid ? [pid] : [] }],
    }));
  };
  const active = d.managers.filter((m) => m.properties.length);
  return (
    <>
      <Heading title="Who sends you these reports?">Matched from your reports. Check each company and the email its reports come from.</Heading>
      <div className="flex flex-col gap-3">
        {d.managers.map((m) => {
          return (
            <div key={m.id} className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-fg">Management company</span>
                  <Input value={m.name} autoFocus={!m.name} onChange={(e) => set(m.id, { name: e.target.value })} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-fg">Reports email</span>
                  <Input type="email" value={m.email} onChange={(e) => set(m.id, { email: e.target.value, sent: undefined })} aria-invalid={m.email !== "" && !isEmail(m.email)} />
                </label>
                {!m.properties.length && (
                  <button type="button" onClick={() => act.setDraft((x) => ({ ...x, managers: x.managers.filter((q) => q.id !== m.id) }))} aria-label={`Remove ${m.name || "company"}`} title="Remove company" className="mb-1 rounded-md p-1.5 text-fg-3 transition-colors hover:bg-fg/[0.06] hover:text-unfavorable">
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {m.properties.map((id) => (
                  <PropertyChip key={id} label={name(id)} others={d.managers.filter((o) => o.id !== m.id)} onMove={(to) => move(id, to)} onNew={() => add(id)} />
                ))}
                {!m.properties.length && <span className="text-xs text-fg-3">Move a property here from another company</span>}
              </div>

            </div>
          );
        })}
      </div>
      <div>
        <Button variant="secondary" icon={<Plus className="size-3.5" />} onClick={() => add()}>
          Add a management company
        </Button>
      </div>
      <Footer back="properties" next="links" disabled={!active.length || !active.every((m) => m.name.trim() && isEmail(m.email))} />
    </>
  );
}

/** A property assigned to a company. Click to move it to another one. */
function PropertyChip({ label, others, onMove, onNew }: { label: string; others: Draft["managers"]; onMove: (to: string) => void; onNew: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const pick = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  const item = "flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-xs text-fg-2 hover:bg-fg/[0.04] hover:text-fg";
  return (
    <span ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu" className="flex h-6 items-center gap-1 rounded-md border border-border bg-bg pr-1.5 pl-2 text-xs text-property transition-colors hover:border-border-strong">
        {label}
        <ChevronDown className="size-3 text-fg-3" />
      </button>
      {open && (
        <div role="menu" className="absolute top-full left-0 z-20 mt-1 w-56 rounded-lg border border-border bg-bg p-1 shadow-overlay">
          {others.map((o) => (
            <button key={o.id} type="button" role="menuitem" onClick={pick(() => onMove(o.id))} className={item}>
              Move to {o.name || "the new company"}
            </button>
          ))}
          <button type="button" role="menuitem" onClick={pick(onNew)} className={item}>
            <Plus className="size-3" /> Move to a new company
          </button>
        </div>
      )}
    </span>
  );
}

// ---- Step 3: upload links ----

const HOW = [
  { icon: Mail, text: "Each company gets an email from RE-IQ with its own private link." },
  { icon: UploadCloud, text: "Every month, they upload the package there. No login, no template." },
  { icon: LayoutGrid, text: "The reports land in this workspace, sorted by property." },
];

function Links() {
  const { state, act } = useWf();
  const copy = useCopyLink();
  const toast = useToast();
  const d = state.draft;
  const active = d.managers.filter((m) => m.properties.length);
  const unsent = active.filter((m) => !m.sent);
  const send = (ids: string[]) => {
    act.setDraft((x) => ({ ...x, managers: x.managers.map((m) => (ids.includes(m.id) ? { ...m, sent: new Date().toISOString() } : m)) }));
    const sent = d.managers.filter((m) => ids.includes(m.id));
    toast(sent.length === 1 ? `Upload link sent to ${sent[0].name}` : `Upload links sent to ${sent.length} companies`, { detail: sent.length === 1 ? sent[0].email : undefined });
  };
  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <Heading title="Send each company its upload link" />
        {unsent.length > 0 && (
          <Button icon={<Send className="size-3" />} onClick={() => send(unsent.map((m) => m.id))}>
            {unsent.length === active.length ? `Send all ${unsent.length}` : `Send the other ${unsent.length}`}
          </Button>
        )}
      </div>

      <ol className="grid gap-3 sm:grid-cols-3">
        {HOW.map(({ icon: Icon, text }) => (
          <li key={text} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            <Icon className="size-4 text-fg-2" strokeWidth={1.75} />
            <span className="text-xs leading-relaxed text-fg">{text}</span>
          </li>
        ))}
      </ol>

      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        {active.map((m) => {
          const token = tokenOf(m.id);
          return (
            <li key={m.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium">{m.name}</span>
                <span className="block truncate text-xs text-fg-3">
                  {m.email} · {m.properties.length} {m.properties.length === 1 ? "property" : "properties"}
                </span>
              </span>
              <button type="button" onClick={() => copy(token)} className="flex items-center gap-1.5 text-xs text-fg-2 hover:text-fg" title="Copy upload link">
                <Copy className="size-3" />
                <span className="num">{uploadUrl(token)}</span>
              </button>
              <span className="flex w-[150px] justify-end">
                {m.sent ? (
                  <span className="flex items-center gap-2 text-xs text-fg-2">
                    <Check className="size-3 text-favorable" /> Sent {fmtWhen(m.sent)}
                    <button type="button" onClick={() => send([m.id])} className="font-medium text-fg hover:underline">
                      Resend
                    </button>
                  </span>
                ) : (
                  <Button variant="secondary" icon={<Send className="size-3" />} onClick={() => send([m.id])}>
                    Send
                  </Button>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <Footer back="managers" next="review" />
    </>
  );
}

// ---- Step 4: review what RE-IQ found ----

const CHECKS = ["Reading reports", "Mapping GL lines to your chart of accounts", "Reconciling rent rolls, cash, and statements", "Checking every KPI against your thresholds"];

function Review() {
  const { state, act } = useWf();
  const router = useRouter();
  const toast = useToast();
  const reduce = useReducedMotion();
  const d = state.draft;
  const [check, setCheck] = useState(d.reviewed ? CHECKS.length : 0);
  const done = check >= CHECKS.length;

  useEffect(() => {
    if (done) {
      if (!d.reviewed) act.setDraft((x) => ({ ...x, reviewed: true }));
      return;
    }
    const t = window.setTimeout(() => setCheck((c) => c + 1), reduce ? 0 : 700);
    return () => window.clearTimeout(t);
  }, [done, d.reviewed, act, reduce]);

  const ids = d.properties.map((p) => p.id);
  const reports = d.properties.reduce((s, p) => s + p.reports.length, 0);
  const gls = d.properties.filter((p) => p.reports.some((r) => r.kind === "GL")).length;
  const m3 = d.properties.some((p) => managerOfId(p.id).id === "m3" && p.reports.some((r) => r.kind === "GL"));
  const lines = m3 ? MAPPING.filter((l) => !l.sure) : [];
  const breaks = ids.includes("c") ? 1 : 0;
  const exceptions = EXCEPTIONS.filter((e) => ids.includes(e.property)).length;
  const unknown = d.properties.flatMap((p) => p.reports.filter((r) => r.kind === "Other"));
  const quiet = d.properties.filter((p) => !p.reports.length);
  const results = [
    `${reports} reports for ${d.properties.length} ${d.properties.length === 1 ? "property" : "properties"}${unknown.length ? ` · ${unknown.length} kept as other files` : ""}`,
    gls ? `${fmt.int(GL_LINES * gls - lines.length)} of ${fmt.int(GL_LINES * gls)} lines matched${lines.length ? ` · ${lines.length} new labels to confirm` : ""}` : "No GL yet · mapping runs when one arrives",
    breaks ? "1 break: a rent roll doesn't tie to its P&L" : "Everything ties",
    exceptions ? `${exceptions} ${exceptions === 1 ? "metric" : "metrics"} outside threshold` : "Every metric inside its threshold",
  ];

  const [accounts, setAccounts] = useState<Record<string, string>>({});
  const [ok, setOk] = useState<string[]>([]);
  const mname = (id: ManagerId) => d.managers.find((m) => m.id === id)?.name ?? DEFAULT_NAMES.managers[id].name;
  const finish = () => {
    act.finishSetup();
    act.approveMapping(ok);
    toast(`Welcome to ${PRODUCT_NAME}`, { detail: `${d.org.trim() || "Your workspace"} is ready.` });
    router.push("/prototype/overview");
  };

  return (
    <>
      <Heading title={done ? "Here's what we found" : "Reading your reports"}>
        {PRODUCT_NAME} maps every line to your chart of accounts, checks that the numbers tie, and measures each property against your thresholds.
      </Heading>

      <ol className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
        {CHECKS.map((c, n) => {
          const isDone = n < check;
          const current = n === check;
          return (
            <li key={c} className={cn("flex items-start gap-2.5 text-xs transition-opacity duration-300", !isDone && !current && "opacity-40")}>
              <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full", isDone ? "bg-favorable/15 text-favorable" : "border border-border")}>
                {isDone ? <Check className="size-2.5" strokeWidth={3} /> : current ? <span className="size-1.5 animate-pulse rounded-full bg-fg-3" /> : null}
              </span>
              <span className="flex flex-col">
                {c}
                {isDone && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-fg-3">
                    {results[n]}
                  </motion.span>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      {done && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }} className="flex flex-col gap-6">
          {lines.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-[13px] font-semibold">Confirm the lines we couldn&apos;t place</h2>
              <p className="text-xs text-fg-2">{mname("m3")} uses labels we haven&apos;t seen before. Our best guess is filled in; confirm now or later from Close. Your choice is remembered, so next month maps on its own.</p>
              <div className="overflow-hidden rounded-lg border border-border bg-surface">
                {lines.map((l) => {
                  const confirmed = ok.includes(l.id);
                  return (
                    <div key={l.id} className={cn("grid grid-cols-[1fr_200px_auto] items-center gap-3 border-b border-border/70 px-4 py-2.5 last:border-b-0", !confirmed && "bg-warning/[0.05]")}>
                      <span className="num text-xs">{l.label}</span>
                      <Select label={`Account for ${l.label}`} value={accounts[l.id] ?? l.account} onChange={(v) => setAccounts((a) => ({ ...a, [l.id]: v }))} options={CHART_OF_ACCOUNTS} />
                      {confirmed ? (
                        <button type="button" onClick={() => setOk((x) => x.filter((y) => y !== l.id))} className="flex w-[72px] items-center justify-end gap-1 text-xs text-favorable" aria-label={`Undo ${l.label}`}>
                          <Check className="size-3" /> Confirmed
                        </button>
                      ) : (
                        <span className="w-[72px] text-right">
                          <Button variant="secondary" onClick={() => setOk((x) => [...x, l.id])}>
                            Confirm
                          </Button>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {quiet.length > 0 && (
            <p className="rounded-md bg-fg/[0.035] px-3 py-2.5 text-xs text-fg-2">
              No reports yet for {quiet.map((p) => p.name).join(", ")}. They&apos;ll show as waiting on Close until the manager uploads.
            </p>
          )}

          <section aria-label="Your workspace" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Properties", String(d.properties.length)],
              ["Units", fmt.int(ids.reduce((s, id) => s + profile(id).units, 0))],
              ["Reports", String(reports)],
              ["Exceptions found", String(exceptions)],
            ].map(([l, v]) => (
              <div key={l} className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3">
                <span className="text-xs text-fg-3">{l}</span>
                <span className="num text-lg">{v}</span>
              </div>
            ))}
          </section>
        </motion.div>
      )}

      <div className="mt-2 flex items-center justify-between border-t border-border pt-5">
        <Link href={`${B}/links`} className="text-xs text-fg-2 hover:text-fg">
          Back
        </Link>
        <span className="flex items-center gap-3">
          <Button disabled={!done} onClick={finish}>
            Open dashboard
          </Button>
        </span>
      </div>
    </>
  );
}
