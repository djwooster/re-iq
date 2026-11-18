import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Auth rate limits, per IP and per email (or account), stored in Supabase (public.rate_limit_hit -> private.hit_rate_limit).
 * When limited, callers return their usual generic message, so limits reveal nothing.
 * If the store is unreachable or not configured, requests are allowed: an outage shouldn't lock
 * everyone out of signing in.
 */

type Action = "signIn" | "signUp" | "passwordReset" | "acceptInvite";

const MINUTE = 60;
const HOUR = 60 * MINUTE;

/** [limit, window in seconds] per IP and per email/account. */
export const LIMITS: Record<Action, { ip: [number, number]; id: [number, number] }> = {
  signIn: { ip: [20, 15 * MINUTE], id: [5, 15 * MINUTE] },
  signUp: { ip: [5, HOUR], id: [3, HOUR] },
  passwordReset: { ip: [5, HOUR], id: [3, HOUR] },
  acceptInvite: { ip: [10, HOUR], id: [5, HOUR] },
};

const hash = (s: string) => createHash("sha256").update(s).digest("hex");

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

/** Counts this attempt against both limits. `id` is an email or user ID; it's stored only as a hash. */
export async function withinLimit(action: Action, id: string): Promise<boolean> {
  const db = createAdminClient();
  if (!db) return true;
  const { ip, id: byId } = LIMITS[action];
  const hit = async (key: string, [limit, window]: [number, number]) => {
    const { data, error } = await db.rpc("rate_limit_hit", { p_key: key, p_limit: limit, p_window_seconds: window });
    return error ? true : data !== false;
  };
  const [ipOk, idOk] = await Promise.all([hit(`${action}:ip:${hash(await clientIp())}`, ip), hit(`${action}:id:${hash(id.toLowerCase())}`, byId)]);
  return ipOk && idOk;
}
