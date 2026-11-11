"use client";

import { Check, Copy, FileSpreadsheet, FileText, Mail, UploadCloud } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Input } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { PRODUCT_NAME } from "@/lib/labels";
import { GL_LINES, uploadUrl, useCopyLink } from "./close";
import { fmt } from "./metrics";
import { TOTAL_UNITS, profile } from "./numbers";
import { CHART_OF_ACCOUNTS, CLOSE_MONTH, DEFAULT_NAMES, EXCEPTIONS, MANAGERS, MAPPING, MISSING, PACKAGE, PROPERTIES, RECEIVED, type ManagerId } from "./seed";
import { STEPS, type StepId } from "./setup-steps";
import { useWf, type Draft } from "./store";
import { Button, Chip, Select } from "./ui";

/**
 * Self-serve setup: properties, managers, the first month's packages, and
 * the mapping lines nobody can guess. Parsing is simulated; the steps,
 * checks, and counts are what the real pipeline would show.
 */

const B = "/prototype/setup";
const EASE = [0.16, 1, 0.3, 1] as const;

export function Setup({ step }: { step: StepId }) {
  const i = STEPS.findIndex((s) => s.id === step);
  const { state, hydrated } = useWf();
  const d = state.draft;
  const reachable = (n: number) => n === 0 || (n === 1 && d.properties.length > 0) || (n === 2 && d.managers.length > 0) || (n === 3 && d.uploaded);
  const furthest = [3, 2, 1, 0].find(reachable) ?? 0;
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
      <motion.main key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }} className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-5 py-10">
        <p className="eyebrow">
          Step {i + 1} of {STEPS.length}
        </p>
        {!hydrated ? null : !reachable(i) ? (
          <div className="flex flex-col items-start gap-3">
            <Heading title="Finish the earlier steps first">This step needs your properties, managers, and packages.</Heading>
            <Button href={`${B}/${STEPS[furthest].id}`}>Go to {STEPS[furthest].label.toLowerCase()}</Button>
          </div>
        ) : (
          <>
            {step === "portfolio" && <Portfolio />}
            {step === "managers" && <Managers />}
            {step === "upload" && <Upload />}
            {step === "mapping" && <Mapping />}
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

function Footer({ back, next, disabled, label = "Continue", onNext }: { back?: StepId; next?: StepId; disabled?: boolean; label?: string; onNext?: () => void }) {
  const router = useRouter();
  return (
    <div className="mt-2 flex items-center justify-between border-t border-border pt-5">
      {back ? (
        <Link href={`${B}/${back}`} className="text-xs text-fg-2 hover:text-fg">
          Back
        </Link>
      ) : (
        <span />
      )}
      <Button
        disabled={disabled}
        onClick={() => {
          onNext?.();
          if (next) router.push(`${B}/${next}`);
        }}
      >
        {label}
      </Button>
    </div>
  );
}

/** Runs a simulated job: progress ticks to 1 over `ms`, then calls done. */
function useJob(ms: number, onDone: () => void) {
  const [p, setP] = useState<number | null>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (p === null || p >= 1) return;
    const t = window.setTimeout(() => setP((x) => Math.min(1, (x ?? 0) + (reduce ? 1 : 80 / ms))), 80);
    return () => window.clearTimeout(t);
  }, [p, ms, reduce]);
  useEffect(() => {
    if (p !== null && p >= 1) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once when the job completes
  }, [p !== null && p >= 1]);
  return { progress: p, start: () => setP(0), reset: () => setP(null) };
}

function DropZone({ title, hint, onFiles, busy }: { title: string; hint: string; onFiles: () => void; busy?: boolean }) {
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ onDrop: () => onFiles(), noClick: true, multiple: true, disabled: busy });
  return (
    <div
      {...getRootProps()}
      className={cn("flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center transition-colors duration-200", isDragActive ? "border-fg-3 bg-fg/[0.035]" : "border-border-strong/70")}
    >
      <input {...getInputProps()} aria-label={title} />
      <UploadCloud className={cn("mb-2.5 size-5", isDragActive ? "text-fg" : "text-fg-3")} strokeWidth={1.5} />
      <p className="text-xs">{isDragActive ? "Drop to upload" : title}</p>
      <p className="mt-1 text-[11px] text-fg-3">{hint}</p>
      <button type="button" disabled={busy} onClick={() => (busy ? null : open())} className="mt-3.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium transition-colors hover:border-border-strong disabled:opacity-50">
        Choose files
      </button>
      <button type="button" disabled={busy} onClick={onFiles} className="mt-2 text-[11px] text-fg-3 underline decoration-fg/20 underline-offset-[3px] hover:text-fg">
        Use the sample files
      </button>
    </div>
  );
}

