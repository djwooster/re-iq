"use client";

import { Bell, CheckCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * The notifications bell. Nothing in the workspace
 * raises notifications yet (they come from exceptions and close events once reports are read), so the list is empty.
 */
export function Notifications() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Notifications"
        className={cn("relative flex size-7 items-center justify-center rounded-md text-fg-2 transition-colors hover:bg-fg/[0.05] hover:text-fg", open && "bg-fg/[0.05] text-fg")}
      >
        <Bell className="size-4" strokeWidth={1.75} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 z-50 mt-1.5 flex max-h-[min(560px,80vh)] w-[min(380px,calc(100vw-24px))] flex-col rounded-lg border border-border bg-bg shadow-overlay"
          >
            <div className="flex items-center justify-between gap-3 px-3 pt-3">
              <h2 className="text-sm font-semibold">Notifications</h2>
            </div>
            <div className="flex gap-1 border-b border-border px-3 pt-2" role="tablist">
              {(["all", "unread"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={cn("-mb-px flex items-center gap-1.5 border-b-2 px-1.5 pb-2 text-xs transition-colors", tab === t ? "border-fg font-medium text-fg" : "border-transparent text-fg-3 hover:text-fg")}
                >
                  {t === "all" ? "All" : "Unread"}
                </button>
              ))}
            </div>
            <div className="flex flex-col items-center gap-2 px-3 py-10 text-center">
              <CheckCheck className="size-5 text-fg-3" />
              <span className="text-xs text-fg-2">You&apos;re all caught up.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
