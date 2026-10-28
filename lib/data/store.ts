import type { AccountMapping, Action, Import, Member, Organization, Role } from "@/lib/types";

/**
 * Demo persistence. The seeded portfolio is regenerated in memory on every
 * load; this overlay records only what users changed (uploads, confirmed
 * mappings, action status, team invites) and lives in localStorage. When the
 * data layer moves to Supabase this module goes away.
 */

export interface Overlay {
  version: 1;
  imports: Import[];
  mappings: AccountMapping[];
  deletedImportIds: string[];
  importPatches: Record<string, Partial<Import>>;
  mappingPatches: Record<string, Partial<AccountMapping>>;
  actionPatches: Record<string, Partial<Action>>;
  members: Member[];
  organization: Partial<Organization> & { logo?: string | null };
  role: Role;
  /** "sample" shows the seeded portfolio; "new" starts empty, the way a fresh signup does. */
  workspace: "sample" | "new";
  /** Who signed up, in a new workspace. Replaces the sample member's name and email. */
  profile: { name: string; email: string } | null;
}

const KEY = "reiq.demo.v1";

/**
 * Inline script for the root layout. `/demo?fresh=1` lands on `/signup#fresh`; before
 * anything reads storage, this clears every `reiq.*` key (workspace, theme) so each
 * usability-test participant signs up into an empty workspace on a shared machine.
 */
export const freshStartScript = `(function(){try{if(location.hash!=="#fresh")return;Object.keys(localStorage).forEach(function(k){if(k.indexOf("reiq.")===0)localStorage.removeItem(k)});history.replaceState(null,"",location.pathname+location.search)}catch(e){}})()`;

const empty = (): Overlay => ({
  version: 1,
  imports: [],
  mappings: [],
  deletedImportIds: [],
  importPatches: {},
  mappingPatches: {},
  actionPatches: {},
  members: [],
  organization: {},
  role: "asset_manager",
  workspace: "sample",
  profile: null,
});

let state: Overlay | null = null;
let revision = 0;
const listeners = new Set<() => void>();

function load(): Overlay {
  if (state) return state;
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Overlay) : null;
    state = parsed?.version === 1 ? { ...empty(), ...parsed } : empty();
  } catch {
    state = empty();
  }
  return state;
}

export function readOverlay(): Overlay {
  return load();
}

export function writeOverlay(update: (draft: Overlay) => void) {
  const next = structuredClone(load());
  update(next);
  state = next;
  revision++;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode, quota). The session still works in memory.
  }
  listeners.forEach((l) => l());
}

export function resetOverlay(start: Partial<Overlay> = {}) {
  state = { ...empty(), ...start };
  revision++;
  try {
    if (Object.keys(start).length) window.localStorage.setItem(KEY, JSON.stringify(state));
    else window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRevision() {
  return revision;
}

// Keep tabs in sync.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    state = null;
    revision++;
    listeners.forEach((l) => l());
  });
}
