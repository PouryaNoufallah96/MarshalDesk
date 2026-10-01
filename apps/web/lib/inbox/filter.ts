import {
  CONVERSATION_STATES,
  type ConversationState,
  type ConversationSummary,
} from "@marshaldesk/shared";
import { stripMarkdown, visitorLabel } from "@/lib/inbox/format";

/** The list filter: every open conversation, or one state. */
export type InboxFilter = "open" | ConversationState;

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
  conversation: ConversationSummary,
  filter: InboxFilter,
): boolean {
  return filter === "open"
    ? conversation.state !== "closed"
    : conversation.state === filter;
}

/** The list payload has no messages, so search covers the visitor and the preview. */
export function matchesSearch(
  conversation: ConversationSummary,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  const haystack = [
    visitorLabel(conversation.visitor),
    conversation.preview ? stripMarkdown(conversation.preview) : "",
  ]
    .join("\n")
    .toLowerCase();
  return haystack.includes(needle);
}

/** Waiting conversations first (D-1), then the most recent activity. */
export function compareConversations(
  a: ConversationSummary,
  b: ConversationSummary,
): number {
  const aWaiting = a.state === "waiting" ? 0 : 1;
  const bWaiting = b.state === "waiting" ? 0 : 1;
  if (aWaiting !== bWaiting) {
    return aWaiting - bWaiting;
  }
  return Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt);
}

export function countByFilter(
  conversations: readonly ConversationSummary[],
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
