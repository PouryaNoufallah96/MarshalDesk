"use client";

import { useState } from "react";

/**
 * Tells which items appeared after the list first rendered, so only live
 * arrivals animate in and a page load stays still. Changing `scope` (another
 * conversation, another filter) starts over.
 */
export function useArrivals(
  ids: readonly string[],
  scope = "",
): (id: string) => boolean {
  const [state, setState] = useState(() => ({
    scope,
    initial: new Set(ids),
  }));
  if (state.scope !== scope) {
    setState({ scope, initial: new Set(ids) });
  }
  const initial = state.scope === scope ? state.initial : new Set(ids);
  return (id) => !initial.has(id);
}
