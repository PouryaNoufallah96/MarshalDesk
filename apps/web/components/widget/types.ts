import type { WidgetColor, WidgetPosition } from "@marshaldesk/shared";

/** Everything the widget needs to render itself, resolved for display. */
export type WidgetAppearance = {
  agentEnabled: boolean;
  agentName: string;
  agentAvatarUrl: string;
  color: WidgetColor;
  position: WidgetPosition;
  greeting: string;
  suggestedQuestions: readonly string[];
};

export type WidgetMember = {
  name: string;
  avatarUrl: string;
};

export type WidgetMessage =
  | { id: string; author: "visitor" | "agent" | "system"; body: string }
  | { id: string; author: "member"; body: string; member: WidgetMember };
