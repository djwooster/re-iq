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
 * Where waitlist signups go. With WAITLIST_WEBHOOK_URL set, each entry is
 * POSTed there as JSON (Zapier, Make, a Google Sheets Apps Script, Loops, ...).
 * Without it, development appends to .data/waitlist.jsonl; production refuses
 * rather than silently dropping signups.
 */
export async function saveWaitlistEntry(entry: WaitlistEntry): Promise<void> {
  const webhook = process.env.WAITLIST_WEBHOOK_URL;
  if (webhook) {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(entry),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Waitlist webhook responded ${res.status}`);
    return;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("WAITLIST_WEBHOOK_URL is not set");
  }
  await mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await appendFile(LOCAL_FILE, JSON.stringify(entry) + "\n");
}
