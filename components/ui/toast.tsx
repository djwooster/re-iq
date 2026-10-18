"use client";

import { Check, AlertTriangle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

interface Toast {
  id: number;
  message: string;
  detail?: string;
  tone: "success" | "warning";
}

interface ToastContextValue {
  toast: (message: string, opts?: { detail?: string; tone?: Toast["tone"] }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION = 3_000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const toast = useCallback<ToastContextValue["toast"]>((message, opts) => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-2), { id, message, detail: opts?.detail, tone: opts?.tone ?? "success" }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), DURATION);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[320px] flex-col gap-2" role="status" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="pointer-events-auto flex items-start gap-2.5 rounded-lg bg-inverted px-3 py-2.5 text-inverted-fg shadow-overlay"
            >
              {t.tone === "success" ? <Check className="mt-0.5 size-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />}
              <div className="min-w-0">
                <div className="text-xs font-medium">{t.message}</div>
                {t.detail && <div className="mt-0.5 text-[11px] text-inverted-muted">{t.detail}</div>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx.toast;
}
