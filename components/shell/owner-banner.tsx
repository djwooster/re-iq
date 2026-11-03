"use client";

import { useRouter } from "next/navigation";
import { useApp } from "./app-context";

/** Shown while previewing the owner's view, with the way back. */
export function OwnerBanner() {
  const { role, setRole } = useApp();
  const router = useRouter();
  if (role !== "owner") return null;
  return (
    <div className="flex items-center justify-center gap-2 border-b border-border bg-surface-2 px-4 py-1.5 text-[11px] text-fg-2">
      Viewing as Dana Whitfield, owner. This is everything the owner sees.
      <button
        type="button"
        onClick={() => {
          setRole("asset_manager");
          router.push("/app");
        }}
        className="cursor-pointer font-medium text-fg underline decoration-border underline-offset-2"
      >
        Back to Jordan
      </button>
    </div>
  );
}
