"use client";

import { DEFAULT_WIDGET_COLOR, type WidgetColor } from "@marshaldesk/shared";
import {
  createContext,
  type CSSProperties,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import { widgetAccent } from "@/components/widget/widget-theme";

type AccentContextValue = {
  color: WidgetColor;
  setColor: (color: WidgetColor) => void;
};

const AccentContext = createContext<AccentContextValue | null>(null);

/**
 * The dashboard takes the owner's widget color as its accent. `primary` and
 * `ring` follow it, so shadcn's default buttons, switches and focus rings do
 * too. It lives in the layout so it survives navigating between pages.
 */
function accentStyle(color: WidgetColor): CSSProperties {
  const { background, foreground } = widgetAccent(color);
  return {
    "--brand": background,
    "--brand-foreground": foreground,
    "--primary": "var(--brand)",
    "--primary-foreground": "var(--brand-foreground)",
    "--ring": "var(--brand)",
    "--sidebar-primary": "var(--brand)",
    "--sidebar-primary-foreground": "var(--brand-foreground)",
    "--sidebar-ring": "var(--brand)",
  } as CSSProperties;
}

export function DashboardAccentProvider({
  initialColor = DEFAULT_WIDGET_COLOR,
  children,
}: {
  initialColor?: WidgetColor;
  children: ReactNode;
}) {
  const [color, setColor] = useState(initialColor);
  const value = useMemo(() => ({ color, setColor }), [color]);

  return (
    <AccentContext value={value}>
      <div className="contents" style={accentStyle(color)}>
        {children}
      </div>
    </AccentContext>
  );
}

export function useDashboardAccent(): AccentContextValue {
  const value = useContext(AccentContext);
  if (!value) {
    throw new Error("useDashboardAccent needs a DashboardAccentProvider");
  }
  return value;
}
