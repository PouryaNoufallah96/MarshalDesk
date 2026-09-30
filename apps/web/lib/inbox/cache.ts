import type {
  Conversation,
  ConversationDetail,
  ConversationSummary,
  Message,
} from "@marshaldesk/shared";
import type { QueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc/client";
import { laterIso, mergeMessages } from "@/lib/realtime/messages";

/**
 * The only place that knows the inbox query keys and writes inbox data into
 * the TanStack Query cache. Mutations, refetches and real-time events
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
  await queryClient.cancelQueries({ queryKey: conversationKey(detail.id) });
  queryClient.setQueryData(conversationKey(detail.id), detail);
  writeSummary(queryClient, toSummary(detail));
}

/** Appends a message to the cached conversation, if it's cached. Duplicates are ignored. */
export function appendMessage(
  queryClient: QueryClient,
  message: Message,
): void {
  queryClient.setQueryData(
    conversationKey(message.conversationId),
    (detail) => {
      if (!detail) return detail;
      if (detail.messages.some((existing) => existing.id === message.id)) {
        return detail;
      }
      return {
        ...detail,
        messages: mergeMessages(detail.messages, [message]),
        lastMessageAt: laterIso(detail.lastMessageAt, message.createdAt),
      };
    },
  );
}

/** Applies a state change to the cached conversation and its list row. */
export function patchConversation(
  queryClient: QueryClient,
  conversation: Conversation,
): void {
  queryClient.setQueryData(conversationKey(conversation.id), (detail) =>
    detail ? { ...detail, ...conversation } : detail,
  );
  queryClient.setQueryData(conversationListKey(), (list) =>
    list
      ? {
          conversations: list.conversations.map((summary) =>
            summary.id === conversation.id
              ? { ...summary, ...conversation }
              : summary,
          ),
        }
      : list,
  );
}

/**
 * Takes a summary pushed by the server. The cached conversation keeps its
 * messages; when the summary says there are newer ones, it refetches.
 */
export function receiveSummary(
  queryClient: QueryClient,
  summary: ConversationSummary,
): void {
  writeSummary(queryClient, summary);
  const detail = queryClient.getQueryData(conversationKey(summary.id));
  if (!detail) return;
  if (Date.parse(summary.lastMessageAt) > Date.parse(detail.lastMessageAt)) {
    void queryClient.invalidateQueries({
      queryKey: conversationKey(summary.id),
    });
    return;
  }
  const { messages } = detail;
  queryClient.setQueryData(conversationKey(summary.id), {
    ...summary,
    messages,
  });
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
