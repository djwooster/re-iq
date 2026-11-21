"use server";

import { redirect } from "next/navigation";
import { log } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "./context";

/**
 * Deletes the signed-in person's account, now. If they're the org's only owner, the org goes too:
 * every property, upload record and stored file, and everyone's access to it (members and property
 * managers keep their logins but no longer belong to it). Otherwise only their own account goes;
 * their uploads stay with the org. Runs with the service role after getWorkspace has checked who's asking.
 */
export async function deleteMyAccount(confirmation: string): Promise<{ ok: false; message: string }> {
  if (confirmation.trim() !== "DELETE") return { ok: false, message: "Type DELETE to confirm." };
  const ws = await getWorkspace();
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "That didn't work. Try again shortly." };

  const { data: owners } = await admin.from("org_members").select("user_id").eq("org_id", ws.orgId).eq("role", "owner");
  const lastOwner = ws.role === "owner" && (owners ?? []).every((o) => o.user_id === ws.userId);

  if (lastOwner) {
    const { data: files } = await admin.from("uploads").select("storage_path").eq("org_id", ws.orgId);
    const paths = (files ?? []).map((f) => f.storage_path as string);
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await admin.storage.from("reports").remove(paths.slice(i, i + 100));
      if (error) {
        log.error("account.delete_files_failed");
        return { ok: false, message: "That didn't work. Try again shortly." };
      }
    }
    const { error } = await admin.from("orgs").delete().eq("id", ws.orgId);
    if (error) {
      log.error("account.delete_org_failed");
      return { ok: false, message: "That didn't work. Try again shortly." };
    }
  }

  const { error } = await admin.auth.admin.deleteUser(ws.userId);
  if (error) {
    log.error("account.delete_user_failed", { org_deleted: lastOwner });
    return { ok: false, message: "That didn't work. Try again shortly." };
  }
  log.info("account.deleted", { org_deleted: lastOwner, files: lastOwner });

  // The session belongs to a user that no longer exists: sign it out on the way out.
  await (await createClient()).auth.signOut().catch(() => undefined);
  redirect("/");
}
