"use client";

import { type ReactNode, useSyncExternalStore } from "react";

/**
 * Renders children only while the media query matches, so gated media never
 * reaches the DOM (and never downloads) on other screens. Renders nothing on
 * the server and during hydration.
 */
export function MediaQueryGate({
  query,
  children,
}: {
  query: string;
  children: ReactNode;
}) {
  const matches = useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
  return matches ? children : null;
}
