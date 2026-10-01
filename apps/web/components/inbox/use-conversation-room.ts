"use client";

import {
  type ConversationEvent,
  conversationEventSchema,
  REALTIME_PARTIES,
} from "@marshaldesk/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  appendMessage,
  conversationKey,
  patchConversation,
} from "@/lib/inbox/cache";
import { client } from "@/lib/orpc/client";
import { type AgentPartial, useAgentStream } from "@/lib/realtime/agent-stream";
import { useRemoteTyping, useTypingSignal } from "@/lib/realtime/typing";
import {
  type RealtimeStatus,
  useRealtimeRoom,
} from "@/lib/realtime/use-realtime-room";

/** The open conversation's room: its messages, state changes and the visitor typing. */
export function useConversationRoom(conversationId: string | undefined): {
  status: RealtimeStatus;
  visitorTyping: boolean;
  agentPartial: AgentPartial | null;
  setTyping: (typing: boolean) => void;
} {
  const queryClient = useQueryClient();
  const visitor = useRemoteTyping(conversationId);
  const agent = useAgentStream(conversationId, {
    onOrphanDone: () => {
      if (!conversationId) return;
      void queryClient.invalidateQueries({
        queryKey: conversationKey(conversationId),
      });
    },
  });

  const getToken = useCallback(async () => {
    const { token } = await client.realtime.getToken({ conversationId });
    return token;
  }, [conversationId]);

  function onEvent(event: ConversationEvent) {
    switch (event.type) {
      case "message.created":
        if (event.message.author === "visitor") visitor.receive(false);
        appendMessage(queryClient, event.message);
        agent.receive(event);
        return;
      case "conversation.updated":
        patchConversation(queryClient, event.conversation);
        if (event.conversation.id === conversationId) {
          agent.receiveState(event.conversation.state);
        }
        return;
      case "typing":
        if (event.role === "visitor") visitor.receive(event.typing);
        return;
      case "agent.chunk":
      case "agent.done":
        agent.receive(event);
        return;
      default: {
        const unhandled: never = event;
        throw new Error(`Unhandled event: ${JSON.stringify(unhandled)}`);
      }
    }
  }

  const room = useRealtimeRoom({
    party: REALTIME_PARTIES.conversation,
    room: conversationId,
    getToken,
    schema: conversationEventSchema,
    onEvent,
    onOpen: () => {
      agent.clear();
      if (!conversationId) return;
      void queryClient.invalidateQueries({
        queryKey: conversationKey(conversationId),
      });
    },
  });

  const setTyping = useTypingSignal(room.send);

  return {
    status: room.status,
    visitorTyping: visitor.typing,
    agentPartial: agent.partial,
    setTyping,
  };
}
