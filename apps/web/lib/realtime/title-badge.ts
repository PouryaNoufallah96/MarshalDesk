"use client";

import { useEffect } from "react";

const BADGE = /^\(\d+\) /;

/** Prefixes the tab title with `(N) `. Next.js rewrites the title on navigation, so it's reapplied. */
export function useTitleBadge(count: number): void {
  useEffect(() => {
    function apply() {
      const base = document.title.replace(BADGE, "");
      const next = count > 0 ? `(${count}) ${base}` : base;
      if (document.title !== next) document.title = next;
    }
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    return () => {
      observer.disconnect();
      document.title = document.title.replace(BADGE, "");
    };
  }, [count]);
}
