"use client";

import type {
  ConversationEvent,
  ConversationState,
  Message,
} from "@marshaldesk/shared";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

/** How long to wait for a lost `message.created` before refetching. */
const ORPHAN_REFETCH_DELAY_MS = 1_000;

export type AgentPartial = {
  messageId: string;
  text: string;
  /** When the first chunk arrived, standing in for the saved message's time. */
  startedAt: string;
};

type Stream = {
  conversationId: string;
  partial: { lastSeq: number; text: string; startedAt: string };
  /** The saved message arrived; it replaces the partial. */
  saved: boolean;
};

/**
 * The partial to show in a thread. The agent only ever answers the newest
 * visitor message while it has the conversation, so anything saved after
 * that message (the reply itself, a take-over, a member's reply) retires it.
 */
export function visiblePartial(
  partial: AgentPartial | null,
  state: ConversationState | undefined,
  messages: readonly Pick<Message, "author">[],
): AgentPartial | null {
  if (!partial || state !== "ai") return null;
  return messages.at(-1)?.author === "visitor" ? partial : null;
}

type StreamEvent = Extract<
  ConversationEvent,
  { type: "agent.chunk" | "agent.done" | "message.created" }
>;

/**
 * The agent reply streaming into one conversation room, as unsaved text.
 * Postgres stays the source of truth: a partial only lives until its saved
 * message arrives with the same id, the turn ends, or the agent loses the
 * conversation.
 */
export function useAgentStream(
  conversationId: string | null | undefined,
  { onOrphanDone }: { onOrphanDone: () => void },
): {
  partial: AgentPartial | null;
  receive: (event: StreamEvent) => void;
  /** Drops every partial, e.g. when the state leaves `ai` or the socket reopens. */
  clear: () => void;
  /** Drops every partial unless the conversation is with the agent. */
  receiveState: (state: ConversationState) => void;
} {
  const streams = useRef(new Map<string, Stream>());
  /** Replies already saved or ended, so a chunk delivered late can't revive them. */
  const finished = useRef(new Set<string>());
  const [snapshot, setSnapshot] = useState<{
    key: string | null | undefined;
    partial: AgentPartial | null;
  }>({ key: conversationId, partial: null });
  const onOrphanDoneRef = useRef(onOrphanDone);
  useLayoutEffect(() => {
    onOrphanDoneRef.current = onOrphanDone;
  });
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const later = useCallback((delay: number, run: () => void) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      run();
    }, delay);
    timers.current.add(timer);
  }, []);

  const publish = useCallback(() => {
    let latest: AgentPartial | null = null;
    for (const [messageId, stream] of streams.current) {
      if (stream.conversationId !== conversationId) continue;
      latest = {
        messageId,
        text: stream.partial.text,
        startedAt: stream.partial.startedAt,
      };
    }
    setSnapshot({ key: conversationId, partial: latest });
  }, [conversationId]);

  const clear = useCallback(() => {
    streams.current.clear();
    publish();
  }, [publish]);

  useEffect(() => {
    const pending = timers.current;
    streams.current.clear();
    finished.current.clear();
    return () => {
      for (const timer of pending) clearTimeout(timer);
      pending.clear();
    };
  }, [conversationId]);

  const receive = useCallback(
    (event: StreamEvent) => {
      switch (event.type) {
        case "agent.chunk": {
          if (finished.current.has(event.messageId)) return;
          const stream = streams.current.get(event.messageId);
          if (!stream) {
            streams.current.set(event.messageId, {
              conversationId: event.conversationId,
              partial: {
                lastSeq: event.seq,
                text: event.text,
                startedAt: new Date().toISOString(),
              },
              saved: false,
            });
          } else if (!stream.saved && event.seq > stream.partial.lastSeq) {
            stream.partial = {
              ...stream.partial,
              lastSeq: event.seq,
              text: event.text,
            };
          } else {
            return;
          }
          publish();
          return;
        }
        case "message.created": {
          finished.current.add(event.message.id);
          const stream = streams.current.get(event.message.id);
          if (!stream) return;
          stream.saved = true;
          // TanStack Query renders cache writes on a zero-delay timer; dropping
          // the partial on a later one keeps the bubble on screen in between.
          later(0, () => {
            if (streams.current.get(event.message.id) !== stream) return;
            streams.current.delete(event.message.id);
            publish();
          });
          return;
        }
        case "agent.done": {
          finished.current.add(event.messageId);
          const stream = streams.current.get(event.messageId);
          if (!stream) return;
          if (stream.saved) return;
          streams.current.delete(event.messageId);
          publish();
          later(ORPHAN_REFETCH_DELAY_MS, () => onOrphanDoneRef.current());
          return;
        }
        default: {
          const unhandled: never = event;
          throw new Error(`Unhandled event: ${JSON.stringify(unhandled)}`);
        }
      }
    },
    [publish, later],
  );

  const receiveState = useCallback(
    (state: ConversationState) => {
      switch (state) {
        case "ai":
          return;
        case "waiting":
        case "human":
        case "closed":
          clear();
          return;
        default: {
          const unhandled: never = state;
          throw new Error(`Unhandled state: ${String(unhandled)}`);
        }
      }
    },
    [clear],
  );

  return {
    partial: snapshot.key === conversationId ? snapshot.partial : null,
    receive,
    clear,
    receiveState,
  };
}
