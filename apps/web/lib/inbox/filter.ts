import { visitorLabel } from "@/lib/inbox/format";
import {
  CONVERSATION_STATES,
  type Conversation,
  type ConversationState,
  type InboxFilter,
} from "@/lib/inbox/types";

export const INBOX_FILTERS: readonly InboxFilter[] = [
  "open",
  "waiting",
  "ai",
  "human",
  "closed",
];

export const FILTER_PARAM = "state";

function isConversationState(value: string): value is ConversationState {
  return (CONVERSATION_STATES as readonly string[]).includes(value);
}

export function parseFilter(value: string | null | undefined): InboxFilter {
  return value && isConversationState(value) ? value : "open";
}

export function matchesFilter(
  conversation: Conversation,
  filter: InboxFilter,
): boolean {
  return filter === "open"
    ? conversation.state !== "closed"
    : conversation.state === filter;
}

function textOf(conversation: Conversation): string {
  const bodies = conversation.messages.map((message) => {
    switch (message.author) {
      case "visitor":
      case "agent":
      case "member":
        return message.body;
      case "system":
        return "";
      default: {
        const unhandled: never = message;
        throw new Error(`Unhandled message: ${JSON.stringify(unhandled)}`);
      }
    }
  });
  return [visitorLabel(conversation.visitor), ...bodies]
    .join("\n")
    .toLowerCase();
}

export function matchesSearch(
  conversation: Conversation,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  return needle === "" || textOf(conversation).includes(needle);
}

/** Waiting conversations first (D-1), then the most recent activity. */
export function compareConversations(a: Conversation, b: Conversation): number {
  const aWaiting = a.state === "waiting" ? 0 : 1;
  const bWaiting = b.state === "waiting" ? 0 : 1;
  if (aWaiting !== bWaiting) {
    return aWaiting - bWaiting;
  }
  return Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt);
}

export function countByFilter(
  conversations: readonly Conversation[],
): Record<InboxFilter, number> {
  const counts: Record<InboxFilter, number> = {
    open: 0,
    ai: 0,
    waiting: 0,
    human: 0,
    closed: 0,
  };
  for (const conversation of conversations) {
    counts[conversation.state] += 1;
    if (conversation.state !== "closed") {
      counts.open += 1;
    }
  }
  return counts;
}
