import {
  readableTextColor,
  WIDGET_COLOR_HEX,
  type WidgetColor,
} from "@marshaldesk/shared";
import type { CSSProperties } from "react";

export type WidgetAccent = { background: string; foreground: string };

export function widgetAccent(color: WidgetColor): WidgetAccent {
  const background = WIDGET_COLOR_HEX[color];
  return { background, foreground: readableTextColor(background) };
}

/** Sets the accent variables the widget components read (`--widget-accent*`). */
export function widgetThemeStyle(color: WidgetColor): CSSProperties {
  const accent = widgetAccent(color);
  return {
    "--widget-accent": accent.background,
    "--widget-accent-foreground": accent.foreground,
  } as CSSProperties;
}
