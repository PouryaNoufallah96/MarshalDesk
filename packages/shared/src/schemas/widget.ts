import * as z from "zod";

export const WIDGET_POSITIONS = ["bottom-left", "bottom-right"] as const;
export type WidgetPosition = (typeof WIDGET_POSITIONS)[number];
export const DEFAULT_WIDGET_POSITION: WidgetPosition = "bottom-right";

export const WIDGET_COLORS = [
  "blue",
  "indigo",
  "violet",
  "pink",
  "red",
  "orange",
  "green",
] as const;
export type WidgetColor = (typeof WIDGET_COLORS)[number];
export const DEFAULT_WIDGET_COLOR: WidgetColor = "blue";

// Hex rather than CSS tokens: the embed script paints the launcher on the
// customer's page, where the app's stylesheet doesn't exist.
export const WIDGET_COLOR_HEX: Record<WidgetColor, string> = {
  blue: "#2563eb",
  indigo: "#4f46e5",
  violet: "#7c3aed",
  pink: "#db2777",
  red: "#dc2626",
  orange: "#ea580c",
  green: "#16a34a",
};

export const AGENT_NAME_MAX_LENGTH = 60;
export const GREETING_MAX_LENGTH = 300;
export const SUGGESTED_QUESTIONS_MAX = 4;
export const AGENT_AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AGENT_AVATAR_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export function defaultAgentName(workspaceName: string): string {
  return `${workspaceName.trim()} Agent`;
}

export const DEFAULT_GREETING = "Hi there! How can we help you today?";

export const WIDGET_LIGHT_TEXT = "#ffffff";
export const WIDGET_DARK_TEXT = "#0a0a0a";
const AA_CONTRAST = 4.5;

function linearChannel(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  const r = linearChannel((value >> 16) & 0xff);
  const g = linearChannel((value >> 8) & 0xff);
  const b = linearChannel(value & 0xff);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** White text when it meets WCAG AA on the accent, otherwise whichever reads better. */
export function readableTextColor(backgroundHex: string): string {
  const onLight = contrastRatio(backgroundHex, WIDGET_LIGHT_TEXT);
  if (onLight >= AA_CONTRAST) return WIDGET_LIGHT_TEXT;
  return contrastRatio(backgroundHex, WIDGET_DARK_TEXT) > onLight
    ? WIDGET_DARK_TEXT
    : WIDGET_LIGHT_TEXT;
}

const HOSTNAME_PATTERN =
  /^(?:localhost|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63})$/;

/** Reduces pasted URLs like `https://www.example.com/pricing` to their hostname. */
export function normalizeDomain(input: string): string {
  let value = input.trim().toLowerCase();
  const protocol = value.match(/^[a-z][a-z0-9+.-]*:\/\//);
  if (protocol) value = value.slice(protocol[0].length);
  value = value.split(/[/?#]/, 1)[0] ?? "";
  value = value.replace(/^[^@]*@/, "");
  value = value.replace(/:\d+$/, "");
  return value.replace(/\.$/, "");
}

export const allowedDomainSchema = z
  .string()
  .trim()
  .min(1, { error: "Enter a domain." })
  .transform(normalizeDomain)
  .pipe(
    z
      .string()
      .max(253, { error: "That domain is too long." })
      .regex(HOSTNAME_PATTERN, {
        error: "Enter a domain like example.com or app.example.com.",
      }),
  );

export const addAllowedDomainSchema = z.object({
  domain: allowedDomainSchema,
});
export type AddAllowedDomainInput = z.input<typeof addAllowedDomainSchema>;
export type AddAllowedDomainOutput = z.output<typeof addAllowedDomainSchema>;

export const agentNameSchema = z
  .string()
  .trim()
  .min(1, { error: "Give the agent a name." })
  .max(AGENT_NAME_MAX_LENGTH, {
    error: `Keep the name under ${AGENT_NAME_MAX_LENGTH} characters.`,
  });

export const greetingSchema = z
  .string()
  .trim()
  .min(1, { error: "Write a greeting. It opens every conversation." })
  .max(GREETING_MAX_LENGTH, {
    error: `Keep the greeting under ${GREETING_MAX_LENGTH} characters.`,
  });

// The agent avatar is uploaded separately (Object Storage), so it isn't part
// of the settings form.
export const widgetSettingsSchema = z.object({
  agentEnabled: z.boolean(),
  agentName: agentNameSchema,
  color: z.enum(WIDGET_COLORS),
  position: z.enum(WIDGET_POSITIONS),
  greeting: greetingSchema,
  allowedDomains: z.array(allowedDomainSchema),
});
export type WidgetSettingsInput = z.input<typeof widgetSettingsSchema>;
export type WidgetSettings = z.output<typeof widgetSettingsSchema>;
