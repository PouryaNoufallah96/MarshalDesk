import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/**
 * False during server rendering and hydration, true afterwards. Gates output
 * that depends on the browser, like the owner's own time zone.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
