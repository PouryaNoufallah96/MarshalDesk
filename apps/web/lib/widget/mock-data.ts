import type { WidgetMessage } from "@/components/widget/types";

// Sample conversations for the settings preview. Nothing here is persisted.

export const mockPreviewConversation: readonly WidgetMessage[] = [
  {
    id: "preview-visitor-1",
    author: "visitor",
    body: "Do you ship to Canada?",
  },
  {
    id: "preview-agent-1",
    author: "agent",
    body: "Yes, we ship to Canada. Orders usually arrive within 5 to 8 business days, and you'll get a tracking link by email once it's on its way.",
  },
];

export const mockPreviewAgentOffConversation: readonly WidgetMessage[] = [
  {
    id: "preview-visitor-1",
    author: "visitor",
    body: "Do you ship to Canada?",
  },
  {
    id: "preview-system-1",
    author: "system",
    body: "You'll be connected to a person shortly. It can take a little while, so please hang on.",
  },
];