// ---- Step 1: properties ----

const LIST_FILE = "Portfolio list.xlsx";

function Portfolio() {
  const { state, act } = useWf();
  const d = state.draft;
  const setDraft = (fn: (d: Draft) => Draft) => act.setDraft(fn);
  const job = useJob(1400, () =>
    setDraft((x) => ({
      ...x,
      properties: PROPERTIES.map((p) => ({ id: p.id, name: x.properties.find((y) => y.id === p.id)?.name ?? DEFAULT_NAMES.properties[p.id], units: profile(p.id).units })),
    })),
  );
  const units = d.properties.reduce((s, p) => s + p.units, 0);
  return (
    <>
      <Heading title="Set up your portfolio">
        Start with the properties you own and the firm they report to. Upload your property list (any spreadsheet with property names and unit counts works) and fix any names before you continue.
      </Heading>

      <label className="flex max-w-sm flex-col gap-1.5">
        <span className="text-[11px] font-medium text-fg-2">Firm name</span>
        <Input value={d.org} onChange={(e) => setDraft((x) => ({ ...x, org: e.target.value }))} placeholder="As your owners know it" />
      </label>

      {d.properties.length === 0 ? (
        job.progress === null ? (
          <DropZone title="Drop your property list here" hint="Excel or CSV · one row per property · name, units, and manager if you have it" onFiles={job.start} />
        ) : (
          <FileProgress name={LIST_FILE} progress={job.progress} steps={["Reading rows", "Finding property names and unit counts", "Matching managers"]} />
        )
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="flex items-center gap-2 text-xs">
              <FileSpreadsheet className="size-3.5 text-file-xls" />
              <span className="num">{LIST_FILE}</span>
              <span className="text-fg-3">
                · {d.properties.length} properties · {fmt.int(units)} units
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                job.reset();
                setDraft((x) => ({ ...x, properties: [], managers: [], uploaded: false }));
              }}
              className="text-[11px] text-fg-3 hover:text-fg"
            >
              Replace file
            </button>
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="eyebrow h-8 px-4 text-left font-normal">Property</th>
                  <th className="eyebrow h-8 px-4 text-right font-normal">Units</th>
                  <th className="eyebrow h-8 px-4 text-left font-normal">Manager in file</th>
                </tr>
              </thead>
              <motion.tbody initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.03 } } }}>
                {d.properties.map((p) => (
                  <motion.tr key={p.id} variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } } }} className="border-b border-border/70 last:border-b-0">
                    <td className="px-2 py-1">
                      <input
                        aria-label={`Name for ${DEFAULT_NAMES.properties[p.id]}`}
                        value={p.name}
                        onChange={(e) => setDraft((x) => ({ ...x, properties: x.properties.map((y) => (y.id === p.id ? { ...y, name: e.target.value } : y)) }))}
                        className="h-7 w-full rounded-md border border-transparent bg-transparent px-2 text-xs transition-colors hover:border-border focus:border-fg-3 focus:bg-bg focus:outline-none"
                      />
                    </td>
                    <td className="num px-4 text-right text-fg-2">{p.units}</td>
                    <td className="px-4 text-fg-2">{DEFAULT_NAMES.managers[PROPERTIES.find((x) => x.id === p.id)!.manager].name}</td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
          <p className="text-[11px] text-fg-3">Unit counts come from the file and update from each month&apos;s rent roll.</p>
        </div>
      )}

      <Footer next="managers" disabled={!d.properties.length || !d.org.trim()} onNext={() => !d.managers.length && setDraft((x) => ({ ...x, managers: seedManagers(x) }))} />
    </>
  );
}

const seedManagers = (d: Draft): Draft["managers"] =>
  MANAGERS.map((m) => ({ id: m.id, name: DEFAULT_NAMES.managers[m.id].name, email: DEFAULT_NAMES.managers[m.id].email, properties: d.properties.filter((p) => PROPERTIES.find((x) => x.id === p.id)!.manager === m.id).map((p) => p.id) }));

