"use server";

import { saveWaitlistEntry } from "@/lib/waitlist";

export type WaitlistState = { status: "idle" } | { status: "error"; message: string } | { status: "done"; email: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function joinWaitlist(_prev: WaitlistState, formData: FormData): Promise<WaitlistState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const source = String(formData.get("source") ?? "unknown").slice(0, 32);

  // Honeypot: people never see this field, so anything in it is a bot. Pretend it worked.
  if (formData.get("company_site")) return { status: "done", email };

  if (email.length > 254 || !EMAIL.test(email)) {
    return { status: "error", message: "That doesn't look like an email address." };
  }

  try {
    await saveWaitlistEntry({ email, source, submitted_at: new Date().toISOString() });
  } catch (err) {
    console.error("[waitlist]", err);
    return { status: "error", message: "We couldn't save that just now. Please try again in a minute." };
  }
  return { status: "done", email };
}
