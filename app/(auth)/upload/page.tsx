import type { Metadata } from "next";
import { Suspense } from "react";
import { getViewer } from "@/lib/auth/access";
import { signOut } from "@/lib/auth/actions";

export const metadata: Metadata = { title: "Uploads" };

/** Where uploaders land. The upload page itself comes later (TODO: manager upload page). */
export default function UploadPage() {
  return (
    <Suspense>
      <Upload />
    </Suspense>
  );
}

async function Upload() {
  const viewer = await getViewer();
  const uploader = viewer.kind === "user" && viewer.access === "uploader";
  return (
    <div>
      <h1 className="text-[15px] font-semibold text-fg">{uploader ? "Uploads" : "No workspace yet"}</h1>
      <p className="mt-1 text-xs text-fg-3">
        {uploader ? "Uploading reports opens here soon." : "Your account isn't part of a workspace. Ask the person who invited you for a new invite link."}
      </p>
      <form action={signOut} className="mt-6">
        <button type="submit" className="cursor-pointer text-xs text-fg-2 underline-offset-2 hover:text-fg hover:underline">
          Sign out
        </button>
      </form>
    </div>
  );
}
