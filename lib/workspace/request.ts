import "server-only";
import { connection } from "next/server";
import { getWorkspace, type Workspace } from "./context";

/**
 * The signed-in workspace, for a page render. `connection()` keeps the page out of prerendering:
 * it's per request, and Supabase reads the clock to check the session.
 */
export async function requestWorkspace(): Promise<Workspace> {
  await connection();
  return getWorkspace();
}
