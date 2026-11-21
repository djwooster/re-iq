import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Database tests run against local Supabase, never production. Set TEST_SUPABASE_URL,
 * TEST_SUPABASE_PUBLISHABLE_KEY and TEST_SUPABASE_SECRET_KEY (from `npx supabase status -o env`) to run them.
 */
const URL = process.env.TEST_SUPABASE_URL ?? "";
const PUBLISHABLE = process.env.TEST_SUPABASE_PUBLISHABLE_KEY ?? "";
const SECRET = process.env.TEST_SUPABASE_SECRET_KEY ?? "";
const PRODUCTION_REF = "dixlcrxxnmoivfrnvaqv";

if (URL.includes(PRODUCTION_REF)) throw new Error("TEST_SUPABASE_URL points at production. Use local Supabase.");

export const HAS_TEST_DB = Boolean(URL && PUBLISHABLE && SECRET);

const options = { auth: { persistSession: false, autoRefreshToken: false } };

/** Service-role client: sets up and checks state, bypassing RLS. Never used as the user under test. */
export const admin = (): SupabaseClient => createClient(URL, SECRET, options);

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

const rand = () => Math.random().toString(36).slice(2, 10);

/** A confirmed user. Without signup_via=invite, the sign-up trigger gives them a new org as owner. */
export async function makeUser(label: string, metadata: Record<string, string>): Promise<TestUser> {
  const email = `rls-${label}-${rand()}@example.test`;
  const password = `pw-${rand()}-${rand()}`;
  const { data, error } = await admin().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: metadata });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  return { id: data.user.id, email, password };
}

/** A client signed in as this user, as the browser would be: publishable key plus their session. */
export async function signedIn(user: TestUser): Promise<SupabaseClient> {
  const client = createClient(URL, PUBLISHABLE, options);
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error) throw error;
  return client;
}

export async function orgsOf(userId: string): Promise<{ org_id: string; role: string }[]> {
  const { data } = await admin().from("org_members").select("org_id, role").eq("user_id", userId);
  return data ?? [];
}

export async function cleanup(users: TestUser[], orgIds: string[]) {
  const db = admin();
  if (orgIds.length) await db.from("orgs").delete().in("id", orgIds);
  await Promise.all(users.map((u) => db.auth.admin.deleteUser(u.id)));
}
