import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export interface WaitlistEntry {
  email: string;
  /** Which form on the marketing site it came from, e.g. "hero" or "footer". */
  source: string;
  submitted_at: string;
}

const LOCAL_FILE = path.join(process.cwd(), ".data", "waitlist.jsonl");

/**
 * Where waitlist signups go. With SUPABASE_URL and SUPABASE_SECRET_KEY set, each
 * entry is inserted into the `waitlist` table (supabase/waitlist.sql); signing
 * up twice with the same email is a no-op. Without them, development appends to
 * .data/waitlist.jsonl; production refuses rather than silently dropping signups.
 */
export async function saveWaitlistEntry(entry: WaitlistEntry): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (url && key) {
    const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/waitlist?on_conflict=email`, {
      method: "POST",
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        prefer: "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify(entry),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Supabase responded ${res.status}: ${await res.text()}`);
    return;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are not set");
  }
  await mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await appendFile(LOCAL_FILE, JSON.stringify(entry) + "\n");
}
