"use client";

import {
  type ConversationDetail,
  type ConversationSummary,
  inboxErrors,
} from "@marshaldesk/shared";
import { ORPCError } from "@orpc/client";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  conversationKey,
  conversationListKey,
  refreshConversation,
  writeConversation,
} from "@/lib/inbox/cache";
import { conflictMessage } from "@/lib/inbox/format";
import { orpc } from "@/lib/orpc/client";
import { realtimeEnabled } from "@/lib/realtime/use-realtime-room";
import { useDocumentVisible } from "@/lib/realtime/visibility";

/** Real-time events keep the inbox current; without them, it polls. */
const REFRESH_MS = realtimeEnabled ? false : 10_000;
const FRESH_MS = 5_000;

function isInboxError(error: unknown): error is ORPCError<string, unknown> {
  return (
    error instanceof ORPCError &&
    (error.code === "NOT_FOUND" || error.code === "CONFLICT")
  );
}

export function useConversations(): ConversationSummary[] {
  return useSuspenseQuery(
    orpc.inbox.list.queryOptions({
      refetchInterval: REFRESH_MS,
      staleTime: FRESH_MS,
    }),
  ).data.conversations;
}

/**
 * The open conversation with its messages. When the list has polled newer
 * data than the detail, the detail refetches so the two stay in step.
 */
export function useConversationDetail(
  id: string | undefined,
  summary: ConversationSummary | null,
) {
  const queryClient = useQueryClient();
  const query = useQuery(
    orpc.inbox.get.queryOptions({
      input: { id: id ?? "" },
      enabled: id !== undefined,
      refetchInterval: REFRESH_MS,
      staleTime: FRESH_MS,
      retry: (failureCount, error) => !isInboxError(error) && failureCount < 2,
    }),
  );

  const detail = query.data;
  const listUpdatedAt =
    queryClient.getQueryState(conversationListKey())?.dataUpdatedAt ?? 0;
  const outOfStep =
    id !== undefined &&
    summary !== null &&
    detail !== undefined &&
    listUpdatedAt > query.dataUpdatedAt &&
    (summary.state !== detail.state ||
      summary.lastMessageAt !== detail.lastMessageAt);

  useEffect(() => {
    if (outOfStep && id) {
      void queryClient.invalidateQueries({ queryKey: conversationKey(id) });
    }
  }, [outOfStep, id, queryClient]);

  return query;
}

function actionErrorHandler(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
  failure: string,
) {
  return (error: Error) => {
    if (error instanceof ORPCError && error.code === "CONFLICT") {
      const data = inboxErrors.CONFLICT.data.safeParse(error.data);
      toast(
        data.success
          ? conflictMessage(data.data.state)
          : "This conversation changed. Refreshing it now.",
      );
      void refreshConversation(queryClient, id);
      return;
    }
    if (error instanceof ORPCError && error.code === "NOT_FOUND") {
      toast("This conversation doesn't exist anymore.");
      void refreshConversation(queryClient, id);
      return;
    }
    toast.error(failure);
  };
}

/** Member actions. The server decides the resulting state; the cache takes whatever it returns. */
export function useConversationActions(id: string) {
  const queryClient = useQueryClient();
  const onSuccess = (detail: ConversationDetail) =>
    writeConversation(queryClient, detail);

  const reply = useMutation(
    orpc.inbox.reply.mutationOptions({
      onSuccess,
      onError: actionErrorHandler(
        queryClient,
        id,
        "Your reply wasn't sent. Try again.",
      ),
    }),
  );
  const takeOver = useMutation(
    orpc.inbox.takeOver.mutationOptions({
      onSuccess,
      onError: actionErrorHandler(
        queryClient,
        id,
        "Couldn't take over. Try again.",
      ),
    }),
  );
  const handBack = useMutation(
    orpc.inbox.handBack.mutationOptions({
      onSuccess,
      onError: actionErrorHandler(
        queryClient,
        id,
        "Couldn't hand it to the agent. Try again.",
      ),
    }),
  );
  const close = useMutation(
    orpc.inbox.close.mutationOptions({
      onSuccess,
      onError: actionErrorHandler(
        queryClient,
        id,
        "Couldn't close the conversation. Try again.",
      ),
    }),
  );

  return {
    reply,
    takeOver,
    handBack,
    close,
    pending:
      reply.isPending ||
      takeOver.isPending ||
      handBack.isPending ||
      close.isPending,
  };
}

/**
 * Marks the open conversation read once per new message, so refetches can't
 * loop it. A hidden tab doesn't count as reading, so the badge still counts it.
 */
export function useMarkRead(summary: ConversationSummary | null) {
  const queryClient = useQueryClient();
  const visible = useDocumentVisible();
  const { mutate } = useMutation(
    orpc.inbox.markRead.mutationOptions({
      onSuccess: (detail) => writeConversation(queryClient, detail),
    }),
  );
  const marked = useRef(new Set<string>());
  const id = summary?.id;
  const unread = summary?.unread ?? false;
  const version = summary ? `${summary.id}:${summary.lastMessageAt}` : null;

  useEffect(() => {
    if (!visible || !id || !unread || !version) return;
    if (marked.current.has(version)) return;
    marked.current.add(version);
    mutate({ id });
  }, [visible, id, unread, version, mutate]);
}
