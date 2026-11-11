"use client";

import { Check, Copy, FileSpreadsheet, FileText, Plus, UploadCloud, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Input } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { formatFileSize } from "@/lib/format";
import { PRODUCT_NAME } from "@/lib/labels";
import { GL_LINES, uploadUrl, useCopyLink } from "./close";
import { fmt } from "./metrics";
import { profile } from "./numbers";
import { ALL_PROPERTY_IDS, CHART_OF_ACCOUNTS, CLOSE_MONTH, DEFAULT_NAMES, EXCEPTIONS, MANAGERS, MAPPING, MISSING, PACKAGE, RECEIVED, detectKind, managerOfId, type ManagerId, type ReportKind, type Upload } from "./seed";
import { STEPS, type StepId } from "./setup-steps";
import { useWf, type Draft } from "./store";
import { Button, Chip, Select } from "./ui";

/**
 * Self-serve setup: each property with its reports, the managers who send
 * them, then a review of what RE-IQ found. Parsing is simulated; file names,
 * sizes, and report types come from what the user drops.
 */

const B = "/prototype/setup";
const EASE = [0.16, 1, 0.3, 1] as const;
const MAX = ALL_PROPERTY_IDS.length;

export function Setup({ step }: { step: StepId }) {
  const i = STEPS.findIndex((s) => s.id === step);
  const { state, hydrated } = useWf();
  const d = state.draft;
  const ready = d.properties.length > 0 && d.properties.every((p) => p.name.trim()) && d.properties.some((p) => p.reports.length);
  const reachable = (n: number) => n === 0 || (n === 1 && ready) || (n === 2 && ready && d.managers.length > 0);
  const furthest = [2, 1, 0].find(reachable) ?? 0;
  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg">
      <header className="flex h-12 items-center justify-between border-b border-border px-5">
        <Link href="/prototype" className="num text-[13px] font-semibold tracking-[0.06em]">
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
        <Link href="/prototype" className="text-[11px] text-fg-3 hover:text-fg">
          Save and exit
        </Link>
      </header>
      <motion.main key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }} className="flex w-full max-w-[920px] flex-1 flex-col gap-6 px-5 py-10 md:px-20">
        <p className="eyebrow">
          Step {i + 1} of {STEPS.length}
        </p>
        {!hydrated ? null : !reachable(i) ? (
          <div className="flex flex-col items-start gap-3">
            <Heading title="Finish the earlier steps first">This step needs at least one named property with a report.</Heading>
            <Button href={`${B}/${STEPS[furthest].id}`}>Go to {STEPS[furthest].label.toLowerCase()}</Button>
          </div>
        ) : (
          <>
            {step === "properties" && <Properties />}
            {step === "managers" && <Managers />}
            {step === "review" && <Review />}
          </>
        )}
      </motion.main>
    </div>
  );
}

function Heading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="-mt-4 flex flex-col gap-1">
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
        {hint && <span className="num text-[11px] text-fg-3">{hint}</span>}
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
function sampleReports(id: string, name: string): Upload[] {
  if (!RECEIVED[managerOfId(id).id]) return [];
  const slug = name.replace(/[^A-Za-z0-9]+/g, "_");
  return PACKAGE.filter((r) => !MISSING[id]?.includes(r)).map((r, n) => ({
    id: uid(),
    property: id,
    name: `${slug}_${r.replace(/[^A-Za-z0-9]+/g, "")}_Nov2026.${r === "GL" || r === "Capex" ? "csv" : r === "Renovation tracker" ? "pdf" : "xlsx"}`,
    kind: r,
    size: 38_000 + ((id.charCodeAt(0) * 97 + n * 7919) % 900_000),
  }));
}

const blank = (id: string): Draft["properties"][number] => ({ id, name: "", reports: [] });

