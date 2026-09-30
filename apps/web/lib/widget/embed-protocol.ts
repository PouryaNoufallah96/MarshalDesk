// Messages between the embed script (on the customer's page) and the widget
// iframe. The embed script bundles this file, so it must stay dependency-free.

export const EMBED_POSITIONS = ["bottom-left", "bottom-right"] as const;
export type EmbedPosition = (typeof EMBED_POSITIONS)[number];

export const EMBED_LAYOUT_STATES = ["hidden", "collapsed", "open"] as const;
export type EmbedLayoutState = (typeof EMBED_LAYOUT_STATES)[number];

/** Viewports this wide or narrower get the full-screen widget. */
export const EMBED_MOBILE_MAX_WIDTH = 640;

/** Iframe → page. The first one also means the widget is ready to show. */
export type EmbedLayoutMessage = {
  type: "marshaldesk:layout";
  state: EmbedLayoutState;
  position: EmbedPosition;
};

/** Page → iframe, whenever the page's viewport crosses the phone width. */
export type EmbedViewportMessage = {
  type: "marshaldesk:viewport";
  mobile: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOneOf<T extends string>(
  options: readonly T[],
  value: unknown,
): value is T {
  return options.some((option) => option === value);
}

export function isEmbedLayoutMessage(
  data: unknown,
): data is EmbedLayoutMessage {
  return (
    isRecord(data) &&
    data.type === "marshaldesk:layout" &&
    isOneOf(EMBED_LAYOUT_STATES, data.state) &&
    isOneOf(EMBED_POSITIONS, data.position)
  );
}

export function isEmbedViewportMessage(
  data: unknown,
): data is EmbedViewportMessage {
  return (
    isRecord(data) &&
    data.type === "marshaldesk:viewport" &&
    typeof data.mobile === "boolean"
  );
}
