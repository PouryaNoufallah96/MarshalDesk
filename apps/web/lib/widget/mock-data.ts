import type { SourceStatus } from "@marshaldesk/shared";
import type { WidgetMessage } from "@/components/widget/types";

// Stand-ins until suggested questions, sources and the knowledge base setup
// step are served by oRPC and Neon. Nothing here is persisted.

export const mockSuggestedQuestions: readonly string[] = [
  "Do you ship to Canada?",
  "What's your refund policy?",
  "How do I reset my password?",
  "Which plan is right for my team?",
];

export const mockSetupProgress = {
  hasReadySource: true,
};

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

export type MockSource = {
  id: string;
  name: string;
  bytes: number;
  status: SourceStatus;
  failureReason?: string;
};

export const mockSources: readonly MockSource[] = [
  {
    id: "source-returns",
    name: "returns-policy.pdf",
    bytes: 248_000,
    status: "ready",
  },
  {
    id: "source-shipping",
    name: "shipping-and-delivery.md",
    bytes: 14_200,
    status: "ready",
  },
  { id: "source-faq", name: "faq.txt", bytes: 9_800, status: "processing" },
  {
    id: "source-scan",
    name: "price-list-scan.pdf",
    bytes: 3_400_000,
    status: "failed",
    failureReason: "No text could be extracted from this file.",
  },
];
