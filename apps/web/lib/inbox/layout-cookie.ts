import * as z from "zod";

export const INBOX_LAYOUT_COOKIE = "inbox_layout";

const PANEL_IDS = ["list", "conversation", "details"] as const;

const layoutSchema = z.record(z.enum(PANEL_IDS), z.number().min(0).max(100));

/** The saved pane sizes, or `undefined` when the cookie is missing or doesn't fit the current panes. */
export function parseInboxLayout(
  value: string | undefined,
): Record<string, number> | undefined {
  if (!value) return undefined;
  try {
    const parsed = layoutSchema.safeParse(
      JSON.parse(decodeURIComponent(value)),
    );
    if (!parsed.success) return undefined;
    const total = PANEL_IDS.reduce((sum, id) => sum + parsed.data[id], 0);
    return Math.abs(total - 100) < 1 ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}