function FileProgress({ name, progress, steps }: { name: string; progress: number; steps: string[] }) {
  const at = Math.min(steps.length - 1, Math.floor(progress * steps.length));
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <span className="flex items-center gap-2 text-xs">
        <FileSpreadsheet className="size-3.5 text-file-xls" />
        <span className="num">{name}</span>
      </span>
      <span className="h-1 overflow-hidden rounded-full bg-fg/10">
        <span className="block h-full rounded-full bg-fg/70 transition-[width] duration-100" style={{ width: `${progress * 100}%` }} />
      </span>
      <span className="text-[11px] text-fg-3">{steps[at]}…</span>
    </div>
  );
}

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
      <Heading title="Who sends you reports?">
        We found {d.managers.length} management companies in your property list. Each gets a private upload link for their monthly package, so you never have to rename or forward a file.
      </Heading>
      <div className="flex flex-col gap-3">
        {d.managers.map((m) => {
          const token = MANAGERS.find((x) => x.id === m.id)!.token;
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
                  <span className="num ml-1 text-[11px] text-fg-3">{fmt.int(m.properties.reduce((s, id) => s + profile(id).units, 0))} units</span>
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
          <span className="block text-[11px] text-fg-3">They&apos;ll get one message from {PRODUCT_NAME} with the link and the reports you expect each month: {PACKAGE.join(", ")}.</span>
        </span>
      </label>
      <Footer back="portfolio" next="upload" disabled={!valid} onNext={() => invite && toast(`Upload links sent to ${d.managers.length} managers`, { detail: "You can resend from Close or Managers." })} />
    </>
  );
}

// ---- Step 3: the first month's packages ----

interface Arrival {
  manager: ManagerId;
  file: string;
  kind: "xls" | "pdf";
  reports: number;
  note?: string;
}

function arrivals(d: Draft): Arrival[] {
  const name = (id: string) => d.properties.find((p) => p.id === id)?.name ?? DEFAULT_NAMES.properties[id];
  return MANAGERS.filter((m) => RECEIVED[m.id]).map((m) => {
    const props = PROPERTIES.filter((p) => p.manager === m.id);
    const missing = props.flatMap((p) => (MISSING[p.id] ?? []).map((r) => `${r} missing for ${name(p.id)}`));
    return { manager: m.id, file: `${CLOSE_MONTH} package · ${props.map((p) => name(p.id)).join(", ")}.xlsx`, kind: "xls", reports: PACKAGE.length * props.length - missing.length, note: missing[0] };
  });
}

const CHECKS = ["Reading reports", "Mapping GL lines to your chart of accounts", "Reconciling rent rolls, cash, and statements", "Checking every KPI against your thresholds"];

function Upload() {
  const { state, act } = useWf();
  const d = state.draft;
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"idle" | "uploading" | "checking" | "done">(d.uploaded ? "done" : "idle");
  const [check, setCheck] = useState(0);
  const files = arrivals(d);
  const mname = (id: ManagerId) => d.managers.find((m) => m.id === id)?.name ?? DEFAULT_NAMES.managers[id].name;
  const late = MANAGERS.filter((m) => !RECEIVED[m.id]);
  const job = useJob(2200, () => setPhase("checking"));

  useEffect(() => {
    if (phase !== "checking") return;
    if (check >= CHECKS.length) {
      act.setDraft((x) => ({ ...x, uploaded: true }));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the simulated pipeline finishing
      setPhase("done");
      return;
    }
    const t = window.setTimeout(() => setCheck((c) => c + 1), reduce ? 0 : 650);
    return () => window.clearTimeout(t);
  }, [phase, check, act, reduce]);

  const unsure = MAPPING.filter((l) => !l.sure).length;
  const lines = GL_LINES * files.length;
  const results = [`${files.reduce((s, f) => s + f.reports, 0)} reports from ${files.length} managers`, `${fmt.int(lines - unsure)} of ${fmt.int(lines)} lines matched · ${unsure} new labels to review`, "1 break: rent roll doesn't tie to the P&L at one property", `${EXCEPTIONS.length} metrics outside threshold`];

  return (
    <>
      <Heading title={`Upload ${CLOSE_MONTH}'s packages`}>
        Drop whatever your managers sent for {CLOSE_MONTH}, in any format and with any file names. {PRODUCT_NAME} works out who sent what, maps each line to your chart of accounts, and checks that the numbers tie.
      </Heading>

      {phase === "idle" && (
        <DropZone
          title={`Drop ${CLOSE_MONTH} packages here`}
          hint="P&L, T-12, rent roll, box score, AR aging, capex, GL · Excel, CSV, or PDF"
          onFiles={() => {
            setPhase("uploading");
            job.start();
          }}
        />
      )}

      {phase !== "idle" && (
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {files.map((f, n) => {
              const p = phase === "uploading" ? Math.max(0, Math.min(1, (job.progress ?? 0) * files.length - n * 0.6)) : 1;
              return (
                <motion.div key={f.manager} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE, delay: n * 0.05 }} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
                  <FileSpreadsheet className="size-4 shrink-0 text-file-xls" />
                  <span className="min-w-0 flex-1">
                    <span className="num block truncate text-[11px]">{f.file}</span>
                    <span className="block text-[11px] text-fg-3">
                      {p < 1 ? (
                        "Uploading…"
                      ) : (
                        <>
                          From {mname(f.manager)} · {f.reports} reports{f.note && <span className="text-warning"> · {f.note}</span>}
                        </>
                      )}
                    </span>
                  </span>
                  {p < 1 ? (
                    <span className="h-1 w-20 overflow-hidden rounded-full bg-fg/10">
                      <span className="block h-full bg-fg/70" style={{ width: `${p * 100}%` }} />
                    </span>
                  ) : (
                    <Check className="size-3.5 text-favorable" />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {late.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-lg border border-dashed border-border px-3 py-2.5">
              <Mail className="size-4 shrink-0 text-fg-3" />
              <span className="min-w-0 flex-1 text-[11px]">
                <span className="block">Nothing from {mname(m.id)} yet</span>
                <span className="block text-fg-3">Their package will land on Close when they use their upload link.</span>
              </span>
              <Chip tone="amber">Waiting</Chip>
            </div>
          ))}
        </div>
      )}

      {(phase === "checking" || phase === "done") && (
        <ol className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
          {CHECKS.map((c, n) => {
            const done = phase === "done" || n < check;
            const current = phase === "checking" && n === check;
            return (
              <li key={c} className={cn("flex items-start gap-2.5 text-xs transition-opacity duration-300", !done && !current && "opacity-40")}>
                <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full", done ? "bg-favorable/15 text-favorable" : "border border-border")}>
                  {done ? <Check className="size-2.5" strokeWidth={3} /> : current ? <span className="size-1.5 animate-pulse rounded-full bg-fg-3" /> : null}
                </span>
                <span className="flex flex-col">
                  {c}
                  {done && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-fg-3">
                      {results[n]}
                    </motion.span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <Footer back="managers" next="mapping" disabled={phase !== "done"} />
    </>
  );
}

// ---- Step 4: mapping, then into the workspace ----

function Mapping() {
  const { state, act } = useWf();
  const router = useRouter();
  const toast = useToast();
  const d = state.draft;
  const lines = MAPPING.filter((l) => !l.sure);
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
      <Heading title="Confirm the lines we couldn't place">
        {mname("m3")} uses {lines.length} labels we haven&apos;t seen before. Pick the account each belongs to. {PRODUCT_NAME} remembers your choice, so next month&apos;s package maps on its own.
      </Heading>
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-xs">
          <FileText className="size-3.5 text-fg-3" />
          {mname("m3")} · GL · {CLOSE_MONTH}
        </div>
        {lines.map((l) => {
          const done = ok.includes(l.id);
          return (
            <div key={l.id} className={cn("grid grid-cols-[1fr_200px_auto] items-center gap-3 border-b border-border/70 px-4 py-2.5 last:border-b-0", !done && "bg-warning/[0.05]")}>
              <span className="num text-[11px]">{l.label}</span>
              <Select label={`Account for ${l.label}`} value={accounts[l.id] ?? l.account} onChange={(v) => setAccounts((a) => ({ ...a, [l.id]: v }))} options={CHART_OF_ACCOUNTS} />
              {done ? (
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

      <section aria-label="Your workspace" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Properties", String(d.properties.length || PROPERTIES.length)],
          ["Units", fmt.int(TOTAL_UNITS)],
          ["Packages in", `${MANAGERS.filter((m) => RECEIVED[m.id]).length} of ${MANAGERS.length}`],
          ["Exceptions found", String(EXCEPTIONS.length)],
        ].map(([l, v]) => (
          <div key={l} className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3">
            <span className="text-[11px] text-fg-3">{l}</span>
            <span className="num text-lg">{v}</span>
          </div>
        ))}
      </section>

      <div className="mt-2 flex items-center justify-between border-t border-border pt-5">
        <Link href={`${B}/upload`} className="text-xs text-fg-2 hover:text-fg">
          Back
        </Link>
        <span className="flex items-center gap-3">
          {ok.length < lines.length && (
            <button type="button" onClick={finish} className="text-xs text-fg-3 hover:text-fg">
              Do this later
            </button>
          )}
          <Button disabled={ok.length < lines.length} onClick={finish}>
            Open {d.org.trim() || "workspace"}
          </Button>
        </span>
      </div>
    </>
  );
}
