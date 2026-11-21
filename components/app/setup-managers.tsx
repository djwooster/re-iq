"use client";

import { ChevronDown, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/controls";
import { saveCompanies } from "@/lib/workspace/actions";
import type { Company, Property } from "@/lib/workspace/queries";
import { Button } from "./ui";

/**
 * Setup's Managers step: who sends the reports. One card per management company, with the email
 * its reports come from and the properties it manages (chips that move between companies). With no
 * companies yet, it starts with one card holding every property. Continue saves; skipping is fine
 * for owners who upload reports themselves.
 */

interface Card {
  key: string;
  id: string | null;
  name: string;
  email: string;
  propertyIds: string[];
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
let seq = 0;
const newKey = () => `c${Date.now().toString(36)}${(seq++).toString(36)}`;

function initialCards(properties: Property[], companies: Company[]): Card[] {
  const cards: Card[] = companies.map((c) => ({ key: c.id, id: c.id, name: c.name, email: c.reports_email ?? "", propertyIds: properties.filter((p) => p.management_company_id === c.id).map((p) => p.id) }));
  const loose = properties.filter((p) => !p.management_company_id || !companies.some((c) => c.id === p.management_company_id)).map((p) => p.id);
  if (loose.length) cards.push({ key: newKey(), id: null, name: "", email: "", propertyIds: loose });
  return cards;
}

export function SetupManagers({ properties, companies }: { properties: Property[]; companies: Company[] }) {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>(() => initialCards(properties, companies));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const name = (id: string) => properties.find((p) => p.id === id)?.name ?? "Property";
  const set = (key: string, patch: Partial<Card>) => setCards((cs) => cs.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  const move = (pid: string, to: string) => setCards((cs) => cs.map((c) => ({ ...c, propertyIds: c.key === to ? [...c.propertyIds, pid] : c.propertyIds.filter((p) => p !== pid) })));
  const add = (pid?: string) => {
    const key = newKey();
    setCards((cs) => [...cs.map((c) => ({ ...c, propertyIds: c.propertyIds.filter((p) => p !== pid) })), { key, id: null, name: "", email: "", propertyIds: pid ? [pid] : [] }]);
  };

  const active = cards.filter((c) => c.propertyIds.length);
  const ready = active.length > 0 && active.every((c) => c.name.trim() && isEmail(c.email));
  const next = () =>
    start(async () => {
      setError(null);
      // Blank companies with no properties are dropped.
      const keep = cards.filter((c) => c.propertyIds.length || c.name.trim());
      const res = await saveCompanies(keep.map((c) => ({ id: c.id, name: c.name, email: c.email, propertyIds: c.propertyIds })));
      if (!res.ok) return setError(res.message);
      router.push("/app/setup?step=links");
    });

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-[22px] leading-8 font-semibold tracking-tight">Who sends you these reports?</h1>
        <p className="max-w-[560px] text-xs leading-relaxed text-fg-2">Check each company and the email its reports come from.</p>
      </div>

      <div className="flex flex-col gap-3">
        {cards.map((c) => (
          <div key={c.key} className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-fg">Management company</span>
                <Input value={c.name} autoFocus={!c.name} onChange={(e) => set(c.key, { name: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-fg">Reports email</span>
                <Input type="email" value={c.email} onChange={(e) => set(c.key, { email: e.target.value })} aria-invalid={c.email !== "" && !isEmail(c.email)} />
              </label>
              {!c.propertyIds.length && (
                <button type="button" onClick={() => setCards((cs) => cs.filter((x) => x.key !== c.key))} aria-label={`Remove ${c.name || "company"}`} title="Remove company" className="mb-1 rounded-md p-1.5 text-fg-3 transition-colors hover:bg-fg/[0.06] hover:text-unfavorable">
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {c.propertyIds.map((id) => (
                <PropertyChip key={id} label={name(id)} others={cards.filter((o) => o.key !== c.key)} onMove={(to) => move(id, to)} onNew={() => add(id)} />
              ))}
              {!c.propertyIds.length && <span className="text-xs text-fg-3">Move a property here from another company</span>}
            </div>
          </div>
        ))}
      </div>
      <div>
        <Button variant="secondary" icon={<Plus className="size-3.5" />} onClick={() => add()}>
          Add a management company
        </Button>
      </div>

      {error && <p className="text-xs text-unfavorable">{error}</p>}
      <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
        <Link href="/app/setup?step=review" className="mr-auto text-xs text-fg-2 transition-colors hover:text-fg">
          Skip, I&apos;ll upload reports myself
        </Link>
        <Button variant="secondary" href="/app/setup?step=properties">
          Back
        </Button>
        <Button disabled={!ready || pending} onClick={next}>
          {pending ? "Saving…" : "Continue"}
        </Button>
      </div>
    </>
  );
}

/** A property assigned to a company. Click to move it to another one. */
function PropertyChip({ label, others, onMove, onNew }: { label: string; others: Card[]; onMove: (to: string) => void; onNew: () => void }) {
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
            <button key={o.key} type="button" role="menuitem" onClick={pick(() => onMove(o.key))} className={item}>
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
