"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { createContext, Suspense, useContext, useEffect, useState } from "react";
import { UploadProvider } from "@/components/data-sources/upload-button";
import { ToastProvider } from "@/components/ui/toast";
import { AppProvider } from "./app-context";
import { Sidebar } from "./sidebar";

const MobileNavContext = createContext<() => void>(() => {});
export const useMobileNav = () => useContext(MobileNavContext);

export function AppShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNavOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navOpen]);

  return (
    <AppProvider>
      <ToastProvider>
        <UploadProvider>
        <MobileNavContext.Provider value={() => setNavOpen(true)}>
          <div className="min-h-screen bg-bg">
            <aside className="fixed inset-y-0 left-0 z-40 hidden md:block">
              <Suspense fallback={<SidebarFrame />}>
                <Sidebar />
              </Suspense>
            </aside>
            <AnimatePresence>
              {navOpen && (
                <>
                  <motion.div
                    className="fixed inset-0 z-40 bg-backdrop backdrop-blur-[2px] md:hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setNavOpen(false)}
                  />
                  <motion.aside
                    className="fixed inset-y-0 left-0 z-50 shadow-overlay md:hidden"
                    initial={{ x: -24, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -24, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <Suspense fallback={<SidebarFrame />}>
                      <Sidebar onNavigate={() => setNavOpen(false)} />
                      <CloseOnRouteChange onChange={() => setNavOpen(false)} />
                    </Suspense>
                  </motion.aside>
                </>
              )}
            </AnimatePresence>
            <main className="min-w-0 md:pl-[220px]">{children}</main>
          </div>
        </MobileNavContext.Provider>
        </UploadProvider>
      </ToastProvider>
    </AppProvider>
  );
}

/** Static stand-in while route-dependent navigation state streams in. */
function SidebarFrame() {
  return <div className="h-full w-[220px] border-r border-border bg-bg" />;
}

function CloseOnRouteChange({ onChange }: { onChange: () => void }) {
  const pathname = usePathname();
  const [initial] = useState(pathname);
  useEffect(() => {
    if (pathname !== initial) onChange();
  }, [pathname, initial, onChange]);
  return null;
}
