import "server-only";
import { log } from "@/lib/logger";

/**
 * Transactional email from the app, through Resend (the same account that sends Supabase's auth
 * emails from no-reply@reiq.app). Needs RESEND_API_KEY. Returns false when it couldn't send.
 */

const FROM = "RE-IQ <no-reply@reiq.app>";

export async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    log.error("email.not_configured");
    return false;
  }
  const html = text
    .split("\n\n")
    .map((p) => `<p>${escape(p).replace(/(https:\/\/\S+)/g, '<a href="$1">$1</a>').replace(/\n/g, "<br>")}</p>`)
    .join("");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, text, html: `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;color:#111">${html}</div>` }),
  }).catch(() => null);
  if (!res?.ok) {
    log.error("email.send_failed", { status: res?.status ?? 0 });
    return false;
  }
  return true;
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
