import type {
  Conversation,
  ConversationState,
  MemberMessage,
  Message,
  SystemEvent,
} from "@/lib/inbox/types";

export type MemberAction =
  | { type: "take_over" }
  | { type: "hand_to_agent" }
  | { type: "close" }
  | { type: "reply"; body: string; memberId: string };

export type MemberActionType = MemberAction["type"];

/** The state a member action leads to (PRD Flow C), or `null` when it isn't allowed. */
export function nextState(
  state: ConversationState,
  action: MemberActionType,
): ConversationState | null {
  switch (action) {
    case "take_over":
      switch (state) {
        case "ai":
        case "waiting":
          return "human";
        case "human":
        case "closed":
          return null;
        default: {
          const unhandled: never = state;
          throw new Error(`Unhandled state: ${String(unhandled)}`);
        }
      }
    case "reply":
      switch (state) {
        case "ai":
        case "waiting":
        case "human":
          return "human";
        case "closed":
          return null;
        default: {
          const unhandled: never = state;
          throw new Error(`Unhandled state: ${String(unhandled)}`);
        }
      }
    case "hand_to_agent":
      switch (state) {
        case "human":
          return "ai";
        case "ai":
        case "waiting":
        case "closed":
          return null;
        default: {
          const unhandled: never = state;
          throw new Error(`Unhandled state: ${String(unhandled)}`);
        }
      }
    case "close":
      switch (state) {
        case "ai":
        case "waiting":
        case "human":
          return "closed";
        case "closed":
          return null;
        default: {
          const unhandled: never = state;
          throw new Error(`Unhandled state: ${String(unhandled)}`);
        }
      }
    default: {
      const unhandled: never = action;
      throw new Error(`Unhandled action: ${String(unhandled)}`);
    }
  }
}

export function canApply(
  conversation: Conversation,
  action: MemberActionType,
): boolean {
  return nextState(conversation.state, action) !== null;
}

type Clock = { now: Date; newId: () => string };

function systemMessage(event: SystemEvent, clock: Clock): Message {
  return {
    id: clock.newId(),
    author: "system",
    event,
    createdAt: clock.now.toISOString(),
  };
}

/**
 * Applies a member action and appends the matching event lines. Returns the
 * conversation unchanged when the action isn't allowed in its current state.
 */
export function applyMemberAction(
  conversation: Conversation,
  action: MemberAction,
  clock: Clock,
): Conversation {
  const state = nextState(conversation.state, action.type);
  if (state === null) {
    return conversation;
  }
  const at = clock.now.toISOString();

  switch (action.type) {
    case "take_over":
      return {
        ...conversation,
        state,
        messages: [
          ...conversation.messages,
          systemMessage({ kind: "taken_over" }, clock),
        ],
      };
    case "reply": {
      const body = action.body.trim();
      if (!body) {
        return conversation;
      }
      const reply: MemberMessage = {
        id: clock.newId(),
        author: "member",
        memberId: action.memberId,
        body,
        attachments: [],
        createdAt: at,
      };
      const takesOver = conversation.state !== "human";
      return {
        ...conversation,
        state,
        lastMessageAt: at,
        messages: [
          ...conversation.messages,
          ...(takesOver ? [systemMessage({ kind: "taken_over" }, clock)] : []),
          reply,
        ],
      };
    }
    case "hand_to_agent":
      return {
        ...conversation,
        state,
        messages: [
          ...conversation.messages,
          systemMessage({ kind: "handed_back" }, clock),
        ],
      };
    case "close":
      return {
        ...conversation,
        state,
        closedAt: at,
        messages: [
          ...conversation.messages,
          systemMessage({ kind: "closed", by: "member" }, clock),
        ],
      };
    default: {
      const unhandled: never = action;
      throw new Error(`Unhandled action: ${JSON.stringify(unhandled)}`);
    }
  }
}
