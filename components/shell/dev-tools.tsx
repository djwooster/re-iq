"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { resetDemoData } from "@/lib/data";
import { ROLE_LABELS } from "@/lib/labels";
import type { Role } from "@/lib/types";
import { useApp } from "./app-context";

/**
 * Internal-only controls, rendered when NEXT_PUBLIC_SHOW_DEV_TOOLS=true.
 * The role preview changes emphasis and defaults, not permissions.
 */
export function DevTools() {
  const { role, setRole } = useApp();
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="mx-2 mb-2 rounded-md border border-dashed border-warning/40 p-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="eyebrow !text-warning">Internal · dev tools</span>
      </div>
      <div className="flex flex-col gap-px" role="radiogroup" aria-label="Preview as role">
        {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={role === r}
            onClick={() => setRole(r)}
            className={`flex h-6 cursor-pointer items-center gap-2 rounded px-1.5 text-[11px] transition-colors ${role === r ? "bg-fg/[0.06] text-fg" : "text-fg-3 hover:text-fg-2"}`}
          >
            <span className={`size-1.5 rounded-full ${role === r ? "bg-fg" : "bg-fg/20"}`} />
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setConfirmReset(true)}
        className="mt-1.5 w-full cursor-pointer rounded px-1.5 py-1 text-left text-[11px] text-fg-3 transition-colors hover:text-fg-2"
      >
        Reset demo data
      </button>
      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset demo data?"
        description="Removes uploads, confirmed mappings, action changes, and invites made in this browser. The seeded portfolio stays."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                resetDemoData();
                setConfirmReset(false);
                toast("Demo data reset");
              }}
            >
              Reset
            </Button>
          </>
        }
      />
    </div>
  );
}
