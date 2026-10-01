import type {
  Conversation,
  ConversationDetail,
  ConversationSummary,
  Message,
} from "@marshaldesk/shared";
import { type QueryClient, queryOptions } from "@tanstack/react-query";
import { client, orpc } from "@/lib/orpc/client";
import { isOlder, laterIso, mergeMessages } from "@/lib/realtime/messages";

/**
 * The only place that knows the inbox query keys and writes inbox data into
 * the TanStack Query cache. Mutations, refetches and real-time events
 * all go through here, so the list and the open conversation never disagree.
 *
 * Responses and events can arrive out of order: a conversation only replaces
 * the cached one when its `updatedAt` isn't older, and message lists are
 * always merged, so a response read before a message was saved can't hide it.
 */

type ConversationList = { conversations: ConversationSummary[] };

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
    updatedAt: detail.updatedAt,
    visitor: detail.visitor,
    unread: detail.unread,
    preview: detail.preview,
  };
}

/** The newer of two copies of one conversation; ties go to `incoming`. */
function newerOf<T extends Conversation>(current: T, incoming: T): T {
  const winner = isOlder(incoming, current) ? current : incoming;
  return {
    ...winner,
    lastMessageAt: laterIso(current.lastMessageAt, incoming.lastMessageAt),
  };
}

/**
 * A visitor message is saved first and classified later, so it can arrive
 * twice. Declining only ever turns on, so a copy read earlier can't undo it.
 */
function laterCopy(current: Message, incoming: Message): Message {
  if (current.author === "visitor" && incoming.author === "visitor") {
    return { ...incoming, declined: current.declined || incoming.declined };
  }
  return incoming;
}

/** Like `mergeMessages`, but a message already cached takes the incoming copy. */
function upsertMessages(
  current: readonly Message[],
  incoming: readonly Message[],
): Message[] {
  const copies = new Map(incoming.map((message) => [message.id, message]));
  const updated = current.map((message) => {
    const copy = copies.get(message.id);
    return copy ? laterCopy(message, copy) : message;
  });
  return mergeMessages(updated, incoming);
}

function mergeDetail(
  current: ConversationDetail | undefined,
  incoming: ConversationDetail,
): ConversationDetail {
  if (!current) return incoming;
  return {
    ...newerOf(current, incoming),
    messages: upsertMessages(current.messages, incoming.messages),
  };
}

function mergeList(
  current: ConversationList | undefined,
  incoming: ConversationList,
): ConversationList {
  if (!current) return incoming;
  const cached = new Map(
    current.conversations.map((summary) => [summary.id, summary]),
  );
  const merged = incoming.conversations.map((summary) => {
    const existing = cached.get(summary.id);
    cached.delete(summary.id);
    return existing ? newerOf(existing, summary) : summary;
  });
  // Conversations aren't deleted, so one missing from a response either got a
  // message after the request was read or fell off the end of the capped,
  // newest-first page. Only the first kind is newer than the oldest row returned.
  const oldest = incoming.conversations.at(-1)?.lastMessageAt;
  const added = [...cached.values()].filter(
    (summary) =>
      oldest === undefined ||
      Date.parse(summary.lastMessageAt) >= Date.parse(oldest),
  );
  return { conversations: [...added, ...merged] };
}

/** The list query, merged into the cache instead of replacing it. */
export function conversationListOptions(
  queryClient: QueryClient,
  options: { refetchInterval: number | false; staleTime?: number },
) {
  return queryOptions({
    queryKey: conversationListKey(),
    queryFn: async ({ signal }) => {
      const incoming = await client.inbox.list(undefined, { signal });
      // Read the cache after the request so events that landed meanwhile survive.
      return mergeList(
        queryClient.getQueryData(conversationListKey()),
        incoming,
      );
    },
    ...options,
  });
}

/** One conversation's query, merged into the cache instead of replacing it. */
export function conversationOptions(queryClient: QueryClient, id: string) {
  return queryOptions({
    queryKey: conversationKey(id),
    queryFn: async ({ signal }) => {
      const incoming = await client.inbox.get({ id }, { signal });
      return mergeDetail(
        queryClient.getQueryData(conversationKey(id)),
        incoming,
      );
    },
  });
}

/** Adds or updates one conversation in the list; a no-op before the list has loaded. */
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
            conversation.id === summary.id
              ? newerOf(conversation, summary)
              : conversation,
          )
        : [summary, ...list.conversations],
    };
  });
}

/** Stores a conversation returned by the server in both the detail and the list. */
export async function writeConversation(
  queryClient: QueryClient,
  detail: ConversationDetail,
): Promise<void> {
  // An older poll still in flight would overwrite the fresher result.
  await Promise.all([
    queryClient.cancelQueries({ queryKey: conversationKey(detail.id) }),
    queryClient.cancelQueries({ queryKey: conversationListKey() }),
  ]);
  queryClient.setQueryData(conversationKey(detail.id), (current) =>
    mergeDetail(current, detail),
  );
  writeSummary(queryClient, toSummary(detail));
}

/** Adds a message to the cached conversation, if it's cached, or updates the cached copy. */
export function appendMessage(
  queryClient: QueryClient,
  message: Message,
): void {
  queryClient.setQueryData(
    conversationKey(message.conversationId),
    (detail) => {
      if (!detail) return detail;
      return {
        ...detail,
        messages: upsertMessages(detail.messages, [message]),
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
    detail
      ? { ...detail, ...newerOf<Conversation>(detail, conversation) }
      : detail,
  );
  queryClient.setQueryData(conversationListKey(), (list) =>
    list
      ? {
          conversations: list.conversations.map((summary) =>
            summary.id === conversation.id
              ? { ...summary, ...newerOf<Conversation>(summary, conversation) }
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
  if (!detail || isOlder(summary, detail)) return;
  if (Date.parse(summary.lastMessageAt) > Date.parse(detail.lastMessageAt)) {
    void queryClient.invalidateQueries({
      queryKey: conversationKey(summary.id),
    });
    return;
  }
  queryClient.setQueryData(conversationKey(summary.id), (current) =>
    current ? { ...current, ...newerOf(toSummary(current), summary) } : current,
  );
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