function Properties() {
  const { state, act } = useWf();
  const d = state.draft;
  const set = act.setDraft;
  const nextId = ALL_PROPERTY_IDS.find((id) => !d.properties.some((p) => p.id === id));

  // Start with one blank property; "Fill with sample reports" fills the form in one click.
  useEffect(() => {
    set((x) => (x.properties.length ? x : { ...x, properties: [blank(ALL_PROPERTY_IDS[0])] }));
  }, [set]);

  const add = () => nextId && set((x) => ({ ...x, properties: [...x.properties, blank(nextId)] }));
  const sample = () =>
    set((x) => ({
      ...x,
      managers: [],
      properties: ALL_PROPERTY_IDS.map((id) => {
        const name = x.properties.find((p) => p.id === id)?.name.trim() || DEFAULT_NAMES.properties[id];
        return { id, name, reports: sampleReports(id, name) };
      }),
    }));

  const reports = d.properties.reduce((s, p) => s + p.reports.length, 0);
  const named = d.properties.every((p) => p.name.trim());
  const hasReports = d.properties.some((p) => p.reports.length);
  const first = state.user.name.trim().split(" ")[0];

  return (
    <>
      <Heading title={first && state.user.name !== "Asset manager" ? `Welcome, ${first}. Add your properties.` : "Add your properties"}>
        For each property, add the reports your manager sent for {CLOSE_MONTH}: P&amp;L, T-12, rent roll, box score, AR aging, capex, renovation tracker, GL. Any format, any file names. {PRODUCT_NAME} reads each one and works out what it is.
      </Heading>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-4 py-3">
        <span className="text-xs text-fg-2">Trying it out? Fill the form with twelve sample properties and their {CLOSE_MONTH} reports.</span>
        <Button variant="secondary" icon={<UploadCloud className="size-3" />} onClick={sample}>
          Fill with sample reports
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {d.properties.map((p, n) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
              <PropertyCard n={n} p={p} canRemove={d.properties.length > 1} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" icon={<Plus className="size-3" />} onClick={add} disabled={!nextId}>
          Add another property
        </Button>
        {!nextId && <span className="text-[11px] text-fg-3">Up to {MAX} properties in this prototype</span>}
      </div>

      <Footer
        next="managers"
        disabled={!named || !hasReports}
        hint={`${d.properties.length} ${d.properties.length === 1 ? "property" : "properties"} · ${reports} ${reports === 1 ? "report" : "reports"}`}
        onNext={() => set((x) => ({ ...x, managers: managersFor(x, x.managers) }))}
      />
    </>
  );
}

type DraftProperty = Draft["properties"][number];

function PropertyCard({ n, p, canRemove }: { n: number; p: DraftProperty; canRemove: boolean }) {
  const { act } = useWf();
  const update = (fn: (q: DraftProperty) => DraftProperty) => act.setDraft((x) => ({ ...x, properties: x.properties.map((q) => (q.id === p.id ? fn(q) : q)) }));
  const remove = () => act.setDraft((x) => ({ ...x, properties: x.properties.filter((q) => q.id !== p.id) }));
  const addFiles = (files: File[]) => update((q) => ({ ...q, reports: [...q.reports, ...files.map((f) => ({ id: uid(), property: p.id, name: f.name, kind: detectKind(f.name), size: f.size }))] }));
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ onDrop: addFiles, noClick: true, multiple: true });
  const rentRoll = p.reports.some((r) => r.kind === "Rent roll");
  const missing = PACKAGE.filter((k) => !p.reports.some((r) => r.kind === k));

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-end gap-3">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-[11px] font-medium text-fg-2">Property name</span>
          <Input value={p.name} onChange={(e) => update((q) => ({ ...q, name: e.target.value }))} placeholder={n === 0 ? "As it appears on your owner reports" : ""} />
        </label>
        <span className="num mb-2 text-[11px] whitespace-nowrap text-fg-3">{rentRoll ? `${profile(p.id).units} units · from rent roll` : "Units from rent roll"}</span>
        {canRemove && (
          <button type="button" onClick={remove} aria-label={`Remove ${p.name || "property"}`} className="mb-1.5 rounded-md p-1 text-fg-3 transition-colors hover:bg-fg/[0.05] hover:text-fg">
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {p.reports.length > 0 && (
        <ul className="flex flex-col rounded-md border border-border bg-bg">
          <AnimatePresence initial={false}>
            {p.reports.map((r) => (
              <motion.li key={r.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="overflow-hidden border-b border-border/70 last:border-b-0">
                <div className="flex items-center gap-2.5 px-3 py-1.5">
                  {/\.pdf$/i.test(r.name) ? <FileText className="size-3.5 shrink-0 text-file-pdf" /> : <FileSpreadsheet className={cn("size-3.5 shrink-0", /\.csv$/i.test(r.name) ? "text-file-csv" : "text-file-xls")} />}
                  <span className="num min-w-0 flex-1 truncate text-[11px]" title={r.name}>
                    {r.name}
                  </span>
                  <span className="num hidden text-[10px] text-fg-3 sm:inline">{formatFileSize(r.size)}</span>
                  <div className="w-40 shrink-0">
                    <Select
                      label={`Report type for ${r.name}`}
                      value={r.kind === "Other" ? "Not sure yet" : r.kind}
                      onChange={(v) => update((q) => ({ ...q, reports: q.reports.map((x) => (x.id === r.id ? { ...x, kind: (v === "Not sure yet" ? "Other" : v) as ReportKind } : x)) }))}
                      options={[...PACKAGE, "Not sure yet"]}
                    />
                  </div>
                  <button type="button" onClick={() => update((q) => ({ ...q, reports: q.reports.filter((x) => x.id !== r.id) }))} aria-label={`Remove ${r.name}`} className="rounded p-0.5 text-fg-3 hover:text-fg">
                    <X className="size-3" />
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <div {...getRootProps()} className={cn("flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-md border border-dashed px-4 text-center transition-colors duration-200", p.reports.length ? "py-3" : "py-6", isDragActive ? "border-fg-3 bg-fg/[0.035]" : "border-border-strong/70")}>
        <input {...getInputProps()} aria-label={`Add reports for ${p.name || "this property"}`} />
        <UploadCloud className={cn("size-4", isDragActive ? "text-fg" : "text-fg-3")} strokeWidth={1.5} />
        <span className="text-xs">{isDragActive ? "Drop to add" : p.reports.length ? "Drop more reports" : "Drop this property's reports here"}</span>
        <button type="button" onClick={open} className="rounded-md border border-border bg-surface px-2.5 py-1 text-[11px] font-medium transition-colors hover:border-border-strong">
          Choose files
        </button>
        {!p.reports.length && (
          <button type="button" onClick={() => update((q) => ({ ...q, name: q.name.trim() || DEFAULT_NAMES.properties[q.id], reports: sampleReports(q.id, q.name.trim() || DEFAULT_NAMES.properties[q.id]) }))} className="text-[11px] text-fg-3 underline decoration-fg/20 underline-offset-[3px] hover:text-fg">
            Use sample reports
          </button>
        )}
      </div>

      {p.reports.length > 0 && missing.length > 0 && <p className="text-[11px] text-fg-3">Not added: {missing.join(", ")}. Add them now, or the manager can send them with their upload link.</p>}
    </div>
  );
}

/** The managers behind the properties in the draft, keeping anything already typed. */
const managersFor = (d: Draft, prev: Draft["managers"]): Draft["managers"] =>
  [...new Set(d.properties.map((p) => managerOfId(p.id).id))].sort().map((id) => {
    const old = prev.find((m) => m.id === id);
    return { id, name: old?.name ?? DEFAULT_NAMES.managers[id].name, email: old?.email ?? DEFAULT_NAMES.managers[id].email, properties: d.properties.filter((p) => managerOfId(p.id).id === id).map((p) => p.id) };
  });

// ---- Step 2: managers ----

function Managers() {
  const { state, act } = useWf();
  const copy = useCopyLink();
  const d = state.draft;
  const [invite, setInvite] = useState(true);
  const toast = useToast();
  const name = (id: string) => d.properties.find((p) => p.id === id)?.name ?? DEFAULT_NAMES.properties[id];
  const set = (id: ManagerId, patch: Partial<Draft["managers"][number]>) => act.setDraft((x) => ({ ...x, managers: x.managers.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  const valid = d.managers.every((m) => m.name.trim() && /.+@.+\..+/.test(m.email));
  return (
    <>
      <Heading title="Who sends you these reports?">
        We read the management company off each property&apos;s reports. Check the names and the email their reports come from. Each company gets a private upload link, so next month&apos;s reports land here without you forwarding anything.
      </Heading>
      <div className="flex flex-col gap-3">
        {d.managers.map((m) => {
          const token = MANAGERS.find((x) => x.id === m.id)?.token ?? m.id;
          return (
            <div key={m.id} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-fg-2">Management company</span>
                  <Input value={m.name} onChange={(e) => set(m.id, { name: e.target.value })} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-fg-2">Reports email</span>
                  <Input type="email" value={m.email} onChange={(e) => set(m.id, { email: e.target.value })} aria-invalid={!/.+@.+\..+/.test(m.email)} />
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex flex-wrap gap-1">
                  {m.properties.map((id) => (
                    <Chip key={id}>{name(id)}</Chip>
                  ))}
                </span>
                <button type="button" onClick={() => copy(token)} className="flex items-center gap-1.5 text-[11px] text-fg-3 hover:text-fg">
                  <Copy className="size-3" />
                  <span className="num">{uploadUrl(token)}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <label className="flex items-start gap-2.5 text-xs">
        <input type="checkbox" checked={invite} onChange={(e) => setInvite(e.target.checked)} className="mt-0.5 accent-[var(--text-primary)]" />
        <span>
          Email each manager their upload link
          <span className="block text-[11px] text-fg-3">One message from {PRODUCT_NAME} with the link and the reports you expect each month.</span>
        </span>
      </label>
      <Footer
        back="properties"
        next="review"
        disabled={!valid}
        onNext={() => invite && toast(`Upload links sent to ${d.managers.length} ${d.managers.length === 1 ? "manager" : "managers"}`, { detail: "You can resend from Close or Managers." })}
      />
    </>
  );
}

// ---- Step 3: review what RE-IQ found ----

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
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-fg-3">
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
                      <span className="num text-[11px]">{l.label}</span>
                      <Select label={`Account for ${l.label}`} value={accounts[l.id] ?? l.account} onChange={(v) => setAccounts((a) => ({ ...a, [l.id]: v }))} options={CHART_OF_ACCOUNTS} />
                      {confirmed ? (
                        <button type="button" onClick={() => setOk((x) => x.filter((y) => y !== l.id))} className="flex w-[72px] items-center justify-end gap-1 text-[11px] text-favorable" aria-label={`Undo ${l.label}`}>
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
                <span className="text-[11px] text-fg-3">{l}</span>
                <span className="num text-lg">{v}</span>
              </div>
            ))}
          </section>
        </motion.div>
      )}

      <div className="mt-2 flex items-center justify-between border-t border-border pt-5">
        <Link href={`${B}/managers`} className="text-xs text-fg-2 hover:text-fg">
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
