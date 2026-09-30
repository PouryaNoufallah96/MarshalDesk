"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { createMockConversations } from "@/lib/inbox/mock-data";
import { applyMemberAction, type MemberAction } from "@/lib/inbox/transitions";
import type { Conversation } from "@/lib/inbox/types";

type StoreAction =
  | {
      type: "member_action";
      conversationId: string;
      action: MemberAction;
      at: number;
      idPrefix: string;
    }
  | { type: "mark_read"; conversationId: string };

function reducer(
  conversations: Conversation[],
  storeAction: StoreAction,
): Conversation[] {
  switch (storeAction.type) {
    case "member_action": {
      let sequence = 0;
      const clock = {
        now: new Date(storeAction.at),
        newId: () => `${storeAction.idPrefix}_${++sequence}`,
      };
      return conversations.map((conversation) =>
        conversation.id === storeAction.conversationId
          ? applyMemberAction(conversation, storeAction.action, clock)
          : conversation,
      );
    }
    case "mark_read":
      return conversations.map((conversation) =>
        conversation.id === storeAction.conversationId && conversation.unread
          ? { ...conversation, unread: false }
          : conversation,
      );
    default: {
      const unhandled: never = storeAction;
      throw new Error(`Unhandled store action: ${JSON.stringify(unhandled)}`);
    }
  }
}

export type InboxAgent = { name: string; avatarUrl: string };

type InboxStore = {
  conversations: Conversation[];
  /** Shared clock for relative times; starts at the server's render time so hydration matches. */
  now: number;
  agent: InboxAgent;
  act: (conversationId: string, action: MemberAction) => void;
  markRead: (conversationId: string) => void;
};

const InboxStoreContext = createContext<InboxStore | null>(null);

const TICK_MS = 30_000;

export function InboxStoreProvider({
  initialNow,
  agent,
  children,
}: {
  initialNow: number;
  agent: InboxAgent;
  children: ReactNode;
}) {
  const [conversations, dispatch] = useReducer(
    reducer,
    initialNow,
    createMockConversations,
  );
  const [now, setNow] = useState(initialNow);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(interval);
  }, []);

  const act = useCallback((conversationId: string, action: MemberAction) => {
    const at = Date.now();
    setNow(at);
    dispatch({
      type: "member_action",
      conversationId,
      action,
      at,
      idPrefix: crypto.randomUUID(),
    });
  }, []);

  const markRead = useCallback((conversationId: string) => {
    dispatch({ type: "mark_read", conversationId });
  }, []);

  const value = useMemo(
    () => ({ conversations, now, agent, act, markRead }),
    [conversations, now, agent, act, markRead],
  );

  return (
    <InboxStoreContext.Provider value={value}>
      {children}
    </InboxStoreContext.Provider>
  );
}

export function useInboxStore(): InboxStore {
  const store = useContext(InboxStoreContext);
  if (!store) {
    throw new Error("useInboxStore must be used inside InboxStoreProvider.");
  }
  return store;
}

export function useConversation(
  conversationId: string | undefined,
): Conversation | null {
  const { conversations } = useInboxStore();
  return useMemo(
    () =>
      conversationId
        ? (conversations.find(
            (conversation) => conversation.id === conversationId,
          ) ?? null)
        : null,
    [conversations, conversationId],
  );
}
