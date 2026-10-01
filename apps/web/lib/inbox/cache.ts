import type {
  ConversationDetail,
  ConversationSummary,
} from "@marshaldesk/shared";
import type { QueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc/client";

/**
 * The only place that knows the inbox query keys and writes inbox data into
 * the TanStack Query cache. Mutations, polling and (later) real-time events
 * all go through here, so the list and the open conversation never disagree.
 */

export function inboxKey() {
  return orpc.inbox.key();
}

export function conversationListKey() {
  return orpc.inbox.list.queryKey();
}

export function conversationKey(id: string) {
  return orpc.inbox.get.queryKey({ input: { id } });
}

export function toSummary(detail: ConversationDetail): ConversationSummary {
  return {
    id: detail.id,
    state: detail.state,
    handoffReason: detail.handoffReason,
    createdAt: detail.createdAt,
    lastMessageAt: detail.lastMessageAt,
    closedAt: detail.closedAt,
    visitor: detail.visitor,
    unread: detail.unread,
    preview: detail.preview,
  };
}

/** Adds or replaces one conversation in the list; a no-op before the list has loaded. */
export function writeSummary(
  queryClient: QueryClient,
  summary: ConversationSummary,
): void {
  queryClient.setQueryData(conversationListKey(), (list) => {
    if (!list) return list;
    const exists = list.conversations.some(
      (conversation) => conversation.id === summary.id,
    );
    return {
      conversations: exists
        ? list.conversations.map((conversation) =>
            conversation.id === summary.id ? summary : conversation,
          )
        : [summary, ...list.conversations],
    };
  });
}

/** Stores a fresh conversation from the server in both the detail and the list. */
export async function writeConversation(
  queryClient: QueryClient,
  detail: ConversationDetail,
): Promise<void> {
  // An older poll still in flight would overwrite the fresher result.
  await Promise.all([
    queryClient.cancelQueries({ queryKey: conversationKey(detail.id) }),
    queryClient.cancelQueries({ queryKey: conversationListKey() }),
  ]);
  queryClient.setQueryData(conversationKey(detail.id), detail);
  writeSummary(queryClient, toSummary(detail));
}

/** Refetches one conversation and the list, for when the cache can't be trusted. */
export async function refreshConversation(
  queryClient: QueryClient,
  id: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: conversationKey(id) }),
    queryClient.invalidateQueries({ queryKey: conversationListKey() }),
  ]);
}
