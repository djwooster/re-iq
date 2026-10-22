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
 * Where waitlist signups go. With NOTION_TOKEN and NOTION_WAITLIST_DB set, each
 * entry becomes a row in that Notion database (columns: Email, Source,
 * Submitted). Without them, development appends to .data/waitlist.jsonl;
 * production refuses rather than silently dropping signups.
 */
export async function saveWaitlistEntry(entry: WaitlistEntry): Promise<void> {
  const token = process.env.NOTION_TOKEN;
  const database = process.env.NOTION_WAITLIST_DB;
  if (token && database) {
    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "notion-version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: database },
        properties: {
          Email: { title: [{ text: { content: entry.email } }] },
          Source: { select: { name: entry.source } },
          Submitted: { date: { start: entry.submitted_at } },
        },
      }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Notion responded ${res.status}: ${await res.text()}`);
    return;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("NOTION_TOKEN and NOTION_WAITLIST_DB are not set");
  }
  await mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await appendFile(LOCAL_FILE, JSON.stringify(entry) + "\n");
}
