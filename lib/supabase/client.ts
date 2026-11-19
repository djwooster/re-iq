import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

/** Browser client, used only to send a file to its one-time signed upload URL. */
export const createClient = () => createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
