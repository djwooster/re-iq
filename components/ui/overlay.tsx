"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

const EASE = [0.16, 1, 0.3, 1] as const;

function useOverlayBehavior(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => panelRef.current?.focus(), 20);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, [open, onClose]);
  return panelRef;
}

const noop = () => () => {};

function Portal({ children }: { children: React.ReactNode }) {
  // Only portal after hydration; the server and first client render emit nothing.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

function Backdrop({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-40 bg-backdrop backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onClick={onClick}
      aria-hidden
    />
  );
}

export function Drawer({
  open,
  onClose,
  title,
  eyebrow,
  actions,
  footer,
  children,
  width = 400,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  width?: number;
}) {
  const panelRef = useOverlayBehavior(open, onClose);
  const titleId = useId();
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <>
            <Backdrop onClick={onClose} />
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              style={{ width }}
              className="fixed inset-y-0 right-0 z-50 flex max-w-[100vw] flex-col border-l border-border bg-bg shadow-overlay outline-none"
              initial={{ x: 24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 24, opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
            >
              <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                <div className="min-w-0">
                  {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
                  <h2 id={titleId} className="text-sm font-semibold leading-5 text-fg">
                    {title}
                  </h2>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {actions}
                  <button
                    type="button"
                    onClick={onClose}
                    className="cursor-pointer rounded-md p-1 text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg"
                    aria-label="Close"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
              {footer && <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">{footer}</div>}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  width = 440,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  width?: number;
  className?: string;
}) {
  const panelRef = useOverlayBehavior(open, onClose);
  const titleId = useId();
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <>
            <Backdrop onClick={onClose} />
            <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[12vh]">
              <motion.div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                style={{ width }}
                className={cn("pointer-events-auto max-w-full rounded-lg border border-border bg-bg shadow-overlay outline-none", className)}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 8, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <div className="flex items-start justify-between gap-3 px-4 pt-4">
                  <div>
                    <h2 id={titleId} className="text-sm font-semibold text-fg">
                      {title}
                    </h2>
                    {description && <p className="mt-1 text-xs text-fg-2">{description}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="-mr-1 cursor-pointer rounded-md p-1 text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg"
                    aria-label="Close"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                {children && <div className="px-4 pt-3 pb-4">{children}</div>}
                {footer && <div className={cn("flex items-center justify-end gap-2 border-t border-border px-4 py-3", !children && "mt-4")}>{footer}</div>}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
}
