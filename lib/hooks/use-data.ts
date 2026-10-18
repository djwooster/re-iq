"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getRevision, subscribe } from "@/lib/data";

/**
 * Loads data from the data layer and reloads when inputs change or when any
 * write lands (uploads, action updates). Keeps the previous value while
 * reloading so numbers animate between states instead of blinking.
 */
export function useData<T>(load: () => Promise<T>, deps: React.DependencyList): { data: T | undefined; loading: boolean; error: Error | null } {
  const revision = useSyncExternalStore(subscribe, getRevision, () => 0);
  const key = `${revision}|${deps.map(String).join("|")}`;
  const [state, setState] = useState<{ key: string | null; data: T | undefined; error: Error | null }>({ key: null, data: undefined, error: null });

  useEffect(() => {
    let cancelled = false;
    load().then(
      (data) => !cancelled && setState({ key, data, error: null }),
      (error: Error) => !cancelled && setState((s) => ({ ...s, key, error })),
    );
    return () => {
      cancelled = true;
    };
    // `key` captures every input; `load` is a fresh closure each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data: state.data, loading: state.key !== key, error: state.error };
}
