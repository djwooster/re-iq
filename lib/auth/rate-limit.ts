import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { log } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Auth rate limits, per IP and per email (or account), stored in Supabase
 * (public.rate_limit_hit -> private.hit_rate_limit). Callers return their usual generic message
 * when limited, so limits reveal nothing.
 *
 * If the store is unreachable or not configured: sign-in fails open (people can still get in);
 * sign-up, password reset and invite acceptance fail closed. Both are logged, without personal data.
 */

type Action = "signIn" | "signUp" | "passwordReset" | "acceptInvite";
export type Verdict = "ok" | "limited" | "unavailable";

const MINUTE = 60;
const HOUR = 60 * MINUTE;

/** [limit, window in seconds] per IP and per email/account. */
export const LIMITS: Record<Action, { ip: [number, number]; id: [number, number] }> = {
  signIn: { ip: [20, 15 * MINUTE], id: [5, 15 * MINUTE] },
  signUp: { ip: [5, HOUR], id: [3, HOUR] },
  passwordReset: { ip: [5, HOUR], id: [3, HOUR] },
  acceptInvite: { ip: [10, HOUR], id: [5, HOUR] },
};

const FAIL_OPEN: ReadonlySet<Action> = new Set(["signIn"]);

/**
 * Identifiers are stored as HMAC-SHA256 with a server-only secret, so a leaked table can't be
 * matched against known emails or IPs by hashing guesses.
 */
const keyed = (secret: string, s: string) => createHmac("sha256", secret).update(s).digest("hex");

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

/** Counts this attempt against both limits. `id` is an email or user ID; it's stored only as an HMAC. */
export async function checkLimit(action: Action, id: string): Promise<Verdict> {
  const verdict = await count(action, id);
  if (verdict !== "unavailable") return verdict;
  const open = FAIL_OPEN.has(action);
  log.warn(open ? "rate_limit.fail_open" : "rate_limit.fail_closed", { action });
  return open ? "ok" : "unavailable";
}

async function count(action: Action, id: string): Promise<Verdict> {
  const secret = process.env.RATE_LIMIT_HMAC_SECRET ?? "";
  const db = createAdminClient();
  if (!db || !secret) return "unavailable";
  const { ip, id: byId } = LIMITS[action];
  const hit = async (key: string, [limit, window]: [number, number]): Promise<Verdict> => {
    try {
      const { data, error } = await db.rpc("rate_limit_hit", { p_key: key, p_limit: limit, p_window_seconds: window });
      if (error || typeof data !== "boolean") return "unavailable";
      return data ? "ok" : "limited";
    } catch {
      return "unavailable";
    }
  };
  const results = await Promise.all([hit(`${action}:ip:${keyed(secret, await clientIp())}`, ip), hit(`${action}:id:${keyed(secret, id.trim().toLowerCase())}`, byId)]);
  return results.includes("limited") ? "limited" : results.includes("unavailable") ? "unavailable" : "ok";
}
