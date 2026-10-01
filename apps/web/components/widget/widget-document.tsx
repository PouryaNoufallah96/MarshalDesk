"use client";

import { type ReactNode, useEffect } from "react";

/**
 * Wraps the widget iframe's page. The widget always uses the light theme, but
 * the root theme provider follows the dashboard's saved theme, which shares
 * this origin's storage, so its `dark` class is kept off the document here.
 */
export function WidgetDocument({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    const forceLight = () => {
      if (root.classList.contains("dark")) root.classList.remove("dark");
    };
    forceLight();
    const observer = new MutationObserver(forceLight);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div data-widget-document className="flex h-dvh w-full flex-col">
      {children}
    </div>
  );
}
